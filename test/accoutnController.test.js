const systemConfig = require("../config/system");
const Account = require("../model/accounts.model");
const md5 = require("md5");
const Role = require("../model/roles.model");
const accountsController = require("../controllers/admin/accounts.controller"); // Assuming the controller file is named account.controller.js

// Mock dependencies
jest.mock("../model/accounts.model");
jest.mock("../model/roles.model");
jest.mock("md5");
jest.mock("../config/system", () => ({
  prefixAdmin: "/admin",
}));

describe("Account Controller Unit Tests", () => {
  let mockReq;
  let mockRes;
  let mockFlash;

  beforeEach(() => {
    mockFlash = jest.fn();
    mockReq = {
      flash: mockFlash,
      body: {},
      params: {},
    };
    mockRes = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn(() => mockRes), // Allow chaining .status().send()
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /admin/accounts - index", () => {
    // ACC_001
    /*
     * Chức năng: Hiển thị danh sách tài khoản
     * Mô tả kiểm thử: Kiểm tra xem trang index có render đúng template và truyền đúng dữ liệu tài khoản cùng vai trò hay không.
     * Dữ liệu đầu vào:
     * - Account.find trả về mảng mockAccounts: [{ _id: "acc1", role_id: "role1", ... }, { _id: "acc2", role_id: "role2", ... }]
     * - Role.findOne trả về mockRole1 và mockRole2 tương ứng với role_id.
     * Kết quả mong đợi: Render trang "admin/page/accounts/index.pug" với pageTitle, accounts (đã gán role), và roles.
     */
    test("should render the accounts index page with accounts and roles", async () => {
      const mockAccounts = [
        { _id: "acc1", role_id: "role1", name: "User 1", email: "user1@example.com" },
        { _id: "acc2", role_id: "role2", name: "User 2", email: "user2@example.com" },
      ];
      const mockRole1 = { _id: "role1", title: "Admin" };
      const mockRole2 = { _id: "role2", title: "Editor" };

      // Mock cả find và select
      const mockFind = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue(mockAccounts);
      Account.find = mockFind;
      Account.find().select = mockSelect;

      Role.findOne.mockResolvedValueOnce(mockRole1).mockResolvedValueOnce(mockRole2);

      await accountsController.index(mockReq, mockRes);

      expect(mockFind).toHaveBeenCalledWith({ deleted: false });
      expect(mockSelect).toHaveBeenCalledWith("-password -token");
      expect(Role.findOne).toHaveBeenCalledWith({ deleted: false, _id: "role1" });
      expect(Role.findOne).toHaveBeenCalledWith({ deleted: false, _id: "role2" });
      expect(mockRes.render).toHaveBeenCalledWith("admin/page/accounts/index.pug", {
        pageTitle: "Trang danh sách tài khoản",
        accounts: [
          { ...mockAccounts[0], role: mockRole1 },
          { ...mockAccounts[1], role: mockRole2 },
        ],
      });
    });

    // ACC_002
    /*
     * Chức năng: Hiển thị danh sách tài khoản khi không có tài khoản nào
     * Mô tả kiểm thử: Kiểm tra xem trang index có render đúng template với danh sách tài khoản rỗng khi không tìm thấy tài khoản nào hay không.
     * Dữ liệu đầu vào:
     * - Account.find trả về mảng rỗng: []
     * Kết quả mong đợi: Render trang "admin/page/accounts/index.pug" với pageTitle và accounts là mảng rỗng.
     */
    test("should render the accounts index page with an empty array if no accounts are found", async () => {
      // Mock find() trả về this để chain được select()
      const mockFind = jest.fn().mockReturnThis();
      // Mock select() trả về mảng rỗng
      const mockSelect = jest.fn().mockResolvedValue([]);
      Account.find = mockFind;
      Account.find().select = mockSelect;

      await accountsController.index(mockReq, mockRes);

      expect(mockFind).toHaveBeenCalledWith({ deleted: false });
      expect(mockSelect).toHaveBeenCalledWith("-password -token");
      expect(Role.findOne).not.toHaveBeenCalled(); // Không gọi findOne vì không có account
      expect(mockRes.render).toHaveBeenCalledWith("admin/page/accounts/index.pug", {
        pageTitle: "Trang danh sách tài khoản",
        accounts: [],
      });
    });
  });

  describe("GET /admin/accounts/create - create", () => {
    // ACC_003
    /*
     * Chức năng: Hiển thị trang tạo tài khoản
     * Mô tả kiểm thử: Kiểm tra xem trang tạo tài khoản có render đúng template và truyền đúng danh sách vai trò hay không.
     * Dữ liệu đầu vào:
     * - Role.find trả về mảng mockRoles: [{ _id: "role1", ... }, { _id: "role2", ... }]
     * Kết quả mong đợi: Render trang "admin/page/accounts/create.pug" với pageTitle và roles.
     */
    test("should render the create account page with roles", async () => {
      const mockRoles = [{ _id: "role1", title: "Admin" }, { _id: "role2", title: "Editor" }];
      Role.find.mockResolvedValueOnce(mockRoles);

      await accountsController.create(mockReq, mockRes);

      expect(Role.find).toHaveBeenCalledWith({ deleted: false });
      expect(mockRes.render).toHaveBeenCalledWith("admin/page/accounts/create.pug", {
        pageTitle: "Trang tạo tài khoản",
        roles: mockRoles,
      });
    });

    // ACC_004
    /*
     * Chức năng: Hiển thị trang tạo tài khoản khi không có vai trò nào
     * Mô tả kiểm thử: Kiểm tra xem trang tạo tài khoản có render đúng template với danh sách vai trò rỗng khi không tìm thấy vai trò nào hay không.
     * Dữ liệu đầu vào:
     * - Role.find trả về mảng rỗng: []
     * Kết quả mong đợi: Render trang "admin/page/accounts/create.pug" với pageTitle và roles là mảng rỗng.
     */
    test("should render the create account page with an empty array if no roles are found", async () => {
      Role.find.mockResolvedValueOnce([]);

      await accountsController.create(mockReq, mockRes);

      expect(Role.find).toHaveBeenCalledWith({ deleted: false });
      expect(mockRes.render).toHaveBeenCalledWith("admin/page/accounts/create.pug", {
        pageTitle: "Trang tạo tài khoản",
        roles: [],
      });
    });
  });

  describe("POST /admin/accounts/create - createPost", () => {
    // ACC_005
    /*
     * Chức năng: Tạo tài khoản mới thành công
     * Mô tả kiểm thử: Kiểm tra xem controller có tạo tài khoản mới, mã hóa mật khẩu và chuyển hướng sau khi lưu thành công hay không.
     * Dữ liệu đầu vào:
     * - req.body: { email: "newuser@example.com", password: "password123", name: "New User", role_id: "role1" }
     * - Account.findOne trả về null (email chưa tồn tại).
     * - md5 trả về mật khẩu đã mã hóa.
     * - account.save trả về thành công.
     * Kết quả mong đợi: Tìm kiếm email, mã hóa mật khẩu, tạo và lưu tài khoản mới, chuyển hướng đến "/admin/accounts".
     */
    test("should create a new account and redirect on success", async () => {
      mockReq.body = {
        email: "newuser@example.com",
        password: "password123",
        name: "New User",
        role_id: "role1",
      };
      const hashedPassword = "hashedpassword123";

      Account.findOne.mockResolvedValueOnce(null); // Email does not exist
      md5.mockReturnValueOnce(hashedPassword);
      const mockAccountInstance = { save: jest.fn().mockResolvedValueOnce({}) };
      Account.mockImplementationOnce(() => mockAccountInstance);

      await accountsController.createPost(mockReq, mockRes);

      expect(Account.findOne).toHaveBeenCalledWith({
        email: "newuser@example.com",
        deleted: false,
      });
      expect(md5).toHaveBeenCalledWith("password123");
      expect(Account).toHaveBeenCalledWith({
        ...mockReq.body,
        password: hashedPassword,
      });
      expect(mockAccountInstance.save).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith("/admin/accounts");
      expect(mockFlash).not.toHaveBeenCalled(); // No error flash
    });

    // ACC_006
    /*
     * Chức năng: Tạo tài khoản mới với email đã tồn tại
     * Mô tả kiểm thử: Kiểm tra xem controller có báo lỗi và chuyển hướng lại trang trước nếu email đã tồn tại hay không.
     * Dữ liệu đầu vào:
     * - req.body: { email: "existinguser@example.com", password: "password123", ... }
     * - Account.findOne trả về một đối tượng tài khoản (email đã tồn tại).
     * Kết quả mong đợi: Tìm thấy email đã tồn tại, flash lỗi "Email đã tồn tại", chuyển hướng lại trang trước ("back").
     */
    test("should flash error and redirect back if email already exists", async () => {
      mockReq.body = {
        email: "existinguser@example.com",
        password: "password123",
        name: "Existing User",
        role_id: "role1",
      };

      Account.findOne.mockResolvedValueOnce({ _id: "existingAcc" }); // Email exists

      await accountsController.createPost(mockReq, mockRes);

      expect(Account.findOne).toHaveBeenCalledWith({
        email: "existinguser@example.com",
        deleted: false,
      });
      expect(md5).not.toHaveBeenCalled(); // Should not hash password
      expect(Account).not.toHaveBeenCalled(); // Should not create new account
      expect(mockFlash).toHaveBeenCalledWith("error", "Email đã tồn tại");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
    });

    // ACC_007
    /*
     * Chức năng: Xử lý tạo tài khoản khi thiếu trường bắt buộc 
     * Mô tả kiểm thử: Kiểm tra xem controller xử lý như thế nào khi các trường bắt buộc (email, password, name, role_id) bị thiếu trong req.body.
     * Dữ liệu đầu vào:
     * - req.body: {} (rỗng hoặc thiếu các trường cần thiết)
     * - Account.findOne trả về null.
     * - md5 trả về giá trị khi mã hóa undefined.
     * - account.save trả về thành công.
     * Kết quả mong đợi: Controller sẽ tiếp tục xử lý mà không báo lỗi validation, có thể dẫn đến lưu dữ liệu không đầy đủ hoặc lỗi.
     */
    test("should proceed without validation if required fields are missing (potential failure)", async () => {
      mockReq.body = {
        // Missing email, password, name, role_id
      };
      const hashedPassword = "hashedpassword123";

      Account.findOne.mockResolvedValueOnce(null); // Email does not exist (even though it's missing)
      md5.mockReturnValueOnce(hashedPassword); // Will still be called on undefined
      const mockAccountInstance = { save: jest.fn().mockResolvedValueOnce({}) };
      Account.mockImplementationOnce(() => mockAccountInstance);

      await accountsController.createPost(mockReq, mockRes);

      // This test highlights that the controller doesn't validate
      // that required fields like email, password, name, role_id are present.
      // The test will pass because the current controller code doesn't perform this check.
      expect(Account.findOne).toHaveBeenCalledWith({
        email: undefined, // Email is missing in req.body
        deleted: false,
      });
      expect(md5).toHaveBeenCalledWith(undefined); // Will attempt to hash undefined
      expect(Account).toHaveBeenCalledWith({
        // req.body is empty
        password: hashedPassword,
      });
      expect(mockAccountInstance.save).toHaveBeenCalled(); // Will attempt to save an incomplete model
      expect(mockRes.redirect).toHaveBeenCalledWith("/admin/accounts"); // Still redirects
      expect(mockFlash).not.toHaveBeenCalled(); // No error flash

      // In a real application, you would expect this test to fail or for the controller
      // to handle this case by returning an error or redirecting with a flash message.
      // This test passes to demonstrate the current behavior.
    });
  });

  describe("GET /admin/accounts/edit/:id - edit", () => {
    // ACC_008
    /*
     * Chức năng: Hiển thị trang sửa thông tin tài khoản
     * Mô tả kiểm thử: Kiểm tra xem trang sửa có render đúng template và truyền đúng dữ liệu tài khoản cần sửa cùng danh sách vai trò hay không.
     * Dữ liệu đầu vào:
     * - req.params.id: "acc123" (ID của tài khoản tồn tại)
     * - Account.findOne trả về mockAccount: { _id: "acc123", ... }
     * - Role.find trả về mảng mockRoles: [{ _id: "role1", ... }, { _id: "role2", ... }]
     * Kết quả mong đợi: Tìm thấy tài khoản và vai trò, render trang "admin/page/accounts/edit.pug" với pageTitle, roles và account.
     */
    test("should render the edit account page with account data and roles on success", async () => {
      const accountId = "acc123";
      mockReq.params.id = accountId;
      const mockAccount = {
        _id: accountId,
        name: "Edit User",
        email: "edit@example.com",
        role_id: "role1",
      };
      const mockRoles = [{ _id: "role1", title: "Admin" }, { _id: "role2", title: "Editor" }];

      Account.findOne.mockResolvedValueOnce(mockAccount);
      Role.find.mockResolvedValueOnce(mockRoles);

      await accountsController.edit(mockReq, mockRes);

      expect(Account.findOne).toHaveBeenCalledWith({
        deleted: false,
        _id: accountId,
      });
      expect(Role.find).toHaveBeenCalledWith({ deleted: false });
      expect(mockRes.render).toHaveBeenCalledWith("admin/page/accounts/edit.pug", {
        pageTitle: "Trang sửa thông tin tài khoản",
        roles: mockRoles,
        account: mockAccount,
      });
    });

    // ACC_009
    /*
     * Chức năng: Hiển thị trang sửa thông tin tài khoản khi không tìm thấy tài khoản
     * Mô tả kiểm thử: Kiểm tra xem controller có chuyển hướng về trang danh sách tài khoản nếu không tìm thấy tài khoản với ID cung cấp hay không.
     * Dữ liệu đầu vào:
     * - req.params.id: "nonexistentacc" (ID của tài khoản không tồn tại)
     * - Account.findOne trả về null.
     * Kết quả mong đợi: Không tìm thấy tài khoản, chuyển hướng đến "/admin/accounts".
     */
    test("should redirect to accounts index if account is not found", async () => {
      const accountId = "nonexistentacc";
      mockReq.params.id = accountId;

      Account.findOne.mockResolvedValueOnce(null); // Account not found
      Role.find.mockResolvedValueOnce([]); // Roles might or might not be found, doesn't matter for this case

      await accountsController.edit(mockReq, mockRes);

      expect(Account.findOne).toHaveBeenCalledWith({
        deleted: false,
        _id: accountId,
      });
      // Role.find might or might not be called depending on the implementation order,
      // but the redirect should happen regardless if Account.findOne returns null.
      // expect(Role.find).not.toHaveBeenCalled(); // This might fail if Role.find is called before the check
      expect(mockRes.redirect).toHaveBeenCalledWith("/admin/accounts");
      expect(mockRes.render).not.toHaveBeenCalled();
    });

    // ACC_010
    /*
     * Chức năng: Xử lý lỗi khi lấy thông tin tài khoản để sửa
     * Mô tả kiểm thử: Kiểm tra xem controller có chuyển hướng về trang danh sách tài khoản nếu có lỗi xảy ra trong quá trình lấy dữ liệu tài khoản hay không.
     * Dữ liệu đầu vào:
     * - req.params.id: "acc123"
     * - Account.findOne giả lập trả về lỗi (rejected promise).
     * Kết quả mong đợi: Xảy ra lỗi khi tìm tài khoản, chuyển hướng đến "/admin/accounts".
     */
    test("should redirect to accounts index if an error occurs during fetching", async () => {
      const accountId = "acc123";
      mockReq.params.id = accountId;

      Account.findOne.mockRejectedValueOnce(new Error("Database error")); // Simulate error

      await accountsController.edit(mockReq, mockRes);

      expect(Account.findOne).toHaveBeenCalledWith({
        deleted: false,
        _id: accountId,
      });
      expect(mockRes.redirect).toHaveBeenCalledWith("/admin/accounts");
      expect(mockRes.render).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /admin/accounts/edit/:id - editPatch", () => {
    // ACC_011
    /*
     * Chức năng: Cập nhật thông tin tài khoản thành công (không đổi mật khẩu)
     * Mô tả kiểm thử: Kiểm tra xem controller có cập nhật thông tin tài khoản (trừ mật khẩu) và chuyển hướng lại trang trước sau khi thành công hay không.
     * Dữ liệu đầu vào:
     * - req.params.id: "acc123"
     * - req.body: { id: "acc123", name: "Updated User", email: "updated@example.com", role_id: "role2" } (không có trường password)
     * - Account.findOne trả về null (email không trùng với tài khoản khác).
     * - Account.updateOne trả về { nModified: 1 }.
     * Kết quả mong đợi: Email không trùng với tài khoản khác, cập nhật tài khoản, flash thành công, chuyển hướng lại trang trước.
     */
    test("should update account and redirect back on success (without password change)", async () => {
      const accountId = "acc123";
      mockReq.params.id = accountId;
      mockReq.body = {
        id: accountId,
        name: "Updated User",
        email: "updated@example.com",
        role_id: "role2",
        // No password field
      };

      Account.findOne.mockResolvedValueOnce(null); // Email does not exist for other accounts
      Account.updateOne.mockResolvedValueOnce({ nModified: 1 });

      await accountsController.editPatch(mockReq, mockRes);

      expect(Account.findOne).toHaveBeenCalledWith({
        _id: { $ne: accountId },
        email: "updated@example.com",
        deleted: false,
      });
      expect(md5).not.toHaveBeenCalled(); // Password not in body
      expect(Account.updateOne).toHaveBeenCalledWith(
        { _id: mockReq.body.id },
        mockReq.body // Giữ nguyên body vì controller không xóa id
      );
      expect(mockFlash).toHaveBeenCalledWith("success", "Cập nhật thành công");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
    });

    // ACC_012
    /*
     * Chức năng: Cập nhật thông tin tài khoản thành công (có đổi mật khẩu)
     * Mô tả kiểm thử: Kiểm tra xem controller có cập nhật thông tin tài khoản (bao gồm mã hóa mật khẩu mới) và chuyển hướng lại trang trước sau khi thành công hay không.
     * Dữ liệu đầu vào:
     * - req.params.id: "acc123"
     * - req.body: { id: "acc123", name: "Updated User", email: "updated@example.com", password: "newpassword", role_id: "role2" } (có trường password)
     * - Account.findOne trả về null (email không trùng với tài khoản khác).
     * - md5 trả về mật khẩu đã mã hóa.
     * - Account.updateOne trả về { nModified: 1 }.
     * Kết quả mong đợi: Email không trùng với tài khoản khác, mã hóa mật khẩu mới, cập nhật tài khoản, flash thành công, chuyển hướng lại trang trước.
     */
    test("should update account and redirect back on success (with password change)", async () => {
      const accountId = "acc123";
      mockReq.params.id = accountId;
      mockReq.body = {
        id: accountId,
        name: "Updated User",
        email: "updated@example.com",
        password: "newpassword",
        role_id: "role2",
      };
      const hashedPassword = "newhashedpassword";

      Account.findOne.mockResolvedValueOnce(null); // Email does not exist for other accounts
      md5.mockReturnValueOnce(hashedPassword);
      Account.updateOne.mockResolvedValueOnce({ nModified: 1 });

      await accountsController.editPatch(mockReq, mockRes);

      expect(Account.findOne).toHaveBeenCalledWith({
        _id: { $ne: accountId },
        email: "updated@example.com",
        deleted: false,
      });
      expect(md5).toHaveBeenCalledWith("newpassword");
      expect(Account.updateOne).toHaveBeenCalledWith(
        { _id: accountId }, // Uses req.body.id in the original code
        {
          name: "Updated User",
          email: "updated@example.com",
          password: hashedPassword,
          role_id: "role2",
        }
      );
      expect(mockFlash).toHaveBeenCalledWith("success", "Cập nhật thành công");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
    });

    // ACC_013
    /*
     * Chức năng: Cập nhật thông tin tài khoản với email đã tồn tại ở tài khoản khác
     * Mô tả kiểm thử: Kiểm tra xem controller có báo lỗi và chuyển hướng lại trang trước nếu email cập nhật đã tồn tại ở một tài khoản khác hay không.
     * Dữ liệu đầu vào:
     * - req.params.id: "acc123"
     * - req.body: { id: "acc123", email: "existing@example.com", ... } (email đã tồn tại ở tài khoản khác)
     * - Account.findOne trả về một đối tượng tài khoản khác ({ _id: "anotherAcc456", ... }).
     * Kết quả mong đợi: Tìm thấy email đã tồn tại ở tài khoản khác, flash lỗi "Email đã tồn tại", không gọi updateOne, chuyển hướng lại trang trước ("back").
     */
    test("should flash error and redirect back if email already exists for another account", async () => {
      const accountId = "acc123";
      mockReq.params.id = accountId;
      mockReq.body = {
        id: accountId,
        email: "existing@example.com", // Email exists for another account
        name: "Updated User",
        role_id: "role2",
      };

      Account.findOne.mockResolvedValueOnce({ _id: "anotherAcc456" }); // Email exists for a different account

      await accountsController.editPatch(mockReq, mockRes);

      expect(Account.findOne).toHaveBeenCalledWith({
        _id: { $ne: accountId },
        email: "existing@example.com",
        deleted: false,
      });
      expect(md5).not.toHaveBeenCalled(); // Should not hash password
      expect(Account.updateOne).not.toHaveBeenCalled(); // Should not update
      expect(mockFlash).toHaveBeenCalledWith("error", "Email đã tồn tại");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");
    });

    // ACC_014
    /*
     * Chức năng: Xử lý cập nhật khi thiếu ID tài khoản trong body 
     * Mô tả kiểm thử: Kiểm tra xem controller xử lý như thế nào khi trường `id` bị thiếu trong `req.body` nhưng có trong `req.params`. Controller hiện tại sử dụng `req.body.id` cho `updateOne`.
     * Dữ liệu đầu vào:
     * - req.params.id: "acc123"
     * - req.body: { name: "Updated User", email: "updated@example.com", role_id: "role2" } (thiếu trường id)
     * - Account.findOne trả về null.
     * - Account.updateOne trả về { nModified: 0 }.
     * Kết quả mong đợi: Controller sẽ cố gắng cập nhật tài khoản với `_id: undefined`, có thể không cập nhật được bản ghi nào nhưng vẫn báo thành công.
     */
    test("should attempt update using undefined ID if body.id is missing (potential failure)", async () => {
      const accountId = "acc123";
      mockReq.params.id = accountId;
      mockReq.body = {
        // Missing id in body, but present in params
        name: "Updated User",
        email: "updated@example.com",
        role_id: "role2",
      };

      Account.findOne.mockResolvedValueOnce(null); // Email check passes
      Account.updateOne.mockResolvedValueOnce({ nModified: 0 }); // Update will likely fail or update 0 documents

      await accountsController.editPatch(mockReq, mockRes);

      // This test highlights that the controller uses `req.body.id` for `updateOne`
      // instead of `req.params.id`. If `body.id` is missing, it will attempt to
      // update a document with `_id: undefined`.
      expect(Account.updateOne).toHaveBeenCalledWith(
        { _id: undefined }, // Uses body.id which is missing
        { name: "Updated User", email: "updated@example.com", role_id: "role2" }
      );
      // The current code will still flash success and redirect back even if updateOne modified 0 documents.
      expect(mockFlash).toHaveBeenCalledWith("success", "Cập nhật thành công");
      expect(mockRes.redirect).toHaveBeenCalledWith("back");

      // A more robust implementation would use `req.params.id` for the update query
      // and check the result of `updateOne` to confirm a document was modified.
      // This test passes to demonstrate the current behavior.
    });
// ACC_015
    /*
     * Chức năng: Xử lý khi updateOne không thay đổi bản ghi nào 
     * Mô tả kiểm thử: Kiểm tra xem controller xử lý như thế nào khi hàm `updateOne` thực thi thành công về mặt kỹ thuật nhưng không có bản ghi nào bị thay đổi (`nModified: 0`). Controller hiện tại vẫn báo thành công.
     * Dữ liệu đầu vào:
     * - req.params.id: "acc123"
     * - req.body: { id: "acc123", name: "Updated User", email: "updated@example.com", role_id: "role2" }
     * - Account.findOne trả về null.
     * - Account.updateOne trả về { nModified: 0, n: 1, ok: 1 }.
     * Kết quả mong đợi: Controller vẫn flash thông báo thành công mặc dù không có bản ghi nào được cập nhật.
     */
    test("should flash success even if updateOne fails or modifies 0 documents (potential failure)", async () => {
      const accountId = "acc123";
      mockReq.params.id = accountId;
      mockReq.body = {
        id: accountId,
        name: "Updated User",
        email: "updated@example.com",
        role_id: "role2",
      };

      Account.findOne.mockResolvedValueOnce(null); // Email check passes
      // Simulate update found but didn't modify (e.g., no changes) or failed silently
      Account.updateOne.mockResolvedValueOnce({ nModified: 0, n: 1, ok: 1 });

      await accountsController.editPatch(mockReq, mockRes);

      // This test highlights that the controller doesn't check the result of
      // `updateOne` (like `nModified`) to confirm the update was successful.
      // It always flashes "success".
      expect(Account.updateOne).toHaveBeenCalledWith(
        { _id: accountId },
        { name: "Updated User", email: "updated@example.com", role_id: "role2" }
      );
      expect(mockFlash).toHaveBeenCalledWith("success", "Cập nhật thành công"); // Still flashes success
      expect(mockRes.redirect).toHaveBeenCalledWith("back");

      // A more robust implementation would check `nModified` and flash an error
      // if it's 0 or if an actual error occurred during the update.
      // This test passes to demonstrate the current behavior.
    });
  });
});
