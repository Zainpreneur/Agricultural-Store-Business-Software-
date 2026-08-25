import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

describe('Agricultural Store API', () => {
  let adminToken: string;
  let categoryId: string;
  let productId: string;
  let customerId: string;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('responds on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('bootstraps the first user as ADMIN via /api/auth/register', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Admin',
      email: `admin+${Date.now()}@test.local`,
      password: 'Password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.token).toBeTruthy();
    adminToken = res.body.token;
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('creates a category and a product', async () => {
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Fertilizers-${Date.now()}` });
    expect(catRes.status).toBe(201);
    categoryId = catRes.body.id;

    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Urea Fertilizer',
        sku: `TEST-SKU-${Date.now()}`,
        categoryId,
        unit: 'bag',
        costPrice: 100,
        sellingPrice: 150,
        stockQty: 20,
        reorderLevel: 5,
      });
    expect(prodRes.status).toBe(201);
    expect(prodRes.body.stockQty).toBe(20);
    productId = prodRes.body.id;
  });

  it('creates a customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Farmer', creditLimit: 1000 });
    expect(res.status).toBe(201);
    customerId = res.body.id;
  });

  it('processes a credit sale, decrements stock, and increases customer balance', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        items: [{ productId, qty: 5 }],
        paidAmount: 200,
        paymentMode: 'CREDIT',
      });
    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe(750); // 5 * 150
    expect(res.body.paidAmount).toBe(200);
    expect(res.body.status).toBe('PARTIALLY_PAID');

    const product = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(product.body.stockQty).toBe(15); // 20 - 5

    const customer = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(customer.body.creditBalance).toBe(550); // 750 - 200
  });

  it('rejects a sale that would exceed available stock', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        items: [{ productId, qty: 999 }],
        paidAmount: 0,
        paymentMode: 'CREDIT',
      });
    expect(res.status).toBe(400);
  });

  it('records a customer payment and reduces their credit balance', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, amount: 550, mode: 'CASH' });
    expect(res.status).toBe(201);

    const customer = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(customer.body.creditBalance).toBe(0);
  });

  it('returns a dashboard summary', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.todaySalesTotal).toBe('number');
  });
});
