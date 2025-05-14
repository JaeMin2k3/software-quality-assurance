const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });
const app = require('../index');

const Account = require('../model/accounts.model');

describe('My Account Controller Integration Test', () => {
  let userId;

  beforeAll(async () => {
    await mongoose.connect(process.env.mongoURL);
    const user = await Account.create({ email: 'myaccount_test@mail.com', name: 'Test User', token: 'token_test_user', status: 'active', deleted: false });
    userId = user._id;
    await Account.create({ email: 'existing_user@mail.com', name: 'Other User', status: 'active', deleted: false });
  });

  afterAll(async () => {
    await Account.deleteMany({ email: /myaccount_test|existing_user/ });
    await mongoose.connection.close();
  });

  test('MYACC_004 - Cập nhật thành công', async () => {
    const res = await request(app)
      .patch('/admin/my-account/edit')
      .set('Cookie', [`token=token_test_user`])
      .send({ email: 'myaccount_updated@mail.com', name: 'Updated Name' });

    expect(res.status).toBe(302);
    const updated = await Account.findOne({ _id: userId });
    expect(updated.email).toBe('myaccount_updated@mail.com');
  });

  test('MYACC_003 - Email bị trùng với người khác', async () => {
    const res = await request(app)
      .patch('/admin/my-account/edit')
      .set('Cookie', [`token=token_test_user`])
      .send({ email: 'existing_user@mail.com' });

    expect(res.status).toBe(302);
    const stillSame = await Account.findOne({ _id: userId });
    expect(stillSame.email).not.toBe('existing_user@mail.com');
  });
});