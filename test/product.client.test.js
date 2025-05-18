// __tests__/product.controller.test.js

// Mock dependencies
jest.mock('../model/products.model');
jest.mock('../model/products-category.model');
jest.mock('../model/brands.model');
jest.mock('../helper/pagination');
jest.mock('../helper/product-category');

const Product = require('../model/products.model');
const ProductCategory = require('../model/products-category.model');
const Brand = require('../model/brands.model');
const paginationHelper = require('../helper/pagination');
const CategoryHelper = require('../helper/product-category');

const productController = require('../controllers/client/product.controller'); // Adjust path as needed

describe('Product Controller', () => {
  let mockReq, mockRes;

  // Sample data for mocking
  const mockBrandData = [
    { _id: 'brand1', name: 'Brand A', toObject: function() { return this; } },
    { _id: 'brand2', name: 'Brand B', toObject: function() { return this; } },
  ];

  const mockSaleProductRaw = { _id: 'saleProd1', title: 'Sale Product 1', price: 100000, discountPercentage: 20, toObject: function() { return this; } };
  const mockSaleProductProcessed = { ...mockSaleProductRaw, newPrice: "80000" };

  const mockProductRaw1 = { _id: 'prod1', title: 'Product 1', price: 1500000, discountPercentage: 10, category_id: 'cat1', brand_id: 'brand1', type: 'Low-top', slug: 'product-1', position: 2, toObject: function() { return this; } };
  const mockProductProcessed1 = { ...mockProductRaw1, newPrice: "1350000" };
  const mockProductRaw2 = { _id: 'prod2', title: 'Product 2', price: 2000000, discountPercentage: 0, category_id: 'cat2', brand_id: 'brand2', type: 'High-top', slug: 'product-2', position: 1, toObject: function() { return this; } };
  const mockProductProcessed2 = { ...mockProductRaw2, newPrice: "2000000" };
  const mockProductRaw3LowPrice = { _id: 'prod3', title: 'Product 3 Low Price', price: 700000, discountPercentage: 5, category_id: 'cat1', brand_id: 'brand1', type: 'Mid-top', slug: 'product-3', position: 3, toObject: function() { return this; } };
  const mockProductProcessed3LowPrice = { ...mockProductRaw3LowPrice, newPrice: "665000" };


  const mockCategory1 = { _id: 'cat1', title: 'Category 1', slug: 'category-1', toObject: function() { return this; } };


  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      query: {},
      params: {},
    };
    mockRes = {
      render: jest.fn(),
      redirect: jest.fn(),
    };

    // Default mock implementations
    Brand.find.mockResolvedValue(mockBrandData.map(b => ({...b})));

    // Default mock for Product.find to handle sale products and main products separately
    // This will be overridden by mockImplementationOnce in specific tests for more control
    const defaultSaleProductsChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSaleProductRaw].map(p => ({...p}))),
    };
    const defaultMainProductsChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([]),
    };

    Product.find.mockImplementation(query => {
        // Check if it's likely a sale products query
        if (Object.keys(query).length === 2 && query.status === "active" && query.deleted === false) {
            // This is a simplified check, might need adjustment if sale products query changes
            // For the first call in `index` and `productOfCategory` that fetches sale products.
            return defaultSaleProductsChain;
        }
        // Otherwise, assume it's for main products or needs specific mocking
        return defaultMainProductsChain;
    });


    Product.findOne.mockResolvedValue(null);
    Product.countDocuments.mockResolvedValue(0);
    ProductCategory.findOne.mockResolvedValue(null);
    CategoryHelper.getSubCategory.mockResolvedValue([]);
    paginationHelper.mockReturnValue({ limitedItem: 16, skip: 0, totalPage: 1, currentPage: 1 });
  });

  // --- Tests for module.exports.index ---
  describe('index - [GET] /products', () => {
    /**
     * @Chức năng: Hiển thị trang danh sách sản phẩm với các cài đặt mặc định khi không có sản phẩm nào (ngoại trừ sản phẩm sale).
     * @Mô tả kiểm thử:
     * - Người dùng truy cập trang sản phẩm mà không chọn bất kỳ bộ lọc hay sắp xếp nào.
     * - Giả lập rằng cơ sở dữ liệu trả về danh sách các thương hiệu có sẵn.
     * - Giả lập rằng có một số sản phẩm đang giảm giá được tìm thấy.
     * - Giả lập rằng không có sản phẩm chính nào khác được tìm thấy (số lượng sản phẩm là 0).
     * - Giả lập thông tin phân trang mặc định (ví dụ: trang 1, 16 sản phẩm mỗi trang).
     * - Sau đó, kiểm tra xem hệ thống có hiển thị đúng trang danh sách sản phẩm hay không,
     * với các thông tin như: không có sản phẩm chính, có sản phẩm giảm giá,
     * thông tin bộ lọc mặc định (ví dụ: kích thước, loại giày, khoảng giá, thương hiệu),
     * và cách sắp xếp mặc định (theo vị trí sản phẩm giảm dần).
     * @Dữ liệu đầu vào: Người dùng không cung cấp tham số lọc hay sắp xếp (`req.query = {}`).
     * @Kết quả mong đợi:
     * - Trang danh sách sản phẩm được hiển thị.
     * - Danh sách sản phẩm chính trống.
     * - Danh sách sản phẩm giảm giá hiển thị đúng sản phẩm đã được tính giá mới.
     * - Các bộ lọc bên (sidebar) hiển thị đúng thông tin (size, type, price, brands).
     * - Cách sắp xếp mặc định được áp dụng là theo vị trí, giảm dần.
     */
    test('should render product listing with default values and no main products', async () => {
      const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{...mockSaleProductRaw}]) };
      const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([]) };

      Product.find
        .mockImplementationOnce((query) => saleProductsChain) // For Sale Products
        .mockImplementationOnce((query) => mainProductsChain); // For Main Products

      Product.countDocuments.mockResolvedValue(0);

      await productController.index(mockReq, mockRes);

      expect(Brand.find).toHaveBeenCalledWith({ status: "active", deleted: false });
      expect(saleProductsChain.sort).toHaveBeenCalledWith({ discountPercentage: "desc" });
      expect(saleProductsChain.limit).toHaveBeenCalledWith(6);
      expect(Product.countDocuments).toHaveBeenCalledWith({ status: "active", deleted: false });
      expect(mainProductsChain.sort).toHaveBeenCalledWith({ position: "desc" });
      expect(mainProductsChain.limit).toHaveBeenCalledWith(16);
      expect(mainProductsChain.skip).toHaveBeenCalledWith(0);

      expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
        products: [],
        saleProducts: [mockSaleProductProcessed],
      }));
    });

    /**
     * @Chức năng: Lọc sản phẩm chỉ dựa trên thương hiệu.
     * @Mô tả kiểm thử:
     * - Người dùng chọn lọc sản phẩm theo một thương hiệu cụ thể (ví dụ: 'brand1').
     * - Giả lập rằng cơ sở dữ liệu tìm thấy các sản phẩm thuộc thương hiệu này.
     * - Các bộ lọc khác và sắp xếp được giữ ở giá trị mặc định.
     * - Kiểm tra xem hệ thống có tìm kiếm sản phẩm dựa trên đúng `brand_id` hay không,
     * và các sản phẩm trả về có thuộc thương hiệu đó và đã được tính giá mới.
     * @Dữ liệu đầu vào: Người dùng chọn lọc theo `brand = 'brand1'` (`req.query = { brand: 'brand1' }`).
     * @Kết quả mong đợi:
     * - Hệ thống tìm kiếm sản phẩm với điều kiện `brand_id` là 'brand1'.
     * - Trang danh sách sản phẩm hiển thị các sản phẩm của 'brand1'.
     * - Sắp xếp vẫn là mặc định (theo vị trí, giảm dần).
     */
    test('should filter by brand ONLY', async () => {
      mockReq.query = { brand: 'brand1' };
      const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([{...mockProductRaw1}]) }; // mockProductRaw1 belongs to brand1
      Product.find.mockImplementationOnce(() => saleProductsChain).mockImplementationOnce(() => mainProductsChain);
      Product.countDocuments.mockResolvedValue(1);

      await productController.index(mockReq, mockRes);
      const expectedFindObject = { status: "active", deleted: false, brand_id: 'brand1' };
      expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
      expect(mainProductsChain.sort).toHaveBeenCalledWith({ position: "desc" }); // Default sort
      expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
        products: [mockProductProcessed1],
      }));
    });

    /**
     * @Chức năng: Sắp xếp sản phẩm chỉ dựa trên giá (tăng dần).
     * @Mô tả kiểm thử:
     * - Người dùng chọn sắp xếp sản phẩm theo giá tăng dần.
     * - Không có bộ lọc nào khác được áp dụng.
     * - Giả lập rằng cơ sở dữ liệu trả về các sản phẩm.
     * - Kiểm tra xem hệ thống có áp dụng đúng tiêu chí sắp xếp giá tăng dần cho danh sách sản phẩm chính hay không.
     * @Dữ liệu đầu vào: Người dùng chọn sắp xếp theo `sortKey = 'price'`, `sortValue = 'asc'` (`req.query = { sortKey: 'price', sortValue: 'asc' }`).
     * @Kết quả mong đợi:
     * - Hệ thống sắp xếp danh sách sản phẩm chính theo giá từ thấp đến cao.
     * - Trang danh sách sản phẩm hiển thị các sản phẩm đã được sắp xếp.
     */
    test('should sort by price ascending ONLY', async () => {
      mockReq.query = { sortKey: 'price', sortValue: 'asc' };
      const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      // mockProductRaw3LowPrice is cheaper than mockProductRaw1
      const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([{...mockProductRaw3LowPrice}, {...mockProductRaw1}]) };
      Product.find.mockImplementationOnce(() => saleProductsChain).mockImplementationOnce(() => mainProductsChain);
      Product.countDocuments.mockResolvedValue(2);

      await productController.index(mockReq, mockRes);
      const expectedFindObject = { status: "active", deleted: false }; // No filters
      expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
      expect(mainProductsChain.sort).toHaveBeenCalledWith({ price: "asc" });
      expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
        products: [mockProductProcessed3LowPrice, mockProductProcessed1],
      }));
    });

    /**
     * @Chức năng: Kết hợp lọc sản phẩm theo thương hiệu VÀ sắp xếp theo giá tăng dần.
     * @Mô tả kiểm thử:
     * - Người dùng chọn lọc theo thương hiệu 'brand1' và đồng thời sắp xếp theo giá tăng dần.
     * - Giả lập cơ sở dữ liệu trả về các sản phẩm thuộc 'brand1'.
     * - Kiểm tra xem hệ thống có áp dụng cả điều kiện lọc thương hiệu và điều kiện sắp xếp giá cho sản phẩm chính hay không.
     * @Dữ liệu đầu vào: `req.query = { brand: 'brand1', sortKey: 'price', sortValue: 'asc' }`.
     * @Kết quả mong đợi:
     * - Hệ thống tìm sản phẩm thuộc 'brand1'.
     * - Danh sách sản phẩm chính của 'brand1' được sắp xếp theo giá tăng dần.
     */
    test('should filter by brand AND sort by price ascending', async () => {
      mockReq.query = { brand: 'brand1', sortKey: 'price', sortValue: 'asc' };
      const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      // Both products belong to brand1, mockProductRaw3LowPrice is cheaper
      const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([{...mockProductRaw3LowPrice}, {...mockProductRaw1}]) };
      Product.find.mockImplementationOnce(() => saleProductsChain).mockImplementationOnce(() => mainProductsChain);
      Product.countDocuments.mockResolvedValue(2);

      await productController.index(mockReq, mockRes);
      const expectedFindObject = { status: "active", deleted: false, brand_id: 'brand1' };
      expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
      expect(mainProductsChain.sort).toHaveBeenCalledWith({ price: "asc" });
      expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
        products: [mockProductProcessed3LowPrice, mockProductProcessed1],
      }));
    });


    /**
     * @Chức năng: Lọc sản phẩm chỉ theo loại (type).
     * @Mô tả kiểm thử:
     * - Người dùng chọn lọc sản phẩm theo một loại cụ thể (ví dụ: 'Low-top', tương ứng index '0').
     * - Giả lập cơ sở dữ liệu trả về sản phẩm thuộc loại này.
     * - Kiểm tra xem hệ thống có tìm kiếm sản phẩm dựa trên đúng loại đã chọn hay không.
     * @Dữ liệu đầu vào: `req.query = { type: '0' }`.
     * @Kết quả mong đợi:
     * - Hệ thống tìm kiếm sản phẩm với điều kiện `type` là "Low-top".
     * - Trang danh sách sản phẩm hiển thị các sản phẩm "Low-top".
     */
    test('should filter by type ONLY', async () => {
      mockReq.query = { type: '0' }; // SiderVar.type[0] is "Low-top"
      const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([{...mockProductRaw1}]) }; // mockProductRaw1 is Low-top
      Product.find.mockImplementationOnce(() => saleProductsChain).mockImplementationOnce(() => mainProductsChain);
      Product.countDocuments.mockResolvedValue(1);

      await productController.index(mockReq, mockRes);
      const expectedFindObject = { status: "active", deleted: false, type: { $in: ["Low-top"] } };
      expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
        products: [mockProductProcessed1],
      }));
    });

    /**
     * @Chức năng: Lọc sản phẩm chỉ theo khoảng giá chọn từ radio button (priceRadio).
     * @Mô tả kiểm thử:
     * - Người dùng chọn một khoảng giá từ các lựa chọn có sẵn (ví dụ: giá dưới 500,000, tương ứng index '0').
     * - Giả lập cơ sở dữ liệu trả về sản phẩm trong khoảng giá này.
     * - Kiểm tra xem hệ thống có tìm kiếm sản phẩm với điều kiện giá nhỏ hơn mức đã chọn hay không.
     * @Dữ liệu đầu vào: `req.query = { priceRadio: '0' }`.
     * @Kết quả mong đợi:
     * - Hệ thống tìm kiếm sản phẩm với điều kiện `price` nhỏ hơn 500,000.
     * - Trang danh sách sản phẩm hiển thị các sản phẩm phù hợp.
     */
    test('should filter by priceRadio ONLY', async () => {
      mockReq.query = { priceRadio: '0' }; // SiderVar.price[0] is 500000, so price < 500000
      const productCheaper = { ...mockProductRaw1, price: 400000 }; // This product is cheaper
      const productCheaperProcessed = { ...productCheaper, newPrice: (400000 * (100-10)/100).toFixed(0) };

      const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([productCheaper]) };
      Product.find.mockImplementationOnce(() => saleProductsChain).mockImplementationOnce(() => mainProductsChain);
      Product.countDocuments.mockResolvedValue(1);

      await productController.index(mockReq, mockRes);
      const expectedFindObject = { status: "active", deleted: false, price: { $lt: 500000 } };
      expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
        products: [productCheaperProcessed],
      }));
    });

    /**
     * @Chức năng: Kết hợp lọc sản phẩm theo loại (type) VÀ khoảng giá (priceRadio).
     * @Mô tả kiểm thử:
     * - Người dùng chọn cả loại sản phẩm (ví dụ: 'High-top', index '2') và khoảng giá (ví dụ: dưới 3,000,000, index '3').
     * - Giả lập cơ sở dữ liệu trả về sản phẩm thỏa mãn cả hai điều kiện.
     * - Kiểm tra xem hệ thống có áp dụng cả hai điều kiện lọc này khi tìm kiếm sản phẩm không.
     * @Dữ liệu đầu vào: `req.query = { type: '2', priceRadio: '3' }`.
     * @Kết quả mong đợi:
     * - Hệ thống tìm kiếm sản phẩm là "High-top" VÀ có giá nhỏ hơn 3,000,000.
     */
    test('should filter by type AND priceRadio', async () => {
        mockReq.query = { type: '2', priceRadio: '3' }; // SiderVar.type[2] is "High-top", SiderVar.price[3] is 3000000
        const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
        // mockProductRaw2 is High-top and price 2,000,000 (which is < 3,000,000)
        const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([{...mockProductRaw2}]) };
        Product.find.mockImplementationOnce(() => saleProductsChain).mockImplementationOnce(() => mainProductsChain);
        Product.countDocuments.mockResolvedValue(1);

        await productController.index(mockReq, mockRes);
        const expectedFindObject = {
            status: "active",
            deleted: false,
            type: { $in: ["High-top"] },
            price: { $lt: 3000000 }
        };
        expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
        expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
            products: [mockProductProcessed2],
        }));
    });

    /**
     * @Chức năng: Lọc sản phẩm theo khoảng giá nhập từ người dùng (priceInput).
     * @Mô tả kiểm thử:
     * - Người dùng nhập một khoảng giá cụ thể (ví dụ: từ 1,000,000 đến 2,000,000).
     * - Giả lập cơ sở dữ liệu trả về sản phẩm nằm trong khoảng giá này.
     * - Kiểm tra xem hệ thống có tìm kiếm sản phẩm với điều kiện giá lớn hơn mức dưới và nhỏ hơn mức trên hay không.
     * @Dữ liệu đầu vào: `req.query = { priceInput: '1000000-2000000' }`.
     * @Kết quả mong đợi:
     * - Hệ thống tìm kiếm sản phẩm có giá trong khoảng (1,000,000, 2,000,000).
     */
    test('should filter by priceInput', async () => {
        mockReq.query = { priceInput: '1000000-2000000' };
        const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
        // mockProductRaw1 has price 1,500,000
        const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([{...mockProductRaw1}]) };
        Product.find.mockImplementationOnce(() => saleProductsChain).mockImplementationOnce(() => mainProductsChain);
        Product.countDocuments.mockResolvedValue(1);

        await productController.index(mockReq, mockRes);
        const expectedFindObject = {
            status: "active",
            deleted: false,
            price: { $gt: 1000000, $lt: 2000000 }
        };
        expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
        expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
            products: [mockProductProcessed1],
        }));
    });

    /**
     * @Chức năng: Xử lý trường hợp người dùng nhập `priceInput` không hợp lệ (ví dụ: chỉ có một giá trị).
     * @Mô tả kiểm thử:
     * - Người dùng nhập `priceInput` thiếu một trong hai giới hạn giá (ví dụ: '1000000-').
     * - Hệ thống nên bỏ qua bộ lọc giá này và tìm kiếm sản phẩm mà không có điều kiện về giá từ `priceInput`.
     * @Dữ liệu đầu vào: `req.query = { priceInput: '1000000-' }`.
     * @Kết quả mong đợi:
     * - Điều kiện lọc theo `priceInput` không được thêm vào truy vấn tìm kiếm sản phẩm.
     * - Hệ thống tìm kiếm sản phẩm dựa trên các bộ lọc hợp lệ khác (nếu có) hoặc không có bộ lọc giá.
     */
    test('should not add price filter if priceInput is invalid (e.g., one value)', async () => {
        mockReq.query = { priceInput: '1000000-' }; // Missing second value
        const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
        const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([]) };
        Product.find.mockImplementationOnce(() => saleProductsChain).mockImplementationOnce(() => mainProductsChain);
        Product.countDocuments.mockResolvedValue(0);

        await productController.index(mockReq, mockRes);
        const expectedFindObject = { status: "active", deleted: false }; // No price filter from priceInput
        expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
    });

    /**
     * @Chức năng: Xử lý trường hợp người dùng chọn một `type` không hợp lệ (ví dụ: chỉ số nằm ngoài phạm vi của danh sách loại sản phẩm).
     * @Mô tả kiểm thử:
     * - Người dùng cung cấp một chỉ số `type` không tồn tại (ví dụ: '10').
     * - Hệ thống sẽ cố gắng tìm sản phẩm với loại là `undefined` (không xác định).
     * - Kiểm tra xem truy vấn tìm kiếm có thực sự bao gồm điều kiện `type: {$in: [undefined]}` hay không.
     * @Dữ liệu đầu vào: `req.query = { type: '10' }`.
     * @Kết quả mong đợi:
     * - Hệ thống tìm kiếm sản phẩm với điều kiện `type` là không xác định (`undefined`).
     */
    test('should handle invalid type index by creating a query with undefined', async () => {
        mockReq.query = { type: '10' }; // Index out of bounds for siderVar.type
        const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
        const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([]) };
        Product.find.mockImplementationOnce(() => saleProductsChain).mockImplementationOnce(() => mainProductsChain);
        Product.countDocuments.mockResolvedValue(0);

        await productController.index(mockReq, mockRes);
        const expectedFindObject = { status: "active", deleted: false, type: {$in: [undefined]} }; // siderVar.type[10] is undefined
        expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
    });


  });

  // --- Tests for module.exports.detail ---
  describe('detail - [GET] /products/detail/:slug', () => {
    /**
     * @Chức năng: Hiển thị trang chi tiết của một sản phẩm khi sản phẩm đó tồn tại và có thông tin danh mục liên quan.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập vào đường dẫn chi tiết của một sản phẩm cụ thể (ví dụ: '/products/detail/product-1').
     * - Giả lập rằng cơ sở dữ liệu tìm thấy sản phẩm tương ứng với 'product-1'.
     * - Giả lập rằng sản phẩm này có một mã danh mục (`category_id`) và cơ sở dữ liệu cũng tìm thấy thông tin danh mục đó.
     * - Kiểm tra xem hệ thống có hiển thị đúng trang chi tiết sản phẩm, với đầy đủ thông tin sản phẩm (đã tính giá mới) và thông tin danh mục của nó.
     * @Dữ liệu đầu vào: Đường dẫn URL chứa `slug = 'product-1'`.
     * @Kết quả mong đợi:
     * - Trang chi tiết sản phẩm được hiển thị.
     * - Thông tin sản phẩm bao gồm giá đã được tính toán lại (`newPrice`).
     * - Thông tin danh mục của sản phẩm cũng được hiển thị kèm theo.
     */
    test('should render product detail page when product and category exist', async () => {
      mockReq.params.slug = 'product-1';
      Product.findOne.mockResolvedValue({...mockProductRaw1}); // Giả lập tìm thấy sản phẩm
      ProductCategory.findOne.mockResolvedValue({...mockCategory1}); // Giả lập tìm thấy danh mục của sản phẩm

      await productController.detail(mockReq, mockRes);

      expect(Product.findOne).toHaveBeenCalledWith({ deleted: false, status: 'active', slug: 'product-1' });
      expect(ProductCategory.findOne).toHaveBeenCalledWith({ _id: 'cat1', status: "active", deleted: false });
      expect(mockRes.render).toHaveBeenCalledWith("client/page/product/detail", expect.objectContaining({
        product: expect.objectContaining({ ...mockProductRaw1, category: mockCategory1, newPrice: mockProductProcessed1.newPrice }),
      }));
    });

    /**
     * @Chức năng: Hiển thị trang chi tiết của một sản phẩm khi sản phẩm đó tồn tại nhưng không có thông tin danh mục (không có `category_id`).
     * @Mô tả kiểm thử:
     * - Người dùng truy cập vào đường dẫn chi tiết của một sản phẩm (ví dụ: '/products/detail/product-no-cat').
     * - Giả lập rằng cơ sở dữ liệu tìm thấy sản phẩm này, nhưng sản phẩm không có `category_id` (mã danh mục).
     * - Kiểm tra xem hệ thống có hiển thị đúng trang chi tiết sản phẩm với thông tin sản phẩm (đã tính giá mới) mà không cố gắng tìm hay hiển thị thông tin danh mục.
     * @Dữ liệu đầu vào: Đường dẫn URL chứa `slug = 'product-no-cat'`.
     * @Kết quả mong đợi:
     * - Trang chi tiết sản phẩm được hiển thị.
     * - Thông tin sản phẩm bao gồm giá đã được tính toán lại (`newPrice`).
     * - Không có thông tin danh mục nào được tìm kiếm hay hiển thị.
     */
    test('should render product detail page when product exists but has no category_id', async () => {
      mockReq.params.slug = 'product-no-cat';
      const productNoCat = { ...mockProductRaw2, category_id: undefined, slug: 'product-no-cat' }; // Sản phẩm không có category_id
      Product.findOne.mockResolvedValue(productNoCat);

      await productController.detail(mockReq, mockRes);

      expect(ProductCategory.findOne).not.toHaveBeenCalled(); // Không tìm danh mục
      const renderedProduct = mockRes.render.mock.calls[0][1].product;
      expect(renderedProduct.category).toBeUndefined(); // Không có thông tin danh mục trong dữ liệu render
    });

    /**
     * @Chức năng: Chuyển hướng người dùng về trang danh sách sản phẩm nếu sản phẩm không được tìm thấy.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập vào đường dẫn chi tiết của một sản phẩm không tồn tại (ví dụ: '/products/detail/non-existent-product').
     * - Giả lập rằng cơ sở dữ liệu không tìm thấy sản phẩm nào với slug này.
     * - Kiểm tra xem hệ thống có chuyển hướng người dùng về trang `/products` hay không.
     * @Dữ liệu đầu vào: Đường dẫn URL chứa `slug = 'non-existent-product'`.
     * @Kết quả mong đợi:
     * - Người dùng được chuyển hướng đến trang `/products`.
     * - Không có trang nào được hiển thị (render).
     */
    test('should redirect to /products if product is not found', async () => {
      mockReq.params.slug = 'non-existent-product';
      Product.findOne.mockResolvedValue(null); // Giả lập không tìm thấy sản phẩm
      await productController.detail(mockReq, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith('/products');
    });

    /**
     * @Chức năng: Xử lý lỗi và chuyển hướng khi có sự cố lúc tìm kiếm sản phẩm trong cơ sở dữ liệu.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập trang chi tiết sản phẩm.
     * - Giả lập rằng việc truy vấn cơ sở dữ liệu để tìm sản phẩm (`Product.findOne`) gặp lỗi (ví dụ: mất kết nối CSDL).
     * - Kiểm tra xem hệ thống có bắt được lỗi này và chuyển hướng người dùng về trang `/products` hay không, nhờ vào khối `try...catch` trong controller.
     * @Dữ liệu đầu vào: Bất kỳ `slug` nào, và `Product.findOne` được giả lập để gây lỗi.
     * @Kết quả mong đợi:
     * - Người dùng được chuyển hướng đến trang `/products`.
     */
    test('should redirect to /products if Product.findOne throws an error', async () => {
        mockReq.params.slug = 'any-slug';
        Product.findOne.mockRejectedValue(new Error("DB error")); // Giả lập lỗi CSDL
        await productController.detail(mockReq, mockRes);
        expect(mockRes.redirect).toHaveBeenCalledWith('/products');
    });

    /**
     * @Chức năng: Xử lý lỗi và chuyển hướng khi có sự cố lúc tìm kiếm danh mục của sản phẩm.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập trang chi tiết sản phẩm.
     * - Giả lập rằng sản phẩm được tìm thấy thành công và có `category_id`.
     * - Tuy nhiên, giả lập rằng việc truy vấn cơ sở dữ liệu để tìm thông tin danh mục (`ProductCategory.findOne`) gặp lỗi.
     * - Kiểm tra xem hệ thống có bắt được lỗi này và chuyển hướng người dùng về trang `/products` hay không.
     * @Dữ liệu đầu vào: `slug` của sản phẩm có `category_id`, và `ProductCategory.findOne` được giả lập để gây lỗi.
     * @Kết quả mong đợi:
     * - Người dùng được chuyển hướng đến trang `/products`.
     */
    test('should redirect to /products if ProductCategory.findOne throws an error', async () => {
        mockReq.params.slug = 'product-1';
        Product.findOne.mockResolvedValue({...mockProductRaw1}); // Sản phẩm tìm thấy, có category_id
        ProductCategory.findOne.mockRejectedValue(new Error("Category DB error")); // Lỗi khi tìm danh mục

        await productController.detail(mockReq, mockRes);
        expect(mockRes.redirect).toHaveBeenCalledWith('/products');
    });
  });

  // --- Tests for module.exports.productOfCategory ---
  describe('productOfCategory - [GET] /products/:slugCategory', () => {
    /**
     * @Chức năng: Hiển thị danh sách sản phẩm thuộc một danh mục cụ thể (không có danh mục con và không có bộ lọc nào được áp dụng).
     * @Mô tả kiểm thử:
     * - Người dùng truy cập vào trang của một danh mục (ví dụ: '/products/category-1').
     * - Giả lập rằng danh mục 'category-1' được tìm thấy trong cơ sở dữ liệu.
     * - Giả lập rằng danh mục này không có danh mục con.
     * - Giả lập rằng có một số sản phẩm thuộc danh mục này.
     * - Kiểm tra xem hệ thống có hiển thị đúng trang danh sách sản phẩm, với tiêu đề trang là tên của danh mục,
     * và danh sách sản phẩm chỉ chứa các sản phẩm thuộc danh mục đó (và các danh mục con, nếu có).
     * @Dữ liệu đầu vào: Đường dẫn URL chứa `slugCategory = 'category-1'`, không có tham số query.
     * @Kết quả mong đợi:
     * - Trang danh sách sản phẩm được hiển thị với tiêu đề là "Category 1".
     * - Hệ thống tìm kiếm sản phẩm với điều kiện `category_id` là ID của 'category-1'.
     * - Danh sách sản phẩm hiển thị các sản phẩm thuộc 'category-1'.
     * - Danh sách sản phẩm sale chung vẫn được hiển thị.
     */
    test('should render products for a category with no subcategories and no filters', async () => {
      mockReq.params.slugCategory = 'category-1';
      ProductCategory.findOne.mockResolvedValue({...mockCategory1}); // Tìm thấy danh mục chính
      CategoryHelper.getSubCategory.mockResolvedValue([]); // Không có danh mục con

      const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([{...mockProductRaw1}]) }; // mockProductRaw1 thuộc category-1
      const saleProductsChainGeneral = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{...mockSaleProductRaw}]) };

      Product.find
        .mockImplementationOnce((query) => { // Truy vấn sản phẩm chính theo danh mục
            if (query.category_id && query.category_id.$in && query.category_id.$in.includes(mockCategory1._id)) {
                return mainProductsChain;
            }
            return { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([]) };
        })
        .mockImplementationOnce((query) => { // Truy vấn sản phẩm sale chung
             if(Object.keys(query).length === 2 && query.status === "active" && query.deleted === false) {
                return saleProductsChainGeneral;
             }
             return { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
        });


      Product.countDocuments.mockResolvedValue(1); // Đếm sản phẩm trong danh mục

      await productController.productOfCategory(mockReq, mockRes);

      expect(ProductCategory.findOne).toHaveBeenCalledWith({ slug: 'category-1', deleted: false });
      expect(CategoryHelper.getSubCategory).toHaveBeenCalledWith(mockCategory1._id);
      const expectedFindObject = { status: "active", deleted: false, category_id: { $in: [mockCategory1._id] } };
      expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
        pageTitle: mockCategory1.title,
        products: [mockProductProcessed1],
        saleProducts: [mockSaleProductProcessed]
      }));
    });

    /**
     * @Chức năng: Hiển thị sản phẩm của một danh mục cha, bao gồm cả sản phẩm từ các danh mục con, và áp dụng bộ lọc theo thương hiệu.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập trang của một danh mục cha (ví dụ: '/products/parent-cat').
     * - Người dùng cũng chọn lọc theo một thương hiệu cụ thể (ví dụ: 'brand2').
     * - Giả lập rằng danh mục cha 'parent-cat' được tìm thấy.
     * - Giả lập rằng danh mục cha này có một danh mục con.
     * - Giả lập rằng có sản phẩm thuộc thương hiệu 'brand2' và nằm trong danh mục cha hoặc danh mục con.
     * - Kiểm tra xem hệ thống có tìm kiếm sản phẩm dựa trên ID của cả danh mục cha và danh mục con, đồng thời áp dụng bộ lọc thương hiệu.
     * @Dữ liệu đầu vào: Đường dẫn URL `slugCategory = 'parent-cat'`, tham số query `brand = 'brand2'`.
     * @Kết quả mong đợi:
     * - Trang danh sách sản phẩm được hiển thị với tiêu đề là tên của danh mục cha.
     * - Hệ thống tìm kiếm sản phẩm với điều kiện `category_id` bao gồm ID của cả danh mục cha và con, VÀ `brand_id` là 'brand2'.
     * - Danh sách sản phẩm hiển thị các sản phẩm phù hợp.
     */
    test('should render products for a category with subcategories and brand filter', async () => {
      mockReq.params.slugCategory = 'parent-cat';
      mockReq.query = { brand: 'brand2' };
      const parentCat = { _id: 'parent1', title: 'Parent Category', slug: 'parent-cat', toObject: function() { return this; } };
      const subCat = { id: 'sub1', title: 'Sub Category 1', toObject: function() { return this; } }; // Giả sử getSubCategory trả về item có .id
      ProductCategory.findOne.mockResolvedValue(parentCat);
      CategoryHelper.getSubCategory.mockResolvedValue([subCat]);

      // mockProductRaw2 thuộc brand2, giả sử nó thuộc parentCat hoặc subCat
      const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([{...mockProductRaw2}]) };
      const saleProductsChainGeneral = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) }; // Không có sản phẩm sale cho đơn giản
      Product.find.mockImplementationOnce(() => mainProductsChain).mockImplementationOnce(() => saleProductsChainGeneral);
      Product.countDocuments.mockResolvedValue(1);

      await productController.productOfCategory(mockReq, mockRes);

      const expectedFindObject = {
        status: "active",
        deleted: false,
        category_id: { $in: [parentCat._id, subCat.id] }, // Bao gồm cả cha và con
        brand_id: 'brand2' // Lọc theo brand
      };
      expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObject);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/product/index", expect.objectContaining({
        pageTitle: parentCat.title,
        products: [mockProductProcessed2],
      }));
    });

    /**
     * @Chức năng: Xử lý trường hợp không tìm thấy danh mục sản phẩm (slug không tồn tại).
     * @Mô tả kiểm thử:
     * - Người dùng truy cập trang của một danh mục với slug không tồn tại (ví dụ: '/products/non-existent-cat').
     * - Giả lập rằng `ProductCategory.findOne` trả về `null` (không tìm thấy).
     * - Controller hiện tại (với `try...catch` cho toàn bộ hàm `productOfCategory` đang bị comment) sẽ cố gắng truy cập `productCategory.id` trên một đối tượng `null`, gây ra lỗi `TypeError`.
     * - Test này kiểm tra xem lỗi `TypeError` có thực sự xảy ra hay không.
     * (Nếu `try...catch` được bỏ comment và hoạt động, hành vi mong đợi sẽ là chuyển hướng đến `/products`).
     * @Dữ liệu đầu vào: Đường dẫn URL `slugCategory = 'non-existent-cat'`.
     * @Kết quả mong đợi:
     * - Hàm controller ném ra lỗi `TypeError`.
     * - Không có trang nào được render.
     */
    test('should throw TypeError if category is not found (due to current code structure)', async () => {
        mockReq.params.slugCategory = 'non-existent-cat';
        ProductCategory.findOne.mockResolvedValue(null); // Danh mục không tìm thấy
        // Vì try...catch tổng trong productOfCategory đang bị comment, lỗi sẽ nổi lên
        await expect(productController.productOfCategory(mockReq, mockRes)).rejects.toThrow(TypeError);
        expect(mockRes.render).not.toHaveBeenCalled();
    });

    /**
     * @Chức năng: Xử lý lỗi khi hàm helper `CategoryHelper.getSubCategory` gặp sự cố.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập trang của một danh mục.
     * - Giả lập rằng danh mục chính được tìm thấy thành công.
     * - Tuy nhiên, giả lập rằng hàm `CategoryHelper.getSubCategory` (dùng để lấy danh mục con) gây ra lỗi.
     * - Controller hiện tại (với `try...catch` tổng đang bị comment) sẽ không bắt được lỗi này từ helper và sẽ bị crash.
     * - Test này kiểm tra xem lỗi từ helper có thực sự làm controller bị crash hay không.
     * @Dữ liệu đầu vào: `slugCategory` hợp lệ, nhưng `CategoryHelper.getSubCategory` được mock để `reject` một Promise.
     * @Kết quả mong đợi:
     * - Hàm controller ném ra lỗi ( lỗi này bắt nguồn từ `CategoryHelper.getSubCategory`).
     * - Không có trang nào được render.
     */
    test('should throw an error if CategoryHelper.getSubCategory fails (due to current code structure)', async () => {
        mockReq.params.slugCategory = 'category-1';
        ProductCategory.findOne.mockResolvedValue({...mockCategory1}); // Danh mục chính tìm thấy
        CategoryHelper.getSubCategory.mockRejectedValue(new Error("Helper error")); // Helper gây lỗi

        await expect(productController.productOfCategory(mockReq, mockRes)).rejects.toThrow("Helper error");
        expect(mockRes.render).not.toHaveBeenCalled();
    });

    /**
     * @Chức năng: Xử lý `priceInput` không hợp lệ (ví dụ: chỉ một giá trị) trong trang danh mục sản phẩm.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập trang của một danh mục và nhập `priceInput` thiếu một giới hạn giá (ví dụ: '1000000-').
     * - Hệ thống nên bỏ qua bộ lọc giá không hợp lệ này và chỉ lọc theo danh mục (và các bộ lọc hợp lệ khác nếu có).
     * @Dữ liệu đầu vào: `slugCategory = 'category-1'`, `req.query = { priceInput: "1000000-" }`.
     * @Kết quả mong đợi:
     * - Điều kiện lọc theo `priceInput` không được thêm vào truy vấn tìm kiếm sản phẩm.
     * - Hệ thống tìm sản phẩm chỉ dựa trên danh mục.
     */
    test('productOfCategory should not add price filter if priceInput is invalid (one value)', async () => {
        mockReq.params.slugCategory = 'category-1';
        mockReq.query = { priceInput: "1000000-" }; // priceInput không hợp lệ

        ProductCategory.findOne.mockResolvedValue({...mockCategory1});
        CategoryHelper.getSubCategory.mockResolvedValue([]); // Không có danh mục con

        const mainProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([]) };
        const saleProductsChainGeneral = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
        Product.find.mockImplementationOnce(() => mainProductsChain).mockImplementationOnce(() => saleProductsChainGeneral);
        Product.countDocuments.mockResolvedValue(0);

        await productController.productOfCategory(mockReq, mockRes);

        const expectedFindObjectForCount = {
            status: "active",
            deleted: false,
            category_id: { $in: [mockCategory1._id] }
            // Không có điều kiện price từ priceInput ở đây
        };
        expect(Product.countDocuments).toHaveBeenCalledWith(expectedFindObjectForCount);
    });

  });
});
