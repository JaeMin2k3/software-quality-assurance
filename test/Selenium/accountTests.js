const { Builder, By, until } = require('selenium-webdriver');

(async function testLoginPage() {
    // Khởi tạo WebDriver cho Chrome
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Điều hướng đến trang đăng nhập
        await driver.get('http://localhost:3000/user/login');

        // Chờ tiêu đề trang chứa từ "Đăng nhập" (tối đa 5 giây)
        await driver.wait(until.titleContains('Đăng nhập'), 5000);

        // Lấy tiêu đề trang và in ra
        const pageTitle = await driver.getTitle();
        console.log('Page Title:', pageTitle);

        // Tìm và xác minh các phần tử của form đăng nhập
        const emailField = await driver.findElement(By.name('email'));
        const passwordField = await driver.findElement(By.name('password'));
        const loginButton = await driver.findElement(By.css('button[type="submit"]'));

        console.log('Login form elements found.');
    } catch (error) {
        console.error('❌ Đã xảy ra lỗi trong quá trình test:', error);
    } finally {
        // Đảm bảo đóng trình duyệt sau khi test
        await driver.quit();
    }
})();
