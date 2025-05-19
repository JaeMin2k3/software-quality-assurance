require("chromedriver");

const { Builder, By, until } = require("selenium-webdriver");
const { expect } = require("chai");
const chrome = require("selenium-webdriver/chrome");

describe("Quy trình đặt hàng hoàn chỉnh", function () {
  let driver;
  this.timeout(60000); // 60 giây timeout

  before(async function () {
    console.log("🚀 Khởi tạo WebDriver...");
    const options = new chrome.Options();

    // ❗ĐẢM BẢO KHÔNG CHẠY HEADLESS
    // options.addArguments("--headless=new"); // <- COMMENT hoặc xóa dòng này
    options.addArguments("--disable-gpu");
    options.addArguments("--window-size=1920,1080");

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();
    console.log("✅ WebDriver đã khởi tạo xong và Chrome đã mở.");
  });

  after(async function () {
    if (driver) await driver.quit();
    console.log("🧹 Đã đóng trình duyệt.");
  });

  it("nên hoàn tất quá trình đặt hàng thành công", async function () {
    // 1. Đăng nhập
    await driver.get("http://localhost:3000/user/login");
    await driver.findElement(By.id("email")).sendKeys("minhdz2k3@gmail.com");
    await driver.findElement(By.id("password")).sendKeys("123");
    await driver.findElement(By.css("button.btn.btn-primary.btn-block")).click();
    console.log("✅ Đăng nhập thành công.");

    // 2. Truy cập chi tiết sản phẩm và thêm vào giỏ
    await driver.get("http://localhost:3000/products/detail/dell-laptop-model-50");
    const quantityInput = await driver.findElement(By.name("quantity"));
    await quantityInput.clear();
    await quantityInput.sendKeys("2");
    await driver.findElement(By.css("button.btn.btn-success.btn-block")).click();
    console.log("🛒 Đã thêm sản phẩm vào giỏ hàng.");

    // 3. Truy cập giỏ hàng
    await driver.sleep(1000);
    await driver.get("http://localhost:3000/cart");

    // 4. Kiểm tra sản phẩm trong giỏ hàng
    const productId = "6643d00000000000000032";
    const input = await driver.findElement(By.css(`input[data-product-id="${productId}"]`));
    const quantity = await input.getAttribute("value");
    expect(quantity).to.equal("2", "Số lượng trong giỏ không đúng");
    console.log("Sản phẩm đúng và số lượng chính xác.");

    
    // 5. Nhấn nút "Thanh toán"
    await driver.findElement(By.css("a.btn.btn-success")).click();
    console.log("Đã nhấn nút Thanh toán.");
    // Chờ chuyển hướng đến trang checkout
    await driver.wait(until.urlContains("/checkout"), 5000);
    console.log("Đã chuyển sang trang /checkout.");

    // 6. Nhập thông tin giao hàng
    await driver.findElement(By.id("fullName")).sendKeys("Nguyen Van A");
    await driver.findElement(By.id("phone")).sendKeys("0912345678");
    await driver.findElement(By.id("address")).sendKeys("123 ABC Street");

    // 7. Nhấn nút "Đặt hàng"
    await driver.findElement(By.css("button.btn.btn-success.btn-block")).click();
    console.log("Đã gửi thông tin đặt hàng.");

    // 8. Kiểm tra trang success
    await driver.wait(until.urlMatches(/\/checkout\/success\/[a-f0-9]{24}$/), 5000);
    const currentUrl = await driver.getCurrentUrl();

    console.log("Đặt hàng thành công, chuyển đến URL:", currentUrl);
    expect(currentUrl).to.match(/\/checkout\/success\/[a-f0-9]{24}$/, "Không chuyển đến trang xác nhận đơn hàng");
  });
});
