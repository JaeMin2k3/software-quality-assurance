const authController = require('../controllers/admin/auth.controller');
const Account = require('../model/accounts.model');
const md5 = require('md5');

jest.mock('../model/accounts.model');
jest.mock('md5');

describe('Auth Controller', () => {
    let mockRequest;
    let mockResponse;

    // Setup mock request and response objects before each test
    beforeEach(() => {
        mockRequest = {
            body: {},
            cookies: {},
            flash: jest.fn()
        };
        mockResponse = {
            render: jest.fn(),
            redirect: jest.fn(),
            cookie: jest.fn(),
            clearCookie: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('index (login page)', () => {
        // Test Case: Redirect to dashboard with valid token
        // Goal: Verify that users with valid tokens are redirected to dashboard
        // Input: Valid token in cookies
        // Expected Output: Redirect to dashboard page
        it('should redirect to dashboard if token exists', async () => {
            mockRequest.cookies.token = 'valid-token';

            await authController.index(mockRequest, mockResponse);

            expect(mockResponse.redirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
        });

        // Test Case: Render login page without token
        // Goal: Verify that users without tokens see the login page
        // Input: No token in cookies
        // Expected Output: Render login page with correct title
        it('should render login page if no token exists', async () => {
            await authController.index(mockRequest, mockResponse);

            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/auth/login.pug',
                expect.objectContaining({
                    pageTitle: 'Trang đăng nhập'
                })
            );
        });
    });

    describe('indexPost (login process)', () => {
        // Test Case: Non-existent email login attempt
        // Goal: Verify error handling for non-existent email
        // Input: Email that doesn't exist in database
        // Expected Output: Flash error message and redirect back
        // Note: Simulates database returning null for email lookup
        it('should show error for non-existent email', async () => {
            mockRequest.body = {
                email: 'nonexistent@example.com',
                password: 'password123'
            };
            Account.findOne.mockResolvedValue(null);

            await authController.indexPost(mockRequest, mockResponse);

            expect(mockRequest.flash).toHaveBeenCalledWith('error', 'Email không tồn tại');
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });

        // Test Case: Incorrect password login attempt
        // Goal: Verify error handling for wrong password
        // Input: Existing email with incorrect password
        // Expected Output: Flash error message and redirect back
        // Note: Uses md5 mock to simulate password mismatch
        it('should show error for incorrect password', async () => {
            mockRequest.body = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };
            const mockUser = {
                email: 'test@example.com',
                password: 'hashedCorrectPassword'
            };
            Account.findOne.mockResolvedValue(mockUser);
            md5.mockReturnValue('hashedWrongPassword');

            await authController.indexPost(mockRequest, mockResponse);

            expect(mockRequest.flash).toHaveBeenCalledWith('error', 'Mật khẩu không đúng');
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });

        // Test Case: Inactive account login attempt
        // Goal: Verify error handling for deactivated accounts
        // Input: Correct credentials but inactive account status
        // Expected Output: Flash error message and redirect back
        // Note: Account exists but has inactive status
        it('should show error for inactive account', async () => {
            mockRequest.body = {
                email: 'inactive@example.com',
                password: 'password123'
            };
            const mockUser = {
                email: 'inactive@example.com',
                password: 'hashedPassword',
                status: 'inactive'
            };
            Account.findOne.mockResolvedValue(mockUser);
            md5.mockReturnValue('hashedPassword');

            await authController.indexPost(mockRequest, mockResponse);

            expect(mockRequest.flash).toHaveBeenCalledWith('error', 'Tài khoản đã bị khóa');
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });

        // Test Case: Successful login
        // Goal: Verify successful login process
        // Input: Valid email, password, and active account
        // Expected Output: Set token cookie and redirect to dashboard
        // Note: Simulates complete successful authentication flow
        it('should login successfully with correct credentials', async () => {
            mockRequest.body = {
                email: 'active@example.com',
                password: 'correctpassword'
            };
            const mockUser = {
                email: 'active@example.com',
                password: 'hashedPassword',
                status: 'active',
                token: 'valid-token'
            };
            Account.findOne.mockResolvedValue(mockUser);
            md5.mockReturnValue('hashedPassword');

            await authController.indexPost(mockRequest, mockResponse);

            expect(mockResponse.cookie).toHaveBeenCalledWith('token', 'valid-token');
            expect(mockResponse.redirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
        });
    });

    describe('logout', () => {
        // Test Case: User logout
        // Goal: Verify logout functionality
        // Input: None (just logout request)
        // Expected Output: Clear token cookie and redirect to login
        // Note: Ensures proper session termination
        it('should clear cookie and redirect to login page', async () => {
            await authController.logout(mockRequest, mockResponse);

            expect(mockResponse.clearCookie).toHaveBeenCalledWith('token');
            expect(mockResponse.redirect).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
        });
    });
});