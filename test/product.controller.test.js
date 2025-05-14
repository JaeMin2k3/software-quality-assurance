// tests/product.controller.test.js
const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });
const app = require('../index');

const Product = require('../model/products.model');
const Brand = require('../model/brands.model');
const productsCategory = require('../model/products-category.model');

describe('Product Controller Integration Test', () => {
  let productSlug;
  let categorySlug;

  beforeAll(async () => {
    await mongoose.connect(process.env.mongoURL);

    const brand = await Brand.create({ name: 'TestBrand', deleted: false, status: 'active' });
    const category = await productsCategory.create({ title: 'TestCategory', slug: 'test-category', status: 'active', deleted: false });
    categorySlug = category.slug;

    const product = await Product.create({
      title: 'Test Product Slug',
      slug: 'test-product-slug',
      price: 100000,
      discountPercentage: 10,
      stock: 50,
      status: 'active',
      deleted: false,
      brand_id: brand._id,
      category_id: category._id,
      type: 'Low-top',
      size: [36, 37]
    });
    productSlug = product.slug;
  });

  afterAll(async () => {
    await Product.deleteMany({ title: /Test Product Slug/ });
    await productsCategory.deleteMany({ title: /TestCategory/ });
    await Brand.deleteMany({ name: /TestBrand/ });
    await mongoose.disconnect();
  });

  test('PRODUCT_001 - Truy cập trang danh sách sản phẩm', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Trang sản phẩm');
  });

  test('PRODUCT_002 - Truy cập chi tiết sản phẩm', async () => {
    const res = await request(app).get(`/products/detail/${productSlug}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Trang chi tiết sản phẩm');
    expect(res.text).toContain('Test Product Slug');
  });

  test('PRODUCT_003 - Truy cập sản phẩm theo danh mục', async () => {
    const res = await request(app).get(`/products/${categorySlug}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('TestCategory');
  });
});
