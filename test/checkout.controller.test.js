// tests/checkout.controller.test.js
const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });
const app = require('../index');

const Cart = require('../model/carts.model');
const Product = require('../model/products.model');
const Order = require('../model/orders.model');

describe('Checkout Controller Integration Test', () => {
  let cartId;
  let productId;
  let orderId;

  beforeAll(async () => {
    await mongoose.connect(process.env.mongoURL);

    const product = await Product.create({
      title: 'Checkout Test Product',
      price: 100000,
      discountPercentage: 20,
      stock: 100,
      size: [37, 38],
      status: 'active',
      deleted: false
    });
    productId = product._id.toString();

    const cart = await Cart.create({
      products: [{ product_id: productId, quantity: 2 }]
    });
    cartId = cart._id.toString();
  });

  afterAll(async () => {
    await Product.deleteMany({ title: /Checkout Test Product/ });
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await mongoose.disconnect();
  });

  test('CHECKOUT_001 - Hiển thị trang thanh toán', async () => {
    const res = await request(app)
      .get('/checkout')
      .set('Cookie', [`cartId=${cartId}`]);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Thanh toán');
  });

  test('CHECKOUT_002 - Đặt hàng thành công', async () => {
    const res = await request(app)
      .post('/order')
      .set('Cookie', [`cartId=${cartId}`])
      .send({
        fullName: 'Test User',
        phone: '0123456789',
        address: 'Hanoi'
      });

    expect(res.status).toBe(302);
    const order = await Order.findOne({ 'userInfor.fullName': 'Test User' });
    expect(order).not.toBeNull();
    expect(order.products.length).toBeGreaterThan(0);
    orderId = order._id.toString();
  });

  test('CHECKOUT_003 - Trang đặt hàng thành công', async () => {
    const res = await request(app)
      .get(`/checkout/success/${orderId}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Đặt hàng thành công');
  });
});
