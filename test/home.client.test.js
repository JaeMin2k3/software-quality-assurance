// __tests__/home.controller.test.js

// Mock all dependencies used by home.controller.js
jest.mock('../config/system', () => ({}));
jest.mock('../model/products-category.model');
jest.mock('../model/products.model');
jest.mock('../model/accounts.model', () => ({}));
jest.mock('../model/artical-categoty.model');
jest.mock('../helper/createTree', () => ({
  tree: jest.fn(),
}));

const productsCategoryModel = require('../model/products-category.model');
const productModel = require('../model/products.model');
const articalCategoryModel = require('../model/artical-categoty.model');
const createTreeHelper = require('../helper/createTree');

const homeController = require('../controllers/client/home.controller'); // Điều chỉnh đường dẫn nếu cần

describe('Home Controller - index method', () => {
  let mockReq, mockRes;

  // Dữ liệu mock chung cho các sản phẩm
  const mockProductRaw1 = { _id: 'p1', title: 'Product 1', price: 100, discountPercentage: 10, featured: "1", position: 1, toObject: function() { return this; } };
  const mockProductRaw2 = { _id: 'p2', title: 'Product 2', price: 200, discountPercentage: 0, position: 10, toObject: function() { return this; } };
  const mockProductRaw3 = { _id: 'p3', title: 'Product 3', price: 300, discountPercentage: 50, position: 3, toObject: function() { return this; } };
  const mockProductRaw4 = { _id: 'p4', title: 'Product 4', price: 50, discountPercentage: 5, featured: "1", position: 2, toObject: function() { return this; } };


  // Dữ liệu mock đã xử lý newPrice
  const mockProcessedProduct1 = { ...mockProductRaw1, newPrice: "90" };
  const mockProcessedProduct2 = { ...mockProductRaw2, newPrice: "200" };
  const mockProcessedProduct3 = { ...mockProductRaw3, newPrice: "150" };
  const mockProcessedProduct4 = { ...mockProductRaw4, newPrice: "48" };


  // Dữ liệu mock cho danh mục
  const mockProdCat1 = { _id: 'cat1', title: 'Electronics', toObject: function() { return this; } };
  const mockArtCat1 = { _id: 'artcat1', title: 'Tech News', toObject: function() { return this; } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {};
    mockRes = {
      render: jest.fn(),
    };

    // Thiết lập mock mặc định cho các hàm find, có thể ghi đè trong từng test
    productModel.find.mockImplementation((query) => {
      if (query.featured === "1") {
        return Promise.resolve([]);
      }
      // For chained calls, return an object with chainable methods
      return {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
    });
    productsCategoryModel.find.mockResolvedValue([]);
    articalCategoryModel.find.mockResolvedValue([]);
  });

  describe('Fetching Featured Products', () => {
    /**
     * @Chức năng: Kiểm tra việc lấy và xử lý sản phẩm nổi bật.
     * @Mô tả kiểm thử:
     * - Mock `productModel.find` để trả về một danh sách sản phẩm thô khi truy vấn sản phẩm nổi bật.
     * - Các lời gọi `find` khác được mock để trả về mảng rỗng nhằm cô lập test.
     * - Gọi hàm `homeController.index`.
     * - Kiểm tra `productModel.find` được gọi với đúng tham số cho sản phẩm nổi bật.
     * - Kiểm tra `res.render` được gọi với `featuredProducts` đã được xử lý (có `newPrice`).
     * @Dữ liệu đầu vào:
     * - `mockProductRaw1`, `mockProductRaw4` (sản phẩm thô).
     * @Kết quả mong đợi:
     * - `productModel.find` được gọi với `{ deleted: false, status: "active", featured: "1" }`.
     * - `res.render` được gọi với `featuredProducts` là `[mockProcessedProduct1, mockProcessedProduct4]`.
     */
    // ID: HO_001
    test('should fetch and process featured products correctly', async () => {
      const mockFeaturedRaw = [mockProductRaw1, mockProductRaw4];
      productModel.find.mockImplementationOnce(query => { // Mock cho featured products
        if (query.deleted === false && query.status === "active" && query.featured === "1") {
          return Promise.resolve(mockFeaturedRaw.map(p => ({...p})));
        }
        return Promise.resolve([]);
      });
      // Mock các find khác trả về mảng rỗng để cô lập test này
       productModel.find.mockImplementationOnce(() => ({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) })); // latest
       productModel.find.mockImplementationOnce(() => ({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) })); // sale


      await homeController.index(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledWith({ deleted: false, status: "active", featured: "1" });
      const renderArgs = mockRes.render.mock.calls[0][1];
      expect(renderArgs.featuredProducts).toEqual([mockProcessedProduct1, mockProcessedProduct4]);
    });
  });

  describe('Fetching Latest Products', () => {
    /**
     * @Chức năng: Kiểm tra việc lấy, sắp xếp, giới hạn và xử lý sản phẩm mới nhất.
     * @Mô tả kiểm thử:
     * - Mock `productModel.find` cho sản phẩm nổi bật trả về mảng rỗng.
     * - Mock `productModel.find` cho sản phẩm mới nhất trả về một đối tượng có thể chain `sort` và `limit`, với `limit` trả về danh sách sản phẩm thô.
     * - Mock `productModel.find` cho sản phẩm giảm giá trả về mảng rỗng (thông qua chain).
     * - Gọi hàm `homeController.index`.
     * - Kiểm tra `productModel.find` được gọi với đúng tham số cho sản phẩm mới nhất.
     * - Kiểm tra `sort` được gọi với `{ position: "desc" }`.
     * - Kiểm tra `limit` được gọi với `6`.
     * - Kiểm tra `res.render` được gọi với `lastestProducts` đã được xử lý.
     * @Dữ liệu đầu vào:
     * - `mockProductRaw2`, `mockProductRaw1` (sản phẩm thô cho "latest").
     * @Kết quả mong đợi:
     * - `productModel.find` (lần 2) được gọi với `{ deleted: false, status: "active" }`.
     * - `latestProductsChain.sort` được gọi với `{ position: "desc" }`.
     * - `latestProductsChain.limit` được gọi với `6`.
     * - `res.render` được gọi với `lastestProducts` là `[mockProcessedProduct2, mockProcessedProduct1]`.
     */
    // ID: HO_002
    test('should fetch, sort, limit, and process latest products correctly', async () => {
      const mockLatestRaw = [mockProductRaw2, mockProductRaw1];
      const latestProductsChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockLatestRaw.map(p => ({...p}))),
      };
      productModel.find.mockImplementationOnce(query => Promise.resolve([])); // featured
      productModel.find.mockImplementationOnce(query => { // latest
        if (query.deleted === false && query.status === "active") {
          return latestProductsChain;
        }
        return { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      });
      productModel.find.mockImplementationOnce(() => ({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) })); // sale


      await homeController.index(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledWith({ deleted: false, status: "active" }); // Lần gọi thứ 2
      expect(latestProductsChain.sort).toHaveBeenCalledWith({ position: "desc" });
      expect(latestProductsChain.limit).toHaveBeenCalledWith(6);
      const renderArgs = mockRes.render.mock.calls[0][1];
      expect(renderArgs.lastestProducts).toEqual([mockProcessedProduct2, mockProcessedProduct1]);
    });
  });

  describe('Fetching Sale Products', () => {
    /**
     * @Chức năng: Kiểm tra việc lấy, sắp xếp, giới hạn và xử lý sản phẩm giảm giá.
     * @Mô tả kiểm thử:
     * - Mock `productModel.find` cho sản phẩm nổi bật và mới nhất trả về mảng rỗng (hoặc chain rỗng).
     * - Mock `productModel.find` cho sản phẩm giảm giá trả về một đối tượng có thể chain `sort` và `limit`, với `limit` trả về danh sách sản phẩm thô.
     * - Gọi hàm `homeController.index`.
     * - Kiểm tra `productModel.find` được gọi với đúng tham số cho sản phẩm giảm giá.
     * - Kiểm tra `sort` được gọi với `{ discountPercentage: "desc" }`.
     * - Kiểm tra `limit` được gọi với `6`.
     * - Kiểm tra `res.render` được gọi với `saleProducts` đã được xử lý.
     * @Dữ liệu đầu vào:
     * - `mockProductRaw3`, `mockProductRaw1` (sản phẩm thô cho "sale").
     * @Kết quả mong đợi:
     * - `productModel.find` (lần 3) được gọi với `{ deleted: false, status: "active" }`.
     * - `saleProductsChain.sort` được gọi với `{ discountPercentage: "desc" }`.
     * - `saleProductsChain.limit` được gọi với `6`.
     * - `res.render` được gọi với `saleProducts` là `[mockProcessedProduct3, mockProcessedProduct1]`.
     */
    // ID: HO_003
    test('should fetch, sort, limit, and process sale products correctly', async () => {
      const mockSaleRaw = [mockProductRaw3, mockProductRaw1];
       const saleProductsChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockSaleRaw.map(p => ({...p}))),
      };
      productModel.find.mockImplementationOnce(query => Promise.resolve([])); // featured
      productModel.find.mockImplementationOnce(() => ({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) })); // latest
      productModel.find.mockImplementationOnce(query => { // sale
        if (query.deleted === false && query.status === "active") {
          return saleProductsChain;
        }
        return { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      });

      await homeController.index(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledWith({ deleted: false, status: "active" }); // Lần gọi thứ 3
      expect(saleProductsChain.sort).toHaveBeenCalledWith({ discountPercentage: "desc" });
      expect(saleProductsChain.limit).toHaveBeenCalledWith(6);
      const renderArgs = mockRes.render.mock.calls[0][1];
      expect(renderArgs.saleProducts).toEqual([mockProcessedProduct3, mockProcessedProduct1]);
    });
  });

  describe('Fetching Product Categories', () => {
    /**
     * @Chức năng: Kiểm tra việc lấy danh mục sản phẩm.
     * @Mô tả kiểm thử:
     * - Mock `productsCategoryModel.find` để trả về một danh sách danh mục.
     * - Các lời gọi `find` cho sản phẩm được mock để trả về mảng rỗng/chain rỗng.
     * - Gọi hàm `homeController.index`.
     * - Kiểm tra `productsCategoryModel.find` được gọi với đúng tham số.
     * - Kiểm tra `res.render` được gọi với `productCategorys` là danh sách đã mock.
     * - Kiểm tra `createTreeHelper.tree` không được gọi (vì nó bị comment trong code gốc).
     * @Dữ liệu đầu vào:
     * - `mockProdCat1`, `{ _id: 'cat2', title: 'Books', ... }` (danh mục sản phẩm).
     * @Kết quả mong đợi:
     * - `productsCategoryModel.find` được gọi với `{ deleted: false, status: "active" }`.
     * - `res.render` được gọi với `productCategorys` chứa dữ liệu mock.
     * - `createTreeHelper.tree` không được gọi.
     */
    // ID: HO_004
    test('should fetch product categories correctly', async () => {
      const mockProductCategories = [mockProdCat1, { _id: 'cat2', title: 'Books', toObject: function() { return this; } }];
      productsCategoryModel.find.mockResolvedValue(mockProductCategories.map(c => ({...c})));
      productModel.find.mockImplementation(query => { // Mock chung cho các product find trong test này
        if (query.featured === "1") return Promise.resolve([]);
        return { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      });


      await homeController.index(mockReq, mockRes);

      expect(productsCategoryModel.find).toHaveBeenCalledWith({ deleted: false, status: "active" });
      const renderArgs = mockRes.render.mock.calls[0][1];
      expect(renderArgs.productCategorys).toEqual(mockProductCategories);
      expect(createTreeHelper.tree).not.toHaveBeenCalled();
    });
  });

  describe('Fetching Article Categories', () => {
    /**
     * @Chức năng: Kiểm tra việc lấy danh mục bài viết.
     * @Mô tả kiểm thử:
     * - Mock `articalCategoryModel.find` để trả về một danh sách danh mục bài viết.
     * - Các lời gọi `find` cho sản phẩm và danh mục sản phẩm được mock để trả về mảng rỗng/chain rỗng.
     * - Gọi hàm `homeController.index`.
     * - Kiểm tra `articalCategoryModel.find` được gọi với đúng tham số.
     * - Kiểm tra `res.render` được gọi với `articalCategorys` là danh sách đã mock.
     * @Dữ liệu đầu vào:
     * - `mockArtCat1`, `{ _id: 'artcat2', title: 'Tutorials', ... }` (danh mục bài viết).
     * @Kết quả mong đợi:
     * - `articalCategoryModel.find` được gọi với `{ deleted: false, status: "active" }`.
     * - `res.render` được gọi với `articalCategorys` chứa dữ liệu mock.
     */
    // ID: HO_005
    test('should fetch article categories correctly', async () => {
      const mockArticleCategories = [mockArtCat1, { _id: 'artcat2', title: 'Tutorials', toObject: function() { return this; } }];
      articalCategoryModel.find.mockResolvedValue(mockArticleCategories.map(c => ({...c})));
      productModel.find.mockImplementation(query => { // Mock chung cho các product find
        if (query.featured === "1") return Promise.resolve([]);
        return { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      });
      productsCategoryModel.find.mockResolvedValue([]); // Mock product categories rỗng


      await homeController.index(mockReq, mockRes);

      expect(articalCategoryModel.find).toHaveBeenCalledWith({ deleted: false, status: "active" });
      const renderArgs = mockRes.render.mock.calls[0][1];
      expect(renderArgs.articalCategorys).toEqual(mockArticleCategories);
    });
  });

  describe('Overall Rendering with All Data', () => {
    /**
     * @Chức năng: Kiểm tra việc render trang chủ với đầy đủ dữ liệu khi tất cả các lời gọi API thành công.
     * @Mô tả kiểm thử:
     * - Mock tất cả các lời gọi `find` (cho sản phẩm nổi bật, mới nhất, giảm giá, danh mục sản phẩm, danh mục bài viết) để trả về dữ liệu cụ thể.
     * - Gọi hàm `homeController.index`.
     * - Kiểm tra `res.render` được gọi với đúng tên view và tất cả các loại dữ liệu đã được xử lý/lấy về.
     * - Kiểm tra các hàm `sort` và `limit` được gọi đúng cách cho sản phẩm mới nhất và giảm giá.
     * @Dữ liệu đầu vào:
     * - `mockProductRaw1` (cho featured), `mockProductRaw2` (cho latest), `mockProductRaw3` (cho sale).
     * - `mockProdCat1` (cho product categories), `mockArtCat1` (cho article categories).
     * @Kết quả mong đợi:
     * - `res.render` được gọi với `pageTitle: "Trang chu"` và các trường dữ liệu:
     * - `featuredProducts`: `[mockProcessedProduct1]`
     * - `lastestProducts`: `[mockProcessedProduct2]`
     * - `saleProducts`: `[mockProcessedProduct3]`
     * - `productCategorys`: `[mockProdCat1]`
     * - `articalCategorys`: `[mockArtCat1]`
     * - Các hàm `sort`, `limit` được gọi đúng.
     */
    // ID: HO_006
    test('should render the home page with all data correctly when all fetches are successful', async () => {
      const mockFeaturedRaw = [mockProductRaw1];
      const mockLatestRaw = [mockProductRaw2];
      const mockSaleRaw = [mockProductRaw3];
      const mockProductCategoriesData = [mockProdCat1];
      const mockArticleCategoriesData = [mockArtCat1];

      productModel.find.mockImplementationOnce(query => { // Featured
        if (query.deleted === false && query.status === "active" && query.featured === "1") return Promise.resolve(mockFeaturedRaw.map(p => ({...p})));
        return Promise.resolve([]);
      });

      const latestProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(mockLatestRaw.map(p => ({...p}))) };
      productModel.find.mockImplementationOnce(query => { // Latest
          if (query.deleted === false && query.status === "active" && !query.featured) return latestProductsChain;
          return { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      });

      const saleProductsChain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(mockSaleRaw.map(p => ({...p}))) };
      productModel.find.mockImplementationOnce(query => { // Sale
          if (query.deleted === false && query.status === "active" && !query.featured) return saleProductsChain;
          return { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      });

      productsCategoryModel.find.mockResolvedValue(mockProductCategoriesData.map(c => ({...c})));
      articalCategoryModel.find.mockResolvedValue(mockArticleCategoriesData.map(c => ({...c})));

      await homeController.index(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith("client/page/home/index", {
        pageTitle: "Trang chu",
        featuredProducts: [mockProcessedProduct1],
        lastestProducts: [mockProcessedProduct2],
        saleProducts: [mockProcessedProduct3],
        productCategorys: mockProductCategoriesData,
        articalCategorys: mockArticleCategoriesData,
      });
      expect(latestProductsChain.sort).toHaveBeenCalledWith({ position: "desc" });
      expect(latestProductsChain.limit).toHaveBeenCalledWith(6);
      expect(saleProductsChain.sort).toHaveBeenCalledWith({ discountPercentage: "desc" });
      expect(saleProductsChain.limit).toHaveBeenCalledWith(6);
    });
  });

  describe('Handling Empty Data Scenarios', () => {
    /**
     * @Chức năng: Kiểm tra việc render trang chủ với các mảng rỗng khi không có dữ liệu nào được tìm thấy.
     * @Mô tả kiểm thử:
     * - Mock tất cả các lời gọi `find` để trả về mảng rỗng (hoặc chain trả về mảng rỗng).
     * - Gọi hàm `homeController.index`.
     * - Kiểm tra `res.render` được gọi với tất cả các trường dữ liệu là mảng rỗng.
     * - Kiểm tra các hàm model `find` được gọi đúng số lần.
     * @Dữ liệu đầu vào: Không có dữ liệu cụ thể, các mock được thiết lập để trả về rỗng.
     * @Kết quả mong đợi:
     * - `res.render` được gọi với `pageTitle: "Trang chu"` và các trường:
     * - `featuredProducts`: `[]`
     * - `lastestProducts`: `[]`
     * - `saleProducts`: `[]`
     * - `productCategorys`: `[]`
     * - `articalCategorys`: `[]`
     * - `productModel.find` được gọi 3 lần.
     * - `productsCategoryModel.find` được gọi 1 lần.
     * - `articalCategoryModel.find` được gọi 1 lần.
     */
    // ID: HO_007
    test('should render the home page with empty arrays if no data is found for any section', async () => {
      productModel.find.mockImplementation(query => {
        if (query.featured === "1") return Promise.resolve([]);
        return {
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([]),
        };
      });
      productsCategoryModel.find.mockResolvedValue([]);
      articalCategoryModel.find.mockResolvedValue([]);


      await homeController.index(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledTimes(3);
      expect(productsCategoryModel.find).toHaveBeenCalledTimes(1);
      expect(articalCategoryModel.find).toHaveBeenCalledTimes(1);

      const renderArgs = mockRes.render.mock.calls[0][1];
      expect(renderArgs.featuredProducts).toEqual([]);
      expect(renderArgs.lastestProducts).toEqual([]);
      expect(renderArgs.saleProducts).toEqual([]);
      expect(renderArgs.productCategorys).toEqual([]);
      expect(renderArgs.articalCategorys).toEqual([]);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/home/index", {
        pageTitle: "Trang chu",
        featuredProducts: [],
        lastestProducts: [],
        saleProducts: [],
        productCategorys: [],
        articalCategorys: [],
      });
    });
  });
});
