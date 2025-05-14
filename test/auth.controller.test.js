const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });
const app = require('../index');

const Account = require('../model/accounts.model');

describe('Auth Controller Integration Test', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.mongoURL);
    await Account.create({ email: 'auth_test_active@mail.com', password: '123456', token: 'token_auth_test', status: 'active', deleted: false });
    await Account.create({ email: 'auth_test_inactive@mail.com', password: '123456', token: 'token_auth_inactive', status: 'inactive', deleted: false });
  });

  afterAll(async () => {
    await Account.deleteMany({ email: /auth_test/ });
    await mongoose.disconnect();
  });

  test('AUTH_001 - Đăng nhập thành công', async () => {
    const res = await request(app)
      .post('/admin/auth/login')
      .send({ email: 'auth_test_active@mail.com', password: '123456' });

    expect(res.status).toBe(302);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('AUTH_002 - Sai mật khẩu', async () => {
    const res = await request(app)
      .post('/admin/auth/login')
      .send({ email: 'auth_test_active@mail.com', password: 'wrongpass' });

    expect(res.status).toBe(302);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('AUTH_003 - Email không tồn tại', async () => {
    const res = await request(app)
      .post('/admin/auth/login')
      .send({ email: 'notfound@mail.com', password: '123456' });

    expect(res.status).toBe(302);
  });

  test('AUTH_004 - Tài khoản bị khóa', async () => {
    const res = await request(app)
      .post('/admin/auth/login')
      .send({ email: 'auth_test_inactive@mail.com', password: '123456' });

    expect(res.status).toBe(302);
  });

  test('AUTH_006 - Logout', async () => {
    const res = await request(app)
      .get('/admin/auth/logout')
      .set('Cookie', ['token=token_auth_test']);

    expect(res.status).toBe(302);
    expect(res.headers['set-cookie'][0]).toMatch(/token=;/);
  });
});
