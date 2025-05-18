// __tests__/search.controller.test.js

// Mock dependencies
jest.mock('../model/products.model');
// These are imported in the controller but not used in the index function, so simple mocks are fine.
jest.mock('../config/system', () => ({}));
jest.mock('../model/products-category.model', () => ({}));
jest.mock('../model/accounts.model', () => ({}));


const Product = require('../model/products.model');
const searchController = require('../controllers/client/search.controller'); // Adjust path as needed

describe('Search Controller', () => {
  let mockReq, mockRes;

  // Static siderVar as defined in the controller
  const expectedSiderVar = {
    size: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
    type: ["Low-top", "Mid-top", "High-top"],
    price: [500000, 1000000, 1500000, 3000000, 5000000],
  };

  // Sample product data for mocking
  const mockProductRaw1 = { _id: 'prod1', title: 'Awesome Red Shoe', price: 2500000, discountPercentage: 10, toObject: function() { return this; } };
  const mockProductProcessed1 = { ...mockProductRaw1, newPrice: "2250000" };

  const mockProductRaw2 = { _id: 'prod2', title: 'Simple Blue Shoe', price: 1200000, discountPercentage: 0, toObject: function() { return this; } };
  const mockProductProcessed2 = { ...mockProductRaw2, newPrice: "1200000" };

  const mockProductRawCase = { _id: 'prodCase', title: 'Red Boot', price: 3000000, discountPercentage: 5, toObject: function() { return this; } };
  const mockProductProcessedCase = { ...mockProductRawCase, newPrice: "2850000" };


  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      query: {}, // query parameters from the URL
    };
    mockRes = {
      render: jest.fn(), // To check if the page is rendered
      redirect: jest.fn(), // To check if redirection happens (not used here as try-catch is commented)
    };

    // Default mock for Product.find
    Product.find.mockResolvedValue([]); // By default, assume no products are found
  });

  // --- Tests for module.exports.index ---
  describe('index - [GET] /search', () => {
    /**
     * @Chức năng: Hiển thị trang tìm kiếm khi người dùng cung cấp từ khóa và có sản phẩm khớp.
     * @Mô tả kiểm thử:
     * - Người dùng nhập một từ khóa vào ô tìm kiếm (ví dụ: "Shoe").
     * - Giả lập rằng cơ sở dữ liệu tìm thấy một hoặc nhiều sản phẩm có tiêu đề chứa từ khóa này.
     * - Kiểm tra xem hệ thống có:
     * 1. Tìm kiếm sản phẩm trong cơ sở dữ liệu với từ khóa đúng (không phân biệt hoa thường).
     * 2. Tính toán lại giá mới (`newPrice`) cho mỗi sản phẩm tìm thấy.
     * 3. Hiển thị trang kết quả tìm kiếm với đúng tiêu đề trang, từ khóa đã nhập, danh sách sản phẩm đã xử lý, và thông tin bộ lọc bên (siderVar).
     * @Dữ liệu đầu vào: `req.query.keyword = "Shoe"`. Cơ sở dữ liệu trả về `[mockProductRaw1, mockProductRaw2]`.
     * @Kết quả mong đợi:
     * - Trang tìm kiếm được hiển thị.
     * - `Product.find` được gọi với một biểu thức chính quy (RegExp) tạo từ "Shoe".
     * - Danh sách `products` chứa `[mockProductProcessed1, mockProductProcessed2]`.
     * - `keyword` trên trang là "Shoe".
     */
    test('should render search page with products when keyword is provided and products are found', async () => {
      mockReq.query.keyword = "Shoe";
      Product.find.mockResolvedValue([
        {...mockProductRaw1}, // Awesome Red Shoe
        {...mockProductRaw2}  // Simple Blue Shoe
      ]);

      await searchController.index(mockReq, mockRes);

      expect(Product.find).toHaveBeenCalledWith({
        title: new RegExp("Shoe", "i"), // Check for case-insensitive regex
        status: "active",
        deleted: false
      });
      expect(mockRes.render).toHaveBeenCalledWith("client/page/search/index", {
        pageTitle: "Trang tìm kiếm sản phẩm",
        keyword: "Shoe",
        products: [
          mockProductProcessed1,
          mockProductProcessed2
        ],
        siderVar: expectedSiderVar,
      });
    });

    /**
     * @Chức năng: Hiển thị trang tìm kiếm khi người dùng cung cấp từ khóa nhưng không có sản phẩm nào khớp.
     * @Mô tả kiểm thử:
     * - Người dùng nhập một từ khóa (ví dụ: "NonExistent").
     * - Giả lập rằng cơ sở dữ liệu không tìm thấy sản phẩm nào khớp với từ khóa này (trả về danh sách rỗng).
     * - Kiểm tra xem hệ thống có:
     * 1. Tìm kiếm sản phẩm trong cơ sở dữ liệu.
     * 2. Hiển thị trang kết quả tìm kiếm với từ khóa đã nhập nhưng danh sách sản phẩm trống.
     * @Dữ liệu đầu vào: `req.query.keyword = "NonExistent"`. Cơ sở dữ liệu trả về `[]`.
     * @Kết quả mong đợi:
     * - Trang tìm kiếm được hiển thị.
     * - `Product.find` được gọi.
     * - Danh sách `products` trống.
     * - `keyword` trên trang là "NonExistent".
     */
    test('should render search page with no products when keyword is provided but no products are found', async () => {
      mockReq.query.keyword = "NonExistent";
      Product.find.mockResolvedValue([]); // No products found

      await searchController.index(mockReq, mockRes);

      expect(Product.find).toHaveBeenCalledWith({
        title: new RegExp("NonExistent", "i"),
        status: "active",
        deleted: false
      });
      expect(mockRes.render).toHaveBeenCalledWith("client/page/search/index", {
        pageTitle: "Trang tìm kiếm sản phẩm",
        keyword: "NonExistent",
        products: [], // Empty array
        siderVar: expectedSiderVar,
      });
    });

    /**
     * @Chức năng: Hiển thị trang tìm kiếm khi người dùng không cung cấp từ khóa.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập trang tìm kiếm mà không nhập từ khóa nào (ô tìm kiếm rỗng).
     * - Kiểm tra xem hệ thống có:
     * 1. KHÔNG thực hiện tìm kiếm sản phẩm trong cơ sở dữ liệu.
     * 2. Hiển thị trang tìm kiếm với từ khóa là rỗng (hoặc không xác định) và danh sách sản phẩm trống.
     * @Dữ liệu đầu vào: `req.query.keyword` không được cung cấp (hoặc là chuỗi rỗng).
     * @Kết quả mong đợi:
     * - Trang tìm kiếm được hiển thị.
     * - `Product.find` KHÔNG được gọi.
     * - Danh sách `products` trống.
     * - `keyword` trên trang là `undefined` (hoặc chuỗi rỗng tùy theo cách Express xử lý query param rỗng).
     */
    test('should render search page with no products and no keyword if keyword is not provided', async () => {
      // req.query.keyword is undefined by default in mockReq setup

      await searchController.index(mockReq, mockRes);

      expect(Product.find).not.toHaveBeenCalled(); // Should not search if no keyword
      expect(mockRes.render).toHaveBeenCalledWith("client/page/search/index", {
        pageTitle: "Trang tìm kiếm sản phẩm",
        keyword: undefined, // Keyword is undefined
        products: [],       // No products
        siderVar: expectedSiderVar,
      });
    });
  /**
     * @Chức năng: Hiển thị trang tìm kiếm khi người dùng cung cấp từ khóa là một chuỗi rỗng.
     * @Mô tả kiểm thử:
     * - Người dùng nhập một chuỗi rỗng ("") vào ô tìm kiếm.
     * - Theo logic hiện tại của controller (`if(keyword)` sẽ đúng cho chuỗi rỗng), hệ thống SẼ thực hiện tìm kiếm.
     * - Giả lập rằng tìm kiếm với chuỗi rỗng không trả về sản phẩm nào.
     * - Kiểm tra xem trang tìm kiếm có hiển thị với từ khóa là chuỗi rỗng và danh sách sản phẩm trống hay không.
     * - *Lưu ý*: Nếu mong muốn là chuỗi rỗng không nên kích hoạt tìm kiếm, logic trong controller cần được thay đổi. Test này phản ánh hành vi hiện tại.
     * @Dữ liệu đầu vào: `req.query.keyword = ""`.
     * @Kết quả mong đợi:
     * - Trang tìm kiếm được hiển thị.
     * - Hàm tìm kiếm sản phẩm (`Product.find`) ĐƯỢC gọi với biểu thức chính quy từ chuỗi rỗng.
     * - Danh sách sản phẩm (`products`) trên trang là một mảng rỗng.
     * - Từ khóa (`keyword`) hiển thị trên trang là `""`.
     */
    test('should render search page with no products and empty keyword if keyword is an empty string', async () => {
      mockReq.query.keyword = ""; // Keyword is an empty string

      await searchController.index(mockReq, mockRes);

      // Controller logic: if(keyword) is true for empty string in JS, so find will be called.
      // This test reflects the current behavior. If "" should mean "no search", controller logic needs change.
      expect(Product.find).toHaveBeenCalledWith({
        title: new RegExp("", "i"),
        status: "active",
        deleted: false
      });
       Product.find.mockResolvedValue([]); // Assume find with "" returns nothing for this test's purpose

      await searchController.index(mockReq, mockRes); // Re-run with the mock for find

      expect(mockRes.render).toHaveBeenCalledWith("client/page/search/index", {
        pageTitle: "Trang tìm kiếm sản phẩm",
        keyword: "",
        products: [],
        siderVar: expectedSiderVar,
      });
    });

    /**
     * @Chức năng: Kiểm tra tìm kiếm không phân biệt hoa thường.
     * @Mô tả kiểm thử:
     * - Người dùng nhập từ khóa "rEd" (kết hợp hoa thường).
     * - Giả lập cơ sở dữ liệu có sản phẩm "Awesome Red Shoe" và "Red Boot".
     * - Kiểm tra xem `Product.find` có sử dụng biểu thức chính quy không phân biệt hoa thường (`/red/i`)
     * và cả hai sản phẩm trên có được tìm thấy và xử lý đúng không.
     * @Dữ liệu đầu vào: `req.query.keyword = "rEd"`. Cơ sở dữ liệu trả về `[mockProductRaw1, mockProductRawCase]`.
     * @Kết quả mong đợi:
     * - `Product.find` được gọi với `RegExp("rEd", "i")`.
     * - Cả hai sản phẩm chứa "Red" (không phân biệt hoa thường) đều được hiển thị.
     */
    test('should perform a case-insensitive search', async () => {
      mockReq.query.keyword = "rEd";
      Product.find.mockResolvedValue([
        {...mockProductRaw1},    // Awesome Red Shoe
        {...mockProductRawCase}  // Red Boot
      ]);

      await searchController.index(mockReq, mockRes);

      expect(Product.find).toHaveBeenCalledWith({
        title: new RegExp("rEd", "i"),
        status: "active",
        deleted: false
      });
      expect(mockRes.render).toHaveBeenCalledWith("client/page/search/index", {
        pageTitle: "Trang tìm kiếm sản phẩm",
        keyword: "rEd",
        products: [
          mockProductProcessed1,
          mockProductProcessedCase
        ],
        siderVar: expectedSiderVar,
      });
    });

    /**
     * @Chức năng: Xử lý trường hợp sản phẩm tìm thấy bị thiếu thuộc tính `price` để tính `newPrice`.
     * @Mô tả kiểm thử:
     * - Người dùng tìm kiếm và cơ sở dữ liệu trả về một sản phẩm, nhưng sản phẩm này không có trường `price`.
     * - Kiểm tra xem hệ thống có hiển thị sản phẩm đó với `newPrice` là "NaN" (Not a Number) hay không,
     * thay vì bị lỗi và dừng hoạt động. Điều này cho thấy một điểm cần cải thiện trong logic tính toán giá.
     * @Dữ liệu đầu vào: `req.query.keyword = "Test"`. Cơ sở dữ liệu trả về sản phẩm `{ title: "Test Product", discountPercentage: 10 /* price is missing *\/ }`.
     * @Kết quả mong đợi:
     * - Trang tìm kiếm được hiển thị.
     * - Sản phẩm thiếu `price` sẽ có `newPrice: "NaN"`.
     */
    test('should handle product missing price by setting newPrice to "NaN"', async () => {
      mockReq.query.keyword = "MissingPrice";
      const productMissingPrice = { _id: 'p_missing', title: 'Missing Price Product', discountPercentage: 10, toObject: function() { return this; } }; // price is undefined
      Product.find.mockResolvedValue([productMissingPrice]);

      await searchController.index(mockReq, mockRes);

      expect(Product.find).toHaveBeenCalledWith({
        title: new RegExp("MissingPrice", "i"),
        status: "active",
        deleted: false
      });
      expect(mockRes.render).toHaveBeenCalledWith("client/page/search/index", {
        pageTitle: "Trang tìm kiếm sản phẩm",
        keyword: "MissingPrice",
        products: [
          expect.objectContaining({
            _id: 'p_missing',
            title: 'Missing Price Product',
            newPrice: "NaN" // (undefined * X / 100).toFixed(0) results in "NaN"
          })
        ],
        siderVar: expectedSiderVar,
      });
    });

    /**
     * @Chức năng: Xử lý trường hợp sản phẩm tìm thấy bị thiếu thuộc tính `discountPercentage`.
     * @Mô tả kiểm thử:
     * - Người dùng tìm kiếm và cơ sở dữ liệu trả về một sản phẩm, nhưng sản phẩm này không có trường `discountPercentage`.
     * - Kiểm tra xem hệ thống có tính `newPrice` dựa trên giả định `discountPercentage` là 0 (hoặc `NaN` nếu phép tính không xử lý `undefined` tốt),
     * thay vì bị lỗi. Điều này cũng chỉ ra một điểm cần cải thiện trong logic.
     * @Dữ liệu đầu vào: `req.query.keyword = "Test"`. Cơ sở dữ liệu trả về sản phẩm `{ title: "Test Product", price: 1000 /* discountPercentage is missing *\/ }`.
     * @Kết quả mong đợi:
     * - Trang tìm kiếm được hiển thị.
     * - Sản phẩm thiếu `discountPercentage` sẽ có `newPrice` là "NaN" (vì `undefined` trong phép tính).
     */
    test('should handle product missing discountPercentage by setting newPrice to "NaN"', async () => {
      mockReq.query.keyword = "MissingDiscount";
      const productMissingDiscount = { _id: 'p_missing_discount', title: 'Missing Discount Product', price: 1000000, toObject: function() { return this; } }; // discountPercentage is undefined
      Product.find.mockResolvedValue([productMissingDiscount]);

      await searchController.index(mockReq, mockRes);

      expect(Product.find).toHaveBeenCalledWith({
        title: new RegExp("MissingDiscount", "i"),
        status: "active",
        deleted: false
      });
      expect(mockRes.render).toHaveBeenCalledWith("client/page/search/index", {
        pageTitle: "Trang tìm kiếm sản phẩm",
        keyword: "MissingDiscount",
        products: [
          expect.objectContaining({
            _id: 'p_missing_discount',
            title: 'Missing Discount Product',
            price: 1000000,
            newPrice: "NaN" // (price * (100 - undefined) / 100).toFixed(0) results in "NaN"
          })
        ],
        siderVar: expectedSiderVar,
      });
    });

    /**
     * @Chức năng: Kiểm tra lỗi khi một trong các sản phẩm trả về từ cơ sở dữ liệu là `null`.
     * @Mô tả kiểm thử:
     * - Người dùng tìm kiếm.
     * - Giả lập rằng `Product.find` trả về một danh sách trong đó có một phần tử là `null` (có thể do lỗi dữ liệu).
     * - Controller hiện tại sẽ cố gắng truy cập thuộc tính (ví dụ: `item.price`) của một đối tượng `null` trong vòng lặp `.map()`, điều này sẽ gây ra lỗi `TypeError`.
     * - Test này mong đợi controller sẽ bị lỗi và ném ra `TypeError`.
     * (Nếu `try...catch` được kích hoạt, hành vi mong đợi sẽ là chuyển hướng đến `/`).
     * @Dữ liệu đầu vào: `req.query.keyword = "Anything"`. `Product.find` trả về `[null, {...mockProductRaw1}]`.
     * @Kết quả mong đợi:
     * - Hàm controller ném ra lỗi `TypeError`.
     * - Trang không được render.
     */
    test('should throw TypeError if a product item in the fetched list is null (THROW ERROR)', async () => {
        mockReq.query.keyword = "SearchWithNull";
        Product.find.mockResolvedValue([null, {...mockProductRaw1}]); // Một sản phẩm là null

        // Controller sẽ bị lỗi khi cố gắng truy cập item.price trên null
        // Vì try...catch tổng trong controller đang bị comment, lỗi sẽ nổi lên
        await expect(searchController.index(mockReq, mockRes)).rejects.toThrow(TypeError);

        expect(Product.find).toHaveBeenCalledWith({
            title: new RegExp("SearchWithNull", "i"),
            status: "active",
            deleted: false
        });
        expect(mockRes.render).not.toHaveBeenCalled();
    });
  });
});
