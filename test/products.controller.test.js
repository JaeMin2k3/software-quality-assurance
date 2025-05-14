const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });
const app = require('../index');

const Product = require('../model/products.model');

describe('Products Controller - Integration DB Thật', () => {
  let token = 'token_test_user';

  beforeAll(async () => {
    await mongoose.connect(process.env.mongoURL);
  });

  afterAll(async () => {
    await Product.deleteMany({ title: /test_product_/ });
    await mongoose.disconnect();
  });

  test('TC_PROD_001 - Tạo sản phẩm thành công', async () => {
    const res = await request(app)
      .post('/admin/products/create')
      .set('Cookie', [`token=${token}`])
      .send({
        title: 'test_product_1',
        price: 1500000,
        discountPercentage: 10,
        stock: 100,
        brand_id: '663d376d46dddf4c6d75e0de',
        category_id: '663d376d46dddf4c6d75e0df',
        type: 'Low-top',
        size: '36,37,38',
        positon: 999
      });

    expect(res.status).toBe(302);

    const product = await Product.findOne({ title: 'test_product_1' });
    expect(product).not.toBeNull();
    expect(product.price).toBe(1500000);
    expect(product.size).toEqual(expect.arrayContaining([36, 37, 38]));
  });
});