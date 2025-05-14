const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });
const app = require('../index');

const Cart = require('../model/carts.model');
const Product = require('../model/products.model');

describe('Cart Controller Integration Test', () => {
  let cartId;
  let productId;

  beforeAll(async () => {
    await mongoose.connect(process.env.mongoURL);

    // Tạo product mẫu
    const product = await Product.create({
      title: 'Test Product Cart',
      price: 100000,
      discountPercentage: 10,
      stock: 100,
      size: [36, 37],
      status: 'active',
      deleted: false
    });
    productId = product._id.toString();

    // Tạo cart mẫu
    const cart = await Cart.create({
      products: []
    });
    cartId = cart._id.toString();
  });

  afterAll(async () => {
    await Product.deleteMany({ title: /Test Product Cart/ });
    await Cart.deleteMany({});
    await mongoose.disconnect();
  });

  test('CART_001 - Thêm sản phẩm mới vào giỏ hàng', async () => {
    const res = await request(app)
      .post(`/cart/add/${productId}`)
      .set('Cookie', [`cartId=${cartId}`])
      .send({ quantity: 2 });

    expect(res.status).toBe(302);

    const cart = await Cart.findOne({ _id: cartId });
    expect(cart.products.length).toBe(1);
    expect(cart.products[0].product_id).toBe(productId);
    expect(cart.products[0].quantity).toBe(2);
  });

  test('CART_002 - Cập nhật số lượng sản phẩm trong giỏ', async () => {
    const res = await request(app)
      .get(`/cart/update/${productId}/5`)
      .set('Cookie', [`cartId=${cartId}`]);

    expect(res.status).toBe(302);

    const cart = await Cart.findOne({ _id: cartId });
    expect(cart.products[0].quantity).toBe(5);
  });

  test('CART_003 - Xóa sản phẩm khỏi giỏ hàng', async () => {
    const res = await request(app)
      .get(`/delete/${productId}`)
      .set('Cookie', [`cartId=${cartId}`]);

    expect(res.status).toBe(302);

    const cart = await Cart.findOne({ _id: cartId });
    expect(cart.products.length).toBe(0);
  });
});
