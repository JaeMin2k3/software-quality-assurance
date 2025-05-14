// tests/search.controller.test.js
const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });
const app = require('../index');

const Product = require('../model/products.model');

describe('Search Controller Integration Test', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.mongoURL);
    await Product.create({
      title: 'Giày Sneaker Search Test',
      price: 1200000,
      discountPercentage: 15,
      status: 'active',
      deleted: false
    });
  });

  afterAll(async () => {
    await Product.deleteMany({ title: /Search Test/ });
    await mongoose.disconnect();
  });

  test('SEARCH_001 - Truy cập trang tìm kiếm với từ khoá hợp lệ', async () => {
    const res = await request(app)
      .get('/search')
      .query({ keyword: 'Sneaker' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Trang tìm kiếm sản phẩm');
    expect(res.text).toContain('Giày Sneaker Search Test');
  });

  test('SEARCH_002 - Truy cập trang tìm kiếm với từ khoá không khớp', async () => {
    const res = await request(app)
      .get('/search')
      .query({ keyword: 'NoMatchKey' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Trang tìm kiếm sản phẩm');
    expect(res.text).not.toContain('Giày Sneaker Search Test');
  });

  test('SEARCH_003 - Truy cập trang tìm kiếm không có từ khoá', async () => {
    const res = await request(app)
      .get('/search');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Trang tìm kiếm sản phẩm');
  });
});
