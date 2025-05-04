require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../index.js"); 
const User = require("../model/users.model"); 
const Cart = require("../model/carts.model"); 
const db = require("../config/database"); 
const md5 = require("md5");

let server;

// Increase timeout and setup server
beforeAll(async () => {
    await db.connect();
    server = app.listen(3001); // Use different port for testing
}, 10000); // 10 second timeout

afterAll(async () => {
    await mongoose.connection.close();
    await server.close();
}, 10000);

describe("📂 User Registration API", () => {
    beforeEach(async () => {
        await User.deleteMany({});
        await Cart.deleteMany({});
    }, 10000); // Increase timeout for database cleanup

    // Add timeout to individual tests
    test("✅ should register successfully and create a user", async () => {
        const newUser = {
            fullName: "Bui Quang Thanh",
            email: "test@example.com",
            password: "123",
            passwordCF: "123",
            phone: "0123456789"
        };

        const response = await request(app)
            .post("/user/register")
            .set("Content-Type", "application/x-www-form-urlencoded") // Định dạng form-data
            .send(newUser)
            .expect(302); // Redirect sau khi đăng ký thành công

        // Kiểm tra User được tạo trong DB
        const userInDB = await User.findOne({ email: newUser.email });
        expect(userInDB).not.toBeNull();
        expect(userInDB.fullName).toBe(newUser.fullName);
        expect(userInDB.password).toBe(md5(newUser.password));

        // Kiểm tra giỏ hàng (cart) đã tạo
        const cartInDB = await Cart.findById(userInDB.cart_id);
        expect(cartInDB).not.toBeNull();

        // Kiểm tra cookie cartId
        expect(response.headers["set-cookie"]).toEqual(
            expect.arrayContaining([expect.stringContaining("cartId=")])
        );

        // Kiểm tra cookie tokenUser
        expect(response.headers["set-cookie"]).toEqual(
            expect.arrayContaining([expect.stringContaining("tokenUser=")])
        );
    });

    test("❌ should fail if passwords do not match", async () => {
        const newUser = {
            fullName: "Bui Quang Thanh",
            email: "test@example.com",
            password: "123",
            passwordCF: "1234",
            phone: "0123456789"
        };

        const response = await request(app)
            .post("/user/register")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(newUser)
            .expect(302); // Redirect vì lỗi

   

        // Đảm bảo User KHÔNG được tạo
        const userInDB = await User.findOne({ email: newUser.email });
        expect(userInDB).toBeNull();
    });

    test("❌ should fail if email already exists", async () => {
        // Tạo user trước để test email bị trùng
        await User.create({
            fullName: "Bui Quang Thanh",
            email: "test@example.com",
            password: "123",
            phone: "0123456789"
        });

        const newUser = {
            fullName: "Bui Quang Thanh",
            email: "test@example.com",
            password: "123",
            passwordCF: "123",
            phone: "0123456789"
        };

        const response = await request(app)
            .post("/user/register")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(newUser)
            .expect(302); // Redirect vì lỗi

        // Kiểm tra chỉ có 1 user tồn tại trong DB
        const userCount = await User.countDocuments({ email: newUser.email });
        expect(userCount).toBe(1);
    });

});
