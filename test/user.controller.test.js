// tests/user.controller.test.js
const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });
const app = require('../index');

const User = require('../model/users.model');
const Cart = require('../model/carts.model');
const ForgotPassword = require('../model/forgot-password.model');

let testEmail = 'test_user@mail.com';
let tokenUser;

beforeAll(async () => {
  await mongoose.connect(process.env.mongoURL);
});

afterAll(async () => {
  await User.deleteMany({ email: /test_user|otp_user/ });
  await Cart.deleteMany({});
  await ForgotPassword.deleteMany({});
  await mongoose.disconnect();
});

describe('User Controller Integration Test', () => {
  test('USER_001 - Đăng ký tài khoản thành công', async () => {
    const res = await request(app)
      .post('/user/register')
      .send({
        email: testEmail,
        password: '123456',
        passwordCF: '123456',
        fullName: 'Test User'
      });

    expect(res.status).toBe(302);
    const user = await User.findOne({ email: testEmail });
    expect(user).not.toBeNull();
    tokenUser = user.tokenUser;
  });

  test('USER_002 - Đăng nhập thành công', async () => {
    const res = await request(app)
      .post('/user/login')
      .send({
        email: testEmail,
        password: '123456'
      });
    expect(res.status).toBe(302);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('USER_003 - Quên mật khẩu - gửi OTP thành công', async () => {
    const res = await request(app)
      .post('/password/forgot')
      .send({ email: testEmail });

    expect(res.status).toBe(302);
    const otpEntry = await ForgotPassword.findOne({ email: testEmail });
    expect(otpEntry).not.toBeNull();
  });

  test('USER_004 - Submit mã OTP đúng', async () => {
    const otpDoc = await ForgotPassword.findOne({ email: testEmail });

    const res = await request(app)
      .post('/user/password/otp')
      .send({
        email: testEmail,
        otp: otpDoc.otp
      });

    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe('/user/password/reset');
  });

  test('USER_005 - Reset mật khẩu thành công', async () => {
    const res = await request(app)
      .post('/user/password/reset')
      .set('Cookie', [`tokenUser=${tokenUser}`])
      .send({
        password: '654321',
        confirmPassword: '654321'
      });

    expect(res.status).toBe(302);
    const updatedUser = await User.findOne({ email: testEmail });
    expect(updatedUser.password).not.toBe('123456');
  });
});
