const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' }); // Dùng biến môi trường test
const app = require('../index');

const Account = require('../model/accounts.model');

// 🔁 MOCK middleware uploadCloud (bỏ qua nếu không có ảnh)
jest.mock('../middlewares/admin/ulpoadCloud.middleware', () => ({
  upload: (req, res, next) => next()
}));

describe('Accounts Controller Integration Test', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Account.deleteMany({ email: /integration_test/ });
  });

  /**
   * TC_ACC_001 - Tạo account mới thành công
   */
  test('TC_ACC_001 - Tạo account mới thành công', async () => {
    const res = await request(app)
      .post('/admin/accounts/create')
      .type('form') // ⚠️ Quan trọng nếu bạn không dùng .attach()
      .send({
        email: 'integration_test@mail.com',
        password: '123456',
        role_id: '64abcedf1234567890abcdef' // cần là role có thật
      });

    expect(res.status).toBe(302); // Redirect sau khi thành công

    const account = await Account.findOne({ email: 'integration_test@mail.com' });
    expect(account).not.toBeNull(); // Đảm bảo đã tạo thành công
  });

  /**
   * TC_ACC_002 - Không tạo account nếu email đã tồn tại
   */
  test('TC_ACC_002 - Không tạo account nếu email đã tồn tại', async () => {
    // Tạo trước 1 account
    await Account.create({
      email: 'integration_test@mail.com',
      password: 'hashed',
      role_id: '64abcedf1234567890abcdef'
    });

    const res = await request(app)
      .post('/admin/accounts/create')
      .type('form')
      .send({
        email: 'integration_test@mail.com',
        password: '123456',
        role_id: '64abcedf1234567890abcdef'
      });

    expect(res.status).toBe(302); // Vẫn redirect nhưng không tạo mới

    const count = await Account.countDocuments({ email: 'integration_test@mail.com' });
    expect(count).toBe(1); // Không thêm trùng
  });
});
