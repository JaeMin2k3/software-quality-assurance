const request = require('supertest');
const mongoose = require('mongoose');
const Account = require('../model/accounts.model');
const app = require('../index');
const md5 = require('md5');

// ========== CONSTANTS ==========
const TEST_ACCOUNT = {
  email: 'test@example.com',
  password: 'password123',
  hashedPassword: null, // Will be set in beforeAll
  status: 'active',
  deleted: false
};

const TEST_INACTIVE_ACCOUNT = {
  email: 'inactive@example.com',
  password: 'password456',
  status: 'inactive',
  deleted: false
};

// ========== SETUP ==========
let originalAccounts = [];

beforeAll(async () => {
  // Connect to MongoDB
  const mongoUri = process.env.MONGO_TEST_URI || 
    'mongodb+srv://vuxuanthinh2003:ibkBgHZC2BCdmA8i@springt.c97gly9.mongodb.net/Products-Management';
  
  await mongoose.connect(mongoUri);
  
  // Backup dữ liệu hiện tại (để restore sau test)
  originalAccounts = await Account.find({});
  
  // Hash password
  TEST_ACCOUNT.hashedPassword = md5(TEST_ACCOUNT.password);
  TEST_INACTIVE_ACCOUNT.hashedPassword = md5(TEST_INACTIVE_ACCOUNT.password);
});

afterAll(async () => {
  // Xóa tất cả test data
  await Account.deleteMany({});
  
  // Restore original data
  if (originalAccounts.length > 0) {
    await Account.insertMany(originalAccounts);
  }
  
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Xóa tất cả accounts trước mỗi test
  await Account.deleteMany({});
});

// ========== TESTS ==========

