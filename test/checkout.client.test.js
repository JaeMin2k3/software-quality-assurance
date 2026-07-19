// __tests__/checkout.controller.test.js

// Mock các model trước khi import controller
// Giả lập Cart, Product, Order models
jest.mock('../model/carts.model');
jest.mock('../model/products.model');
jest.mock('../model/orders.model');

const Cart = require('../model/carts.model');
const Product = require('../model/products.model');
const Order = require('../model/orders.model');
const checkoutController = require('../controllers/client/checkout.controller'); // Điều chỉnh đường dẫn nếu cần

describe('Checkout Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset mocks cho mỗi test
    jest.clearAllMocks();

    // Tạo đối tượng req, res giả lập
    mockReq = {
      cookies: {},
      body: {},
      params: {},
      flash: jest.fn(), // Giả lập hàm flash
    };
    mockRes = {
      render: jest.fn(),
      redirect: jest.fn(),
      // Thêm các phương thức res khác nếu controller của bạn sử dụng
    };
  });

  // --- Test cho module.exports.index ---
  describe('index - [GET] /checkout', () => {
    /**
     * Chức năng: Kiểm tra render trang checkout
     * Mô tả kiểm thử: Kiểm tra việc hiển thị trang checkout khi có giỏ hàng hợp lệ
     * Dữ liệu đầu vào:
     *  - cartId: 'validCartId'
     *  - Giỏ hàng chứa 2 sản phẩm:
     *    + Sản phẩm 1: id='prod1', số lượng=2, giá=100, giảm giá=10%
     *    + Sản phẩm 2: id='prod2', số lượng=1, giá=200, giảm giá=0%
     * Kết quả mong đợi:
     *  - Render trang checkout với thông tin giỏ hàng
     *  - Tổng tiền = 380 (180 + 200)
     *  - Thông tin sản phẩm được tính toán chính xác (giá sau giảm, tổng tiền từng sản phẩm)
     */
    // ID: CH_001
    it('Nên render trang checkout với thông tin giỏ hàng hợp lệ', async () => {
      mockReq.cookies.cartId = 'validCartId';
      const mockCartData = {
        _id: 'validCartId',
        products: [
          { product_id: 'prod1', quantity: 2 },
          { product_id: 'prod2', quantity: 1 },
        ],
      };
      const mockProduct1 = { _id: 'prod1', price: 100, discountPercentage: 10, title: 'Product 1' }; // newPrice = 90
      const mockProduct2 = { _id: 'prod2', price: 200, discountPercentage: 0, title: 'Product 2' };  // newPrice = 200

      Cart.findOne.mockResolvedValue(mockCartData);
      Product.findOne
        .mockResolvedValueOnce(mockProduct1) // Cho product_id: 'prod1'
        .mockResolvedValueOnce(mockProduct2); // Cho product_id: 'prod2'

      await checkoutController.index(mockReq, mockRes);

      expect(Cart.findOne).toHaveBeenCalledWith({ _id: 'validCartId' });
      expect(Product.findOne).toHaveBeenCalledWith({ _id: 'prod1' });
      expect(Product.findOne).toHaveBeenCalledWith({ _id: 'prod2' });

      const expectedCartArgument = {
        _id: 'validCartId',
        products: [
          {
            product_id: 'prod1',
            quantity: 2,
            productInfor: { ...mockProduct1, newPrice: '90' },
            totalPrice: 180,
          },
          {
            product_id: 'prod2',
            quantity: 1,
            productInfor: { ...mockProduct2, newPrice: '200' },
            totalPrice: 200,
          },
        ],
        total: 380, // 180 + 200
      };

      expect(mockRes.render).toHaveBeenCalledWith('client/page/checkout/index.pug', {
        pageTitle: "Thanh toán",
        cart: expect.objectContaining({ // Kiểm tra một phần đối tượng
            _id: 'validCartId',
            total: 380
        })
      });
      // Kiểm tra sâu hơn cho products nếu cần
      const renderedCart = mockRes.render.mock.calls[0][1].cart;
      expect(renderedCart.products[0].totalPrice).toBe(180);
      expect(renderedCart.products[1].totalPrice).toBe(200);
      expect(renderedCart.products[0].productInfor.newPrice).toBe('90');
    });

    /**
     * Chức năng: Kiểm tra render trang checkout với giỏ hàng trống
     * Mô tả kiểm thử: Kiểm tra việc hiển thị trang checkout khi giỏ hàng không có sản phẩm
     * Dữ liệu đầu vào:
     *  - cartId: 'emptyCartId'
     *  - Giỏ hàng không có sản phẩm nào
     * Kết quả mong đợi:
     *  - Render trang checkout
     *  - Giỏ hàng trống, tổng tiền = 0
     */
    // ID: CH_002
    it('Nên render trang checkout với giỏ hàng trống', async () => {
      mockReq.cookies.cartId = 'emptyCartId';
      const mockEmptyCart = {
        _id: 'emptyCartId',
        products: [],
      };
      Cart.findOne.mockResolvedValue(mockEmptyCart);

      await checkoutController.index(mockReq, mockRes);

      expect(Cart.findOne).toHaveBeenCalledWith({ _id: 'emptyCartId' });
      expect(Product.findOne).not.toHaveBeenCalled(); // Không gọi Product.findOne nếu không có sản phẩm
      expect(mockRes.render).toHaveBeenCalledWith('client/page/checkout/index.pug', {
        pageTitle: "Thanh toán",
        cart: {
          _id: 'emptyCartId',
          products: [],
          total: 0,
        },
      });
    });

    /**
     * Chức năng: Kiểm tra xử lý khi không tìm thấy giỏ hàng
     * Mô tả kiểm thử: Kiểm tra việc chuyển hướng khi không tìm thấy giỏ hàng
     * Dữ liệu đầu vào:
     *  - cartId: 'nonExistentCartId'
     *  - Không tìm thấy giỏ hàng trong database
     * Kết quả mong đợi:
     *  - Chuyển hướng về trang /cart
     *  - Hiển thị thông báo lỗi
     */
    // ID: CH_003
    it('Nên redirect về /cart nếu không tìm thấy giỏ hàng', async () => {
      mockReq.cookies.cartId = 'nonExistentCartId';
      Cart.findOne.mockResolvedValue(null);

      await checkoutController.index(mockReq, mockRes);

      expect(Cart.findOne).toHaveBeenCalledWith({ _id: 'nonExistentCartId' });
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'Không tìm thấy giỏ hàng của bạn.');
      expect(mockRes.redirect).toHaveBeenCalledWith('/cart');
      expect(mockRes.render).not.toHaveBeenCalled();
    });


  });

  // --- Test cho module.exports.order ---
  describe('order - [POST] /order', () => {
    /**
     * Chức năng: Kiểm tra tạo đơn hàng
     * Mô tả kiểm thử: Kiểm tra việc tạo đơn hàng thành công và chuyển hướng
     * Dữ liệu đầu vào:
     *  - cartId: 'cartForOrder'
     *  - Thông tin người dùng: name='Test User', address='123 Test St'
     *  - Giỏ hàng chứa 1 sản phẩm: id='prod1', số lượng=1, giá=50
     * Kết quả mong đợi:
     *  - Tạo đơn hàng thành công
     *  - Xóa sản phẩm trong giỏ hàng
     *  - Chuyển hướng đến trang success
     */
    // ID: CH_005
    it('Nên tạo đơn hàng thành công và redirect', async () => {
      mockReq.cookies.cartId = 'cartForOrder';
      mockReq.body = { name: 'Test User', address: '123 Test St' };

      const mockCart = {
        _id: 'cartForOrder',
        products: [
          { product_id: 'prod1', quantity: 1 },
        ],
      };
      const mockProduct1 = { _id: 'prod1', price: 50, discountPercentage: 0 };
      const mockSavedOrder = { id: 'newOrderId123', /* ... các trường khác của order */ };

      Cart.findOne.mockResolvedValue(mockCart);
      Product.findOne.mockResolvedValue(mockProduct1);

      // Giả lập constructor và phương thức save của Order
      const mockOrderInstance = { save: jest.fn().mockResolvedValue(mockSavedOrder) };
      Order.mockImplementation(() => mockOrderInstance); // Khi new Order() được gọi, trả về mockOrderInstance

      Cart.updateOne.mockResolvedValue({ nModified: 1 }); // Giả lập Cart.updateOne

      await checkoutController.order(mockReq, mockRes);

      expect(Cart.findOne).toHaveBeenCalledWith({ _id: 'cartForOrder' });
      expect(Product.findOne).toHaveBeenCalledWith({ _id: 'prod1' });
      expect(Order).toHaveBeenCalledWith({
        cart_id: 'cartForOrder',
        userInfor: mockReq.body,
        products: [
          {
            product_id: 'prod1',
            price: 50,
            discountPercentage: 0,
            quantity: 1,
          },
        ],
      });
      expect(mockOrderInstance.save).toHaveBeenCalled();
      expect(Cart.updateOne).toHaveBeenCalledWith({ _id: 'cartForOrder' }, { products: [] });
      expect(mockRes.redirect).toHaveBeenCalledWith(`/checkout/success/${mockSavedOrder.id}`);
    });

    /**
     * Chức năng: Kiểm tra xử lý lỗi khi tạo đơn hàng
     * Mô tả kiểm thử: Kiểm tra việc xử lý khi không tìm thấy giỏ hàng để tạo đơn
     * Dữ liệu đầu vào:
     *  - cartId: 'nonExistentCartForOrder'
     *  - Thông tin người dùng: name='Test User'
     *  - Không tìm thấy giỏ hàng trong database
     * Kết quả mong đợi:
     *  - Throw error
     */
    // ID: CH_006
    it('Nên xử lý lỗi nếu không tìm thấy giỏ hàng khi đặt hàng (THROW ERROR)', async () => {
      mockReq.cookies.cartId = 'nonExistentCartForOrder';
      mockReq.body = { name: 'Test User' };
      Cart.findOne.mockResolvedValue(null); // Giỏ hàng không tìm thấy

      await expect(checkoutController.order(mockReq, mockRes)).rejects.toThrow();
      // Lỗi sẽ xảy ra khi cố gắng truy cập `cart.products` trên `null`

      expect(Cart.findOne).toHaveBeenCalledWith({ _id: 'nonExistentCartForOrder' });
      expect(Order).not.toHaveBeenCalled();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    /**
     * Chức năng: Kiểm tra tạo đơn hàng với giỏ hàng trống
     * Mô tả kiểm thử: Kiểm tra việc tạo đơn hàng khi giỏ hàng không có sản phẩm nào
     * Dữ liệu đầu vào:
     *  - cartId: 'emptyCartForOrder'
     *  - Thông tin người dùng: name='Test User', address='123 Test St'
     *  - Giỏ hàng không có sản phẩm
     * Kết quả mong đợi:
     *  - Tạo đơn hàng thành công với mảng products rỗng
     *  - Chuyển hướng đến trang success
     */
    // ID: CH_007
    it('Nên tạo đơn hàng với mảng products rỗng nếu giỏ hàng trống', async () => {
        mockReq.cookies.cartId = 'emptyCartForOrder';
        mockReq.body = { name: 'Test User', address: '123 Test St' };
        const mockEmptyCart = {
            _id: 'emptyCartForOrder',
            products: [],
        };
        const mockSavedOrder = { id: 'newOrderId456' };

        Cart.findOne.mockResolvedValue(mockEmptyCart);
        const mockOrderInstance = { save: jest.fn().mockResolvedValue(mockSavedOrder) };
        Order.mockImplementation(() => mockOrderInstance);
        Cart.updateOne.mockResolvedValue({ nModified: 1 });

        await checkoutController.order(mockReq, mockRes);

        expect(Cart.findOne).toHaveBeenCalledWith({ _id: 'emptyCartForOrder' });
        expect(Product.findOne).not.toHaveBeenCalled(); // Không có sản phẩm để tìm
        expect(Order).toHaveBeenCalledWith({
            cart_id: 'emptyCartForOrder',
            userInfor: mockReq.body,
            products: [], // Mảng products rỗng
        });
        expect(mockOrderInstance.save).toHaveBeenCalled();
        expect(Cart.updateOne).toHaveBeenCalledWith({ _id: 'emptyCartForOrder' }, { products: [] });
        expect(mockRes.redirect).toHaveBeenCalledWith(`/checkout/success/${mockSavedOrder.id}`);
    });


    /**
     * Chức năng: Kiểm tra xử lý lỗi khi sản phẩm không tồn tại
     * Mô tả kiểm thử: Kiểm tra việc xử lý khi sản phẩm trong giỏ hàng không còn tồn tại trong quá trình đặt hàng
     * Dữ liệu đầu vào:
     *  - cartId: 'cartOrderInvalidProduct'
     *  - Thông tin người dùng: name='Test User'
     *  - Giỏ hàng chứa sản phẩm không tồn tại (id='invalidProdId')
     * Kết quả mong đợi:
     *  - Throw error khi truy cập thông tin sản phẩm
     */
    // ID: CH_008
    it('Nên xử lý lỗi nếu sản phẩm trong giỏ hàng không tồn tại khi đặt hàng (THROW ERROR)', async () => {
        mockReq.cookies.cartId = 'cartOrderInvalidProduct';
        mockReq.body = { name: 'Test User' };
        const mockCartWithInvalid = {
            _id: 'cartOrderInvalidProduct',
            products: [{ product_id: 'invalidProdId', quantity: 1 }],
        };

        Cart.findOne.mockResolvedValue(mockCartWithInvalid);
        Product.findOne.mockResolvedValue(null); // Sản phẩm không tồn tại

        await expect(checkoutController.order(mockReq, mockRes)).rejects.toThrow();
        // Lỗi khi truy cập productInfor.price

        expect(Cart.findOne).toHaveBeenCalledWith({ _id: 'cartOrderInvalidProduct' });
        expect(Product.findOne).toHaveBeenCalledWith({ _id: 'invalidProdId' });
        expect(Order).not.toHaveBeenCalled();
    });
  });

  // --- Test cho module.exports.success ---
  describe('success - [GET] /checkout/success/:orderId', () => {
    /**
     * Chức năng: Hiển thị trang đặt hàng thành công
     * Mô tả kiểm thử: Kiểm tra việc render trang thành công với thông tin đơn hàng hợp lệ, bao gồm tính toán lại giá và tổng tiền.
     * Dữ liệu đầu vào:
     *  - req.params.orderId: 'validOrderId'
     *  - Order.findOne trả về đơn hàng có 2 sản phẩm.
     *  - Product.findOne trả về thông tin chi tiết cho từng sản phẩm trong đơn hàng.
     * Kết quả mong đợi:
     *  - Order.findOne được gọi đúng với orderId.
     *  - Product.findOne được gọi cho từng sản phẩm trong đơn hàng.
     *  - Giá sản phẩm sau chiết khấu (newPrice) được tính đúng.
     *  - Tổng giá từng sản phẩm (totalPrice) được tính đúng.
     *  - Tổng giá đơn hàng (order.total) được tính đúng.
     *  - res.render được gọi với 'client/page/checkout/success', pageTitle và object order đã được xử lý.
     */
    // ID: CH_009
    it('Nên render trang thành công với thông tin đơn hàng hợp lệ', async () => {
      mockReq.params.orderId = 'validOrderId';
      const mockOrderData = {
        _id: 'validOrderId',
        products: [
          { product_id: 'prodA', quantity: 1, price: 70, discountPercentage: 0 }, // original price & discount from order
          { product_id: 'prodB', quantity: 2, price: 120, discountPercentage: 20 },// newPrice should be 96
        ],
        userInfor: { name: 'Customer' },
      };
      const mockProductA = { _id: 'prodA', price: 70, discountPercentage: 0, title: 'Product A' }; // newPrice = 70
      const mockProductB = { _id: 'prodB', price: 120, discountPercentage: 20, title: 'Product B' }; // newPrice = 96

      Order.findOne.mockResolvedValue(mockOrderData);
      Product.findOne
        .mockResolvedValueOnce(mockProductA) // prodA
        .mockResolvedValueOnce(mockProductB); // prodB

      await checkoutController.success(mockReq, mockRes);

      expect(Order.findOne).toHaveBeenCalledWith({ _id: 'validOrderId' });
      expect(Product.findOne).toHaveBeenCalledWith({ _id: 'prodA' });
      expect(Product.findOne).toHaveBeenCalledWith({ _id: 'prodB' });

      const expectedOrderArgument = {
        _id: 'validOrderId',
        products: [
          {
            product_id: 'prodA',
            quantity: 1,
            price: 70, // giá gốc từ order
            discountPercentage: 0, // discount gốc từ order
            productInfor: { ...mockProductA, newPrice: '70' }, // thông tin đầy đủ từ Product model + newPrice
            totalPrice: 70, // quantity * newPrice
          },
          {
            product_id: 'prodB',
            quantity: 2,
            price: 120,
            discountPercentage: 20,
            productInfor: { ...mockProductB, newPrice: '96' },
            totalPrice: 192, // 2 * 96
          },
        ],
        userInfor: { name: 'Customer' },
        total: 262, // 70 + 192
      };

      expect(mockRes.render).toHaveBeenCalledWith('client/page/checkout/success', {
        pageTitle: "Đặt hàng thành công",
        order: expect.objectContaining({
            _id: 'validOrderId',
            total: 262
        })
      });
      const renderedOrder = mockRes.render.mock.calls[0][1].order;
      expect(renderedOrder.products[0].totalPrice).toBe(70);
      expect(renderedOrder.products[1].totalPrice).toBe(192);
      expect(renderedOrder.products[0].productInfor.newPrice).toBe('70');
      expect(renderedOrder.products[1].productInfor.newPrice).toBe('96');
    });

    /**
     * Chức năng: Xử lý lỗi khi không tìm thấy đơn hàng
     * Mô tả kiểm thử: Kiểm tra việc xử lý khi orderId không tồn tại trong database.
     * Dữ liệu đầu vào:
     *  - req.params.orderId: 'nonExistentOrderId'
     *  - Order.findOne trả về null.
     * Kết quả mong đợi:
     *  - Order.findOne được gọi đúng.
     *  - Controller ném ra lỗi khi cố gắng truy cập thuộc tính của đơn hàng null.
     *  - res.render không được gọi.
     */
    // ID: CH_010
    it('Nên xử lý lỗi nếu không tìm thấy đơn hàng (THROW ERROR)', async () => {
      mockReq.params.orderId = 'nonExistentOrderId';
      Order.findOne.mockResolvedValue(null); // Đơn hàng không tìm thấy

      await expect(checkoutController.success(mockReq, mockRes)).rejects.toThrow();
      // Lỗi khi truy cập `order.products` trên `null`

      expect(Order.findOne).toHaveBeenCalledWith({ _id: 'nonExistentOrderId' });
      expect(mockRes.render).not.toHaveBeenCalled();
    });

    /**
     * Chức năng: Xử lý lỗi khi sản phẩm trong đơn hàng không tồn tại
     * Mô tả kiểm thử: Kiểm tra việc xử lý khi một sản phẩm trong đơn hàng đã bị xóa khỏi database sản phẩm.
     * Dữ liệu đầu vào:
     *  - req.params.orderId: 'orderWithInvalidProd'
     *  - Order.findOne trả về đơn hàng chứa sản phẩm có id không tồn tại trong Product model.
     *  - Product.findOne trả về null cho sản phẩm đó.
     * Kết quả mong đợi:
     *  - Order.findOne được gọi đúng.
     *  - Product.findOne được gọi đúng.
     *  - Controller ném ra lỗi khi cố gắng truy cập thuộc tính của sản phẩm null.
     */
    // ID: CH_011
    it('Nên xử lý lỗi nếu sản phẩm trong đơn hàng không tồn tại (THROW ERROR)', async () => {
        mockReq.params.orderId = 'orderWithInvalidProd';
        const mockOrderWithInvalid = {
            _id: 'orderWithInvalidProd',
            products: [{ product_id: 'unknownProd', quantity: 1, price: 10, discountPercentage: 0 }],
        };
        Order.findOne.mockResolvedValue(mockOrderWithInvalid);
        Product.findOne.mockResolvedValue(null); // Sản phẩm không tồn tại

        await expect(checkoutController.success(mockReq, mockRes)).rejects.toThrow();
        // Lỗi khi truy cập productInfor.price

        expect(Order.findOne).toHaveBeenCalledWith({ _id: 'orderWithInvalidProd' });
        expect(Product.findOne).toHaveBeenCalledWith({ _id: 'unknownProd' });
    });
  });
});

    /**
     * Chức năng: Kiểm tra xử lý lỗi khi sản phẩm trong giỏ hàng không tồn tại
     * Mô tả kiểm thử: Kiểm tra việc xử lý khi một sản phẩm trong giỏ hàng không còn tồn tại
     * Dữ liệu đầu vào:
     *  - cartId: 'cartWithDeletedProduct'
     *  - Thông tin người dùng: name='Test User', address='123 Test St'
     *  - Giỏ hàng chứa 1 sản phẩm đã bị xóa: id='deletedProd', số lượng=1
     * Kết quả mong đợi:
     *  - Ném ra lỗi "Sản phẩm trong giỏ hàng không tồn tại"
     *  - Không tạo đơn hàng
     */
    // ID: CH_004
    it('Nên xử lý lỗi nếu sản phẩm trong giỏ hàng không tồn tại', async () => {
      mockReq.cookies.cartId = 'cartWithDeletedProduct';
      mockReq.body = { name: 'Test User', address: '123 Test St' };

      const mockCart = {
        _id: 'cartWithDeletedProduct',
        products: [
          { product_id: 'deletedProd', quantity: 1 },
        ],
      };

      Cart.findOne.mockResolvedValue(mockCart);
      Product.findOne.mockResolvedValue(null); // Sản phẩm không tồn tại

      await expect(checkoutController.order(mockReq, mockRes)).rejects.toThrow('Sản phẩm trong giỏ hàng không tồn tại');

      expect(Cart.findOne).toHaveBeenCalledWith({ _id: 'cartWithDeletedProduct' });
      expect(Product.findOne).toHaveBeenCalledWith({ _id: 'deletedProd' });
      expect(Order).not.toHaveBeenCalled(); // Không tạo đơn hàng
      expect(Cart.updateOne).not.toHaveBeenCalled(); // Không cập nhật giỏ hàng
      expect(mockRes.redirect).not.toHaveBeenCalled(); // Không chuyển hướng
    });
