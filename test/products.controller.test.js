// test/products.test.js
const mongoose = require('mongoose'); // Cần để tạo ObjectId cho mock dữ liệu
const {
    index,
    changeStatus,
    changeMulti,
    deleteItem,
    create,
    createPost,
    deletedProducts,
    restore,
    edit,
    editPatch,
    detail
} = require('../controllers/admin/products.controller'); // Điều chỉnh đường dẫn đến controller của bạn

// Mock các module bên ngoài mà controller phụ thuộc vào
const Product = require('../model/products.model');
const productsCategory = require('../model/products-category.model');
const Account = require('../model/accounts.model');
const Role = require('../model/roles.model');
const Brand = require('../model/brands.model');

// Mock các helper functions
const filterStatusHelper = require('../helper/filterStatus');
const searchHelper = require('../helper/search');
const paginationHelper = require('../helper/pagination');
const createTreeHelper = require('../helper/createTree');

// Mock system config
const systemConfig = require('../config/system');

// --- Cấu hình Mock cho các Model Mongoose và phương thức của chúng ---
// Khi mock một module hoàn chỉnh, bạn cần đảm bảo các phương thức static được mock
// và constructor cũng được mock nếu bạn tạo instance (ví dụ: `new Product()`).
jest.mock('../model/products.model', () => {
    // Để mock các phương thức tĩnh (static methods) trực tiếp trên Model
    const mockProductModel = {
        countDocuments: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        updateOne: jest.fn(),
        updateMany: jest.fn(),
        // mockReturnThis() cho phép xâu chuỗi các lệnh như .sort().limit().skip()
        // Giá trị cuối cùng được giải quyết bởi .skip().mockResolvedValue()
        mockChainable: () => {
            const query = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn(), // Đây là điểm cuối của chuỗi sẽ được mockResolvedValue
            };
            mockProductModel.find.mockReturnValue(query);
            return query.skip; // Trả về hàm skip để gán giá trị cuối cùng
        }
    };
    // Mock constructor cho `new Product(data)`
    const MockProduct = jest.fn().mockImplementation((data) => {
        return {
            ...data,
            save: jest.fn(), // Mock phương thức `save` cho instance của Product
        };
    });
    // Trả về một đối tượng chứa cả các phương thức tĩnh và constructor
    // __esModule: true là cần thiết cho khả năng tương tác của module ES nếu được sử dụng
    return {
        __esModule: true,
        ...mockProductModel, // Các phương thức tĩnh
        default: MockProduct // Constructor
    };
});

jest.mock('../model/products-category.model', () => ({
    find: jest.fn(),
}));
jest.mock('../model/accounts.model', () => ({
    findOne: jest.fn(),
}));
jest.mock('../model/roles.model', () => ({
    findOne: jest.fn(),
}));
jest.mock('../model/brands.model', () => ({
    find: jest.fn(),
}));

// Mock các helper functions
jest.mock('../helper/filterStatus');
jest.mock('../helper/search');
jest.mock('../helper/pagination');
jest.mock('../helper/createTree');

// Mock system config (đảm bảo prefixAdmin được định nghĩa)
jest.mock('../config/system', () => ({
    prefixAdmin: '/admin'
}));

// Lấy tham chiếu đến MockProduct constructor từ module đã mock
const MockProductConstructor = require('../model/products.model').default;


