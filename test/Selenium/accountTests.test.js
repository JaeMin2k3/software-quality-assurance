require("chromedriver");

const { Builder, By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const chrome = require('selenium-webdriver/chrome');

describe("Kiểm tra form đăng nhập", function () {
  let driver;
  this.timeout(30000);

  before(async function () {
    const options = new chrome.Options();
    // Tắt chế độ headless để nhìn thấy thao tác
    // options.addArguments("--headless=new");
    options.addArguments("--disable-gpu");
    options.addArguments("--window-size=1920,1080");

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  after(async function () {
    if (driver) await driver.quit();
  });

  it("Form đăng nhập có tiêu đề và các input hợp lệ", async function () {
    await driver.get('http://localhost:3000/user/login');

    // Kiểm tra tiêu đề trang
    await driver.wait(until.titleContains('Đăng nhập'), 5000);
    const pageTitle = await driver.getTitle();
    expect(pageTitle).to.include('Đăng nhập');

    // Tìm các field
    const emailField = await driver.findElement(By.name('email'));
    const passwordField = await driver.findElement(By.name('password'));
    const loginButton = await driver.findElement(By.css('button[type="submit"]'));

    // Kiểm tra tồn tại
    expect(emailField).to.exist;
    expect(passwordField).to.exist;
    expect(loginButton).to.exist;

    console.log(" Tìm thấy các phần tử form đăng nhập.");
  });
});
