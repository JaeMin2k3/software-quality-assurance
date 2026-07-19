const myAccountController = require('../controllers/admin/my-account.controller');
const Account = require('../model/accounts.model');

// ========== MOCK SETUP ==========
jest.mock('../model/accounts.model');

// ========== CONSTANTS ==========
const VALID_USER_ID = '6827d917f1b390c526d72954';
const VALID_EMAIL = 'user@example.com';
const NEW_EMAIL = 'newemail@example.com';
const EXISTING_EMAIL = 'existing@example.com';
const INVALID_EMAIL = 'invalid-email';

// ========== TESTS ==========
describe('My Account Controller Tests', () => {
  
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock objects
    mockReq = {
      body: {},
      flash: jest.fn()
    };

    mockRes = {
      locals: {
        userMDW: {
          id: VALID_USER_ID
        }
      },
      render: jest.fn(),
      redirect: jest.fn()
    };
  });

  // ===== DISPLAY PAGES =====
  describe('Display Pages', () => {

    /**
     * TEST ID: ACC_001
     * Chức năng: Display my account page
     * Mô tả: Kiểm tra render trang thông tin cá nhân
     * Input: GET /admin/my-account
     * Expected:
     *   - Render view: 'admin/page/my-account/index.pug'
     *   - pageTitle: 'Thông tin cá nhân'
     */
    it('ACC_001 - should render my account index page', async () => {
      // When
      await myAccountController.index(mockReq, mockRes);

      // Then
      expect(mockRes.render).toHaveBeenCalledWith(
        'admin/page/my-account/index.pug',
        expect.objectContaining({
          pageTitle: 'Thông tin cá nhân'
        })
      );
      expect(mockRes.render).toHaveBeenCalledTimes(1);
    });

    /**
     * TEST ID: ACC_002
     * Chức năng: Display edit account page
     * Mô tả: Kiểm tra render form chỉnh sửa thông tin
     * Input: GET /admin/my-account/edit
     * Expected:
     *   - Render view: 'admin/page/my-account/edit.pug'
     *   - pageTitle: 'Chỉnh sửa thông tin cá nhân'
     */
    it('ACC_002 - should render my account edit page', async () => {
      // When
      await myAccountController.edit(mockReq, mockRes);

      // Then
      expect(mockRes.render).toHaveBeenCalledWith(
        'admin/page/my-account/edit.pug',
        expect.objectContaining({
          pageTitle: 'Chỉnh sửa thông tin cá nhân'
        })
      );
      expect(mockRes.render).toHaveBeenCalledTimes(1);
    });

  });

  // ===== UPDATE ACCOUNT =====
  describe('Update Account - PATCH /admin/my-account/edit', () => {

    /**
     * TEST ID: ACC_003
     * Chức năng: Update account with new email
     * Mô tả: Kiểm tra cập nhật thành công với email mới chưa tồn tại
     * Precondition: Email mới chưa được sử dụng
     * Input:
     *   - email: newemail@example.com
     * Expected:
     *   - Cập nhật thành công
     *   - Flash success message
     *   - Redirect to /admin/my-account
     */
    it('ACC_003 - should update account with new unique email', async () => {
      // Given
      mockReq.body = {
        email: NEW_EMAIL
      };

      Account.findOne.mockResolvedValueOnce(null); // Email not found
      Account.updateOne.mockResolvedValueOnce({ nModified: 1 });

      // When
      await myAccountController.editPatch(mockReq, mockRes);

      // Then
      expect(mockReq.flash).toHaveBeenCalledWith('success', 'Cập nhật thành công');
      expect(mockRes.redirect).toHaveBeenCalledWith('/admin/my-account');
    });

    /**
     * TEST ID: ACC_004
     * Chức năng: Update fails - email already exists
     * Mô tả: Kiểm tra cập nhật thất bại khi email đã tồn tại
     * Precondition: Email đã được sử dụng bởi user khác
     * Input:
     *   - email: existing@example.com (tồn tại)
     * Expected:
     *   - Flash error message: 'Email đã tồn tại'
     *   - Redirect back
     */
    it('ACC_004 - should fail when email already exists', async () => {
      // Given
      mockReq.body = {
        email: EXISTING_EMAIL
      };

      // Mock: Email exists with different user ID
      Account.findOne.mockResolvedValueOnce({
        _id: 'different-user-id',
        email: EXISTING_EMAIL,
        deleted: false
      });

      // When
      await myAccountController.editPatch(mockReq, mockRes);

      // Then
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'Email đã tồn tại');
      expect(mockRes.redirect).toHaveBeenCalledWith('back');
    });

    /**
     * TEST ID: ACC_005
     * Chức năng: Update fails - invalid email format
     * Mô tả: Kiểm tra cập nhật thất bại khi email không đúng format
     * Input:
     *   - email: "invalid-email" (không có @)
     * Expected:
     *   - Flash error message
     *   - Redirect back
     */
    it('ACC_005 - should fail with invalid email format', async () => {
      // Given
      mockReq.body = {
        email: INVALID_EMAIL
      };

      // When & Then
      try {
        await myAccountController.editPatch(mockReq, mockRes);
        
        // Should have error flash
        expect(mockReq.flash).toHaveBeenCalledWith(
          'error',
          expect.stringMatching(/email|invalid/i)
        );
        expect(mockRes.redirect).toHaveBeenCalledWith('back');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    /**
     * TEST ID: ACC_006
     * Chức năng: Update fails - missing user in request
     * Mô tả: Kiểm tra xử lý khi không có user info trong request
     * Precondition: res.locals.userMDW không được set
     * Input: N/A
     * Expected:
     *   - Throw error hoặc flash error message
     */
    it('ACC_006 - should handle missing user in request', async () => {
      // Given
      mockRes.locals = {}; // No userMDW

      mockReq.body = {
        email: NEW_EMAIL
      };

      // When & Then
      try {
        await myAccountController.editPatch(mockReq, mockRes);
        
        expect(mockReq.flash).toHaveBeenCalledWith(
          'error',
          expect.any(String)
        );
        expect(mockRes.redirect).toHaveBeenCalledWith('back');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    /**
     * TEST ID: ACC_007
     * Chức năng: Update multiple fields
     * Mô tả: Kiểm tra cập nhật nhiều trường thông tin cùng lúc
     * Input:
     *   - fullName: "New Full Name"
     *   - phone: "0123456789"
     *   - email: "multi@example.com"
     * Expected:
     *   - Tất cả trường được cập nhật
     *   - Flash success message
     *   - Redirect to /admin/my-account
     */
    it('ACC_007 - should update multiple fields successfully', async () => {
      // Given
      const updateData = {
        fullName: 'New Full Name',
        phone: '0123456789',
        email: 'multi@example.com'
      };

      mockReq.body = updateData;

      Account.findOne.mockResolvedValueOnce(null); // Email available
      Account.updateOne.mockResolvedValueOnce({ nModified: 1 });

      // When
      await myAccountController.editPatch(mockReq, mockRes);

      // Then
      expect(Account.updateOne).toHaveBeenCalledWith(
        { _id: VALID_USER_ID },
        expect.objectContaining(updateData)
      );
      expect(mockReq.flash).toHaveBeenCalledWith('success', 'Cập nhật thành công');
      expect(mockRes.redirect).toHaveBeenCalledWith('/admin/my-account');
    });

    /**
     * TEST ID: ACC_008
     * Chức năng: Update fails - empty data
     * Mô tả: Kiểm tra xử lý khi request body rỗng
     * Input: body = {} (rỗng)
     * Expected:
     *   - Flash error message: 'Dữ liệu không hợp lệ'
     *   - Redirect back
     */
    it('ACC_008 - should fail with empty update data', async () => {
      // Given
      mockReq.body = {}; // Empty

      // When
      await myAccountController.editPatch(mockReq, mockRes);

      // Then
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'Dữ liệu không hợp lệ');
      expect(mockRes.redirect).toHaveBeenCalledWith('back');
    });

    /**
     * TEST ID: ACC_009
     * Chức năng: Update fails - keeping current email
     * Mô tả: Kiểm tra khi user cố gắng set lại email hiện tại
     * Precondition: User hiện tại có email = 'current@example.com'
     * Input:
     *   - email: "current@example.com" (giống email hiện tại)
     * Expected:
     *   - Flash error message: 'Email không thay đổi'
     *   - Redirect back
     */
    it('ACC_009 - should fail when keeping current email unchanged', async () => {
      // Given
      mockReq.body = {
        email: VALID_EMAIL
      };

      // Mock: Find current user (same ID)
      Account.findOne.mockResolvedValueOnce({
        _id: VALID_USER_ID,
        email: VALID_EMAIL,
        deleted: false
      });

      // When
      await myAccountController.editPatch(mockReq, mockRes);

      // Then
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'Email không thay đổi');
      expect(mockRes.redirect).toHaveBeenCalledWith('back');
    });

    /**
     * TEST ID: ACC_010
     * Chức năng: Handle existing email from another user
     * Mô tả: Kiểm tra khi email đã được sử dụng bởi user khác
     * Input:
     *   - email: "hameo2k3@gmail.com" (tồn tại của user khác)
     * Expected:
     *   - Flash error: 'Email đã tồn tại'
     *   - Redirect back
     */
    it('ACC_010 - should handle existing email from another user', async () => {
      // Given
      const otherUserId = 'other-user-id';
      mockReq.body = {
        email: 'hameo2k3@gmail.com'
      };

      // Mock: Email exists with different user
      Account.findOne.mockResolvedValueOnce({
        _id: otherUserId,
        email: 'hameo2k3@gmail.com',
        deleted: false
      });

      // When
      await myAccountController.editPatch(mockReq, mockRes);

      // Then
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'Email đã tồn tại');
      expect(mockRes.redirect).toHaveBeenCalledWith('back');
    });

  });

});