describe('Admin Products Controller Tests', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        // Đặt lại tất cả các mock trước mỗi test
        jest.clearAllMocks();

        // Mock tiêu chuẩn cho đối tượng res
        mockRes = {
            render: jest.fn(),
            redirect: jest.fn(),
            locals: {
                userMDW: { id: 'testUserId' } // Mock người dùng cho các trường updatedBy, createdBy
            }
        };

        // Mock tiêu chuẩn cho đối tượng req (sẽ được điều chỉnh cho từng test)
        mockReq = {
            query: {},
            params: {},
            body: {},
            file: {},
            flash: jest.fn() // Controller sử dụng req.flash
        };

        // Mock giá trị trả về mặc định cho các helper functions
        filterStatusHelper.mockReturnValue([]); // Mặc định không có bộ lọc
        searchHelper.mockReturnValue({ keyword: '', regrex: null }); // Mặc định không tìm kiếm
        paginationHelper.mockReturnValue({ limitedItem: 5, skip: 0 }); // Mặc định phân trang
        createTreeHelper.tree.mockImplementation((items) => items); // Mặc định cây helper chỉ trả về các mục
    });

    // Hàm trợ giúp để tạo các sản phẩm mock
    const createMockProduct = (overrides = {}) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        title: 'Test Product',
        status: 'active',
        deleted: false,
        position: 1,
        price: 100,
        discountPercentage: 10,
        stock: 50,
        description: 'A test product.',
        thumbnail: '/images/test.jpg',
        product_category_id: new mongoose.Types.ObjectId().toString(),
        brand_id: new mongoose.Types.ObjectId().toString(),
        createBy: { accountId: 'creatorId', createdAt: new Date() },
        updatedBy: [],
        deletedBy: [],
        restoredBy: [],
        ...overrides
    });

    // Hàm trợ giúp để tạo các tài khoản mock
    const createMockAccount = (overrides = {}) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        fullName: 'Test User',
        email: 'test@example.com',
        role_id: new mongoose.Types.ObjectId().toString(),
        deleted: false,
        ...overrides
    });

    // Hàm trợ giúp để tạo các vai trò mock
    const createMockRole = (overrides = {}) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        title: 'Admin',
        deleted: false,
        ...overrides
    });

    // Hàm trợ giúp để tạo danh mục sản phẩm mock
    const createMockCategory = (overrides = {}) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        title: 'Category A',
        status: 'active',
        deleted: false,
        ...overrides
    });

    // Hàm trợ giúp để tạo thương hiệu mock
    const createMockBrand = (overrides = {}) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        title: 'Brand A',
        status: 'active',
        deleted: false,
        ...overrides
    });

    // --- [GET] /admin/products (index) ---
    describe('index', () => {
        // * Chức năng: Lấy danh sách sản phẩm.
        // * Mô tả kiểm thử: Hiển thị tất cả sản phẩm đang hoạt động, không bị xóa với phân trang và sắp xếp mặc định.
        // * Dữ liệu đầu vào: req.query = {}
        // * Kết quả mong đợi: Gọi Product.find với điều kiện deleted: false và status: "active", gọi res.render với danh sách sản phẩm và các đối tượng hỗ trợ.
        test('PASS: Should render all active products with default filters, pagination, and sorting', async () => {
            const mockProducts = [createMockProduct()];
            Product.countDocuments.mockResolvedValue(1);
            // Mock chuỗi gọi của Product.find().sort().limit().skip()
            Product.mockChainable().mockResolvedValue(mockProducts);

            filterStatusHelper.mockReturnValue([{}]);
            searchHelper.mockReturnValue({ keyword: '', regrex: null });
            paginationHelper.mockReturnValue({ limitedItem: 5, skip: 0 });

            await index(mockReq, mockRes);

            expect(filterStatusHelper).toHaveBeenCalledWith(mockReq.query);
            expect(searchHelper).toHaveBeenCalledWith(mockReq.query);
            expect(Product.countDocuments).toHaveBeenCalledWith({ deleted: false, status: "active" });
            expect(paginationHelper).toHaveBeenCalledWith(1, mockReq.query, 5);
            expect(Product.find).toHaveBeenCalledWith({ deleted: false, status: "active" });
            expect(Product.find().sort).toHaveBeenCalledWith({ position: "desc" }); // Sắp xếp mặc định
            expect(Product.find().limit).toHaveBeenCalledWith(5);
            expect(Product.find().skip).toHaveBeenCalledWith(0);
            expect(mockRes.render).toHaveBeenCalledWith('admin/page/products/index.pug', expect.any(Object));
            expect(mockRes.render.mock.calls[0][1].products).toEqual(mockProducts);
        });

        // * Chức năng: Lấy danh sách sản phẩm theo trạng thái.
        // * Mô tả kiểm thử: Hiển thị sản phẩm với trạng thái 'inactive'.
        // * Dữ liệu đầu vào: req.query = { status: 'inactive' }
        // * Kết quả mong đợi: Product.find được gọi với điều kiện status: 'inactive'.
        test('PASS: Should render products with status "inactive" when query parameter is provided', async () => {
            mockReq.query = { status: 'inactive' };
            const mockProducts = [createMockProduct({ status: 'inactive' })];
            Product.countDocuments.mockResolvedValue(1);
            Product.mockChainable().mockResolvedValue(mockProducts);

            await index(mockReq, mockRes);

            expect(Product.countDocuments).toHaveBeenCalledWith({ deleted: false, status: "inactive" });
            expect(Product.find).toHaveBeenCalledWith({ deleted: false, status: "inactive" });
            expect(mockRes.render.mock.calls[0][1].products).toEqual(mockProducts);
        });

        // * Chức năng: Lấy danh sách sản phẩm theo từ khóa tìm kiếm.
        // * Mô tả kiểm thử: Hiển thị sản phẩm khớp với từ khóa tìm kiếm.
        // * Dữ liệu đầu vào: req.query = { keyword: 'test' }
        // * Kết quả mong đợi: searchHelper được gọi và Product.find được gọi với regex cho title.
        test('PASS: Should render products filtered by keyword', async () => {
            mockReq.query = { keyword: 'test' };
            searchHelper.mockReturnValue({ keyword: 'test', regrex: /test/i });
            const mockProducts = [createMockProduct({ title: 'Test Product' })];
            Product.countDocuments.mockResolvedValue(1);
            Product.mockChainable().mockResolvedValue(mockProducts);

            await index(mockReq, mockRes);

            expect(searchHelper).toHaveBeenCalledWith(mockReq.query);
            expect(Product.countDocuments).toHaveBeenCalledWith({ deleted: false, title: /test/i });
            expect(Product.find).toHaveBeenCalledWith({ deleted: false, title: /test/i });
            expect(mockRes.render.mock.calls[0][1].products).toEqual(mockProducts);
            expect(mockRes.render.mock.calls[0][1].keyword).toBe('test');
        });

        // * Chức năng: Lấy danh sách sản phẩm với phân trang.
        // * Mô tả kiểm thử: Hiển thị sản phẩm trên trang thứ 2 với số lượng mục giới hạn.
        // * Dữ liệu đầu vào: req.query = { page: 2, limit: 10 }
        // * Kết quả mong đợi: paginationHelper được gọi và Product.find được gọi với skip và limitedItem chính xác (limitedItem là 5 do hardcode trong controller).
        test('PASS: Should render products with specific pagination', async () => {
            mockReq.query = { page: 2, limit: 10 };
            const mockProducts = [createMockProduct()];
            Product.countDocuments.mockResolvedValue(20);
            Product.mockChainable().mockResolvedValue(mockProducts);
            paginationHelper.mockReturnValue({ limitedItem: 5, skip: 10 }); // limitedItem là 5 do hardcode trong controller

            await index(mockReq, mockRes);

            expect(paginationHelper).toHaveBeenCalledWith(20, mockReq.query, 5);
            expect(Product.find().limit).toHaveBeenCalledWith(5);
            expect(Product.find().skip).toHaveBeenCalledWith(10);
            expect(mockRes.render.mock.calls[0][1].pagination.limitedItem).toBe(5);
            expect(mockRes.render.mock.calls[0][1].pagination.skip).toBe(10);
        });

        // * Chức năng: Lấy danh sách sản phẩm với sắp xếp tùy chỉnh.
        // * Mô tả kiểm thử: Hiển thị sản phẩm được sắp xếp theo 'price' giảm dần.
        // * Dữ liệu đầu vào: req.query = { sortKey: 'price', sortValue: 'desc' }
        // * Kết quả mong đợi: Product.find được gọi với sắp xếp { price: 'desc' }.
        test('PASS: Should render products with custom sorting', async () => {
            mockReq.query = { sortKey: 'price', sortValue: 'desc' };
            const mockProducts = [createMockProduct()];
            Product.countDocuments.mockResolvedValue(1);
            Product.mockChainable().mockResolvedValue(mockProducts);

            await index(mockReq, mockRes);

            expect(Product.find().sort).toHaveBeenCalledWith({ price: 'desc' });
        });

        // * Chức năng: Xử lý khi Product.countDocuments() gặp lỗi.
        // * Mô tả kiểm thử: Controller không có try-catch cho hoạt động Product.countDocuments. Nếu có lỗi, ứng dụng sẽ bị treo.
        // * Dữ liệu đầu vào: Giả lập Product.countDocuments() bị từ chối (throw error).
        // * Kết quả mong đợi: Hàm sẽ throw error (không bắt lỗi). res.render không được gọi.
        test('FAIL: Should throw an error if Product.countDocuments fails (no explicit error handling)', async () => {
            const mockError = new Error('Database error during count');
            Product.countDocuments.mockRejectedValue(mockError);

            await expect(index(mockReq, mockRes)).rejects.toThrow('Database error during count');
            expect(mockRes.render).not.toHaveBeenCalled();
        });

        // * Chức năng: Xử lý khi Product.find() gặp lỗi sau khi countDocuments thành công.
        // * Mô tả kiểm thử: Controller không có try-catch cho hoạt động Product.find. Nếu có lỗi, ứng dụng sẽ bị treo.
        // * Dữ liệu đầu vào: Giả lập Product.find().skip() bị từ chối (throw error).
        // * Kết quả mong đợi: Hàm sẽ throw error (không bắt lỗi). res.render không được gọi.
        test('FAIL: Should throw an error if Product.find fails (no explicit error handling)', async () => {
            const mockError = new Error('Database error during find');
            Product.countDocuments.mockResolvedValue(10);
            Product.mockChainable().mockRejectedValue(mockError); // Mock điểm cuối của chuỗi truy vấn trả về lỗi

            await expect(index(mockReq, mockRes)).rejects.toThrow('Database error during find');
            expect(mockRes.render).not.toHaveBeenCalled();
        });
    });

    // --- [PATCH] /admin/products/change-status/:status/:id ---
    describe('changeStatus', () => {
        // * Chức năng: Thay đổi trạng thái của một sản phẩm.
        // * Mô tả kiểm thử: Cập nhật trạng thái sản phẩm thành 'active' và chuyển hướng về trang trước.
        // * Dữ liệu đầu vào: req.params = { status: 'active', id: 'product123' }, res.locals.userMDW = { id: 'testUserId' }
        // * Kết quả mong đợi: Product.updateOne được gọi, req.flash được gọi với thông báo thành công, res.redirect được gọi với 'back'.
        test('PASS: Should change product status to active and redirect back', async () => {
            mockReq.params = { status: 'active', id: 'product123' };
            Product.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

            await changeStatus(mockReq, mockRes);

            expect(Product.updateOne).toHaveBeenCalledWith(
                { _id: 'product123' },
                { status: 'active', $push: { updatedBy: { accountId: 'testUserId', updatedAt: expect.any(Date) } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Cập nhật trạng thái thành công');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });

        // * Chức năng: Xử lý khi cập nhật trạng thái sản phẩm thất bại.
        // * Mô tả kiểm thử: Product.updateOne thất bại (ví dụ: ID không hợp lệ, lỗi DB), nhưng flash message vẫn hiển thị "thành công" do không có try-catch.
        // * Dữ liệu đầu vào: req.params = { status: 'active', id: 'invalidId' }. Giả lập Product.updateOne bị từ chối.
        // * Kết quả mong đợi: Product.updateOne bị lỗi, nhưng req.flash vẫn gọi "success". res.redirect vẫn được gọi.
        test('FAIL: Should flash success message even if Product.updateOne fails', async () => {
            mockReq.params = { status: 'active', id: 'invalidId' };
            Product.updateOne.mockRejectedValue(new Error('Update failed'));

            await changeStatus(mockReq, mockRes);

            expect(Product.updateOne).toHaveBeenCalled();
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Cập nhật trạng thái thành công'); // Thông báo thành công sai
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });
    });

    // --- [PATCH] /admin/products/change-multi ---
    describe('changeMulti', () => {
        // * Chức năng: Thay đổi nhiều trạng thái sản phẩm cùng lúc.
        // * Mô tả kiểm thử: Kích hoạt nhiều sản phẩm và kiểm tra thông báo.
        // * Dữ liệu đầu vào: req.body = { type: 'active', ids: 'id1, id2' }
        // * Kết quả mong đợi: Product.updateMany được gọi với trạng thái 'active', flash message thành công, redirect.
        test('PASS: Should activate multiple products', async () => {
            mockReq.body = { type: 'active', ids: 'id1, id2' };
            Product.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 2 });

            await changeMulti(mockReq, mockRes);

            expect(Product.updateMany).toHaveBeenCalledWith(
                { _id: { $in: ['id1', 'id2'] } },
                { status: 'active', $push: { updatedBy: { accountId: 'testUserId', updatedAt: expect.any(Date) } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Cập nhật trạng thái thành công 2 sản phẩm');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });

        // * Chức năng: Xóa nhiều sản phẩm.
        // * Mô tả kiểm thử: Đánh dấu nhiều sản phẩm là đã xóa.
        // * Dữ liệu đầu vào: req.body = { type: 'delete-all', ids: 'id1, id2' }
        // * Kết quả mong đợi: Product.updateMany được gọi với deleted: true, flash message thành công, redirect.
        test('PASS: Should soft delete multiple products', async () => {
            mockReq.body = { type: 'delete-all', ids: 'id1, id2' };
            Product.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 2 });

            await changeMulti(mockReq, mockRes);

            expect(Product.updateMany).toHaveBeenCalledWith(
                { _id: { $in: ['id1', 'id2'] } },
                { deleted: true, $push: { deletedBy: { accountId: 'testUserId', deletedAt: expect.any(Date) } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Xóa thành công 2 sản phẩm');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });

        // * Chức năng: Thay đổi vị trí của nhiều sản phẩm.
        // * Mô tả kiểm thử: Cập nhật vị trí của các sản phẩm.
        // * Dữ liệu đầu vào: req.body = { type: 'change-position', ids: 'id1-10, id2-5' }
        // * Kết quả mong đợi: Product.updateOne được gọi cho từng sản phẩm với vị trí mới, flash message thành công, redirect.
        test('PASS: Should change position of multiple products', async () => {
            mockReq.body = { type: 'change-position', ids: 'id1-10, id2-5' };
            Product.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

            await changeMulti(mockReq, mockRes);

            expect(Product.updateOne).toHaveBeenCalledTimes(2);
            expect(Product.updateOne).toHaveBeenCalledWith({ _id: 'id1' }, { position: 10 });
            expect(Product.updateOne).toHaveBeenCalledWith({ _id: 'id2' }, { position: 5 });
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Đổi vị trí thành công 2 sản phẩm');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });

        // * Chức năng: Xử lý khi Product.updateMany gặp lỗi.
        // * Mô tả kiểm thử: Product.updateMany thất bại (ví dụ: lỗi DB), nhưng flash message vẫn hiển thị "thành công" do không có try-catch.
        // * Dữ liệu đầu vào: req.body = { type: 'active', ids: 'id1, id2' }
        // * Kết quả mong đợi: Product.updateMany bị lỗi, nhưng req.flash vẫn gọi "success". res.redirect vẫn được gọi.
        test('FAIL: Should flash success message even if Product.updateMany fails', async () => {
            mockReq.body = { type: 'active', ids: 'id1, id2' };
            Product.updateMany.mockRejectedValue(new Error('Batch update failed'));

            await changeMulti(mockReq, mockRes);

            expect(Product.updateMany).toHaveBeenCalled();
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Cập nhật trạng thái thành công 2 sản phẩm'); // Thông báo thành công sai
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });

        // * Chức năng: Xử lý khi đổi vị trí với dữ liệu không hợp lệ.
        // * Mô tả kiểm thử: Input cho vị trí là chuỗi không phải số ('id1-abc'), dẫn đến lưu giá trị NaN cho position. Flash message thành công.
        // * Dữ liệu đầu vào: req.body = { type: 'change-position', ids: 'id1-abc' }
        // * Kết quả mong đợi: Product.updateOne được gọi với position là NaN. Flash message thành công.
        test('FAIL: Should save NaN for position if input is non-numeric, but still flash success', async () => {
            mockReq.body = { type: 'change-position', ids: 'id1-abc' };
            Product.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

            await changeMulti(mockReq, mockRes);

            // parseInt('abc') sẽ là NaN. Điều này sẽ được lưu vào DB nếu schema cho phép NaN hoặc không được kiểm tra.
            expect(Product.updateOne).toHaveBeenCalledWith({ _id: 'id1' }, { position: NaN });
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Đổi vị trí thành công 1 sản phẩm');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });
    });

    // --- [DELETE] /admin/products/delete/:id ---
    describe('deleteItem', () => {
        // * Chức năng: Xóa một sản phẩm.
        // * Mô tả kiểm thử: Đánh dấu sản phẩm là đã xóa và thay đổi trạng thái.
        // * Dữ liệu đầu vào: req.params = { id: 'product123' }, res.locals.userMDW = { id: 'testUserId' }
        // * Kết quả mong đợi: Product.updateOne được gọi với deleted: true và status: inactive, flash message thành công, redirect.
        test('PASS: Should soft delete a single product and redirect back', async () => {
            mockReq.params = { id: 'product123' };
            Product.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

            await deleteItem(mockReq, mockRes);

            expect(Product.updateOne).toHaveBeenCalledWith(
                { _id: 'product123' },
                {
                    deleted: true,
                    status: 'inactive',
                    $push: { deletedBy: { accountId: 'testUserId', deletedAt: expect.any(Date) } }
                }
            );
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Xóa thành công sản phẩm');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });

        // * Chức năng: Xử lý khi Product.updateOne gặp lỗi.
        // * Mô tả kiểm thử: Product.updateOne thất bại (ví dụ: ID không hợp lệ, lỗi DB), nhưng flash message vẫn hiển thị "thành công" do không có try-catch.
        // * Dữ liệu đầu vào: req.params = { id: 'invalidId' }. Giả lập Product.updateOne bị từ chối.
        // * Kết quả mong đợi: Product.updateOne bị lỗi, nhưng req.flash vẫn gọi "success". res.redirect vẫn được gọi.
        test('FAIL: Should flash success message even if Product.updateOne fails', async () => {
            mockReq.params = { id: 'invalidId' };
            Product.updateOne.mockRejectedValue(new Error('Delete failed'));

            await deleteItem(mockReq, mockRes);

            expect(Product.updateOne).toHaveBeenCalled();
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Xóa thành công sản phẩm'); // Thông báo thành công sai
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });
    });

    // --- [GET] /admin/products/create ---
    describe('create', () => {
        // * Chức năng: Render trang thêm mới sản phẩm.
        // * Mô tả kiểm thử: Lấy danh sách danh mục và thương hiệu để hiển thị trên form.
        // * Dữ liệu đầu vào: Không có.
        // * Kết quả mong đợi: productsCategory.find và Brand.find được gọi, createTreeHelper.tree được gọi, res.render được gọi với dữ liệu form.
        test('PASS: Should render the product creation form with categories and brands', async () => {
            const mockCategories = [createMockCategory({ _id: 'cat1' }), createMockCategory({ _id: 'cat2' })];
            const mockBrands = [createMockBrand({ _id: 'brand1' })];
            productsCategory.find.mockResolvedValue(mockCategories);
            Brand.find.mockResolvedValue(mockBrands);
            createTreeHelper.tree.mockReturnValue(mockCategories); // Giả định helper trả về cây danh mục

            await create(mockReq, mockRes);

            expect(productsCategory.find).toHaveBeenCalledWith({ deleted: false, status: "active" });
            expect(Brand.find).toHaveBeenCalledWith({ deleted: false, status: "active" });
            expect(createTreeHelper.tree).toHaveBeenCalledWith(mockCategories, "");
            expect(mockRes.render).toHaveBeenCalledWith('admin/page/products/create', {
                pageTitle: 'Thêm mới sản phẩm',
                categorys: mockCategories,
                brands: mockBrands,
                size: expect.any(Array),
                types: expect.any(Array)
            });
        });

        // * Chức năng: Xử lý khi productsCategory.find hoặc Brand.find gặp lỗi.
        // * Mô tả kiểm thử: Controller không có try-catch. Nếu có lỗi, ứng dụng sẽ bị treo.
        // * Dữ liệu đầu vào: Giả lập productsCategory.find() bị từ chối (throw error).
        // * Kết quả mong đợi: Hàm sẽ throw error (không bắt lỗi). res.render không được gọi.
        test('FAIL: Should throw an error if productsCategory.find fails (no explicit error handling)', async () => {
            const mockError = new Error('Category DB error');
            productsCategory.find.mockRejectedValue(mockError);

            await expect(create(mockReq, mockRes)).rejects.toThrow('Category DB error');
            expect(mockRes.render).not.toHaveBeenCalled();
        });
    });

    // --- [POST] /admin/products/create ---
    describe('createPost', () => {
        // * Chức năng: Tạo mới một sản phẩm.
        // * Mô tả kiểm thử: Tạo sản phẩm với dữ liệu hợp lệ và vị trí được tự động gán.
        // * Dữ liệu đầu vào: req.body = { title: 'New Product', price: '100', discountPercentage: '10.5', stock: '50', size: '39,40', description: 'desc' }, res.locals.userMDW
        // * Kết quả mong đợi: Các trường số được parse, Product.countDocuments được gọi, Product constructor và save được gọi, res.redirect.
        test('PASS: Should create a new product with valid data and auto-assigned position', async () => {
            mockReq.body = {
                title: 'New Product',
                price: '100',
                discountPercentage: '10.5',
                stock: '50',
                size: '39,40',
                description: 'desc'
            };
            Product.countDocuments.mockResolvedValue(0);
            MockProductConstructor.mockImplementation((data) => ({ // Sử dụng MockProductConstructor
                ...data,
                save: jest.fn().mockResolvedValue({ _id: 'newProductId', ...data }) // Mock instance save method
            }));

            await createPost(mockReq, mockRes);

            expect(mockReq.body.price).toBe(100);
            expect(mockReq.body.discountPercentage).toBe(10.5);
            expect(mockReq.body.stock).toBe(50);
            expect(mockReq.body.position).toBe(1);
            expect(mockReq.body.size).toEqual([39, 40]);
            expect(mockReq.body.createBy).toEqual({ accountId: 'testUserId' });
            expect(MockProductConstructor).toHaveBeenCalledWith(expect.objectContaining({ // Kiểm tra constructor được gọi với dữ liệu đúng
                title: 'New Product',
                price: 100,
                position: 1,
                size: [39, 40]
            }));
            const productInstance = MockProductConstructor.mock.results[0].value; // Lấy instance đã mock
            expect(productInstance.save).toHaveBeenCalled();
            expect(mockRes.redirect).toHaveBeenCalledWith(`${systemConfig.prefixAdmin}/products`);
        });

        // * Chức năng: Tạo mới sản phẩm với vị trí được chỉ định.
        // * Mô tả kiểm thử: Gán vị trí theo input thay vì tự động.
        // * Dữ liệu đầu vào: req.body = { ..., positon: '5' }
        // * Kết quả mong đợi: Vị trí được gán bằng 5.
        test('PASS: Should create a new product with specified position', async () => {
            mockReq.body = {
                title: 'New Product',
                price: '100',
                discountPercentage: '10.5',
                stock: '50',
                size: '39,40',
                positon: '5' // Lưu ý: Lỗi chính tả trong controller là `positon`
            };
            MockProductConstructor.mockImplementation((data) => ({
                ...data,
                save: jest.fn().mockResolvedValue({ _id: 'newProductId', ...data })
            }));

            await createPost(mockReq, mockRes);

            expect(mockReq.body.position).toBe(5);
            expect(MockProductConstructor).toHaveBeenCalledWith(expect.objectContaining({ position: 5 }));
            const productInstance = MockProductConstructor.mock.results[0].value;
            expect(productInstance.save).toHaveBeenCalled();
        });

        // * Chức năng: Xử lý khi Product.save() thất bại.
        // * Mô tả kiểm thử: Product.save() bị lỗi (ví dụ: lỗi validation). Controller không bắt lỗi, ứng dụng bị treo.
        // * Dữ liệu đầu vào: Dữ liệu hợp lệ nhưng giả lập Product.save() bị từ chối.
        // * Kết quả mong đợi: Hàm sẽ throw error (không bắt lỗi). res.redirect không được gọi.
        test('FAIL: Should throw an error if Product.save() fails (no explicit error handling)', async () => {
            mockReq.body = {
                title: 'New Product',
                price: '100',
                discountPercentage: '10.5',
                stock: '50',
                size: '39,40',
                description: 'desc'
            };
            Product.countDocuments.mockResolvedValue(0);
            MockProductConstructor.mockImplementation((data) => ({
                ...data,
                save: jest.fn().mockRejectedValue(new Error('Mongoose validation error'))
            }));

            await expect(createPost(mockReq, mockRes)).rejects.toThrow('Mongoose validation error');
            const productInstance = MockProductConstructor.mock.results[0].value;
            expect(productInstance.save).toHaveBeenCalled();
            expect(mockRes.redirect).not.toHaveBeenCalled();
        });

        // * Chức năng: Xử lý input không hợp lệ cho các trường số.
        // * Mô tả kiểm thử: Các trường price, discountPercentage, stock là chuỗi không phải số, dẫn đến lưu giá trị NaN. Redirect vẫn được gọi (như thành công).
        // * Dữ liệu đầu vào: req.body = { ..., price: 'abc', discountPercentage: 'xyz', stock: 'def' }
        // * Kết quả mong đợi: Các trường tương ứng trong sản phẩm được lưu là NaN. Redirect vẫn được gọi.
        test('FAIL: Should save NaN for numeric fields if input is non-numeric, but still redirect as success', async () => {
            mockReq.body = {
                title: 'New Product',
                price: 'abc',
                discountPercentage: 'xyz',
                stock: 'def',
                size: '39,40',
                description: 'desc'
            };
            Product.countDocuments.mockResolvedValue(0);
            MockProductConstructor.mockImplementation((data) => ({
                ...data,
                save: jest.fn().mockResolvedValue({})
            }));

            await createPost(mockReq, mockRes);

            expect(mockReq.body.price).toBe(NaN);
            expect(mockReq.body.discountPercentage).toBe(NaN);
            expect(mockReq.body.stock).toBe(NaN);
            expect(MockProductConstructor).toHaveBeenCalledWith(expect.objectContaining({
                price: NaN,
                discountPercentage: NaN,
                stock: NaN,
            }));
            const productInstance = MockProductConstructor.mock.results[0].value;
            expect(productInstance.save).toHaveBeenCalled();
            expect(mockRes.redirect).toHaveBeenCalledWith(`${systemConfig.prefixAdmin}/products`);
        });

        // * Chức năng: Xử lý input không hợp lệ cho trường size.
        // * Mô tả kiểm thử: Trường size là chuỗi không phải số, dẫn đến lưu giá trị [NaN]. Redirect vẫn được gọi (như thành công).
        // * Dữ liệu đầu vào: req.body = { ..., size: 'abc,def' }
        // * Kết quả mong đợi: Trường size được lưu là [NaN, NaN]. Redirect vẫn được gọi.
        test('FAIL: Should parse size to [NaN, NaN] if input is non-numeric strings, but still redirect as success', async () => {
            mockReq.body = {
                title: 'New Product',
                price: '100',
                discountPercentage: '10',
                stock: '50',
                size: 'abc,def',
                description: 'desc'
            };
            Product.countDocuments.mockResolvedValue(0);
            MockProductConstructor.mockImplementation((data) => ({
                ...data,
                save: jest.fn().mockResolvedValue({})
            }));

            await createPost(mockReq, mockRes);

            expect(mockReq.body.size).toEqual([NaN, NaN]);
            expect(MockProductConstructor).toHaveBeenCalledWith(expect.objectContaining({
                size: [NaN, NaN]
            }));
            const productInstance = MockProductConstructor.mock.results[0].value;
            expect(productInstance.save).toHaveBeenCalled();
            expect(mockRes.redirect).toHaveBeenCalledWith(`${systemConfig.prefixAdmin}/products`);
        });
    });

    // --- [GET] /admin/products/deleted-products ---
    describe('deletedProducts', () => {
        // * Chức năng: Lấy danh sách sản phẩm đã xóa.
        // * Mô tả kiểm thử: Hiển thị các sản phẩm có deleted: true với phân trang mặc định.
        // * Dữ liệu đầu vào: req.query = {}
        // * Kết quả mong đợi: Product.countDocuments và Product.find được gọi với deleted: true, res.render với danh sách sản phẩm đã xóa.
        test('PASS: Should render deleted products with default pagination', async () => {
            const mockDeletedProducts = [createMockProduct({ deleted: true })];
            Product.countDocuments.mockResolvedValue(1);
            Product.mockChainable().mockResolvedValue(mockDeletedProducts); // Mock chuỗi truy vấn

            paginationHelper.mockReturnValue({ limitItem: 10, skip: 0 }); // paginationHelper mặc định limit là 10

            await deletedProducts(mockReq, mockRes);

            expect(Product.countDocuments).toHaveBeenCalledWith({ deleted: true });
            expect(paginationHelper).toHaveBeenCalledWith(1, mockReq.query);
            expect(Product.find).toHaveBeenCalledWith({ deleted: true });
            expect(Product.find().sort).toHaveBeenCalledWith({ position: "desc" });
            expect(Product.find().limit).toHaveBeenCalledWith(10);
            expect(Product.find().skip).toHaveBeenCalledWith(0);
            expect(mockRes.render).toHaveBeenCalledWith('admin/page/products/deleted', {
                pageTitle: 'Sản phẩm đã xóa',
                products: mockDeletedProducts,
                pagination: { limitItem: 10, skip: 0 }
            });
        });

        // * Chức năng: Xử lý khi Product.countDocuments() gặp lỗi.
        // * Mô tả kiểm thử: Controller không có try-catch. Nếu có lỗi, ứng dụng sẽ bị treo.
        // * Dữ liệu đầu vào: Giả lập Product.countDocuments() bị từ chối (throw error).
        // * Kết quả mong đợi: Hàm sẽ throw error (không bắt lỗi). res.render không được gọi.
        test('FAIL: Should throw an error if Product.countDocuments fails (no explicit error handling)', async () => {
            const mockError = new Error('Deleted Products Count DB error');
            Product.countDocuments.mockRejectedValue(mockError);

            await expect(deletedProducts(mockReq, mockRes)).rejects.toThrow('Deleted Products Count DB error');
            expect(mockRes.render).not.toHaveBeenCalled();
        });

        // * Chức năng: Xử lý khi Product.find() gặp lỗi sau khi countDocuments thành công.
        // * Mô tả kiểm thử: Controller không có try-catch cho hoạt động Product.find. Nếu có lỗi, ứng dụng sẽ bị treo.
        // * Dữ liệu đầu vào: Giả lập Product.find().skip() bị từ chối (throw error).
        // * Kết quả mong đợi: Hàm sẽ throw error (không bắt lỗi). res.render không được gọi.
        test('FAIL: Should throw an error if Product.find fails (no explicit error handling)', async () => {
            const mockError = new Error('Deleted Products Find DB error');
            Product.countDocuments.mockResolvedValue(10);
            Product.mockChainable().mockRejectedValue(mockError); // Mock điểm cuối của chuỗi truy vấn trả về lỗi

            await expect(deletedProducts(mockReq, mockRes)).rejects.toThrow('Deleted Products Find DB error');
            expect(mockRes.render).not.toHaveBeenCalled();
        });
    });

    // --- [POST] /admin/products/deleted-products/restore/:id ---
    describe('restore', () => {
        // * Chức năng: Khôi phục một sản phẩm đã xóa.
        // * Mô tả kiểm thử: Thay đổi trạng thái 'deleted' thành false.
        // * Dữ liệu đầu vào: req.params = { id: 'deletedProduct123' }, res.locals.userMDW = { id: 'testUserId' }
        // * Kết quả mong đợi: Product.updateOne được gọi với deleted: false, flash message thành công, redirect.
        test('PASS: Should restore a deleted product and redirect back', async () => {
            mockReq.params = { id: 'deletedProduct123' };
            Product.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

            await restore(mockReq, mockRes);

            expect(Product.updateOne).toHaveBeenCalledWith(
                { _id: 'deletedProduct123' },
                { deleted: false, $push: { restoredBy: { accountId: 'testUserId', restoredAt: expect.any(Date) } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Khôi phục sản phẩm thành công');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });

        // * Chức năng: Xử lý khi khôi phục sản phẩm thất bại.
        // * Mô tả kiểm thử: Product.updateOne gặp lỗi và flash message hiển thị "thất bại".
        // * Dữ liệu đầu vào: req.params = { id: 'invalidId' }. Giả lập lỗi update.
        // * Kết quả mong đợi: Product.updateOne bị lỗi, req.flash gọi "error", res.redirect. (Được xử lý bởi try-catch)
        test('PASS: Should flash error message if Product.updateOne fails (handled by try-catch)', async () => {
            mockReq.params = { id: 'invalidId' };
            Product.updateOne.mockRejectedValue(new Error('Restore failed'));

            await restore(mockReq, mockRes);

            expect(mockReq.flash).toHaveBeenCalledWith('error', 'Khôi phục sản phẩm thất bại');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });
    });

    // --- [GET] /admin/products/edit/:id ---
    describe('edit', () => {
        // * Chức năng: Render trang chỉnh sửa sản phẩm.
        // * Mô tả kiểm thử: Lấy thông tin sản phẩm và danh mục để hiển thị trên form.
        // * Dữ liệu đầu vào: req.params = { id: 'productToEdit123' }
        // * Kết quả mong đợi: productsCategory.find và Product.findOne được gọi, res.render với dữ liệu sản phẩm và danh mục.
        test('PASS: Should render the product edit form with product data and categories', async () => {
            mockReq.params = { id: 'productToEdit123' };
            const mockProduct = createMockProduct({ _id: 'productToEdit123' });
            const mockCategories = [createMockCategory()];
            productsCategory.find.mockResolvedValue(mockCategories);
            Product.findOne.mockResolvedValue(mockProduct);
            createTreeHelper.tree.mockReturnValue(mockCategories);

            await edit(mockReq, mockRes);

            expect(productsCategory.find).toHaveBeenCalledWith({ deleted: false });
            expect(Product.findOne).toHaveBeenCalledWith({ deleted: false, _id: 'productToEdit123' });
            expect(createTreeHelper.tree).toHaveBeenCalledWith(mockCategories, "");
            expect(mockRes.render).toHaveBeenCalledWith('admin/page/products/edit', {
                pageTitle: 'Sửa thông tin sản phẩm',
                product: mockProduct,
                categorys: mockCategories
            });
        });

        // * Chức năng: Xử lý khi sản phẩm không tìm thấy hoặc có lỗi.
        // * Mô tả kiểm thử: Product.findOne trả về null hoặc bị lỗi. Chuyển hướng về trang danh sách sản phẩm.
        // * Dữ liệu đầu vào: req.params = { id: 'nonExistentId' }. Giả lập Product.findOne trả về null.
        // * Kết quả mong đợi: res.redirect về trang /admin/products. (Được xử lý bởi try-catch)
        test('PASS: Should redirect to products list if product is not found or error occurs (handled by try-catch)', async () => {
            mockReq.params = { id: 'nonExistentId' };
            Product.findOne.mockResolvedValue(null); // Hoặc mockRejectedValue(new Error('DB error'))

            await edit(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(`${systemConfig.prefixAdmin}/products`);
            expect(mockRes.render).not.toHaveBeenCalled();
        });
    });

    // --- [PATCH] /admin/products/edit/:id ---
    describe('editPatch', () => {
        // * Chức năng: Cập nhật thông tin sản phẩm.
        // * Mô tả kiểm thử: Cập nhật các trường số và các trường khác.
        // * Dữ liệu đầu vào: req.params = { id: 'product123' }, req.body = { price: '200', discountPercentage: '15', stock: '60', title: 'Updated Title', positon: '20' }, res.locals.userMDW
        // * Kết quả mong đợi: Product.updateOne được gọi với dữ liệu đã parse và cập nhật, flash message thành công, redirect.
        test('PASS: Should update product information with valid data', async () => {
            mockReq.params = { id: 'product123' };
            mockReq.body = {
                price: '200',
                discountPercentage: '15',
                stock: '60',
                title: 'Updated Title',
                positon: '20' // Lưu ý: Lỗi chính tả trong controller là `positon`, được gán cho req.body.position
            };
            Product.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

            await editPatch(mockReq, mockRes);

            expect(mockReq.body.price).toBe(200);
            expect(mockReq.body.discountPercentage).toBe(15);
            expect(mockReq.body.stock).toBe(60);
            expect(mockReq.body.position).toBe('20'); // Giá trị được gán là chuỗi, không phải số nguyên ở đây.
            expect(Product.updateOne).toHaveBeenCalledWith(
                { _id: 'product123' },
                {
                    ...mockReq.body,
                    $push: { updatedBy: { accountId: 'testUserId', updatedAt: expect.any(Date) } }
                }
            );
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Sửa thông tin sản phẩm thành công');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });

        // * Chức năng: Xử lý input không hợp lệ cho các trường số.
        // * Mô tả kiểm thử: Các trường price, discountPercentage, stock là chuỗi không phải số, dẫn đến lưu giá trị NaN. Flash message thành công.
        // * Dữ liệu đầu vào: req.body = { ..., price: 'abc', discountPercentage: 'xyz', stock: 'def', positon: 'pqr' }
        // * Kết quả mong đợi: Các trường tương ứng trong sản phẩm được lưu là NaN. Flash message thành công.
        test('FAIL: Should save NaN for numeric fields if input is non-numeric, but still flash success', async () => {
            mockReq.params = { id: 'product123' };
            mockReq.body = {
                price: 'abc',
                discountPercentage: 'xyz',
                stock: 'def',
                positon: 'pqr', // Lỗi chính tả trong controller, được gán cho req.body.position là chuỗi.
                title: 'Updated Title'
            };
            Product.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

            await editPatch(mockReq, mockRes);

            expect(mockReq.body.price).toBe(NaN); // parseInt('abc') là NaN
            expect(mockReq.body.discountPercentage).toBe(NaN); // parseFloat('xyz') là NaN
            expect(mockReq.body.stock).toBe(NaN); // parseInt('def') là NaN
            expect(mockReq.body.position).toBe('pqr'); // Vẫn là chuỗi 'pqr'
            expect(Product.updateOne).toHaveBeenCalledWith(
                { _id: 'product123' },
                expect.objectContaining({
                    price: NaN,
                    discountPercentage: NaN,
                    stock: NaN,
                    position: 'pqr'
                })
            );
            expect(mockReq.flash).toHaveBeenCalledWith('success', 'Sửa thông tin sản phẩm thành công');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });

        // * Chức năng: Xử lý khi cập nhật sản phẩm thất bại.
        // * Mô tả kiểm thử: Product.updateOne gặp lỗi. Flash message hiển thị "thất bại".
        // * Dữ liệu đầu vào: req.params = { id: 'invalidId' }. Giả lập lỗi update.
        // * Kết quả mong đợi: Product.updateOne bị lỗi, req.flash gọi "error", res.redirect. (Được xử lý bởi try-catch)
        test('PASS: Should flash error message if Product.updateOne fails (handled by try-catch)', async () => {
            mockReq.params = { id: 'invalidId' };
            Product.updateOne.mockRejectedValue(new Error('Update failed'));

            await editPatch(mockReq, mockRes);

            expect(mockReq.flash).toHaveBeenCalledWith('error', 'Sửa thông tin sản phẩm thất bại');
            expect(mockRes.redirect).toHaveBeenCalledWith('back');
        });
    });

    // --- [GET] /admin/products/detail/:id ---
    describe('detail', () => {
        // * Chức năng: Xem chi tiết sản phẩm.
        // * Mô tả kiểm thử: Lấy thông tin chi tiết sản phẩm bao gồm người tạo, người cập nhật, người xóa, người khôi phục và vai trò của họ.
        // * Dữ liệu đầu vào: req.params = { id: 'productDetail123' }
        // * Kết quả mong đợi: Product.findOne, Account.findOne, Role.findOne được gọi, res.render với dữ liệu chi tiết sản phẩm.
        test('PASS: Should render product detail with associated user and role info', async () => {
            mockReq.params = { id: 'productDetail123' };

            const creatorAccount = createMockAccount({ _id: 'creatorId', fullName: 'Creator User', role_id: 'roleId1' });
            const creatorRole = createMockRole({ _id: 'roleId1', title: 'Admin' });
            const updaterAccount = createMockAccount({ _id: 'updaterId', fullName: 'Updater User', role_id: 'roleId2' });
            const updaterRole = createMockRole({ _id: 'roleId2', title: 'Editor' });
            const deleterAccount = createMockAccount({ _id: 'deleterId', fullName: 'Deleter User', role_id: 'roleId3' });
            const deleterRole = createMockRole({ _id: 'roleId3', title: 'Moderator' });
            const restorerAccount = createMockAccount({ _id: 'restorerId', fullName: 'Restorer User', role_id: 'roleId4' });
            const restorerRole = createMockRole({ _id: 'roleId4', title: 'Admin' });

            const mockProduct = createMockProduct({
                _id: 'productDetail123',
                createBy: { accountId: 'creatorId' },
                updatedBy: [{ accountId: 'updaterId', updatedAt: new Date() }],
                deletedBy: [{ accountId: 'deleterId', deletedAt: new Date() }],
                restoredBy: [{ accountId: 'restorerId', restoredAt: new Date() }]
            });

            Product.findOne.mockResolvedValue(mockProduct);
            Account.findOne
                .mockImplementation(async (query) => {
                    if (query._id === 'creatorId') return creatorAccount;
                    if (query._id === 'updaterId') return updaterAccount;
                    if (query._id === 'deleterId') return deleterAccount;
                    if (query._id === 'restorerId') return restorerAccount;
                    return null;
                });
            Role.findOne
                .mockImplementation(async (query) => {
                    if (query._id === 'roleId1') return creatorRole;
                    if (query._id === 'roleId2') return updaterRole;
                    if (query._id === 'roleId3') return deleterRole;
                    if (query._id === 'roleId4') return restorerRole;
                    return null;
                });

            await detail(mockReq, mockRes);

            expect(Product.findOne).toHaveBeenCalledWith({ deleted: false, _id: 'productDetail123' });
            expect(Account.findOne).toHaveBeenCalledTimes(4); // Đối với người tạo, cập nhật, xóa, khôi phục
            expect(Role.findOne).toHaveBeenCalledTimes(4); // Đối với các vai trò liên quan

            const renderedProduct = mockRes.render.mock.calls[0][1].product;
            expect(renderedProduct.userCreate.fullName).toBe('Creator User');
            expect(renderedProduct.userCreate.role.title).toBe('Admin');
            expect(renderedProduct.userUpdate[0].fullName).toBe('Updater User');
            expect(renderedProduct.userUpdate[0].role.title).toBe('Editor');
            expect(renderedProduct.userDelete[0].fullName).toBe('Deleter User');
            expect(renderedProduct.userDelete[0].role.title).toBe('Moderator');
            expect(renderedProduct.userRestore[0].fullName).toBe('Restorer User');
            expect(renderedProduct.userRestore[0].role.title).toBe('Admin');

            expect(mockRes.render).toHaveBeenCalledWith('admin/page/products/detail', {
                pageTitle: mockProduct.title,
                product: expect.objectContaining({ _id: mockProduct._id })
            });
        });

        // * Chức năng: Xem chi tiết sản phẩm không có người tạo.
        // * Mô tả kiểm thử: Sản phẩm tồn tại nhưng không có thông tin người tạo được tìm thấy.
        // * Dữ liệu đầu vào: req.params = { id: 'productDetail123' }, Product.findOne trả về sản phẩm có createBy.accountId, nhưng Account.findOne trả về null.
        // * Kết quả mong đợi: res.render được gọi, nhưng các trường userCreate/roleCreate không được gán.
        test('PASS: Should render product detail even if creator account is not found', async () => {
            mockReq.params = { id: 'productDetail123' };
            const mockProduct = createMockProduct({
                _id: 'productDetail123',
                createBy: { accountId: 'nonExistentCreatorId' } // Mock người tạo không tồn tại
            });
            Product.findOne.mockResolvedValue(mockProduct);
            Account.findOne.mockResolvedValue(null); // Account không tìm thấy
            Role.findOne.mockResolvedValue(null);

            await detail(mockReq, mockRes);

            expect(mockRes.render).toHaveBeenCalledWith('admin/page/products/detail', {
                pageTitle: mockProduct.title,
                product: expect.objectContaining({
                    _id: mockProduct._id,
                    userCreate: undefined,
                    roleCreate: undefined
                })
            });
        });

        // * Chức năng: Xử lý khi sản phẩm không tìm thấy hoặc có lỗi.
        // * Mô tả kiểm thử: Product.findOne trả về null hoặc bị lỗi. Chuyển hướng về trang danh sách sản phẩm.
        // * Dữ liệu đầu vào: req.params = { id: 'nonExistentId' }. Giả lập Product.findOne trả về null.
        // * Kết quả mong đợi: res.redirect về trang /admin/products. (Được xử lý bởi try-catch)
        test('PASS: Should redirect to products list if product is not found or error occurs (handled by try-catch)', async () => {
            mockReq.params = { id: 'nonExistentId' };
            Product.findOne.mockResolvedValue(null); // Hoặc mockRejectedValue(new Error('DB error'))

            await detail(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(`${systemConfig.prefixAdmin}/products`);
            expect(mockRes.render).not.toHaveBeenCalled();
        });
    });
});