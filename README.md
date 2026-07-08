* [Kế hoạch Kiểm thử Phần mềm - SQA Plan](## Kiểm thử phần mềm (Software Quality Assurance - SQA)

Dự án áp dụng chiến lược kiểm thử đa cấp độ để phát hiện lỗi sớm, xác thực các luồng chức năng từ đầu đến cuối và đảm bảo hiệu suất của hệ thống.

### 1. Chiến lược và Công cụ Kiểm thử

* **Kiểm thử Unit (Unit Testing):** Sử dụng Jest để kiểm tra tính đúng đắn của các hàm trong backend controller và xác thực đầu vào. Quá trình này bao gồm các bước kiểm tra cơ sở dữ liệu và rollback để đảm bảo tính toàn vẹn dữ liệu.
* **Kiểm thử Giao diện và Hệ thống (System/UI Testing):** Sử dụng Selenium WebDriver để kiểm thử tự động các luồng thao tác của người dùng trên UI (nhấp chuột, chuyển hướng, xác thực). Kết hợp với kiểm thử thủ công theo các kịch bản thực tế đã được chuẩn bị sẵn.
* **Kiểm thử API (API Functional Test):** Sử dụng Postman để kiểm tra thủ công các endpoint của REST API (đăng nhập, giỏ hàng, đơn hàng), đảm bảo hệ thống trả về đúng mã trạng thái HTTP và dữ liệu.
* **Kiểm thử Hiệu năng (Performance Testing):** Sử dụng Apache JMeter để đánh giá thời gian phản hồi của hệ thống dưới tải.

### 2. Các chức năng đã được kiểm thử

Đội ngũ kiểm thử đã thực hiện phân công và kiểm tra chi tiết các module chức năng sau của hệ thống:

**Dành cho Khách hàng (User/Cart Modules):**
* **Tài khoản & Xem sản phẩm:** Đăng nhập / Đăng ký tài khoản, Xem chi tiết sản phẩm, Tìm kiếm sản phẩm, Sắp xếp sản phẩm.
* **Giỏ hàng & Thanh toán:** Thêm sản phẩm vào giỏ, Chỉnh sửa / Xóa sản phẩm trong giỏ hàng, Tiến hành đặt hàng.

**Dành cho Quản trị viên (Admin/Product Modules):**
* **Tài khoản Admin:** Đăng nhập quyền Admin, Tạo tài khoản người dùng, Cập nhật thông tin cá nhân của Admin.
* **Quản lý Sản phẩm:**
    * Thêm sản phẩm mới.
    * Chỉnh sửa thông tin sản phẩm.
    * Xóa sản phẩm.
    * Xem danh sách các sản phẩm đã xóa.
    * Khôi phục sản phẩm đã xóa.
    * Tìm kiếm và Sắp xếp sản phẩm (Giao diện Admin).
    * Xem chi tiết sản phẩm (Giao diện Admin).

### 3. Tiêu chuẩn Chất lượng Đạt được

* Tỷ lệ vượt qua các kịch bản kiểm thử (Test case pass rate) đạt từ 90% trở lên, không có lỗi nghiêm trọng (critical defects).
* Độ phủ mã nguồn (Code coverage) đạt tối thiểu 70%.
* Hệ thống phản hồi ổn định với 100 người dùng đồng thời, không xuất hiện lỗi HTTP 500 trong quá trình chạy kiểm thử hiệu năng bằng JMeter.

### 4. Tài liệu đính kèm (Documentation Links)
* [System test](https://docs.google.com/spreadsheets/d/1zn3at-bboIRiEwk0cm3-hrhDkNtjR95d-AbDF35DqXw/edit?usp=sharing)
* [Unit test]
* [Jmester]
* [Selenium]
