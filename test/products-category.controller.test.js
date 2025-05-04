const productsCategoryController = require('../controllers/admin/products-category.controller');
const ProductsCategory = require('../model/products-category.model');
const createTreeHelper = require('../helper/createTree');

jest.mock('../model/products-category.model');
jest.mock('../helper/createTree');

describe('Products Category Controller', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        mockRequest = {
            body: {},
            params: {},
            flash: jest.fn()
        };
        mockResponse = {
            render: jest.fn(),
            redirect: jest.fn(),
            locals: {
                roleMDW: {
                    permissions: ['products-category_create']
                }
            }
        };
        jest.clearAllMocks();
    });

    describe('index', () => {
        /**
         * Test case: Rendering categories list
         * Purpose: Verify that categories are rendered in tree structure
         * Input: 
         * - Mock categories array with 2 categories
         * - Mock tree structure
         * Expected Output:
         * - Render view with tree structure
         * - Correct page title and categories data
         * Notes: Tests the transformation from flat array to tree structure
         */
        it('should render categories list with tree structure', async () => {
            const mockCategories = [
                { _id: '1', title: 'Category 1' },
                { _id: '2', title: 'Category 2' }
            ];
            const mockTree = [{ id: '1', children: [] }];

            ProductsCategory.find.mockResolvedValue(mockCategories);
            createTreeHelper.tree.mockReturnValue(mockTree);

            await productsCategoryController.index(mockRequest, mockResponse);

            expect(ProductsCategory.find).toHaveBeenCalledWith({ deleted: false });
            expect(createTreeHelper.tree).toHaveBeenCalledWith(mockCategories, '');
            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/products-category/index.pug',
                {
                    pageTitle: 'Danh mục sản phẩm',
                    categorys: mockTree
                }
            );
        });
    });

    describe('createPost', () => {
        /**
         * Test case: Category creation with position
         * Purpose: Verify automatic position increment when creating category
         * Input:
         * - Category title
         * - Invalid position value
         * Expected Output:
         * - New category created with position = previous count + 1
         * Notes: Tests position auto-increment functionality
         */
        it('should create category with auto-increment position', async () => {
            mockRequest.body = {
                title: 'New Category',
                positon: 'not a number'
            };

            const mockSave = jest.fn();
            ProductsCategory.countDocuments.mockResolvedValue(5);
            ProductsCategory.mockImplementation(() => ({
                save: mockSave
            }));

            await productsCategoryController.createPost(mockRequest, mockResponse);

            expect(ProductsCategory.countDocuments).toHaveBeenCalled();
            expect(mockRequest.body.position).toBe(6);
            expect(mockSave).toHaveBeenCalled();
            expect(mockResponse.redirect).toHaveBeenCalled();
        });

        /**
         * Test case: Category creation permission check
         * Purpose: Verify that users without permission cannot create categories
         * Input: Empty permissions array
         * Expected Output: No category creation occurs
         * Notes: Tests permission-based access control
         */
        it('should not create category without permission', async () => {
            mockResponse.locals.roleMDW.permissions = [];
            
            await productsCategoryController.createPost(mockRequest, mockResponse);

            expect(ProductsCategory.countDocuments).not.toHaveBeenCalled();
            expect(mockResponse.redirect).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        /**
         * Test case: Category deletion with children
         * Purpose: Verify proper handling of category deletion including child categories
         * Input:
         * - Category ID
         * - Mock category with parent
         * - Mock child categories
         * Expected Output:
         * - All related categories marked as deleted
         * - Success message flashed
         * Notes: Tests cascading deletion functionality
         */
        it('should handle category deletion with children', async () => {
            mockRequest.params.id = 'category1';
            const mockCategory = { _id: 'category1', parent_id: 'parent1' };
            const mockChildren = [
                { id: 'child1', parent_id: 'category1' },
                { id: 'child2', parent_id: 'category1' }
            ];

            ProductsCategory.findOne.mockResolvedValue(mockCategory);
            ProductsCategory.find.mockResolvedValue(mockChildren);
            ProductsCategory.updateOne.mockResolvedValue({});

            await productsCategoryController.delete(mockRequest, mockResponse);

            expect(ProductsCategory.updateOne).toHaveBeenCalledTimes(3);
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });
    });

    describe('restore', () => {
        /**
         * Test case: Category restoration
         * Purpose: Verify that deleted categories can be restored
         * Input: Category ID to restore
         * Expected Output:
         * - Category marked as not deleted
         * - Success message flashed
         * Notes: Tests restoration functionality
         */
        it('should restore deleted category', async () => {
            mockRequest.params.id = 'category1';
            ProductsCategory.updateOne.mockResolvedValue({});

            await productsCategoryController.restore(mockRequest, mockResponse);

            expect(ProductsCategory.updateOne).toHaveBeenCalledWith(
                { _id: 'category1' },
                { deleted: false }
            );
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });
    });

    describe('changeStatus', () => {
        /**
         * Test case: Category status update
         * Purpose: Verify category status can be changed
         * Input:
         * - Category ID
         * - New status value
         * Expected Output:
         * - Category status updated
         * - Success message flashed
         * Notes: Tests status modification functionality
         */
        it('should update category status', async () => {
            mockRequest.params = {
                id: 'category1',
                status: 'active'
            };
            ProductsCategory.updateOne.mockResolvedValue({});

            await productsCategoryController.changeStatus(mockRequest, mockResponse);

            expect(ProductsCategory.updateOne).toHaveBeenCalledWith(
                { _id: 'category1' },
                { status: 'active' }
            );
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalledWith('back');
        });
    });
});