import request from 'supertest';
import app from '../../src/app';
import { store } from '../../src/store';

const CATEGORY = 'Books';

describe('库存盘点接口 - 集成测试', () => {
  let productA: { id: string; sku: string; name: string };
  let productB: { id: string; sku: string; name: string };

  beforeEach(async () => {
    store.reset();

    const resA = await request(app)
      .post('/api/products')
      .send({ sku: 'BOOK-001', name: '深入理解计算机系统', category: CATEGORY, price: 99, safetyThreshold: 5 })
      .expect(201);
    productA = resA.body.data;

    const resB = await request(app)
      .post('/api/products')
      .send({ sku: 'BOOK-002', name: '代码大全', category: CATEGORY, price: 128, safetyThreshold: 3 })
      .expect(201);
    productB = resB.body.data;

    await request(app)
      .post(`/api/stock/${productA.id}/in`)
      .send({ quantity: 20, remark: '初始入库A' })
      .expect(201);

    await request(app)
      .post(`/api/stock/${productB.id}/in`)
      .send({ quantity: 10, remark: '初始入库B' })
      .expect(201);
  });

  describe('创建盘点', () => {
    it('POST /api/stocktakes - 创建盘点，返回盘点快照', async () => {
      const res = await request(app)
        .post('/api/stocktakes')
        .send({ category: CATEGORY, remark: '月度盘点' })
        .expect(201);

      const stocktake = res.body.data;

      expect(res.body.success).toBe(true);
      expect(stocktake.status).toBe('in_progress');
      expect(stocktake.category).toBe(CATEGORY);
      expect(stocktake.items).toHaveLength(2);
      expect(stocktake.totalItems).toBe(2);
      expect(stocktake.totalBookQuantity).toBe(30);
      expect(stocktake.totalActualQuantity).toBe(30);
      expect(stocktake.totalDifference).toBe(0);
      expect(stocktake.remark).toBe('月度盘点');

      const skus = stocktake.items.map((i: { sku: string }) => i.sku);
      expect(skus).toEqual(expect.arrayContaining(['BOOK-001', 'BOOK-002']));

      stocktake.items.forEach((item: { bookQuantity: number; actualQuantity: number; difference: number }) => {
        expect(item.difference).toBe(0);
        expect(item.bookQuantity).toBe(item.actualQuantity);
      });
    });

    it('同一分类不能同时存在两个进行中的盘点', async () => {
      await request(app)
        .post('/api/stocktakes')
        .send({ category: CATEGORY })
        .expect(201);

      const res = await request(app)
        .post('/api/stocktakes')
        .send({ category: CATEGORY })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.bizCode).toBe(2007);
      expect(res.body.error.message).toMatch(/active stocktake/);
    });
  });

  describe('盘点期间锁定库存调整', () => {
    let stocktakeId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/stocktakes')
        .send({ category: CATEGORY });
      stocktakeId = res.body.data.id;
    });

    it('盘点期间入库被拒绝（409）', async () => {
      const res = await request(app)
        .post(`/api/stock/${productA.id}/in`)
        .send({ quantity: 10 })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.bizCode).toBe(2003);
      expect(res.body.error.message).toMatch(/locked/);
    });

    it('盘点期间出库被拒绝（409）', async () => {
      const res = await request(app)
        .post(`/api/stock/${productB.id}/out`)
        .send({ quantity: 2 })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/locked/);
    });

    it('盘点期间删除商品被拒绝（409）', async () => {
      const res = await request(app)
        .delete(`/api/products/${productA.id}`)
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it('盘点期间修改商品分类被拒绝', async () => {
      const res = await request(app)
        .put(`/api/products/${productA.id}`)
        .send({ category: 'Toys' })
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it('盘点期间查询库存不受影响（只读正常返回）', async () => {
      const res = await request(app)
        .get(`/api/stock/${productA.id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity).toBe(20);
    });

    it('盘点期间查询商品列表不受影响', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ category: CATEGORY })
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });

    it('其它分类的库存调整不受影响', async () => {
      const resOther = await request(app)
        .post('/api/products')
        .send({ sku: 'TOY-001', name: '其它分类商品', category: 'Toys', price: 50, safetyThreshold: 2 })
        .expect(201);

      const otherProductId = resOther.body.data.id;

      const stockInRes = await request(app)
        .post(`/api/stock/${otherProductId}/in`)
        .send({ quantity: 100 })
        .expect(201);

      expect(stockInRes.body.data.quantity).toBe(100);
    });
  });

  describe('完成盘点', () => {
    let stocktakeId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/stocktakes')
        .send({ category: CATEGORY, remark: '月度盘点' });
      stocktakeId = res.body.data.id;
    });

    it('POST /api/stocktakes/:id/complete - 完成盘点，状态变为 completed', async () => {
      const res = await request(app)
        .post(`/api/stocktakes/${stocktakeId}/complete`)
        .send({ remark: '盘点完成，账实相符' })
        .expect(200);

      const stocktake = res.body.data;

      expect(stocktake.status).toBe('completed');
      expect(stocktake.completedAt).toBeTruthy();
      expect(stocktake.remark).toBe('盘点完成，账实相符');
      expect(stocktake.items).toHaveLength(2);
      expect(stocktake.totalBookQuantity).toBe(30);
    });

    it('完成盘点后，分类锁定解除，可以正常入库', async () => {
      await request(app)
        .post(`/api/stocktakes/${stocktakeId}/complete`)
        .expect(200);

      const res = await request(app)
        .post(`/api/stock/${productA.id}/in`)
        .send({ quantity: 15, remark: '补货' })
        .expect(201);

      expect(res.body.data.quantity).toBe(35);
    });

    it('完成盘点后，分类锁定解除，可以正常出库', async () => {
      await request(app)
        .post(`/api/stocktakes/${stocktakeId}/complete`)
        .expect(200);

      const res = await request(app)
        .post(`/api/stock/${productB.id}/out`)
        .send({ quantity: 4 })
        .expect(201);

      expect(res.body.data.quantity).toBe(6);
    });

    it('完成盘点后，可以再次创建该分类的新盘点', async () => {
      await request(app)
        .post(`/api/stocktakes/${stocktakeId}/complete`)
        .expect(200);

      const res = await request(app)
        .post('/api/stocktakes')
        .send({ category: CATEGORY, remark: '二次盘点' })
        .expect(201);

      expect(res.body.data.status).toBe('in_progress');
      expect(res.body.data.id).not.toBe(stocktakeId);
    });

    it('已完成的盘点不能再次完成', async () => {
      await request(app)
        .post(`/api/stocktakes/${stocktakeId}/complete`)
        .expect(200);

      const res = await request(app)
        .post(`/api/stocktakes/${stocktakeId}/complete`)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.bizCode).toBe(2005);
    });
  });

  describe('取消盘点', () => {
    let stocktakeId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/stocktakes')
        .send({ category: CATEGORY });
      stocktakeId = res.body.data.id;
    });

    it('POST /api/stocktakes/:id/cancel - 取消盘点，状态变为 cancelled', async () => {
      const res = await request(app)
        .post(`/api/stocktakes/${stocktakeId}/cancel`)
        .send({ remark: '盘点取消' })
        .expect(200);

      const stocktake = res.body.data;
      expect(stocktake.status).toBe('cancelled');
      expect(stocktake.cancelledAt).toBeTruthy();
    });

    it('取消盘点后，分类锁定解除', async () => {
      await request(app)
        .post(`/api/stocktakes/${stocktakeId}/cancel`)
        .expect(200);

      const res = await request(app)
        .post(`/api/stock/${productA.id}/in`)
        .send({ quantity: 7 })
        .expect(201);

      expect(res.body.data.quantity).toBe(27);
    });

    it('已取消的盘点不能再次取消', async () => {
      await request(app)
        .post(`/api/stocktakes/${stocktakeId}/cancel`)
        .expect(200);

      const res = await request(app)
        .post(`/api/stocktakes/${stocktakeId}/cancel`)
        .expect(409);

      expect(res.body.success).toBe(false);
    });
  });

  describe('盘点查询', () => {
    it('GET /api/stocktakes - 查询盘点列表', async () => {
      await request(app).post('/api/stocktakes').send({ category: CATEGORY });
      await request(app).post('/api/stocktakes').send({ category: 'Electronics' });

      const res = await request(app).get('/api/stocktakes').expect(200);

      expect(res.body.data).toHaveLength(2);
    });

    it('GET /api/stocktakes?category=xxx - 按分类筛选', async () => {
      await request(app).post('/api/stocktakes').send({ category: CATEGORY });
      await request(app).post('/api/stocktakes').send({ category: 'Electronics' });

      const res = await request(app)
        .get('/api/stocktakes')
        .query({ category: CATEGORY })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe(CATEGORY);
    });

    it('GET /api/stocktakes?status=xxx - 按状态筛选', async () => {
      const createRes = await request(app).post('/api/stocktakes').send({ category: CATEGORY });
      await request(app).post(`/api/stocktakes/${createRes.body.data.id}/complete`);

      await request(app).post('/api/stocktakes').send({ category: 'Electronics' });

      const res = await request(app)
        .get('/api/stocktakes')
        .query({ status: 'completed' })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('completed');
    });

    it('GET /api/stocktakes/:id - 查询单个盘点详情', async () => {
      const createRes = await request(app)
        .post('/api/stocktakes')
        .send({ category: CATEGORY, remark: '测试详情' });

      const stocktakeId = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/stocktakes/${stocktakeId}`)
        .expect(200);

      expect(res.body.data.id).toBe(stocktakeId);
      expect(res.body.data.category).toBe(CATEGORY);
      expect(res.body.data.items).toHaveLength(2);
    });

    it('查询不存在的盘点返回 404', async () => {
      const res = await request(app)
        .get('/api/stocktakes/non-existent-id')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.bizCode).toBe(2004);
    });
  });

  describe('刷新盘点快照', () => {
    it('POST /api/stocktakes/:id/refresh - 重新拉取当前库存生成快照', async () => {
      const createRes = await request(app)
        .post('/api/stocktakes')
        .send({ category: CATEGORY });

      const stocktakeId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/stocktakes/${stocktakeId}/refresh`)
        .expect(200);

      expect(res.body.data.totalBookQuantity).toBe(30);
      expect(res.body.data.status).toBe('in_progress');
    });
  });

  describe('统一错误响应格式', () => {
    it('所有错误响应都包含 success=false + error.code + error.bizCode + timestamp', async () => {
      const res = await request(app)
        .get('/api/stocktakes/non-existent-id')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(404);
      expect(res.body.error.bizCode).toBeDefined();
      expect(typeof res.body.error.message).toBe('string');
      expect(typeof res.body.timestamp).toBe('string');
      expect(res.body.timestamp).toMatch(/Z$/);
    });

    it('所有成功响应都包含 success=true + data + timestamp', async () => {
      const res = await request(app)
        .get('/api/products')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.timestamp).toBe('string');
      expect(res.body.timestamp).toMatch(/Z$/);
    });
  });
});
