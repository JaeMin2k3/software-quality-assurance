// __tests__/user.controller.test.js

// Mock dependencies
jest.mock('../model/carts.model');
jest.mock('../model/users.model');
jest.mock('../model/forgot-password.model');
jest.mock('../helper/generate');
jest.mock('md5');
jest.mock('../helper/sendMail');

const Cart = require('../model/carts.model');
const User = require('../model/users.model');
const ForgotPassword = require('../model/forgot-password.model');
const generateHelper = require('../helper/generate');
const md5 = require('md5');
const sendMailHelper = require('../helper/sendMail');

const userController = require('../controllers/client/user.controller'); // Adjust path as needed

describe('User Controller', () => {
  let mockReq, mockRes;

  const mockCartId = 'mockCartId123';
  const mockUserToken = 'mockUserTokenAbc';
  const mockUserId = 'mockUserIdXyz';

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      query: {},
      params: {},
      cookies: {},
      flash: jest.fn(),
    };
    mockRes = {
      render: jest.fn(),
      redirect: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    // Default mock implementations
    User.findOne.mockResolvedValue(null);
    User.updateOne.mockResolvedValue({ nModified: 1, matchedCount: 1 }); // Simulate successful update
    Cart.mockImplementation(() => ({ // Mock Cart constructor
      id: mockCartId,
      save: jest.fn().mockResolvedValue({ id: mockCartId }),
    }));
    ForgotPassword.findOne.mockResolvedValue(null);
    ForgotPassword.mockImplementation(() => ({ // Mock ForgotPassword constructor
        save: jest.fn().mockResolvedValue(true)
    }));
    md5.mockImplementation(str => `md5-${str}`); // Simple md5 mock
    generateHelper.generateRandomNumber.mockReturnValue('123456'); // Default OTP
    sendMailHelper.sendMail.mockResolvedValue(true); // Assume email sends successfully
  });

  // --- [GET] /user/register ---
  describe('register (GET)', () => {
    /**
     * @Chức năng: Hiển thị trang đăng ký người dùng.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập vào đường dẫn để đăng ký tài khoản.
     * - Kiểm tra xem hệ thống có hiển thị đúng trang đăng ký hay không.
     * @Dữ liệu đầu vào: Không có dữ liệu đầu vào đặc biệt từ người dùng.
     * @Kết quả mong đợi:
     * - Trang `client/page/user/register.pug` được hiển thị.
     */
    test('should render the user registration page', async () => {
      await userController.register(mockReq, mockRes);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/user/register.pug");
    });
  });

  // --- [POST] /user/register ---
  describe('registerPost (POST)', () => {
    const registerBody = {
      fullName: "Test User",
      email: "test@example.com",
      password: "password123",
      passwordCF: "password123",
    };

    /**
     * @Chức năng: Xử lý yêu cầu đăng ký tài khoản thành công.
     * @Mô tả kiểm thử:
     * - Người dùng gửi thông tin đăng ký hợp lệ (email chưa tồn tại, mật khẩu khớp).
     * - Giả lập rằng email chưa có trong hệ thống.
     * - Hệ thống sẽ tạo một giỏ hàng mới, mã hóa mật khẩu, lưu thông tin người dùng,
     * thiết lập cookies cho `cartId` và `tokenUser`, sau đó chuyển hướng về trang chủ.
     * @Dữ liệu đầu vào: `req.body` chứa `fullName`, `email`, `password`, `passwordCF` (khớp nhau).
     * @Kết quả mong đợi:
     * - Không có thông báo lỗi `req.flash`.
     * - Một giỏ hàng mới được tạo và lưu.
     * - Cookie `cartId` được thiết lập.
     * - Mật khẩu được mã hóa bằng md5.
     * - Người dùng mới được tạo và lưu với `cart_id` và `tokenUser`.
     * - Cookie `tokenUser` được thiết lập.
     * - Chuyển hướng về trang chủ (`/`).
     */
    test('should register a new user successfully and redirect to home', async () => {
      mockReq.body = { ...registerBody };
      User.findOne.mockResolvedValue(null); // Email does not exist
      const mockSavedUser = {
        id: mockUserId,
        tokenUser: mockUserToken,
        cart_id: mockCartId, // Ensure this matches the cart created
        ...mockReq.body, // other fields
        password: `md5-${registerBody.password}`
      };
      User.mockImplementation(() => ({ // Mock User constructor
        ...mockSavedUser,
        save: jest.fn().mockResolvedValue(mockSavedUser),
      }));


      await userController.registerPost(mockReq, mockRes);

      expect(mockReq.flash).not.toHaveBeenCalled();
      expect(Cart).toHaveBeenCalledTimes(1); // Cart constructor
      expect(Cart.mock.results[0].value.save).toHaveBeenCalledTimes(1); // cart.save()
      expect(mockRes.cookie).toHaveBeenCalledWith("cartId", mockCartId, expect.any(Object));
      expect(md5).toHaveBeenCalledWith(registerBody.password);
      expect(User).toHaveBeenCalledWith(expect.objectContaining({
        email: registerBody.email,
        password: `md5-${registerBody.password}`,
        cart_id: mockCartId
      }));
      expect(User.mock.results[0].value.save).toHaveBeenCalledTimes(1); // user.save()
      expect(mockRes.cookie).toHaveBeenCalledWith("tokenUser", mockUserToken);
      expect(mockRes.redirect).toHaveBeenCalledWith("/");
    });

    /**
     * @Chức năng: Xử lý khi mật khẩu và mật khẩu xác nhận không khớp.
     * @Mô tả kiểm thử:
     * - Người dùng gửi thông tin đăng ký nhưng `password` và `passwordCF` không giống nhau.
     * - Hệ thống sẽ hiển thị thông báo lỗi và chuyển hướng người dùng trở lại trang trước đó.
     * @Dữ liệu đầu vào: `req.body.password = "password123"`, `req.body.passwordCF = "password456"`.
     * @Kết quả mong đợi:
     * - `req.flash` được gọi với thông báo lỗi "Mật khẩu không giống nhau".
     * - Chuyển hướng người dùng trở lại (`res.redirect("back")`).
     * - Không tạo người dùng hay giỏ hàng.
     */
    test('should show error if passwords do not match', async () => {
      mockReq.body = { ...registerBody, passwordCF: "password456" };

      await userController.registerPost(mockReq, mockRes);

      expect(mockReq.flash).toHaveBeenCalledWith("error", "Mật khẩu không giống nhau");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
      expect(User.findOne).not.toHaveBeenCalled(); // Không kiểm tra email nếu mật khẩu đã không khớp
      expect(Cart).not.toHaveBeenCalled();
    });

    /**
     * @Chức năng: Xử lý khi email đăng ký đã tồn tại trong hệ thống.
     * @Mô tả kiểm thử:
     * - Người dùng gửi thông tin đăng ký với một email đã được sử dụng.
     * - Mật khẩu và mật khẩu xác nhận khớp nhau.
     * - Giả lập rằng `User.findOne` tìm thấy một người dùng với email đó.
     * - Hệ thống sẽ hiển thị thông báo lỗi và chuyển hướng người dùng trở lại.
     * @Dữ liệu đầu vào: `req.body.email` là một email đã tồn tại.
     * @Kết quả mong đợi:
     * - `req.flash` được gọi với thông báo lỗi "Email đã tồn tại".
     * - Chuyển hướng người dùng trở lại (`res.redirect("back")`).
     * - Không tạo người dùng mới hay giỏ hàng mới.
     */
    test('should show error if email already exists', async () => {
      mockReq.body = { ...registerBody };
      User.findOne.mockResolvedValue({ email: registerBody.email }); // Email exists

      await userController.registerPost(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: registerBody.email, deleted: false });
      expect(mockReq.flash).toHaveBeenCalledWith("error", "Email đã tồn tại");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
      expect(Cart).not.toHaveBeenCalled(); // Không tạo giỏ hàng nếu email đã tồn tại
    });
  });

  // --- [GET] /user/login ---
  describe('login (GET)', () => {
    /**
     * @Chức năng: Hiển thị trang đăng nhập.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập vào đường dẫn để đăng nhập.
     * - Kiểm tra xem hệ thống có hiển thị đúng trang đăng nhập với tiêu đề trang.
     * @Dữ liệu đầu vào: Không có.
     * @Kết quả mong đợi:
     * - Trang `client/page/user/login.pug` được hiển thị với `pageTitle: "Đăng nhập"`.
     */
    test('should render the user login page', async () => {
      await userController.login(mockReq, mockRes);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/user/login.pug", {
        pageTitle: "Đăng nhập"
      });
    });
  });

  // --- [POST] /user/login ---
  describe('loginPost (POST)', () => {
    const loginBody = { email: "user@example.com", password: "password123" };
    const mockExistingUser = {
      id: mockUserId,
      email: loginBody.email,
      password: `md5-${loginBody.password}`, // Mật khẩu đã mã hóa
      tokenUser: mockUserToken,
      cart_id: mockCartId,
      status: "active",
      deleted: false
    };

    /**
     * @Chức năng: Xử lý đăng nhập thành công.
     * @Mô tả kiểm thử:
     * - Người dùng cung cấp email và mật khẩu chính xác của một tài khoản đang hoạt động.
     * - Giả lập `User.findOne` tìm thấy người dùng với email đó và mật khẩu (sau khi mã hóa) khớp.
     * - Hệ thống sẽ thiết lập cookie `tokenUser` và `cartId` (từ thông tin người dùng), sau đó chuyển hướng về trang chủ.
     * @Dữ liệu đầu vào: `req.body` chứa `email` và `password` hợp lệ.
     * @Kết quả mong đợi:
     * - Không có thông báo lỗi `req.flash`.
     * - Cookie `tokenUser` và `cartId` được thiết lập.
     * - Chuyển hướng về trang chủ (`/`).
     */
    test('should login user successfully and redirect to home', async () => {
      mockReq.body = { ...loginBody };
      User.findOne.mockResolvedValue(mockExistingUser);
      md5.mockReturnValueOnce(`md5-${loginBody.password}`); // Mock md5 cho mật khẩu nhập vào

      await userController.loginPost(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: loginBody.email, deleted: false });
      expect(md5).toHaveBeenCalledWith(loginBody.password);
      expect(mockReq.flash).not.toHaveBeenCalled();
      expect(mockRes.cookie).toHaveBeenCalledWith("tokenUser", mockUserToken);
      expect(mockRes.cookie).toHaveBeenCalledWith("cartId", mockCartId, expect.any(Object));
      expect(mockRes.redirect).toHaveBeenCalledWith("/");
    });

    /**
     * @Chức năng: Xử lý khi email đăng nhập không tồn tại.
     * @Mô tả kiểm thử:
     * - Người dùng nhập một email không có trong hệ thống.
     * - Giả lập `User.findOne` trả về `null` (không tìm thấy người dùng).
     * - Hệ thống hiển thị thông báo lỗi và chuyển hướng trở lại.
     * @Dữ liệu đầu vào: `req.body.email` không tồn tại.
     * @Kết quả mong đợi:
     * - `req.flash` được gọi với lỗi "Email không tồn tại".
     * - Chuyển hướng trở lại (`res.redirect("back")`).
     */
    test('should show error if email does not exist', async () => {
      mockReq.body = { ...loginBody, email: "nouser@example.com" };
      User.findOne.mockResolvedValue(null); // Email không tồn tại

      await userController.loginPost(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: "nouser@example.com", deleted: false });
      expect(mockReq.flash).toHaveBeenCalledWith("error", "Email không tồn tại");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
    });

    /**
     * @Chức năng: Xử lý khi mật khẩu đăng nhập không chính xác.
     * @Mô tả kiểm thử:
     * - Người dùng nhập đúng email nhưng sai mật khẩu.
     * - Giả lập `User.findOne` tìm thấy người dùng, nhưng mật khẩu (sau khi mã hóa) không khớp với mật khẩu lưu trữ.
     * - Hệ thống hiển thị thông báo lỗi và chuyển hướng trở lại.
     * @Dữ liệu đầu vào: `req.body.password` sai.
     * @Kết quả mong đợi:
     * - `req.flash` được gọi với lỗi "Sai mật khẩu".
     * - Chuyển hướng trở lại (`res.redirect("back")`).
     */
    test('should show error if password is incorrect', async () => {
      mockReq.body = { ...loginBody, password: "wrongpassword" };
      User.findOne.mockResolvedValue(mockExistingUser); // User tìm thấy
      md5.mockReturnValueOnce(`md5-wrongpassword`); // Mật khẩu nhập vào sau khi mã hóa

      await userController.loginPost(mockReq, mockRes);

      expect(md5).toHaveBeenCalledWith("wrongpassword");
      expect(mockReq.flash).toHaveBeenCalledWith("error", "Sai mật khẩu");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
    });

    /**
     * @Chức năng: Xử lý khi tài khoản người dùng bị vô hiệu hóa (inactive).
     * @Mô tả kiểm thử:
     * - Người dùng nhập đúng email và mật khẩu, nhưng tài khoản của họ ở trạng thái 'inactive'.
     * - Giả lập `User.findOne` tìm thấy người dùng với trạng thái này.
     * - Hệ thống hiển thị thông báo lỗi và chuyển hướng trở lại.
     * @Dữ liệu đầu vào: Tài khoản người dùng có `status: 'inactive'`.
     * @Kết quả mong đợi:
     * - `req.flash` được gọi với lỗi "Tài khoản đã bị khóa".
     * - Chuyển hướng trở lại (`res.redirect("back")`).
     */
    test('should show error if user account is inactive', async () => {
      mockReq.body = { ...loginBody };
      const inactiveUser = { ...mockExistingUser, status: 'inactive' };
      User.findOne.mockResolvedValue(inactiveUser);
      md5.mockReturnValueOnce(`md5-${loginBody.password}`);

      await userController.loginPost(mockReq, mockRes);

      expect(mockReq.flash).toHaveBeenCalledWith("error", "Tài khoản đã bị khóa");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
    });
  });

  // --- [GET] /user/logout ---
  describe('logout (GET)', () => {
    /**
     * @Chức năng: Đăng xuất người dùng.
     * @Mô tả kiểm thử:
     * - Người dùng yêu cầu đăng xuất.
     * - Hệ thống xóa cookie `tokenUser` và `cartId`.
     * - Chuyển hướng người dùng về trang chủ.
     * @Dữ liệu đầu vào: Không có.
     * @Kết quả mong đợi:
     * - `res.clearCookie` được gọi cho "tokenUser" và "cartId".
     * - Chuyển hướng về trang chủ (`/`).
     */
    test('should clear cookies and redirect to home on logout', async () => {
      await userController.logout(mockReq, mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith("tokenUser");
      expect(mockRes.clearCookie).toHaveBeenCalledWith("cartId");
      expect(mockRes.redirect).toHaveBeenCalledWith("/");
    });
  });

  // --- [GET] /user/password/forgot ---
  describe('forgotPassword (GET)', () => {
    /**
     * @Chức năng: Hiển thị trang yêu cầu lấy lại mật khẩu.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập vào đường dẫn để bắt đầu quá trình quên mật khẩu.
     * - Kiểm tra xem hệ thống có hiển thị đúng trang hay không.
     * @Dữ liệu đầu vào: Không có.
     * @Kết quả mong đợi:
     * - Trang `client/page/user/forgot-password.pug` được hiển thị.
     */
    test('should render the forgot password page', async () => {
      await userController.forgotPassword(mockReq, mockRes);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/user/forgot-password.pug");
    });
  });

  // --- [POST] /user/password/forgot ---
  describe('forgotPasswordPost (POST)', () => {
    const forgotEmail = "user@example.com";

    /**
     * @Chức năng: Xử lý yêu cầu quên mật khẩu thành công.
     * @Mô tả kiểm thử:
     * - Người dùng nhập email đã đăng ký để yêu cầu lấy lại mật khẩu.
     * - Giả lập `User.findOne` tìm thấy người dùng với email đó.
     * - Hệ thống tạo một mã OTP, lưu vào cơ sở dữ liệu `forgotPassword`, gửi email chứa OTP cho người dùng,
     * và chuyển hướng đến trang nhập OTP.
     * @Dữ liệu đầu vào: `req.body.email` là email hợp lệ.
     * @Kết quả mong đợi:
     * - `User.findOne` được gọi để tìm người dùng.
     * - `generate.generateRandomNumber(6)` được gọi để tạo OTP.
     * - Một bản ghi `forgotPassword` mới được tạo và lưu với email và OTP.
     * - `sendMailHelper.sendMail` được gọi để gửi email.
     * - Chuyển hướng đến trang `/user/password/otp?email=user@example.com`.
     */
    test('should process forgot password request successfully', async () => {
      mockReq.body.email = forgotEmail;
      const mockUser = { id: mockUserId, email: forgotEmail, deleted: false };
      User.findOne.mockResolvedValue(mockUser);
      const generatedOtp = '123456';
      generateHelper.generateRandomNumber.mockReturnValue(generatedOtp);

      await userController.forgotPasswordPost(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: forgotEmail, deleted: false });
      expect(generateHelper.generateRandomNumber).toHaveBeenCalledWith(6);
      expect(ForgotPassword).toHaveBeenCalledWith(expect.objectContaining({
        email: forgotEmail,
        otp: generatedOtp,
      }));
      expect(ForgotPassword.mock.results[0].value.save).toHaveBeenCalled();
      expect(sendMailHelper.sendMail).toHaveBeenCalledWith(forgotEmail, generatedOtp, "Xác thực quên mật khẩu");
      expect(mockRes.redirect).toHaveBeenCalledWith(`/user/password/otp?email=${forgotEmail}`);
    });

    /**
     * @Chức năng: Xử lý khi email yêu cầu quên mật khẩu không tồn tại.
     * @Mô tả kiểm thử:
     * - Người dùng nhập một email không có trong hệ thống.
     * - Giả lập `User.findOne` trả về `null`.
     * - Hệ thống hiển thị thông báo lỗi và chuyển hướng trở lại.
     * @Dữ liệu đầu vào: `req.body.email` không tồn tại.
     * @Kết quả mong đợi:
     * - `req.flash` được gọi với lỗi "Email Không tồn tại".
     * - Chuyển hướng trở lại (`res.redirect("back")`).
     */
    test('should show error if email for forgot password does not exist', async () => {
      mockReq.body.email = "nouser@example.com";
      User.findOne.mockResolvedValue(null); // Email không tồn tại

      await userController.forgotPasswordPost(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: "nouser@example.com", deleted: false });
      expect(mockReq.flash).toHaveBeenCalledWith("error", "Email Không tồn tại");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
      expect(ForgotPassword).not.toHaveBeenCalled();
    });
  });

  // --- [GET] /user/password/otp ---
  describe('otpPassword (GET)', () => {
    /**
     * @Chức năng: Hiển thị trang nhập mã OTP.
     * @Mô tả kiểm thử:
     * - Người dùng được chuyển hướng đến trang này sau khi yêu cầu quên mật khẩu, với email được truyền qua query param.
     * - Kiểm tra xem hệ thống có hiển thị đúng trang nhập OTP, cùng với email của người dùng.
     * @Dữ liệu đầu vào: `req.query.email = "user@example.com"`.
     * @Kết quả mong đợi:
     * - Trang `client/page/user/otpPassword.pug` được hiển thị với `pageTitle` và `email`.
     */
    test('should render OTP input page with email', async () => {
      const email = "user@example.com";
      mockReq.query.email = email;

      await userController.otpPassword(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith("client/page/user/otpPassword.pug", {
        pageTitle: "Nhập mã OTP",
        email: email
      });
    });
  });

  // --- [POST] /user/password/otp ---
  describe('otpPasswordPost (POST)', () => {
    const otpBody = { email: "user@example.com", otp: "123456" };
    const mockUserForOtp = {
        id: mockUserId,
        email: otpBody.email,
        tokenUser: mockUserToken,
        cart_id: mockCartId
    };

    /**
     * @Chức năng: Xử lý xác thực OTP thành công.
     * @Mô tả kiểm thử:
     * - Người dùng nhập đúng email và mã OTP đã được gửi.
     * - Giả lập `forgotPassword.findOne` tìm thấy bản ghi khớp với email và OTP.
     * - Giả lập `User.findOne` tìm thấy người dùng tương ứng với email đó.
     * - Hệ thống thiết lập cookie `cartId` và `tokenUser` (để cho phép đặt lại mật khẩu), sau đó chuyển hướng đến trang đặt lại mật khẩu.
     * @Dữ liệu đầu vào: `req.body` chứa `email` và `otp` hợp lệ.
     * @Kết quả mong đợi:
     * - `forgotPassword.findOne` được gọi để xác thực OTP.
     * - `User.findOne` được gọi để lấy thông tin người dùng.
     * - Cookie `cartId` và `tokenUser` được thiết lập.
     * - Chuyển hướng đến `/user/password/reset`.
     */
    test('should verify OTP successfully and redirect to reset password page', async () => {
      mockReq.body = { ...otpBody };
      ForgotPassword.findOne.mockResolvedValue({ email: otpBody.email, otp: otpBody.otp, expireAt: Date.now() + 60000 }); // OTP hợp lệ và chưa hết hạn
      User.findOne.mockResolvedValue(mockUserForOtp); // User tìm thấy

      await userController.otpPasswordPost(mockReq, mockRes);

      expect(ForgotPassword.findOne).toHaveBeenCalledWith({ email: otpBody.email, otp: otpBody.otp });
      expect(User.findOne).toHaveBeenCalledWith({ email: otpBody.email });
      expect(mockRes.cookie).toHaveBeenCalledWith("cartId", mockCartId, expect.any(Object));
      expect(mockRes.cookie).toHaveBeenCalledWith("tokenUser", mockUserToken);
      expect(mockRes.redirect).toHaveBeenCalledWith("/user/password/reset");
    });

    /**
     * @Chức năng: Xử lý khi mã OTP không chính xác.
     * @Mô tả kiểm thử:
     * - Người dùng nhập sai mã OTP.
     * - Giả lập `forgotPassword.findOne` trả về `null` (không tìm thấy bản ghi OTP khớp).
     * - Hệ thống hiển thị thông báo lỗi và chuyển hướng trở lại.
     * @Dữ liệu đầu vào: `req.body.otp` sai.
     * @Kết quả mong đợi:
     * - `req.flash` được gọi với lỗi "otp không đúng".
     * - Chuyển hướng trở lại (`res.redirect("back")`).
     */
    test('should show error if OTP is incorrect', async () => {
      mockReq.body = { ...otpBody, otp: "wrongotp" };
      ForgotPassword.findOne.mockResolvedValue(null); // OTP không đúng

      await userController.otpPasswordPost(mockReq, mockRes);

      expect(ForgotPassword.findOne).toHaveBeenCalledWith({ email: otpBody.email, otp: "wrongotp" });
      expect(mockReq.flash).toHaveBeenCalledWith("error", "otp không đúng");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
      expect(User.findOne).not.toHaveBeenCalled(); // Không tìm user nếu OTP sai
    });
  });

  // --- [GET] /user/password/reset ---
  describe('resetPassword (GET)', () => {
    /**
     * @Chức năng: Hiển thị trang đặt lại mật khẩu mới.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập trang này sau khi xác thực OTP thành công.
     * - Kiểm tra xem hệ thống có hiển thị đúng trang hay không.
     * @Dữ liệu đầu vào: Không có.
     * @Kết quả mong đợi:
     * - Trang `client/page/user/reset-password.pug` được hiển thị.
     */
    test('should render the reset password page', async () => {
      await userController.resetPassword(mockReq, mockRes);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/user/reset-password.pug");
    });
  });

  // --- [POST] /user/password/reset ---
  describe('resetPasswordPost (POST)', () => {
    const resetPasswordBody = { password: "newPassword123", confirmPassword: "newPassword123" };

    /**
     * @Chức năng: Xử lý đặt lại mật khẩu mới thành công.
     * @Mô tả kiểm thử:
     * - Người dùng nhập mật khẩu mới và xác nhận mật khẩu khớp nhau.
     * - `tokenUser` hợp lệ có trong cookie (đã được thiết lập sau khi xác thực OTP).
     * - Hệ thống cập nhật mật khẩu mới (đã mã hóa) cho người dùng dựa trên `tokenUser`.
     * - Hiển thị thông báo thành công và chuyển hướng về trang chủ.
     * @Dữ liệu đầu vào: `req.body` chứa `password` và `confirmPassword` (khớp nhau), `req.cookies.tokenUser` hợp lệ.
     * @Kết quả mong đợi:
     * - `User.updateOne` được gọi để cập nhật mật khẩu với `tokenUser` và mật khẩu mới đã mã hóa.
     * - `req.flash` được gọi với thông báo "Đổi mật khẩu thành công".
     * - Chuyển hướng về trang chủ (`/`).
     */
    test('should reset password successfully and redirect to home', async () => {
      mockReq.body = { ...resetPasswordBody };
      mockReq.cookies.tokenUser = mockUserToken;
      md5.mockReturnValueOnce(`md5-${resetPasswordBody.password}`);
      User.updateOne.mockResolvedValue({ nModified: 1, matchedCount: 1 }); // Giả lập cập nhật thành công 1 bản ghi

      await userController.resetPasswordPost(mockReq, mockRes);

      expect(md5).toHaveBeenCalledWith(resetPasswordBody.password);
      expect(User.updateOne).toHaveBeenCalledWith(
        { tokenUser: mockUserToken },
        { password: `md5-${resetPasswordBody.password}` }
      );
      expect(mockReq.flash).toHaveBeenCalledWith("Đổi mật khẩu thành công");
      expect(mockRes.redirect).toHaveBeenCalledWith("/");
    });

    /**
     * @Chức năng: Xử lý khi mật khẩu mới và mật khẩu xác nhận không khớp.
     * @Mô tả kiểm thử:
     * - Người dùng nhập mật khẩu mới và mật khẩu xác nhận không giống nhau.
     * - Hệ thống hiển thị thông báo lỗi và chuyển hướng trở lại.
     * @Dữ liệu đầu vào: `req.body.password` và `req.body.confirmPassword` không khớp.
     * @Kết quả mong đợi:
     * - `req.flash` được gọi với lỗi "Mật khẩu không trùng khớp!".
     * - Chuyển hướng trở lại (`res.redirect("back")`).
     * - Không cập nhật mật khẩu.
     */
    test('should show error if new passwords do not match during reset', async () => {
      mockReq.body = { ...resetPasswordBody, confirmPassword: "differentPassword" };
      mockReq.cookies.tokenUser = mockUserToken;

      await userController.resetPasswordPost(mockReq, mockRes);

      expect(mockReq.flash).toHaveBeenCalledWith("error", "Mật khẩu không trùng khớp!");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
      expect(User.updateOne).not.toHaveBeenCalled();
    });

    /**
     * @Chức năng: Xử lý khi không có `tokenUser` trong cookie (ví dụ: người dùng truy cập trực tiếp URL).
     * @Mô tả kiểm thử:
     * - Người dùng cố gắng đặt lại mật khẩu mà không có `tokenUser` trong cookie.
     * - `User.updateOne` sẽ được gọi với `tokenUser: undefined`. Giả lập rằng không có user nào được cập nhật.
     * - Hệ thống vẫn sẽ flash thông báo thành công (do không có kiểm tra kết quả của `updateOne` trước khi flash) và chuyển hướng.
     * Đây là một điểm có thể cần cải thiện trong controller. Test này phản ánh hành vi hiện tại.
     * @Dữ liệu đầu vào: `req.cookies.tokenUser` là `undefined`. `User.updateOne` trả về `nModified: 0`.
     * @Kết quả mong đợi:
     * - `User.updateOne` được gọi với `tokenUser: undefined`.
     * - `req.flash` vẫn được gọi với thông báo "Đổi mật khẩu thành công".
     * - Chuyển hướng về trang chủ.
     */
    test('should still attempt update and redirect if tokenUser is missing (current behavior)', async () => {
        mockReq.body = { ...resetPasswordBody };
        // mockReq.cookies.tokenUser is undefined
        User.updateOne.mockResolvedValue({ nModified: 0, matchedCount: 0 }); // Giả lập không có user nào được cập nhật

        await userController.resetPasswordPost(mockReq, mockRes);

        expect(User.updateOne).toHaveBeenCalledWith(
            { tokenUser: undefined },
            { password: `md5-${resetPasswordBody.password}` }
        );
        expect(mockReq.flash).toHaveBeenCalledWith("Đổi mật khẩu thành công");
        expect(mockRes.redirect).toHaveBeenCalledWith("/");
    });
  });

  // --- [GET] /user/infor ---
  describe('infor (GET)', () => {
    /**
     * @Chức năng: Hiển thị trang thông tin người dùng.
     * @Mô tả kiểm thử:
     * - Người dùng truy cập vào đường dẫn để xem thông tin tài khoản.
     * - Kiểm tra xem hệ thống có hiển thị đúng trang thông tin hay không.
     * @Dữ liệu đầu vào: Không có.
     * @Kết quả mong đợi:
     * - Trang `client/page/user/infor.pug` được hiển thị.
     */
    test('should render the user information page', async () => {
      await userController.infor(mockReq, mockRes);
      expect(mockRes.render).toHaveBeenCalledWith("client/page/user/infor.pug");
    });
  });

  // --- Unhandled Scenarios and Logical Gaps ---
  describe('Unhandled Scenarios and Logical Gaps', () => {
    /**
     * @Chức năng: Kiểm tra hành vi khi đăng ký mà thiếu trường email.
     * @Mô tả kiểm thử:
     * - Người dùng gửi form đăng ký nhưng không điền email.
     * - Controller hiện tại không có validation cụ thể cho việc thiếu email trước khi gọi `User.findOne`.
     * - `User.findOne({ email: undefined, ...})` có thể trả về `null`.
     * - Sau đó, `new User(req.body)` sẽ tạo user với `email: undefined`.
     * - Đây là một lỗ hổng logic. Lý tưởng nhất, controller nên báo lỗi "Email là bắt buộc".
     * @Dữ liệu đầu vào: `req.body` không có trường `email`.
     * @Kết quả mong đợi (lý tưởng): Flash lỗi "Email là bắt buộc", redirect "back".
     * @Kết quả mong đợi (hiện tại, được test): Controller sẽ tiếp tục, tạo user với email `undefined`.
     */
    test('registerPost: should proceed with undefined email if email field is missing (current behavior)', async () => {
        mockReq.body = { fullName: "Test NoEmail", password: "123", passwordCF: "123" }; // email is missing
        User.findOne.mockResolvedValue(null); // Giả sử email undefined không tìm thấy user nào
         const mockSavedUser = {
            id: mockUserId,
            tokenUser: mockUserToken,
            cart_id: mockCartId,
            fullName: "Test NoEmail",
            email: undefined, // Đây là điểm mấu chốt
            password: `md5-123`
        };
        User.mockImplementation(() => ({
            ...mockSavedUser,
            save: jest.fn().mockResolvedValue(mockSavedUser),
        }));


        await userController.registerPost(mockReq, mockRes);

        expect(User.findOne).toHaveBeenCalledWith({ email: undefined, deleted: false });
        expect(User).toHaveBeenCalledWith(expect.objectContaining({ email: undefined }));
        expect(mockRes.redirect).toHaveBeenCalledWith("/"); // Vẫn redirect vì không có lỗi nào được ném ra hoặc flash
        // Lý tưởng: expect(mockReq.flash).toHaveBeenCalledWith("error", "Email là bắt buộc");
    });

    /**
     * @Chức năng: Kiểm tra hành vi khi đăng nhập với mật khẩu rỗng.
     * @Mô tả kiểm thử:
     * - Người dùng nhập email nhưng để trống mật khẩu.
     * - Controller hiện tại sẽ mã hóa chuỗi rỗng `md5("")` và so sánh.
     * - Khả năng cao là sẽ báo "Sai mật khẩu" vì hash của chuỗi rỗng không khớp.
     * - Đây là hành vi chấp nhận được, nhưng validation rõ ràng cho trường rỗng sẽ tốt hơn.
     * @Dữ liệu đầu vào: `req.body.email = "user@example.com"`, `req.body.password = ""`.
     * @Kết quả mong đợi (lý tưởng): Flash lỗi "Mật khẩu là bắt buộc", redirect "back".
     * @Kết quả mong đợi (hiện tại, được test): Flash lỗi "Sai mật khẩu", redirect "back".
     */
    test('loginPost: should result in "Sai mật khẩu" if password is empty string (current behavior)', async () => {
        const email = "user@example.com";
        mockReq.body = { email: email, password: "" };
        const mockUser = { email: email, password: "md5-realPassword", status: "active", deleted: false };
        User.findOne.mockResolvedValue(mockUser);
        md5.mockReturnValueOnce("md5-"); // Giả lập md5("")

        await userController.loginPost(mockReq, mockRes);

        expect(md5).toHaveBeenCalledWith("");
        expect(mockReq.flash).toHaveBeenCalledWith("error", "Sai mật khẩu");
        expect(mockRes.redirect).toHaveBeenCalledWith("back");
    });

    /**
     * @Chức năng: Kiểm tra hành vi khi xác thực OTP đã hết hạn.
     * @Mô tả kiểm thử:
     * - Người dùng nhập đúng email và OTP.
     * - `ForgotPassword.findOne` tìm thấy bản ghi OTP, nhưng trường `expireAt` của bản ghi đó đã qua.
     * - Controller hiện tại KHÔNG kiểm tra trường `expireAt`.
     * - Do đó, controller sẽ coi OTP là hợp lệ và cho phép người dùng tiếp tục. Đây là một lỗ hổng bảo mật.
     * @Dữ liệu đầu vào: `req.body` có email và OTP đúng. `ForgotPassword.findOne` trả về bản ghi có `expireAt` trong quá khứ.
     * @Kết quả mong đợi (lý tưởng): Flash lỗi "OTP đã hết hạn", redirect "back".
     * @Kết quả mong đợi (hiện tại, được test): Controller xử lý như OTP hợp lệ, redirect đến trang reset password.
     */
    test('otpPasswordPost: should proceed even if OTP record is expired (current behavior - security flaw)', async () => {
        const email = "user@example.com";
        const otp = "123456";
        mockReq.body = { email: email, otp: otp };
        const expiredOtpRecord = { email: email, otp: otp, expireAt: Date.now() - 3600000 }; // Hết hạn 1 giờ trước
        ForgotPassword.findOne.mockResolvedValue(expiredOtpRecord);
        User.findOne.mockResolvedValue({ email: email, tokenUser: mockUserToken, cart_id: mockCartId });

        await userController.otpPasswordPost(mockReq, mockRes);

        expect(ForgotPassword.findOne).toHaveBeenCalledWith({ email: email, otp: otp });
        // Không có kiểm tra expireAt
        expect(mockRes.redirect).toHaveBeenCalledWith("/user/password/reset");
        // Lý tưởng: expect(mockReq.flash).toHaveBeenCalledWith("error", "OTP đã hết hạn");
    });

    /**
     * @Chức năng: Kiểm tra hành vi khi đặt lại mật khẩu với `tokenUser` không hợp lệ (không tìm thấy user).
     * @Mô tả kiểm thử:
     * - Người dùng gửi form đặt lại mật khẩu với mật khẩu hợp lệ.
     * - Tuy nhiên, `tokenUser` trong cookie không tương ứng với bất kỳ người dùng nào trong CSDL (ví dụ: token cũ, đã bị thay đổi, hoặc user đã bị xóa).
     * - `User.updateOne({ tokenUser: "invalidToken" }, ...)` sẽ không cập nhật bản ghi nào (`matchedCount: 0`).
     * - Controller hiện tại không kiểm tra kết quả của `updateOne` và vẫn hiển thị thông báo "Đổi mật khẩu thành công". Điều này gây hiểu lầm cho người dùng.
     * @Dữ liệu đầu vào: `req.body` có mật khẩu hợp lệ. `req.cookies.tokenUser = "invalidToken"`. `User.updateOne` trả về `{ matchedCount: 0, nModified: 0 }`.
     * @Kết quả mong đợi (lý tưởng): Flash lỗi "Không thể đổi mật khẩu. Vui lòng thử lại." hoặc "Phiên không hợp lệ.", redirect.
     * @Kết quả mong đợi (hiện tại, được test): Flash "Đổi mật khẩu thành công", redirect "/".
     */
    test('resetPasswordPost: should flash success even if tokenUser is invalid and no user is updated (current behavior - misleading feedback)', async () => {
        mockReq.body = { password: "newPass", confirmPassword: "newPass" };
        mockReq.cookies.tokenUser = "invalidOrOldToken";
        md5.mockReturnValueOnce("md5-newPass");
        User.updateOne.mockResolvedValue({ matchedCount: 0, nModified: 0 }); // Không có user nào được cập nhật

        await userController.resetPasswordPost(mockReq, mockRes);

        expect(User.updateOne).toHaveBeenCalledWith(
            { tokenUser: "invalidOrOldToken" },
            { password: "md5-newPass" }
        );
        expect(mockReq.flash).toHaveBeenCalledWith("Đổi mật khẩu thành công"); // Thông báo không chính xác
        expect(mockRes.redirect).toHaveBeenCalledWith("/");
        // Lý tưởng: expect(mockReq.flash).toHaveBeenCalledWith("error", "Không thể đổi mật khẩu. Vui lòng thử lại.");
    });

  });
});
