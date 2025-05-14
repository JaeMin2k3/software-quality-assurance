// tests/home.controller.test.js
const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });
const app = require('../index');
const Product = require('../model/products.model');
const productsCategory = require('../model/products-category.model');
const articalCategory = require('../model/artical-categoty.model');

describe('Home Controller Integration Test', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.mongoURL);

    await Product.create([
      { title: 'Featured Product', price: 100000, discountPercentage: 10, status: 'active', featured: '1', position: 1, deleted: false },
      { title: 'Latest Product', price: 150000, discountPercentage: 5, status: 'active', featured: '0', position: 10, deleted: false },
      { title: 'Sale Product', price: 200000, discountPercentage: 20, status: 'active', featured: '0', position: 5, deleted: false }
    ]);

    await productsCategory.create({ title: 'Category 1', status: 'active', deleted: false });
    await articalCategory.create({ title: 'Artical Category 1', status: 'active', deleted: false });
  });

  afterAll(async () => {
    await Product.deleteMany({ title: /Product/ });
    await productsCategory.deleteMany({ title: /Category/ });
    await articalCategory.deleteMany({ title: /Artical/ });
    await mongoose.disconnect();
  });

  test('HOME_001 - Truy cập trang chủ thành công', async () => {
    const res = await request(app).get('/home');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Trang chu');
    expect(res.text).toMatch(/Featured Product|Latest Product|Sale Product/);
  });
});