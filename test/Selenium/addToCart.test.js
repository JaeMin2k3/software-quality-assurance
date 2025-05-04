require("chromedriver");

const { Builder, By, until } = require("selenium-webdriver");
const { expect } = require("chai");
const chrome = require("selenium-webdriver/chrome");

describe("Thêm sản phẩm vào giỏ hàng từ chi tiết sản phẩm", function () {
  let driver;
  this.timeout(60000); // 60 giây timeout

  beforeEach(async function () {
    console.log("Khởi tạo WebDriver...");
    const options = new chrome.Options();
    options.addArguments("--headless=new");
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

  it("nên thêm sản phẩm iphone 15 promax vào giỏ hàng thành công", async function () {
    //   Truy cập trang đăng nhập
  await driver.get("http://localhost:3000/user/login");

//  Nhập email và password
  await driver.findElement(By.id("email")).sendKeys("minhdz2k3@gmail.com");
  await driver.findElement(By.id("password")).sendKeys("123");

//Nhấn nút Đăng nhập
await driver.findElement(By.css("button.btn.btn-primary.btn-block")).click();
console.log("Đang chờ chuyển hướng đến trang chi tiết sản phẩm...");
//  Chờ chuyển hướng thành công (tuỳ logic server bạn)
await driver.get("http://localhost:3000/products");
    console.log("Truy cập trang chi tiết sản phẩm...");
    await driver.get("http://localhost:3000/products/detail/iphone-15-promax");
    
    const quantityInput = await driver.findElement(By.css("input.form-control.mb-2"));
    await quantityInput.clear();
    await quantityInput.sendKeys("2");

    console.log("Nhấn nút thêm vào giỏ hàng...");
    const addButton = await driver.findElement(By.css("button.btn.btn-success.btn-block"));
    await addButton.click();

    console.log("Chờ chuyển hướng đến giỏ hàng...");
    await driver.sleep(1000);
    await driver.get("http://localhost:3000/cart");
    // const html = await driver.getPageSource();
    // require("fs").writeFileSync("cart_debug.html", html);
    console.log("Đã ghi file cart_debug.html");
    console.log("Nhập số lượng sản phẩm...");
    const productId = "661b7a337ca5c24cb928b669"; // khớp với DOM

    console.log(" Tìm input theo productId:", productId);

   

    const input = await driver.findElement(By.css(`input[data-product-id="${productId}"]`));
    const quantity = await input.getAttribute("value");
    console.log(" Kiểm tra giỏ hàng:");
    console.log("- productId thực tế:", productId);
    console.log("- quantity thực tế:", quantity);
    console.log("- Đúng hay không:", quantity === "2" ? " ĐÚNG" : " SAI");

    console.log(" Đã tìm thấy đúng sản phẩm và số lượng.");
  });
});
