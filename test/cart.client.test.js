// Mock các modules (models) mà controller sử dụng
const Cart = require("../model/carts.model");
const Product = require("../model/products.model");

// Mock toàn bộ module để có thể theo dõi các hàm được gọi
jest.mock("../model/carts.model");
jest.mock("../model/products.model");

// Import controller cần test
const cartController = require("../controllers/client/cart.controller");

describe('Cart Controller', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        // Reset mock trước mỗi test case để đảm bảo độc lập
        mockReq = {
            cookies: {},
            params: {},
            body: {},
            flash: jest.fn(), // Mock req.flash
        };
        mockRes = {
            render: jest.fn(),
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(), // Cho phép chaining .status().send()
            json: jest.fn(), // Nếu bạn có các controller API trả về JSON
        };

        // Clear tất cả các mock của Mongoose models
        Cart.findOne.mockReset();
        Cart.updateOne.mockReset();
        Product.findOne.mockReset();
    });

    // --- [GET] /cart ---
    describe('[GET] /cart - index', () => {
        /**
         * Chức năng: Hiển thị giỏ hàng khi có sản phẩm.
         * Mô tả kiểm thử: Đảm bảo controller tính toán đúng giá mới, tổng giá từng sản phẩm, và tổng giá giỏ hàng, sau đó render trang.
         * Dữ liệu đầu vào:
         * - req.cookies.cartId: "cart_id_123"
         * - Cart.findOne trả về giỏ hàng có 2 sản phẩm.
         * - Product.findOne trả về thông tin chi tiết cho từng sản phẩm.
         * Kết quả mong đợi:
         * - Cart.findOne được gọi đúng với cartId.
         * - Product.findOne được gọi cho từng sản phẩm trong giỏ hàng.
         * - Giá sản phẩm sau chiết khấu (newPrice) được tính đúng.
         * - Tổng giá từng sản phẩm (totalPrice) được tính đúng.
         * - Tổng giá giỏ hàng (cart.total) được tính đúng.
         * - res.render được gọi với 'client/page/cart/index.pug', pageTitle và object cart đã được xử lý.
         */
        test('should render cart with products and calculated totals when cart exists and has products', async () => {
            mockReq.cookies.cartId = "cart_id_123";

            const mockProduct1 = {
                _id: 'product_id_001',
                title: 'Product A',
                price: 200000,
                discountPercentage: 10,
            };
            const mockProduct2 = {
                _id: 'product_id_002',
                title: 'Product B',
                price: 150000,
                discountPercentage: 5,
            };

            const mockCartWithItems = {
                _id: "cart_id_123",
                products: [
                    { product_id: 'product_id_001', quantity: 2 },
                    { product_id: 'product_id_002', quantity: 1 },
                ],
            };

            Cart.findOne.mockResolvedValueOnce(mockCartWithItems);
            Product.findOne
                .mockResolvedValueOnce(mockProduct1)
                .mockResolvedValueOnce(mockProduct2);

            await cartController.index(mockReq, mockRes);

            expect(Cart.findOne).toHaveBeenCalledWith({ _id: "cart_id_123" });
            expect(Product.findOne).toHaveBeenCalledTimes(2);
            expect(Product.findOne).toHaveBeenCalledWith({ _id: 'product_id_001' });
            expect(Product.findOne).toHaveBeenCalledWith({ _id: 'product_id_002' });

            // Calculate expected values
            const expectedNewPrice1 = (mockProduct1.price * (100 - mockProduct1.discountPercentage) / 100).toFixed(0); // 180000
            const expectedTotalPrice1 = 2 * expectedNewPrice1; // 360000
            const expectedNewPrice2 = (mockProduct2.price * (100 - mockProduct2.discountPercentage) / 100).toFixed(0); // 142500
            const expectedTotalPrice2 = 1 * expectedNewPrice2; // 142500
            const expectedTotalCart = parseInt(expectedTotalPrice1) + parseInt(expectedTotalPrice2); // 502500

            expect(mockRes.render).toHaveBeenCalledWith("client/page/cart/index.pug", {
                pageTitle: "Giỏ hàng",
                cart: expect.objectContaining({
                    _id: "cart_id_123",
                    products: expect.arrayContaining([
                        expect.objectContaining({
                            product_id: 'product_id_001',
                            quantity: 2,
                            productInfor: expect.objectContaining({
                                _id: 'product_id_001',
                                newPrice: expectedNewPrice1,
                            }),
                            totalPrice: expectedTotalPrice1,
                        }),
                        expect.objectContaining({
                            product_id: 'product_id_002',
                            quantity: 1,
                            productInfor: expect.objectContaining({
                                _id: 'product_id_002',
                                newPrice: expectedNewPrice2,
                            }),
                            totalPrice: expectedTotalPrice2,
                        }),
                    ]),
                    total: expectedTotalCart,
                }),
            });
        });

        /**
         * Chức năng: Hiển thị giỏ hàng khi không có sản phẩm.
         * Mô tả kiểm thử: Đảm bảo controller render trang với giỏ hàng rỗng và tổng giá là 0.
         * Dữ liệu đầu vào:
         * - req.cookies.cartId: "cart_id_empty"
         * - Cart.findOne trả về giỏ hàng rỗng.
         * Kết quả mong đợi:
         * - Cart.findOne được gọi đúng.
         * - Product.findOne không được gọi.
         * - res.render được gọi với 'client/page/cart/index.pug', pageTitle và object cart rỗng.
         */
        test('should render cart with empty products and total 0 when cart exists but has no products', async () => {
            mockReq.cookies.cartId = "cart_id_empty";
            const mockCartEmpty = { _id: "cart_id_empty", products: [] };
            Cart.findOne.mockResolvedValueOnce(mockCartEmpty);

            await cartController.index(mockReq, mockRes);

            expect(Cart.findOne).toHaveBeenCalledWith({ _id: "cart_id_empty" });
            expect(Product.findOne).not.toHaveBeenCalled(); // Không gọi Product.findOne khi giỏ hàng rỗng

            expect(mockRes.render).toHaveBeenCalledWith("client/page/cart/index.pug", {
                pageTitle: "Giỏ hàng",
                cart: expect.objectContaining({
                    _id: "cart_id_empty",
                    products: [],
                    total: 0,
                }),
            });
        });

        /**
         * Chức năng: Xử lý khi không tìm thấy giỏ hàng hoặc lỗi trong quá trình lấy dữ liệu.
         * Mô tả kiểm thử: Đảm bảo controller bắt lỗi và không render/redirect.
         * Dữ liệu đầu vào:
         * - req.cookies.cartId: "non_existent_cart_id" (hoặc bất kỳ cartId nào gây lỗi)
         * - Cart.findOne trả về null hoặc throw error.
         * Kết quả mong đợi:
         * - res.render và res.redirect không được gọi.
         * - (Hiện tại `catch` block trống, trong thực tế nên có xử lý lỗi như log error hoặc render trang lỗi).
         */
        test('should handle error when cartId is not found or an error occurs', async () => {
            mockReq.cookies.cartId = "non_existent_cart_id";
            // Case 1: Cart.findOne returns null (e.g., cartId doesn't exist)
            Cart.findOne.mockResolvedValueOnce(null);

            await cartController.index(mockReq, mockRes);
            expect(mockRes.render).not.toHaveBeenCalled();
            expect(mockRes.redirect).not.toHaveBeenCalled();

            // Case 2: Cart.findOne throws an error
            Cart.findOne.mockRejectedValueOnce(new Error("Database error"));
            await cartController.index(mockReq, mockRes);
            expect(mockRes.render).not.toHaveBeenCalled();
            expect(mockRes.redirect).not.toHaveBeenCalled();
        });
    });

    // --- [GET] /delete/:productId ---
    describe('[GET] /delete/:productId - delete', () => {
        /**
         * Chức năng: Xóa một sản phẩm khỏi giỏ hàng.
         * Mô tả kiểm thử: Đảm bảo controller gọi đúng hàm update và redirect về trang trước đó.
         * Dữ liệu đầu vào:
         * - req.params.productId: "product_to_delete_id"
         * - req.cookies.cartId: "cart_id_123"
         * Kết quả mong đợi:
         * - Cart.updateOne được gọi với cartId và pull operator để xóa sản phẩm.
         * - req.flash được gọi với thông báo thành công.
         * - res.redirect được gọi với "back".
         */
        test('should delete product from cart and redirect back', async () => {
            mockReq.params.productId = "product_to_delete_id";
            mockReq.cookies.cartId = "cart_id_123";

            Cart.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

            await cartController.delete(mockReq, mockRes);

            expect(Cart.updateOne).toHaveBeenCalledWith(
                { _id: "cart_id_123" },
                { "$pull": { products: { "product_id": "product_to_delete_id" } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith("success", "Xóa thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });

        /**
         * Chức năng: Xóa sản phẩm khỏi giỏ hàng khi productId không tồn tại trong giỏ.
         * Mô tả kiểm thử: Đảm bảo controller vẫn gọi updateOne và redirect, ngay cả khi sản phẩm không có sẵn để xóa.
         * Dữ liệu đầu vào:
         * - req.params.productId: "non_existent_product_id"
         * - req.cookies.cartId: "cart_id_valid"
         * - Cart.updateOne sẽ trả về modifiedCount: 0 (vì không có gì để pull).
         * Kết quả mong đợi:
         * - Cart.updateOne được gọi đúng như mong đợi (MongoDB sẽ tự động bỏ qua nếu không tìm thấy item để pull).
         * - req.flash vẫn thông báo "Xóa thành công" (do logic hiện tại không kiểm tra `modifiedCount`).
         * - res.redirect vẫn được gọi với "back".
         */
        test('should still call updateOne and redirect back even if productId does not exist in cart', async () => {
            mockReq.params.productId = "non_existent_product_id";
            mockReq.cookies.cartId = "cart_id_valid";

            Cart.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 });

            await cartController.delete(mockReq, mockRes);

            expect(Cart.updateOne).toHaveBeenCalledWith(
                { _id: "cart_id_valid" },
                { "$pull": { products: { "product_id": "non_existent_product_id" } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith("success", "Xóa thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });

        /**
         * Chức năng: Xử lý lỗi khi xóa sản phẩm.
         * Mô tả kiểm thử: Đảm bảo controller không crash và redirect về trang trước đó (theo logic hiện tại).
         * Dữ liệu đầu vào:
         * - req.params.productId: "some_product_id"
         * - req.cookies.cartId: "some_cart_id"
         * - Cart.updateOne throw error.
         * Kết quả mong đợi:
         * - req.flash không được gọi với 'success' (có thể là 'error' nếu có xử lý lỗi chi tiết hơn).
         * - res.redirect vẫn được gọi với "back" (vì block try...catch không xử lý khác biệt).
         */
        test('should handle error during deletion and redirect back', async () => {
            mockReq.params.productId = "some_product_id";
            mockReq.cookies.cartId = "some_cart_id";

            Cart.updateOne.mockRejectedValueOnce(new Error("DB delete error"));

            await cartController.delete(mockReq, mockRes);

            expect(Cart.updateOne).toHaveBeenCalled();
            expect(mockReq.flash).not.toHaveBeenCalledWith("success", "Xóa thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });
    });

    // --- [POST] /cart/add/:productId ---
    describe('[POST] /cart/add/:productId - addPost', () => {
        /**
         * Chức năng: Thêm sản phẩm mới vào giỏ hàng.
         * Mô tả kiểm thử: Đảm bảo controller thêm sản phẩm vào mảng `products` nếu nó chưa tồn tại.
         * Dữ liệu đầu vào:
         * - req.cookies.cartId: "cart_id_add"
         * - req.params.productId: "new_product_id"
         * - req.body.quantity: "3"
         * - Cart.findOne trả về giỏ hàng không chứa 'new_product_id'.
         * Kết quả mong đợi:
         * - Cart.updateOne được gọi với `$push` để thêm sản phẩm mới.
         * - req.flash và res.redirect được gọi.
         */
        test('should add new product to cart if it does not exist', async () => {
            mockReq.cookies.cartId = "cart_id_add";
            mockReq.params.productId = "new_product_id";
            mockReq.body.quantity = "3"; // body.quantity là string

            const mockCartExisting = {
                _id: "cart_id_add",
                products: [{ product_id: 'other_product_id', quantity: 1 }],
            };

            Cart.findOne.mockResolvedValueOnce(mockCartExisting);
            Cart.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

            await cartController.addPost(mockReq, mockRes);

            expect(Cart.findOne).toHaveBeenCalledWith({ _id: "cart_id_add" });
            expect(Cart.updateOne).toHaveBeenCalledWith(
                { _id: "cart_id_add" },
                { $push: { products: { product_id: "new_product_id", quantity: 3 } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith("success", "Thêm vào giỏ hàng thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });

        /**
         * Chức năng: Cập nhật số lượng sản phẩm nếu đã có trong giỏ hàng.
         * Mô tả kiểm thử: Đảm bảo controller tăng số lượng sản phẩm hiện có thay vì thêm mới.
         * Dữ liệu đầu vào:
         * - req.cookies.cartId: "cart_id_update"
         * - req.params.productId: "existing_product_id"
         * - req.body.quantity: "2"
         * - Cart.findOne trả về giỏ hàng đã chứa 'existing_product_id' với số lượng ban đầu.
         * Kết quả mong đợi:
         * - Cart.updateOne được gọi với '$' operator để cập nhật số lượng.
         * - Số lượng sản phẩm được cập nhật đúng (quantity + existingQuantity).
         * - req.flash và res.redirect được gọi.
         */
        test('should update quantity if product already exists in cart', async () => {
            mockReq.cookies.cartId = "cart_id_update";
            mockReq.params.productId = "existing_product_id";
            mockReq.body.quantity = "2";

            const initialQuantity = 5;
            const mockCartExisting = {
                _id: "cart_id_update",
                products: [{ product_id: 'existing_product_id', quantity: initialQuantity }],
            };

            Cart.findOne.mockResolvedValueOnce(mockCartExisting);
            Cart.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

            await cartController.addPost(mockReq, mockRes);

            const expectedNewQuantity = initialQuantity + parseInt(mockReq.body.quantity); // 5 + 2 = 7

            expect(Cart.findOne).toHaveBeenCalledWith({ _id: "cart_id_update" });
            expect(Cart.updateOne).toHaveBeenCalledWith(
                {
                    _id: "cart_id_update",
                    'products.product_id': "existing_product_id"
                },
                {
                    'products.$.quantity': expectedNewQuantity
                }
            );
            expect(mockReq.flash).toHaveBeenCalledWith("success", "Thêm vào giỏ hàng thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });

        /**
         * Chức năng: Xử lý khi quantity là một chuỗi không phải số.
         * Mô tả kiểm thử: Kiểm tra hành vi khi `parseInt` trả về `NaN`.
         * Dữ liệu đầu vào:
         * - req.body.quantity: "abc"
         * - Sản phẩm không tồn tại trong giỏ hàng.
         * Kết quả mong đợi:
         * - `Cart.updateOne` được gọi với quantity là `NaN`.
         * - req.flash và res.redirect vẫn được gọi.
         * (Lưu ý: Hành vi này không mong muốn trong thực tế và cần được xử lý validation ở middleware hoặc đầu controller.)
         */
        test('should add product with NaN quantity if input is non-numeric string', async () => {
            mockReq.cookies.cartId = "cart_id_nan_quantity";
            mockReq.params.productId = "new_product_nan";
            mockReq.body.quantity = "abc"; // Non-numeric string

            const mockCartEmpty = { _id: "cart_id_nan_quantity", products: [] };
            Cart.findOne.mockResolvedValueOnce(mockCartEmpty);
            Cart.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

            await cartController.addPost(mockReq, mockRes);

            expect(Cart.findOne).toHaveBeenCalledWith({ _id: "cart_id_nan_quantity" });
            expect(Cart.updateOne).toHaveBeenCalledWith(
                { _id: "cart_id_nan_quantity" },
                { $push: { products: { product_id: "new_product_nan", quantity: NaN } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith("success", "Thêm vào giỏ hàng thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });

        /**
         * Chức năng: Xử lý khi quantity là 0.
         * Mô tả kiểm thử: Kiểm tra hành vi khi số lượng thêm vào là 0.
         * Dữ liệu đầu vào:
         * - req.body.quantity: "0"
         * - Sản phẩm không tồn tại trong giỏ hàng.
         * Kết quả mong đợi:
         * - `Cart.updateOne` được gọi với quantity là 0, tức là thêm một sản phẩm có số lượng 0 vào giỏ.
         * - req.flash và res.redirect vẫn được gọi.
         * (Lưu ý: Hành vi này không mong muốn trong thực tế; thêm 0 sản phẩm thường không nên tạo một mục mới.)
         */
        test('should add product with 0 quantity if input is 0 and product does not exist', async () => {
            mockReq.cookies.cartId = "cart_id_zero_quantity";
            mockReq.params.productId = "new_product_zero";
            mockReq.body.quantity = "0";

            const mockCartEmpty = { _id: "cart_id_zero_quantity", products: [] };
            Cart.findOne.mockResolvedValueOnce(mockCartEmpty);
            Cart.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

            await cartController.addPost(mockReq, mockRes);

            expect(Cart.findOne).toHaveBeenCalledWith({ _id: "cart_id_zero_quantity" });
            expect(Cart.updateOne).toHaveBeenCalledWith(
                { _id: "cart_id_zero_quantity" },
                { $push: { products: { product_id: "new_product_zero", quantity: 0 } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith("success", "Thêm vào giỏ hàng thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });

        /**
         * Chức năng: Xử lý khi quantity là một số âm.
         * Mô tả kiểm thử: Kiểm tra hành vi khi số lượng thêm vào là số âm.
         * Dữ liệu đầu vào:
         * - req.body.quantity: "-2"
         * - Sản phẩm không tồn tại trong giỏ hàng.
         * Kết quả mong đợi:
         * - `Cart.updateOne` được gọi với quantity là số âm, tức là thêm một sản phẩm có số lượng âm vào giỏ.
         * - req.flash và res.redirect vẫn được gọi.
         * (Lưu ý: Hành vi này hoàn toàn không mong muốn trong thực tế.)
         */
        test('should add product with negative quantity if input is negative and product does not exist', async () => {
            mockReq.cookies.cartId = "cart_id_neg_quantity";
            mockReq.params.productId = "new_product_neg";
            mockReq.body.quantity = "-2";

            const mockCartEmpty = { _id: "cart_id_neg_quantity", products: [] };
            Cart.findOne.mockResolvedValueOnce(mockCartEmpty);
            Cart.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

            await cartController.addPost(mockReq, mockRes);

            expect(Cart.findOne).toHaveBeenCalledWith({ _id: "cart_id_neg_quantity" });
            expect(Cart.updateOne).toHaveBeenCalledWith(
                { _id: "cart_id_neg_quantity" },
                { $push: { products: { product_id: "new_product_neg", quantity: -2 } } }
            );
            expect(mockReq.flash).toHaveBeenCalledWith("success", "Thêm vào giỏ hàng thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });

        /**
         * Chức năng: Xử lý khi quantity là số âm và sản phẩm đã tồn tại.
         * Mô tả kiểm thử: Kiểm tra hành vi khi số lượng sản phẩm hiện có bị trừ đi.
         * Dữ liệu đầu vào:
         * - req.body.quantity: "-2"
         * - Sản phẩm đã tồn tại trong giỏ hàng với số lượng ban đầu là 5.
         * Kết quả mong đợi:
         * - Số lượng sản phẩm trong giỏ sẽ giảm xuống (5 - 2 = 3).
         * - req.flash và res.redirect vẫn được gọi.
         */
        test('should decrease quantity if input is negative and product already exists', async () => {
            mockReq.cookies.cartId = "cart_id_update_neg";
            mockReq.params.productId = "existing_product_id_neg";
            mockReq.body.quantity = "-2";

            const initialQuantity = 5;
            const mockCartExisting = {
                _id: "cart_id_update_neg",
                products: [{ product_id: 'existing_product_id_neg', quantity: initialQuantity }],
            };

            Cart.findOne.mockResolvedValueOnce(mockCartExisting);
            Cart.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

            await cartController.addPost(mockReq, mockRes);

            const expectedNewQuantity = initialQuantity + parseInt(mockReq.body.quantity); // 5 + (-2) = 3

            expect(Cart.findOne).toHaveBeenCalledWith({ _id: "cart_id_update_neg" });
            expect(Cart.updateOne).toHaveBeenCalledWith(
                {
                    _id: "cart_id_update_neg",
                    'products.product_id': "existing_product_id_neg"
                },
                {
                    'products.$.quantity': expectedNewQuantity
                }
            );
            expect(mockReq.flash).toHaveBeenCalledWith("success", "Thêm vào giỏ hàng thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });

        /**
         * Chức năng: Xử lý lỗi khi thêm/cập nhật sản phẩm.
         * Mô tả kiểm thử: Đảm bảo controller không crash và redirect về trang trước đó.
         * Dữ liệu đầu vào:
         * - Bất kỳ input hợp lệ nào, nhưng Cart.findOne hoặc Cart.updateOne throw error.
         * Kết quả mong đợi:
         * - req.flash không được gọi với 'success'.
         * - res.redirect vẫn được gọi với "back".
         */
        test('should handle error during add/update and redirect back', async () => {
            mockReq.cookies.cartId = "cart_id_error";
            mockReq.params.productId = "some_product";
            mockReq.body.quantity = "1";

            Cart.findOne.mockRejectedValueOnce(new Error("DB error on find"));

            await cartController.addPost(mockReq, mockRes);

            expect(Cart.findOne).toHaveBeenCalled();
            expect(Cart.updateOne).not.toHaveBeenCalled(); // Vì findOne lỗi nên updateOne không được gọi
            expect(mockReq.flash).not.toHaveBeenCalledWith("success", "Thêm vào giỏ hàng thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });
    });

    // --- [GET] /update/:productId/:quantity ---
    describe('[GET] /update/:productId/:quantity - update', () => {
        /**
         * Chức năng: Cập nhật số lượng sản phẩm trong giỏ hàng.
         * Mô tả kiểm thử: Đảm bảo controller gọi đúng hàm update với số lượng mới và redirect.
         * Dữ liệu đầu vào:
         * - req.params.productId: "product_to_update_id"
         * - req.cookies.cartId: "cart_id_123"
         * - req.params.quantity: "5"
         * Kết quả mong đợi:
         * - Cart.updateOne được gọi để cập nhật số lượng của sản phẩm cụ thể.
         * - req.flash và res.redirect được gọi.
         */
        test('should update product quantity in cart and redirect back', async () => {
            mockReq.params.productId = "product_to_update_id";
            mockReq.cookies.cartId = "cart_id_123";
            mockReq.params.quantity = "5";

            Cart.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

            await cartController.update(mockReq, mockRes);

            expect(Cart.updateOne).toHaveBeenCalledWith(
                {
                    _id: "cart_id_123",
                    'products.product_id': "product_to_update_id"
                },
                {
                    'products.$.quantity': "5" // quantity from params is string
                }
            );
            expect(mockReq.flash).toHaveBeenCalledWith("success", "Cập nhật thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });

        /**
         * Chức năng: Xử lý lỗi khi cập nhật số lượng.
         * Mô tả kiểm thử: Đảm bảo controller không crash và redirect về trang trước đó.
         * Dữ liệu đầu vào:
         * - Bất kỳ input hợp lệ nào, nhưng Cart.updateOne throw error.
         * Kết quả mong đợi:
         * - req.flash không được gọi với 'success'.
         * - res.redirect vẫn được gọi với "back".
         */
        test('should handle error during update and redirect back', async () => {
            mockReq.params.productId = "some_product";
            mockReq.cookies.cartId = "some_cart";
            mockReq.params.quantity = "1";

            Cart.updateOne.mockRejectedValueOnce(new Error("DB update error"));

            await cartController.update(mockReq, mockRes);

            expect(Cart.updateOne).toHaveBeenCalled();
            expect(mockReq.flash).not.toHaveBeenCalledWith("success", "Cập nhật thành công");
            expect(mockRes.redirect).toHaveBeenCalledWith("back");
        });
    });
});