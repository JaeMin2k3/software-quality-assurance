require("chromedriver");

const { Builder, By } = require("selenium-webdriver");
const { expect } = require("chai");
const chrome = require("selenium-webdriver/chrome");

describe("Thêm sản phẩm vào giỏ hàng từ chi tiết sản phẩm", function () {
  let driver;
  this.timeout(60000); // timeout cho từng test case

  beforeEach(async function () {
    console.log("Khởi tạo WebDriver...");
    const options = new chrome.Options();
    // Tắt chế độ headless để dễ debug nếu cần
    // options.addArguments("--headless=new");
    options.addArguments("--disable-gpu");
    options.addArguments("--window-size=1920,1080");

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();
    console.log(" WebDriver đã khởi tạo thành công.");
  });

  afterEach(async function () {
    if (driver) await driver.quit();
  });

  it("nên thêm sản phẩm Dell Laptop Model 50 vào giỏ hàng thành công", async function () {
    await driver.get("http://localhost:3000/user/login");

    await driver.findElement(By.id("email")).sendKeys("minhdz2k3@gmail.com");
    await driver.findElement(By.id("password")).sendKeys("123");
    await driver.findElement(By.css("button.btn.btn-primary.btn-block")).click();
    console.log(" Đăng nhập thành công.");

    await driver.get("http://localhost:3000/products/detail/dell-laptop-model-50");

    //  Sử dụng selector đúng dựa trên name
       const quantityInput = await driver.findElement(By.css("input.form-control.mb-2"));

    await quantityInput.clear();
    await quantityInput.sendKeys("2");

    const addButton = await driver.findElement(By.css("button.btn.btn-success.btn-block"));
    await addButton.click();

    console.log(" Đã thêm sản phẩm vào giỏ hàng. Chờ chuyển hướng...");
    await driver.sleep(1000); // hoặc dùng wait nếu có điều kiện rõ ràng hơn

    await driver.get("http://localhost:3000/cart");

    const productId = "6643d00000000000000032"; // Đảm bảo đúng với dữ liệu sản phẩm
    console.log(" Tìm input theo productId:", productId);

    const input = await driver.findElement(By.css(`input[data-product-id="${productId}"]`));
    const quantity = await input.getAttribute("value");

    console.log(" Kiểm tra giỏ hàng:");
    console.log("- productId:", productId);
    console.log("- quantity thực tế:", quantity);

    //  ASSERT số lượng sản phẩm là 2
    expect(quantity).to.equal("2", `Số lượng không đúng (mong đợi: 2, thực tế: ${quantity})`);

    console.log(" Đã xác nhận sản phẩm đúng và số lượng chính xác.");
  });
});
