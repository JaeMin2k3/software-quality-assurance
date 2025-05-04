const myAccountController = require('../controllers/admin/my-account.controller');
const Account = require('../model/accounts.model');

jest.mock('../model/accounts.model');

describe('My Account Controller', () => {
    let mockRequest;
    let mockResponse;

    // Test setup
    // Purpose: Initialize mock objects before each test
    // Input: None
    // Expected: Fresh mock objects for each test case
    beforeEach(() => {
        mockRequest = {
            body: {},
            flash: jest.fn()
        };
        mockResponse = {
            render: jest.fn(),
            redirect: jest.fn(),
            locals: {
                userMDW: {
                    id: 'user123'
                }
            }
        };
        jest.clearAllMocks();
    });

    describe('index', () => {
        // Test case: Render account page
        // Purpose: Verify index route renders correct template
        // Input: Mock request and response objects
        // Expected: Renders index.pug with correct page title
        it('should render my account page', async () => {
            await myAccountController.index(mockRequest, mockResponse);

            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/my-account/index.pug',
                {
                    pageTitle: 'Thông tin cá nhân'
                }
            );
        });
    });

    describe('edit', () => {
        // Test case: Render edit page
        // Purpose: Verify edit route renders correct template
        // Input: Mock request and response objects
        // Expected: Renders edit.pug with correct page title
        it('should render edit page', async () => {
            await myAccountController.edit(mockRequest, mockResponse);

            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/my-account/edit.pug',
                {
                    pageTitle: 'Chỉnh sửa thông tin cá nhân'
                }
            );
        });
    });

    describe('editPatch', () => {
        // Test case: Email already exists
        // Purpose: Verify duplicate email validation
        // Input: Email that exists for different user
        // Expected: Error flash message and redirect back
        // Note: Tests email uniqueness constraint
        it('should not update if email exists for different user', async () => {
            mockRequest.body = {
                email: 'existing@test.com'
            };
            Account.findOne.mockResolvedValue({ 
                _id: 'different-user',
                email: 'existing@test.com' 
            });

            await myAccountController.editPatch(mockRequest, mockResponse);

            expect(Account.findOne).toHaveBeenCalledWith({
                _id: { $ne: 'user123' },
                email: 'existing@test.com',
                deleted: false
            });
            expect(mockRequest.flash).toHaveBeenCalledWith('error', 'Email đã tồn tại');
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });

        // Test case: Successful account update
        // Purpose: Verify successful account information update
        // Input: New unique email and full name
        // Expected: Success flash message and redirect to my-account page
        // Note: Tests happy path for account updates
        it('should update account successfully if email is unique', async () => {
            mockRequest.body = {
                email: 'new@test.com',
                fullName: 'Updated Name'
            };
            Account.findOne.mockResolvedValue(null);
            Account.updateOne.mockResolvedValue({ modifiedCount: 1 });

            await myAccountController.editPatch(mockRequest, mockResponse);

            expect(Account.updateOne).toHaveBeenCalledWith(
                { _id: 'user123' },
                mockRequest.body
            );
            expect(mockRequest.flash).toHaveBeenCalledWith('success', 'Cập nhật thành công');
            expect(mockResponse.redirect).toHaveBeenCalledWith(expect.stringContaining('/my-account'));
        });
    });
});