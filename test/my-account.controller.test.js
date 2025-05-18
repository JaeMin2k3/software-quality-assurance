const request = require('supertest');
const mongoose = require('mongoose');
const Account = require('../model/accounts.model');
const myAccountController = require('../controllers/admin/my-account.controller');
const systemConfig = require('../config/system');

let originalAccounts = [];

beforeAll(async () => {
  await mongoose.connect('mongodb+srv://vuxuanthinh2003:ibkBgHZC2BCdmA8i@springt.c97gly9.mongodb.net/Products-Management');
  originalAccounts = await Account.find({});
});

afterAll(async () => {
  await Account.deleteMany({});
  if (originalAccounts.length > 0) {
    await Account.insertMany(originalAccounts);
  }
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Account.deleteMany({});
});

describe('My Account Controller Tests', () => {
  /**
   * Chức năng: Hiển thị trang thông tin cá nhân (GET /admin/my-account)
   * Mô tả kiểm thử: Kiểm tra render trang thông tin cá nhân
   * Dữ liệu đầu vào: Request không có tham số
   * Kết quả mong đợi: Render view với tiêu đề "Thông tin cá nhân"
   */
  test('should render index page', async () => {
    const mockReq = {};
    const mockRes = {
      render: jest.fn()
    };

    await myAccountController.index(mockReq, mockRes);
    expect(mockRes.render).toHaveBeenCalledWith(
      'admin/page/my-account/index.pug',
      expect.objectContaining({
        pageTitle: 'Thông tin cá nhân'
      })
    );
  });

  /**
   * Chức năng: Hiển thị form chỉnh sửa (GET /admin/my-account/edit)
   * Mô tả kiểm thử: Kiểm tra render form chỉnh sửa
   * Dữ liệu đầu vào: Request không có tham số
   * Kết quả mong đợi: Render view với tiêu đề "Chỉnh sửa thông tin cá nhân"
   */
  test('should render edit page', async () => {
    const mockReq = {};
    const mockRes = {
      render: jest.fn()
    };

    await myAccountController.edit(mockReq, mockRes);
    expect(mockRes.render).toHaveBeenCalledWith(
      'admin/page/my-account/edit.pug',
      expect.objectContaining({
        pageTitle: 'Chỉnh sửa thông tin cá nhân'
      })
    );
  });

  /**
   * Chức năng: Cập nhật thông tin (PATCH /admin/my-account/edit)
   * Mô tả kiểm thử: Kiểm tra cập nhật thành công với email mới
   * Dữ liệu đầu vào: Email chưa tồn tại trong hệ thống
   * Kết quả mong đợi: 
   *  - Cập nhật thành công
   *  - Redirect về trang thông tin
   *  - Flash message thành công
   */
  test('should update account with new email successfully', async () => {
    const mockReq = {
      body: {
        email: 'existing111@example.com'
      },
      flash: jest.fn()
    };
    const mockRes = {
      locals: {
        userMDW: {
          id: '6827d917f1b390c526d72954'
        }
      },
      redirect: jest.fn()
    };

    await myAccountController.editPatch(mockReq, mockRes);
    expect(mockReq.flash).toHaveBeenCalledWith('success', 'Cập nhật thành công');
    expect(mockRes.redirect).toHaveBeenCalledWith('/admin/my-account');
  });

  /**
   * Chức năng: Cập nhật thông tin (PATCH /admin/my-account/edit)
   * Mô tả kiểm thử: - Kiểm tra với email đã tồn tại
   * Dữ liệu đầu vào: email:existing@example.com
   * Kết quả mong đợi: 
   *  - Hiển thị lỗi email đã tồn tại
   *  - Redirect back
   */
  test('should fail when email already exists', async () => {
    // Tạo một tài khoản có sẵn
    await Account.create({
      email: 'existing@example.com',
      deleted: false
    });

    const mockReq = {
      body: {
        email: 'existing@example.com'
      },
      flash: jest.fn()
    };
    const mockRes = {
      locals: {
        userMDW: {
          id: '6827d917f1b390c526d72954'
        }
      },
      redirect: jest.fn()
    };

    await myAccountController.editPatch(mockReq, mockRes);
    expect(mockReq.flash).toHaveBeenCalledWith('error', 'Email đã tồn tại');
    expect(mockRes.redirect).toHaveBeenCalledWith('back');
  });

  /**
   * Chức năng: Cập nhật thông tin (PATCH /admin/my-account/edit)
   * Mô tả kiểm thử: Test fail - Kiểm tra với email không hợp lệ
   * Dữ liệu đầu vào: Email: invalid-email
   * Kết quả mong đợi: Throw validation error
   */
  test('should fail with invalid email format', async () => {
    const mockReq = {
      body: {
        email: 'invalid-email'
      }
    };
    const mockRes = {
      locals: {
        userMDW: {
          id: 'user123'
        }
      }
    };

    await expect(myAccountController.editPatch(mockReq, mockRes)).rejects.toThrow();
  });

  /**
   * Chức năng: Cập nhật thông tin (PATCH /admin/my-account/edit)
   * Mô tả kiểm thử: Test fail - Kiểm tra khi không có user trong request
   * Dữ liệu đầu vào: Request không có thông tin user
   * Kết quả mong đợi: Throw error vì thiếu thông tin user
   */
  test('should fail when no user in request', async () => {
    const mockReq = {
      body: {
        email: 'test@example.com'
      }
    };
    const mockRes = {
      locals: {}
    };

    await expect(myAccountController.editPatch(mockReq, mockRes)).rejects.toThrow();
  });

  /**
   * Chức năng: Cập nhật thông tin (PATCH /admin/my-account/edit)
   * Mô tả kiểm thử: Kiểm tra cập nhật nhiều trường thông tin
   * Dữ liệu đầu vào: Nhiều trường thông tin cần update
   * Kết quả mong đợi: Tất cả các trường được cập nhật thành công
   */
  test('should update multiple fields successfully', async () => {
    const updateData = {
      fullName: 'New Name',
      phone: '0123456789',
      email: 'new@example.com'
    };

    const mockReq = {
      body: updateData,
      flash: jest.fn()
    };
    const mockRes = {
      locals: {
        userMDW: {
          id: '6827de407845286b463060a4'
        }
      },
      redirect: jest.fn()
    };

    await myAccountController.editPatch(mockReq, mockRes);
    const updatedAccount = await Account.findById('user123');
    expect(updatedAccount).toMatchObject(updateData);
  });

  
  /**
   * Chức năng: Cập nhật thông tin (PATCH /admin/my-account/edit)
   * Mô tả kiểm thử: Test fail - Kiểm tra cập nhật với dữ liệu rỗng
   * Dữ liệu đầu vào: Request body rỗng
   * Kết quả mong đợi: 
   *  - Hiển thị lỗi dữ liệu không hợp lệ
   *  - Redirect back
   */
  test('should fail with empty update data', async () => {
    const mockReq = {
      body: {},
      flash: jest.fn()
    };
    const mockRes = {
      locals: {
        userMDW: {
          id: 'user123'
        }
      },
      redirect: jest.fn()
    };

    await myAccountController.editPatch(mockReq, mockRes);
    expect(mockReq.flash).toHaveBeenCalledWith('error', 'Dữ liệu không hợp lệ');
    expect(mockRes.redirect).toHaveBeenCalledWith('back');
  });

  /**
   * Chức năng: Cập nhật thông tin (PATCH /admin/my-account/edit)
   * Mô tả kiểm thử: Test fail - Kiểm tra giữ nguyên email cũ
   * Dữ liệu đầu vào: Email giống với email hiện tại
   * Kết quả mong đợi: 
   *  - Hiển thị lỗi email không thay đổi
   *  - Redirect back
   */
  test('should fail when keeping current email', async () => {
    const currentUser = await Account.create({
      email: 'current@example.com',
      _id: 'user123'
    });

    const mockReq = {
      body: {
        email: 'current@example.com'
      },
      flash: jest.fn()
    };
    const mockRes = {
      locals: {
        userMDW: {
          id: 'user123'
        }
      },
      redirect: jest.fn()
    };

    await myAccountController.editPatch(mockReq, mockRes);
    expect(mockReq.flash).toHaveBeenCalledWith('error', 'Email không thay đổi');
    expect(mockRes.redirect).toHaveBeenCalledWith('back');
  });

  /**
   * Chức năng: Cập nhật thông tin (PATCH /admin/my-account/edit)
   * Mô tả kiểm thử: Kiểm tra với email đã tồn tại của user khác
   * Dữ liệu đầu vào: Email đã tồn tại của user khác
   * Kết quả mong đợi: 
   *  - Hiển thị lỗi email đã tồn tại
   *  - Redirect back
   */
  test('should handle existing email correctly', async () => {
    // Tạo một tài khoản có sẵn
    await Account.create({
      email: 'existing@example.com',
      deleted: false
    });

    const mockReq = {
      body: {
        email: 'existing@example.com'
      },
      flash: jest.fn()
    };
    const mockRes = {
      locals: {
        userMDW: {
          id: '6827d917f1b390c526d72954'
        }
      },
      redirect: jest.fn()
    };

    await myAccountController.editPatch(mockReq, mockRes);
    expect(mockReq.flash).toHaveBeenCalledWith('error', 'Email đã tồn tại');
    expect(mockRes.redirect).toHaveBeenCalledWith('back');
  });
});

