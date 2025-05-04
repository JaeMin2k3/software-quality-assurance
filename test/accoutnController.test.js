

const accountsController = require('../controllers/admin/accounts.controller');
const Account = require('../model/accounts.model');
const Role = require('../model/roles.model'); 
const md5 = require('md5');

// Mock the dependencies
jest.mock('../model/accounts.model');
jest.mock('../model/roles.model');
jest.mock('md5');

/**
 * Test Suite: Accounts Controller
 * Tests the account management functionality including CRUD operations
 */
describe('Accounts Controller', () => {
    let mockRequest;
    let mockResponse;

    // Common test setup
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

    /**
     * Test: Index Page Rendering
     * Goal: Verify accounts list page renders with correct roles
     * Input: None
     * Expected: Renders index.pug with accounts and roles data
     */
    describe('index', () => {
        it('should render accounts list with roles', async () => {
            // Test data setup
            const mockAccounts = [{ _id: '1', role_id: 'role1' }];
            const mockRole = { _id: 'role1', name: 'admin' };

            // Mock responses
            Account.find().select.mockResolvedValue(mockAccounts);
            Role.findOne.mockResolvedValue(mockRole);

            await accountsController.index(mockRequest, mockResponse);

            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/accounts/index.pug',
                expect.objectContaining({
                    pageTitle: expect.any(String),
                    accounts: expect.arrayContaining([
                        expect.objectContaining({
                            role: mockRole
                        })
                    ])
                })
            );
        });
    });

    /**
     * Test: Create Account Page
     * Goal: Verify create account page renders properly
     * Input: None
     * Expected: Renders create.pug with roles list
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
     * Test: Account Creation Process
     * Goal: Verify account creation validation and processing
     */
    describe('createPost', () => {
        /**
         * Test Case: Email Duplicate Check
         * Input: Existing email
         * Expected: Error flash message and redirect back
         */
        it('should not create account if email exists', async () => {
            mockRequest.body = { email: 'test@test.com' };
            Account.findOne.mockResolvedValue({ email: 'test@test.com' });

            await accountsController.createPost(mockRequest, mockResponse);

            expect(mockRequest.flash).toHaveBeenCalledWith('error', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });

        /**
         * Test Case: Successful Account Creation
         * Input: New email and password
         * Expected: Account created and redirected
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
    });

    /**
     * Test: Edit Account Page
     * Goal: Verify edit account functionality
     */
    describe('edit', () => {
        /**
         * Test Case: Successful Edit Page Load
         * Input: Valid account ID
         * Expected: Renders edit page with account data
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
         * Test Case: Error Handling
         * Input: Invalid account ID
         * Expected: Redirects on error
         */
        it('should redirect on error', async () => {
            mockRequest.params.id = 'invalid';
            Account.findOne.mockRejectedValue(new Error('Not found'));

            await accountsController.edit(mockRequest, mockResponse);

            expect(mockResponse.redirect).toHaveBeenCalled();
        });
    });

    /**
     * Test: Account Update Process
     * Goal: Verify account update validation and processing
     */
    describe('editPatch', () => {
        /**
         * Test Case: Email Conflict Check
         * Input: Email that exists for different account
         * Expected: Error flash message and redirect
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
         * Test Case: Successful Password Update
         * Input: Valid account ID and new password
         * Expected: Password updated and success message
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