describe('Auth Controller', () => {
  
  // ===== LOGIN PAGE =====
  describe('Login Page - GET /admin/auth/login', () => {
    
    /**
     * TEST ID: AU_000
     * Chức năng: Redirect to dashboard if token exists
     * Mô tả: Kiểm tra redirect khi user đã login (có valid token)
     * Precondition: User đã login, có valid token trong cookie
     * Input: GET /admin/auth/login với cookie token
     * Expected: 
     *   - Status code: 302 (redirect)
     *   - Location header: /admin/dashboard
     */
    it('AU_000 - should redirect to dashboard if valid token exists', async () => {
      const response = await request(app)
        .get('/admin/auth/login')
        .set('Cookie', ['token=valid-token'])
        .expect(302);

      expect(response.header.location).toContain('/admin/dashboard');
    });

  });

  // ===== LOGIN PROCESS =====
  describe('Login Process - POST /admin/auth/login', () => {
    
    beforeEach(async () => {
      // Create test account before each test
      await Account.create({
        email: TEST_ACCOUNT.email,
        password: TEST_ACCOUNT.hashedPassword,
        status: TEST_ACCOUNT.status,
        deleted: TEST_ACCOUNT.deleted
      });

      // Create inactive account for status tests
      await Account.create({
        email: TEST_INACTIVE_ACCOUNT.email,
        password: md5(TEST_INACTIVE_ACCOUNT.password),
        status: TEST_INACTIVE_ACCOUNT.status,
        deleted: TEST_INACTIVE_ACCOUNT.deleted
      });
    });

    /**
     * TEST ID: AU_001
     * Chức năng: Successful login
     * Mô tả: Kiểm tra login thành công với credentials hợp lệ
     * Precondition: Account 'test@example.com' tồn tại, status='active'
     * Input: 
     *   - email: test@example.com
     *   - password: password123
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Location: /
     *   - Cookie token được tạo
     */
    it('AU_001 - should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: TEST_ACCOUNT.email,
          password: TEST_ACCOUNT.password
        })
        .expect(302);

      // Verify redirect
      expect(response.header.location).toBe('/');
      
      // Verify token cookie created
      expect(response.header['set-cookie']).toBeDefined();
      expect(response.header['set-cookie'][0]).toContain('token=');
    });

    /**
     * TEST ID: AU_002
     * Chức năng: Login failed - inactive account
     * Mô tả: Kiểm tra login thất bại với account bị inactive
     * Precondition: Account 'inactive@example.com' tồn tại, status='inactive'
     * Input:
     *   - email: inactive@example.com
     *   - password: password456
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Location: /
     *   - Không tạo token cookie
     */
    it('AU_002 - should fail with inactive account', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: TEST_INACTIVE_ACCOUNT.email,
          password: TEST_INACTIVE_ACCOUNT.password
        })
        .expect(302);

      // Verify redirect to home
      expect(response.header.location).toBe('/');
      
      // Verify no auth token created
      const setCookieHeader = response.header['set-cookie'];
      const hasAuthToken = setCookieHeader && 
        setCookieHeader.some(cookie => cookie.includes('token=') && !cookie.includes('token=;'));
      expect(hasAuthToken).toBeFalsy();
    });

    /**
     * TEST ID: AU_003
     * Chức năng: Login failed - wrong password
     * Mô tả: Kiểm tra login thất bại khi password sai
     * Precondition: Account 'test@example.com' tồn tại
     * Input:
     *   - email: test@example.com
     *   - password: wrongpassword (sai)
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Location: /
     *   - Không tạo token
     */
    it('AU_003 - should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: TEST_ACCOUNT.email,
          password: 'wrongpassword'  // Wrong password!
        })
        .expect(302);

      expect(response.header.location).toBe('/');
    });

    /**
     * TEST ID: AU_004
     * Chức năng: Login failed - non-existent email
     * Mô tả: Kiểm tra login thất bại với email chưa đăng ký
     * Precondition: Email không tồn tại trong hệ thống
     * Input:
     *   - email: nonexistent@example.com (không tồn tại)
     *   - password: anypassword
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Location: /
     */
    it('AU_004 - should fail with non-existent email', async () => {
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
     * TEST ID: AU_005
     * Chức năng: Login failed - account status is undefined
     * Mô tả: Kiểm tra login thất bại khi account.status là undefined
     * Precondition: Account tồn tại nhưng status=undefined
     * Input:
     *   - email: statusundefined@example.com
     *   - password: password789
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Login thất bại (undefined status không hợp lệ)
     */
    it('AU_005 - should fail when account status is undefined', async () => {
      // Create account with undefined status
      await Account.create({
        email: 'statusundefined@example.com',
        password: md5('password789'),
        // status is undefined
        deleted: false
      });

      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'statusundefined@example.com',
          password: 'password789'
        })
        .expect(302);

      expect(response.header.location).toBe('/');
    });

    /**
     * TEST ID: AU_006
     * Chức năng: Login failed - invalid account status
     * Mô tả: Kiểm tra login thất bại khi status có giá trị không hợp lệ
     * Precondition: Account có status='invalid_status' (không phải 'active')
     * Input:
     *   - email: invalidstatus@example.com
     *   - password: password999
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Login thất bại vì status không hợp lệ
     */
    it('AU_006 - should fail when account status is invalid', async () => {
      // Create account with invalid status
      await Account.create({
        email: 'invalidstatus@example.com',
        password: md5('password999'),
        status: 'invalid_status',  // Not 'active'
        deleted: false
      });

      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'invalidstatus@example.com',
          password: 'password999'
        })
        .expect(302);

      expect(response.header.location).toBe('/');
    });

    /**
     * TEST ID: AU_007
     * Chức năng: Login failed - account status is null
     * Mô tả: Kiểm tra login thất bại khi status=null
     * Precondition: Account có status=null
     * Input:
     *   - email: statusnull@example.com
     *   - password: password111
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Login thất bại
     */
    it('AU_007 - should fail when account status is null', async () => {
      await Account.create({
        email: 'statusnull@example.com',
        password: md5('password111'),
        status: null,
        deleted: false
      });

      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'statusnull@example.com',
          password: 'password111'
        })
        .expect(302);

      expect(response.header.location).toBe('/');
    });

    /**
     * TEST ID: AU_008
     * Chức năng: Login failed - empty credentials
     * Mô tả: Kiểm tra login thất bại khi cung cấp credentials rỗng
     * Precondition: N/A
     * Input:
     *   - email: "" (rỗng)
     *   - password: "" (rỗng)
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Redirect back (validation error)
     */
    it('AU_008 - should fail with empty credentials', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: '',
          password: ''
        })
        .expect(302);

      // Should redirect back with validation error
      expect(response.header.location).toBe('back');
    });

    /**
     * TEST ID: AU_009
     * Chức năng: Login failed - invalid email format
     * Mô tả: Kiểm tra login thất bại khi email không đúng format
     * Precondition: N/A
     * Input:
     *   - email: "not-an-email" (không có @)
     *   - password: "password123"
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Redirect back (validation error)
     */
    it('AU_009 - should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({
          email: 'not-an-email',  // Invalid format
          password: 'password123'
        })
        .expect(302);

      expect(response.header.location).toBe('back');
    });

  });

  // ===== LOGOUT PROCESS =====
  describe('Logout Process - GET /admin/auth/logout', () => {
    
    /**
     * TEST ID: AU_011
     * Chức năng: User logout
     * Mô tả: Kiểm tra logout - xóa token và redirect
     * Precondition: User đã login (có token)
     * Input: GET /admin/auth/logout
     * Expected:
     *   - Status code: 302 (redirect)
     *   - Cookie token bị xóa (token=;)
     *   - Redirect to /admin/auth/login
     */
    it('AU_011 - should clear token cookie and redirect to login', async () => {
      const response = await request(app)
        .get('/admin/auth/logout')
        .expect(302);

      // Verify token cookie cleared
      expect(response.header['set-cookie']).toBeDefined();
      expect(response.header['set-cookie'][0]).toContain('token=;');
      
      // Verify redirect to login page
      expect(response.header.location).toContain('/admin/auth/login');
    });

  });

});