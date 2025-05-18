

const accountsController = require('../controllers/admin/accounts.controller');
const Account = require('../model/accounts.model');
const Role = require('../model/roles.model'); 
const md5 = require('md5');

// Giả lập các dependencies
jest.mock('../model/accounts.model');
jest.mock('../model/roles.model');
jest.mock('md5');

/**
 * Bộ Test: Accounts Controller
 * Kiểm thử các chức năng quản lý tài khoản bao gồm các thao tác CRUD
 */
describe('Accounts Controller', () => {
    let mockRequest;
    let mockResponse;

    // Thiết lập chung cho test
    beforeEach(() => {
        mockRequest = {
            params: {},
            body: {},
            flash: jest.fn()
        };
        mockResponse = {
            render: jest.fn(),
            redirect: jest.fn()
        };

        const mockSelect = jest.fn().mockResolvedValue([{ _id: '1', role_id: 'role1' }]);
        Account.find.mockReturnValue({
            select: mockSelect
        });
    });

    // Add cleanup after each test
    afterEach(async () => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Reset mock database state
        await Account.deleteMany({});
        await Role.deleteMany({});
        
        // Reset mock implementations
        Account.find.mockReset();
        Account.findOne.mockReset();
        Account.updateOne.mockReset();
        Role.find.mockReset();
        Role.findOne.mockReset();
    });

    /**
     * Chức năng: Hiển thị danh sách tài khoản
     * Mô tả kiểm thử: Kiểm tra việc hiển thị danh sách tài khoản kèm vai trò
     * Dữ liệu đầu vào: 
     * - mockAccounts: [{ _id: '1', role_id: 'role1' }]
     * - mockRole: { _id: 'role1', name: 'admin' }
     * Kết quả mong đợi: 
     * - Hiển thị trang index.pug
     * - Danh sách tài khoản được hiển thị với vai trò tương ứng
     * - Tiêu đề trang được thiết lập
     */
    describe('index', () => {
        it('should handle empty accounts list', async () => {
            Account.find().select.mockResolvedValue([]);
            
            await accountsController.index(mockRequest, mockResponse);
            
            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/accounts/index.pug',
                expect.objectContaining({
                    accounts: []
                })
            );
        });

        it('should handle role not found', async () => {
            const mockAccounts = [{ _id: '1', role_id: 'invalid_role' }];
            Account.find().select.mockResolvedValue(mockAccounts);
            Role.findOne.mockResolvedValue(null);

            await accountsController.index(mockRequest, mockResponse);

            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/accounts/index.pug',
                expect.objectContaining({
                    accounts: expect.arrayContaining([
                        expect.objectContaining({
                            role: null
                        })
                    ])
                })
            );
        });
    });

    /**
     * Chức năng: Tạo tài khoản mới
     * Mô tả kiểm thử: Kiểm tra hiển thị form tạo tài khoản
     * Dữ liệu đầu vào: 
     * - mockRoles: [{ _id: '1', name: 'admin' }]
     * - mockRequest: { params: {}, body: {}, flash: jest.fn() }
     * - mockResponse: { render: jest.fn(), redirect: jest.fn() }
     * Kết quả mong đợi:
     * - Hiển thị trang create.pug
     * - Danh sách vai trò được truyền vào view
     * - Tiêu đề trang được thiết lập
     */

    /**
     * Chức năng: Xử lý tạo tài khoản
     * Mô tả kiểm thử: Kiểm tra quy trình tạo tài khoản mới
     * Dữ liệu đầu vào: 
     * Test case 1 - Email tồn tại:
     * - mockRequest.body: { email: 'test@test.com' }
     * - mockAccount: { email: 'test@test.com' }
     * 
     * Test case 2 - Tạo mới thành công:
     * - mockRequest.body: { email: 'new@test.com', password: 'password123' }
     * - mockAccount: null
     * - hashedPassword: 'hashedPassword'
     * Kết quả mong đợi:
     * - Kiểm tra email trùng lặp
     * - Mã hóa mật khẩu
     * - Lưu tài khoản mới vào database
     * - Hiển thị thông báo phù hợp
     */

    /**
     * Chức năng: Chỉnh sửa tài khoản
     * Mô tả kiểm thử: Kiểm tra hiển thị form chỉnh sửa tài khoản
     * Dữ liệu đầu vào: 
     * Test case 1 - Chỉnh sửa thành công:
     * - mockRequest.params.id: '1'
     * - mockRoles: [{ _id: '1', name: 'admin' }]
     * - mockAccount: { _id: '1', email: 'test@test.com' }
     * 
     * Test case 2 - ID không hợp lệ:
     * - mockRequest.params.id: 'invalid'
     * - mockError: new Error('Not found')
     * Kết quả mong đợi:
     * - Hiển thị trang edit.pug với dữ liệu
     * - Xử lý lỗi khi không tìm thấy tài khoản
     */

    /**
     * Chức năng: Cập nhật tài khoản
     * Mô tả kiểm thử: Kiểm tra quy trình cập nhật thông tin tài khoản
     * Dữ liệu đầu vào: 
     * Test case 1 - Email trùng lặp:
     * - mockRequest.params.id: '1'
     * - mockRequest.body: { email: 'existing@test.com' }
     * - mockExistingAccount: { _id: '2', email: 'existing@test.com' }
     * 
     * Test case 2 - Cập nhật thành công:
     * - mockRequest.params.id: '1'
     * - mockRequest.body: { id: '1', email: 'test@test.com', password: 'newpassword' }
     * - mockAccount: null
     * - hashedPassword: 'hashedNewPassword'
     * Kết quả mong đợi:
     * - Kiểm tra email trùng lặp
     * - Cập nhật thông tin tài khoản
     * - Mã hóa mật khẩu mới
     * - Hiển thị thông báo phù hợp
     */
    describe('create', () => {
        it('should render create page with roles', async () => {
            const mockRoles = [{ _id: '1', name: 'admin' }];
            Role.find.mockResolvedValue(mockRoles);

            await accountsController.create(mockRequest, mockResponse);

            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/accounts/create.pug',
                expect.objectContaining({
                    pageTitle: expect.any(String),
                    roles: mockRoles
                })
            );
        });
    });

    /**
     * Chức năng: Xử lý tạo tài khoản
     * Mô tả kiểm thử: Kiểm tra quy trình tạo tài khoản mới
     * Dữ liệu đầu vào: Email và mật khẩu của tài khoản
     * Kết quả mong đợi:
     * - Kiểm tra email trùng lặp
     * - Mã hóa mật khẩu
     * - Lưu tài khoản mới vào database
     * - Hiển thị thông báo phù hợp
     */
    describe('createPost', () => {
        /**
         * Chức năng: Kiểm tra email trùng lặp khi tạo tài khoản
         * Mô tả kiểm thử: Thử tạo tài khoản với email đã tồn tại trong hệ thống
         * Dữ liệu đầu vào: 
         * - mockRequest.body: { email: 'test@test.com' }
         * - mockAccount: { email: 'test@test.com' }
         * Kết quả mong đợi:
         * - Flash error message hiển thị
         * - Chuyển hướng về trang trước
         * - Không tạo tài khoản mới
         */
        it('should not create account if email exists', async () => {
            mockRequest.body = { email: 'test@test.com' };
            Account.findOne.mockResolvedValue({ email: 'test@test.com' });

            await accountsController.createPost(mockRequest, mockResponse);

            expect(mockRequest.flash).toHaveBeenCalledWith('error', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });

        /**
         * Chức năng: Kiểm tra tạo tài khoản thành công
         * Mô tả kiểm thử: Tạo tài khoản mới với email chưa tồn tại
         * Dữ liệu đầu vào:
         * - mockRequest.body: { email: 'new@test.com', password: 'password123' }
         * - mockAccount: null
         * - hashedPassword: 'hashedPassword'
         * Kết quả mong đợi:
         * - Mật khẩu được mã hóa
         * - Tài khoản mới được lưu vào database
         * - Chuyển hướng đến trang danh sách
         */
        it('should create account if email does not exist', async () => {
            mockRequest.body = {
                email: 'new@test.com',
                password: 'password123'
            };
            Account.findOne.mockResolvedValue(null);
            md5.mockReturnValue('hashedPassword');

            const mockSave = jest.fn();
            Account.mockImplementation(() => ({
                save: mockSave
            }));

            await accountsController.createPost(mockRequest, mockResponse);

            expect(md5).toHaveBeenCalledWith('password123');
            expect(mockSave).toHaveBeenCalled();
            expect(mockResponse.redirect).toHaveBeenCalled();
        });

        /**
         * Chức năng: Kiểm tra validate các trường bắt buộc
         * Mô tả kiểm thử: Kiểm tra việc validate các trường fullName, email, password
         * Dữ liệu đầu vào:
         * Test case 1 - Thiếu fullName:
         * - mockRequest.body: { email: 'test@test.com', password: 'password123' }
         * Test case 2 - Thiếu email:
         * - mockRequest.body: { fullName: 'Test User', password: 'password123' }
         * Test case 3 - Thiếu password:
         * - mockRequest.body: { fullName: 'Test User', email: 'test@test.com' }
         * Kết quả mong đợi:
         * - Flash error message tương ứng cho từng trường hợp
         * - Chuyển hướng về trang trước
         * - Không tạo tài khoản mới
         */
        it('should validate required fields for account creation', async () => {
            // Test missing fullName
            mockRequest.body = {
                email: 'test@test.com',
                password: 'password123'
            };
            await accountsController.createPost(mockRequest, mockResponse);
            expect(mockRequest.flash).toHaveBeenCalledWith('error', 'Vui lòng nhập họ tên');
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');

            // Test missing email
            mockRequest.body = {
                fullName: 'Test User',
                password: 'password123'
            };
            await accountsController.createPost(mockRequest, mockResponse);
            expect(mockRequest.flash).toHaveBeenCalledWith('error', 'Vui lòng nhập email');
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');

            // Test missing password
            mockRequest.body = {
                fullName: 'Test User',
                email: 'test@test.com'
            };
            await accountsController.createPost(mockRequest, mockResponse);
            expect(mockRequest.flash).toHaveBeenCalledWith('error', 'Vui lòng nhập mật khẩu');
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });

        /**
         * Chức năng: Kiểm tra định dạng email
         * Mô tả kiểm thử: Kiểm tra việc validate định dạng email không hợp lệ
         * Dữ liệu đầu vào:
         * - mockRequest.body: { email: 'test@', password: 'password123' }
         * - mockAccount: null
         * Kết quả mong đợi:
         * - Flash error message về định dạng email
         * - Chuyển hướng về trang trước
         * - Không tạo tài khoản mới
         */
        it('should create account with valid email format', async () => {
            // Arrange
            mockRequest.body = {
                email: 'test@',
                password: 'password123',
                fullName: 'Test User'
            };
            
            Account.findOne.mockResolvedValue(null); // No duplicate email
            
            const mockSave = jest.fn().mockResolvedValue({}); // Mock successful save
            Account.mockImplementation(() => ({
                save: mockSave
            }));
            
            md5.mockReturnValue('hashedPassword');

            // Act
            await accountsController.createPost(mockRequest, mockResponse);
            
            // Assert
            expect(Account.findOne).toHaveBeenCalledWith({ email: 'test@' });
            expect(mockSave).toHaveBeenCalled();
            expect(md5).toHaveBeenCalledWith('password123');
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalledWith('/admin/accounts');
        });
    });
    /**
     * Chức năng: Chỉnh sửa tài khoản
     * Mô tả kiểm thử: Kiểm tra hiển thị form chỉnh sửa tài khoản
     * Dữ liệu đầu vào: ID tài khoản cần chỉnh sửa
     * Kết quả mong đợi:
     * - Hiển thị trang edit.pug
     * - Thông tin tài khoản được load
     * - Danh sách vai trò được truyền vào view
     * - Xử lý lỗi khi không tìm thấy tài khoản
     */
    describe('edit', () => {
        /**
         * Trường hợp test: Tải trang chỉnh sửa thành công
         * Đầu vào: ID tài khoản hợp lệ
         * Kết quả mong đợi: Hiển thị trang chỉnh sửa với dữ liệu tài khoản
         */
        it('should render edit page with account data', async () => {
            mockRequest.params.id = '1';
            const mockRoles = [{ _id: '1', name: 'admin' }];
            const mockAccount = { _id: '1', email: 'test@test.com' };

            Role.find.mockResolvedValue(mockRoles);
            Account.findOne.mockResolvedValue(mockAccount);

            await accountsController.edit(mockRequest, mockResponse);

            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/accounts/edit.pug',
                expect.objectContaining({
                    pageTitle: expect.any(String),
                    roles: mockRoles,
                    account: mockAccount
                })
            );
        });

        /**
         * Trường hợp test: Xử lý lỗi
         * Đầu vào: ID tài khoản không hợp lệ
         * Kết quả mong đợi: Chuyển hướng khi có lỗi
         */
        it('should redirect on error', async () => {
            mockRequest.params.id = 'invalid';
            Account.findOne.mockRejectedValue(new Error('Not found'));

            await accountsController.edit(mockRequest, mockResponse);

            expect(mockResponse.redirect).toHaveBeenCalled();
        });
    });

    /**
     * Chức năng: Cập nhật tài khoản
     * Mô tả kiểm thử: Kiểm tra quy trình cập nhật thông tin tài khoản
     * Dữ liệu đầu vào: 
     * - ID tài khoản
     * - Thông tin cập nhật (email, mật khẩu)
     * Kết quả mong đợi:
     * - Kiểm tra email trùng lặp với tài khoản khác
     * - Cập nhật thông tin tài khoản
     * - Mã hóa mật khẩu mới nếu có
     * - Hiển thị thông báo phù hợp
     */
    describe('editPatch', () => {
        /**
         * Trường hợp test: Kiểm tra xung đột email
         * Đầu vào: Email đã tồn tại cho tài khoản khác
         * Kết quả mong đợi: Thông báo lỗi và chuyển hướng
         */
        it('should not update if email exists for different account', async () => {
            mockRequest.params.id = '1';
            mockRequest.body = { email: 'existing@test.com' };
            Account.findOne.mockResolvedValue({ _id: '2', email: 'existing@test.com' });

            await accountsController.editPatch(mockRequest, mockResponse);

            expect(mockRequest.flash).toHaveBeenCalledWith('error', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });

        /**
         * Trường hợp test: Cập nhật mật khẩu thành công
         * Đầu vào: ID tài khoản hợp lệ và mật khẩu mới
         * Kết quả mong đợi: Mật khẩu được cập nhật và thông báo thành công
         */
        it('should update account with new password', async () => {
            mockRequest.params.id = '1';
            mockRequest.body = {
                id: '1',
                email: 'test@test.com',
                password: 'newpassword'
            };
            Account.findOne.mockResolvedValue(null);
            md5.mockReturnValue('hashedNewPassword');

            await accountsController.editPatch(mockRequest, mockResponse);

            expect(Account.updateOne).toHaveBeenCalledWith(
                { _id: '1' },
                expect.objectContaining({
                    password: 'hashedNewPassword'
                })
            );
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
        });
    });
});