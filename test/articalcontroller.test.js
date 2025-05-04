const articalController = require('../controllers/admin/artical.controller');
const Artical = require('../model/artical.model');
const ArticalCategory = require('../model/artical-categoty.model');

// Mock the dependencies
jest.mock('../model/artical.model');
jest.mock('../model/artical-categoty.model');

/**
 * Test suite for Article Controller
 * Sets up mock request and response objects before each test
 */
describe('Artical Controller', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        mockRequest = {
            body: {},
            flash: jest.fn()
        };
        mockResponse = {
            render: jest.fn(),
            redirect: jest.fn()
        };
        // Reset mocks
        jest.clearAllMocks();
    });

    /**
     * Test suite for index method
     * Purpose: Verify article list rendering functionality
     */
    describe('index', () => {
        /**
         * Test case: Should render articles list
         * Input: None (uses mocked article data)
         * Expected Output: 
         * - Calls find() with {deleted: false}
         * - Renders index.pug with correct page title and articles
         * Mock Data: Two sample articles with IDs and titles
         */
        it('should render articles list', async () => {
            const mockArticles = [
                { _id: '1', title: 'Article 1' },
                { _id: '2', title: 'Article 2' }
            ];

            // Fix mock implementation
            Artical.find = jest.fn().mockResolvedValue(mockArticles);

            await articalController.index(mockRequest, mockResponse);

            expect(Artical.find).toHaveBeenCalledWith({ deleted: false });
            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/artical/index.pug',
                {
                    pageTitle: 'Bài viết',
                    articals: mockArticles
                }
            );
        });
    });

    /**
     * Test suite for create method
     * Purpose: Verify article creation page rendering
     */
    describe('create', () => {
        /**
         * Test case: Should render create page with categories
         * Input: None (uses mocked category data)
         * Expected Output:
         * - Calls find() with {deleted: false}
         * - Renders create.pug with correct page title and categories
         * Mock Data: Two sample categories with IDs and titles
         */
        it('should render create page with categories', async () => {
            const mockCategories = [
                { _id: '1', title: 'Category 1' },
                { _id: '2', title: 'Category 2' }
            ];

            // Fix mock implementation
            ArticalCategory.find = jest.fn().mockResolvedValue(mockCategories);

            await articalController.create(mockRequest, mockResponse);

            expect(ArticalCategory.find).toHaveBeenCalledWith({ deleted: false });
            expect(mockResponse.render).toHaveBeenCalledWith(
                'admin/page/artical/create.pug',
                {
                    pageTitle: 'Thêm bài viết',
                    categorys: mockCategories
                }
            );
        });
    });

    /**
     * Test suite for createPost method
     * Purpose: Verify article creation functionality
     */
    describe('createPost', () => {
        /**
         * Test case: Auto-increment position for non-numeric position input
         * Input: Article with title and invalid position
         * Expected Output:
         * - Automatically assigns position (current count + 1)
         * - Saves article and shows success message
         * - Redirects after creation
         * Note: Position is calculated based on existing articles count
         */
        it('should create article with auto-increment position when position is not a number', async () => {
            mockRequest.body = {
                title: 'New Article',
                positon: 'not a number'
            };

            // Fix mock implementations
            const mockSave = jest.fn().mockResolvedValue({});
            Artical.countDocuments = jest.fn().mockResolvedValue(5);
            Artical.prototype.save = mockSave;

            await articalController.createPost(mockRequest, mockResponse);

            expect(Artical.countDocuments).toHaveBeenCalled();
            expect(mockRequest.body.position).toBe(6);
            expect(mockSave).toHaveBeenCalled();
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalled();
        });

        /**
         * Test case: Use provided numeric position
         * Input: Article with title and valid numeric position
         * Expected Output:
         * - Uses provided position value
         * - Saves article and shows success message
         * - Redirects after creation
         * Note: No position calculation needed when valid position provided
         */
        it('should create article with provided position when position is a number', async () => {
            mockRequest.body = {
                title: 'New Article',
                positon: '10'
            };

            // Fix mock implementation
            const mockSave = jest.fn().mockResolvedValue({});
            Artical.prototype.save = mockSave;

            await articalController.createPost(mockRequest, mockResponse);

            expect(mockRequest.body.position).toBe(10);
            expect(mockSave).toHaveBeenCalled();
            expect(mockRequest.flash).toHaveBeenCalledWith('success', expect.any(String));
            expect(mockResponse.redirect).toHaveBeenCalled();
        });
    });
});