const rolesController = require('../controllers/admin/roles.controller');
const Role = require('../model/roles.model');

jest.mock('../model/roles.model');

describe('Roles Controller', () => {
    let mockRequest;
    let mockResponse;

    // Test setup
    // Purpose: Initialize mock request and response objects before each test
    // Input: None
    // Expected: Fresh mock objects for each test
    beforeEach(() => {
        mockRequest = {
            body: {},
            params: {},
            flash: jest.fn()
        };
        mockResponse = {
            render: jest.fn(),
            redirect: jest.fn(),
            locals: {}
        };
        jest.clearAllMocks();
    });

    describe('index', () => {
        // Test case: Render roles list page
        // Purpose: Verify that the index method correctly renders the roles list
        // Input: None
        // Expected output: Render roles page with mock roles data
        // Note: Checks both find query and render parameters
        it('should render roles list', async () => {
            const mockRoles = [
                { _id: '1', name: 'Admin' },
                { _id: '2', name: 'Editor' }
            ];
            Role.find.mockResolvedValue(mockRoles);

            await rolesController.index(mockRequest, mockResponse);

            expect(Role.find).toHaveBeenCalledWith({ deleted: false });
            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/roles/index.pug',
                {
                    pageTitle: 'Trang nhóm quyền',
                    roles: mockRoles
                }
            );
        });
    });

    describe('createPost', () => {
        // Test case: Create new role
        // Purpose: Verify role creation functionality
        // Input: Role name and permissions in request body
        // Expected output: New role saved and redirect to roles page
        // Note: Validates both role creation and redirect behavior
        it('should create new role', async () => {
            mockRequest.body = {
                name: 'New Role',
                permissions: ['read', 'write']
            };

            const mockSave = jest.fn();
            Role.mockImplementation(() => ({
                save: mockSave
            }));

            await rolesController.createPost(mockRequest, mockResponse);

            expect(Role).toHaveBeenCalledWith(mockRequest.body);
            expect(mockSave).toHaveBeenCalled();
            expect(mockResponse.redirect).toHaveBeenCalledWith(expect.stringContaining('/roles'));
        });
    });

    describe('edit', () => {
        // Test case: Render edit page
        // Purpose: Verify edit page rendering with correct role data
        // Input: Role ID in request params
        // Expected output: Edit page rendered with role data
        // Note: Validates role lookup and page rendering
        it('should render edit page with role data', async () => {
            mockRequest.params.id = 'role1';
            const mockRole = { _id: 'role1', name: 'Admin' };

            Role.findOne.mockResolvedValue(mockRole);

            await rolesController.edit(mockRequest, mockResponse);

            expect(Role.findOne).toHaveBeenCalledWith({
                _id: 'role1',
                deleted: false
            });
            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/roles/edit',
                {
                    pageTitle: 'Sửa nhóm quyền',
                    role: mockRole
                }
            );
        });

        // Test case: Handle edit error
        // Purpose: Verify error handling in edit route
        // Input: Invalid role ID
        // Expected output: Redirect to roles page
        // Note: Tests error handling behavior
        it('should redirect on error', async () => {
            mockRequest.params.id = 'invalid';
            Role.findOne.mockRejectedValue(new Error('Not found'));

            await rolesController.edit(mockRequest, mockResponse);

            expect(mockResponse.redirect).toHaveBeenCalledWith(expect.stringContaining('/roles'));
        });
    });

    describe('permissionsPatch', () => {
        // Test case: Update multiple roles permissions
        // Purpose: Verify bulk permissions update functionality
        // Input: JSON string of role IDs and their permissions
        // Expected output: Permissions updated and success flash message
        // Note: Tests multiple role updates in single request
        it('should update permissions for multiple roles', async () => {
            mockRequest.body = {
                permissions: JSON.stringify([
                    { id: 'role1', permissions: ['read'] },
                    { id: 'role2', permissions: ['write'] }
                ])
            };

            Role.updateOne.mockResolvedValue({ modifiedCount: 1 });

            await rolesController.permissionsPatch(mockRequest, mockResponse);

            expect(Role.updateOne).toHaveBeenCalledTimes(2);
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });

        // Test case: Handle permissions update error
        // Purpose: Verify error handling in permissions update
        // Input: Invalid JSON string
        // Expected output: Error flash message and redirect
        // Note: Tests error handling for invalid input
        it('should handle errors during permissions update', async () => {
            mockRequest.body = {
                permissions: 'invalid-json'
            };

            await rolesController.permissionsPatch(mockRequest, mockResponse);

            expect(mockRequest.flash).toHaveBeenCalledWith('error', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });
    });
});