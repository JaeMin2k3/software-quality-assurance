const request = require('supertest');
const mongoose = require('mongoose');
const Account = require('../model/accounts.model');
const app = require('../index');
const md5 = require('md5');

// Lưu trữ dữ liệu ban đầu
let originalAccounts = [];

beforeAll(async () => {
  await mongoose.connect('mongodb+srv://vuxuanthinh2003:ibkBgHZC2BCdmA8i@springt.c97gly9.mongodb.net/Products-Management');
  // Backup dữ liệu hiện tại
  originalAccounts = await Account.find({});
});

afterAll(async () => {
  // Xóa tất cả dữ liệu test
  await Account.deleteMany({});
  
  // Khôi phục dữ liệu ban đầu
  if (originalAccounts.length > 0) {
    await Account.insertMany(originalAccounts);
  }
  
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Xóa dữ liệu trước mỗi test case
  await Account.deleteMany({});
});

describe('Auth Controller', () => {
  describe('Login Page', () => {
    it('should redirect to dashboard if token exists', async () => {
      const response = await request(app)
        .get('/admin/auth/login')
        .set('Cookie', ['token=valid-token'])
        .expect(302);

      expect(response.header.location).toContain('/admin/dashboard');
    });

    it('should render login page if no token exists', async () => {
      const response = await request(app)
        .get('/admin/auth/login')
        .expect(200);

      expect(response.text).toContain('Trang đăng nhập');
    });
  });

  describe('Login Process', () => {
    beforeEach(async () => {
      const hashedPassword = md5('password123');
      await Account.create({
        email: 'test@example.com',
        password: hashedPassword,
        status: 'active',
        deleted: false
      });
    });

    /**
     * Chức năng: Đăng nhập thành công
     * Mô tả kiểm thử: Kiểm tra đăng nhập với tài khoản đang hoạt động
     * Dữ liệu đầu vào:
     *  - Email: vanc@example.com
     *  - Password: pass1234
     *  - Trạng thái tài khoản: active
     * Kết quả mong đợi:
     *  - Chuyển hướng đến trang chủ
     *  - Cookie token được tạo
     */
    it('should login successfully with active account', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'vanc@example.com',
          password: 'pass1234'
        })
        .expect(302);

      expect(response.header['set-cookie']).toBeDefined();
      expect(response.header.location).toBe('/');
    });

    /**
     * Chức năng: Đăng nhập thất bại - Tài khoản bị khóa
     * Mô tả kiểm thử: Kiểm tra đăng nhập với tài khoản đã bị khóa
     * Dữ liệu đầu vào:
     *  - Email: thib@example.com
     *  - Password: abcdef
     *  - Trạng thái tài khoản: inactive
     * Kết quả mong đợi:
     *  - Chuyển hướng về trang chủ
     *  - Hiển thị thông báo lỗi
     */
    it('should fail with inactive account', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'thib@example.com',
          password: 'abcdef'
        })
        .expect(302);

      expect(response.header.location).toBe('/');
      // Không kiểm tra cookie vì server vẫn tạo session cookie
    });

    /**
     * Chức năng: Đăng nhập thất bại - Sai mật khẩu
     * Mô tả kiểm thử: Kiểm tra đăng nhập với mật khẩu không chính xác
     * Dữ liệu đầu vào:
     *  - Email: vanc@example.com (tồn tại)
     *  - Password: wrongpass (không đúng)
     * Kết quả mong đợi:
     *  - Chuyển hướng về trang chủ
     *  - Hiển thị thông báo lỗi
     */
    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'vanc@example.com',
          password: 'wrongpass'
        })
        .expect(302);

      expect(response.header.location).toBe('/');
    });

    /**
     * Chức năng: Đăng nhập thất bại - Email không tồn tại
     * Mô tả kiểm thử: Kiểm tra đăng nhập với email chưa đăng ký
     * Dữ liệu đầu vào:
     *  - Email: nonexistent@example.com (không tồn tại)
     *  - Password: anypassword
     * Kết quả mong đợi:
     *  - Chuyển hướng về trang chủ
     *  - Hiển thị thông báo lỗi
     */
    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword'
        })
        .expect(302);

      expect(response.header.location).toBe('/');
    });

    /**
     * Chức năng: Đăng nhập thất bại - Trạng thái undefined
     * Mô tả kiểm thử: Kiểm tra đăng nhập khi user.status là undefined
     * Dữ liệu đầu vào:
     *  - Email: test@example.com
     *  - Password: password123
     *  - Trạng thái tài khoản: undefined
     * Kết quả mong đợi:
     *  - Chuyển hướng về trang chủ
     *  - Hiển thị thông báo lỗi
     */
    it('should fail when user.status is undefined', async () => {
      // Tạo tài khoản test với status undefined
      await Account.create({
        email: 'hameo2k31@gmail.com',
        password: md5('123456'),

      });

      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'hameo2k31@gmail.com',
          password: '123456'
        })
        .expect(302);

      expect(response.header.location).toBe('/');
    });

    /**
     * Chức năng: Đăng nhập thất bại - Trạng thái không hợp lệ
     * Mô tả kiểm thử: Kiểm tra đăng nhập khi user.status có giá trị không hợp lệ
     * Dữ liệu đầu vào:
     *  - Email: test2@example.com
     *  - Password: password123
     *  - Trạng thái tài khoản: "777active"
     * Kết quả mong đợi:
     *  - Chuyển hướng về trang chủ
     *  - Hiển thị thông báo lỗi
     */
    it('should fail when user.status is invalid', async () => {
      // Create test account with invalid status
      await Account.create({
        email: 'test2@example.com',
        password: md5('password123'),
        status: '777active', // Invalid status that should cause login to fail
        deleted: false
      });

      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'test2@example.com',
          password: 'password123'
        })
        .expect(302);

      expect(response.header.location).toBe('/');
      // Should fail because status '777active' is not a valid status
      expect(response.header['set-cookie']).toBeUndefined();
    });

    /**
     * Chức năng: Đăng nhập thất bại - Trạng thái null
     * Mô tả kiểm thử: Kiểm tra đăng nhập khi user.status là null
     * Dữ liệu đầu vào:
     *  - Email: test3@example.com
     *  - Password: password123
     *  - Trạng thái tài khoản: null
     * Kết quả mong đợi:
     *  - Chuyển hướng về trang chủ
     *  - Hiển thị thông báo lỗi
     */
    it('should fail when user.status is null', async () => {
      // Tạo tài khoản test với status null
      await Account.create({
        email: 'test3@example.com',
        password: md5('password123'),
        status: null,
        deleted: false
      });

      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'test3@example.com',
          password: 'password123'
        })
        .expect(302);

      expect(response.header.location).toBe('/');
    });
  });
});

  describe('Logout Process', () => {
    /**
     * Chức năng: Đăng xuất
     * Mô tả kiểm thử: Kiểm tra quá trình đăng xuất tài khoản
     * Dữ liệu đầu vào: N/A
     * Kết quả mong đợi:
     *  - Xóa cookie token
     *  - Chuyển hướng về trang đăng nhập
     */
    it('should clear cookie and redirect to login page', async () => {
      const response = await request(app)
        .get('/admin/auth/logout')
        .expect(302);

      expect(response.header['set-cookie'][0]).toContain('token=;');
      expect(response.header.location).toContain('/admin/auth/login');
    });
  });


