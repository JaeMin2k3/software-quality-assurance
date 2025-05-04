const productsController = require('../controllers/admin/products.controller');
const Product = require('../model/products.model');
const ProductCategory = require('../model/products-category.model');
const Brand = require('../model/brands.model');

jest.mock('../model/products.model');
jest.mock('../model/products-category.model');
jest.mock('../model/brands.model');

describe('Products Controller', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        mockRequest = {
            query: {},
            params: {},
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
        /**
         * Test case: Render products list page
         * Purpose: Verify that the index function correctly renders the products list with pagination
         * Input: 
         *   - Empty request parameters
         *   - Mocked products data
         * Expected Output:
         *   - Renders 'admin/page/products/index.pug' template
         *   - Passes products list and page title to template
         * Notes: Includes mocking of Product.find() chain and countDocuments
         */
        it('should render products list with filters and pagination', async () => {
            const mockProducts = [
                { _id: '1', title: 'Product 1' },
                { _id: '2', title: 'Product 2' }
            ];

            Product.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        skip: jest.fn().mockResolvedValue(mockProducts)
                    })
                })
            });
            Product.countDocuments.mockResolvedValue(10);

            await productsController.index(mockRequest, mockResponse);

            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/products/index.pug',
                expect.objectContaining({
                    pageTitle: 'Trang san pham',
                    products: mockProducts
                })
            );
        });
    });

    describe('changeStatus', () => {
        /**
         * Test case: Update product status
         * Purpose: Verify that product status can be updated for a single product
         * Input:
         *   - Product ID: 'product123'
         *   - New status: 'active'
         * Expected Output:
         *   - Product.updateOne called with correct parameters
         *   - Success flash message displayed
         * Notes: Tests the status update functionality for individual products
         */
        it('should update product status', async () => {
            mockRequest.params = {
                status: 'active',
                id: 'product123'
            };

            await productsController.changeStatus(mockRequest, mockResponse);

            expect(Product.updateOne).toHaveBeenCalledWith(
                { _id: 'product123' },
                expect.objectContaining({
                    status: 'active'
                })
            );
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
        });
    });

    describe('changeMulti', () => {
        /**
         * Test case: Bulk status update
         * Purpose: Verify multiple products can have their status updated simultaneously
         * Input:
         *   - Product IDs: '1, 2, 3'
         *   - Status type: 'active'
         * Expected Output:
         *   - Product.updateMany called with correct array of IDs
         *   - Success flash message displayed
         * Notes: Tests bulk update functionality for multiple products at once
         */
        it('should handle bulk status updates', async () => {
            mockRequest.body = {
                type: 'active',
                ids: '1, 2, 3'
            };

            await productsController.changeMulti(mockRequest, mockResponse);

            expect(Product.updateMany).toHaveBeenCalledWith(
                { _id: { $in: ['1', '2', '3'] } },
                expect.objectContaining({
                    status: 'active'
                })
            );
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
        });
    });

    describe('create', () => {
        /**
         * Test case: Render create product form
         * Purpose: Verify the create product form renders with necessary data
         * Input:
         *   - Mocked categories and brands data
         * Expected Output:
         *   - Renders 'admin/page/products/create' template
         *   - Passes brands and page title to template
         * Notes: Tests proper loading of dependent data (categories and brands)
         */
        it('should render create product form with required data', async () => {
            const mockCategories = [{ _id: '1', name: 'Category 1' }];
            const mockBrands = [{ _id: '1', name: 'Brand 1' }];

            ProductCategory.find.mockResolvedValue(mockCategories);
            Brand.find.mockResolvedValue(mockBrands);

            await productsController.create(mockRequest, mockResponse);

            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/products/create',
                expect.objectContaining({
                    pageTitle: 'Thêm mới sản phẩm',
                    brands: mockBrands
                })
            );
        });
    });

    describe('createPost', () => {
        /**
         * Test case: Create new product
         * Purpose: Verify new product creation with proper data transformation
         * Input:
         *   - Price: '100'
         *   - Discount: '10'
         *   - Stock: '50'
         *   - Size: '40,41,42'
         * Expected Output:
         *   - Price converted to number
         *   - Size string converted to array
         *   - Product saved successfully
         *   - Redirect after creation
         * Notes: Tests data type conversion and successful product creation
         */
        it('should create new product with correct data', async () => {
            mockRequest.body = {
                price: '100',
                discountPercentage: '10',
                stock: '50',
                size: '40,41,42'
            };

            const mockSave = jest.fn();
            Product.mockImplementation(() => ({
                save: mockSave
            }));
            Product.countDocuments.mockResolvedValue(5);

            await productsController.createPost(mockRequest, mockResponse);

            expect(mockRequest.body.price).toBe(100);
            expect(mockRequest.body.size).toEqual([40, 41, 42]);
            expect(mockSave).toHaveBeenCalled();
            expect(mockResponse.redirect).toHaveBeenCalled();
        });
    });
});