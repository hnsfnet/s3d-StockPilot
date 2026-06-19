import { inventoryService } from '../../src/services/InventoryService';
import { store } from '../../src/store';
import { BusinessError } from '../../src/errors/BusinessError';
import { ErrorCodes } from '../../src/errors/codes';
import { resetStore, createTestProduct } from '../helpers/test-helpers';

describe('InventoryService - 库存调整核心逻辑', () => {
  let productId: string;

  beforeEach(async () => {
    resetStore();
    const product = await createTestProduct({ sku: 'INV-001', name: '测试商品', safetyThreshold: 5 });
    productId = product.id;
  });

  describe('stockIn - 入库', () => {
    it('入库后库存数量正确增加', async () => {
      const result = await inventoryService.stockIn(productId, 20, '初始入库');

      expect(result.quantity).toBe(20);
      expect(result.productId).toBe(productId);
      expect(result.change.type).toBe('in');
      expect(result.change.quantity).toBe(20);
      expect(result.change.remark).toBe('初始入库');
    });

    it('连续多次入库，数量累计正确', async () => {
      await inventoryService.stockIn(productId, 10);
      await inventoryService.stockIn(productId, 5);
      const result = await inventoryService.stockIn(productId, 15);

      expect(result.quantity).toBe(30);
    });

    it('入库会生成一条变更记录', async () => {
      await inventoryService.stockIn(productId, 8, '采购入库');

      const changes = await inventoryService.getStockChanges(productId);
      expect(changes.length).toBe(1);
      expect(changes[0].type).toBe('in');
      expect(changes[0].quantity).toBe(8);
      expect(changes[0].remark).toBe('采购入库');
    });

    it('入库后可以通过 getStock 查询到最新库存', async () => {
      await inventoryService.stockIn(productId, 42);
      const stock = await inventoryService.getStock(productId);

      expect(stock.quantity).toBe(42);
    });
  });

  describe('stockOut - 出库', () => {
    beforeEach(async () => {
      await inventoryService.stockIn(productId, 20);
    });

    it('出库后库存数量正确减少', async () => {
      const result = await inventoryService.stockOut(productId, 5, '销售出库');

      expect(result.quantity).toBe(15);
      expect(result.change.type).toBe('out');
      expect(result.change.quantity).toBe(5);
    });

    it('出库会生成一条变更记录', async () => {
      await inventoryService.stockOut(productId, 3, '测试出库');

      const changes = await inventoryService.getStockChanges(productId);
      const outChanges = changes.filter(c => c.type === 'out');
      expect(outChanges.length).toBe(1);
      expect(outChanges[0].quantity).toBe(3);
    });

    it('库存刚好等于出库数量时允许出库，库存变为 0', async () => {
      const result = await inventoryService.stockOut(productId, 20);
      expect(result.quantity).toBe(0);
    });

    it('库存不足时抛出异常并拒绝出库', async () => {
      expect.assertions(4);

      try {
        await inventoryService.stockOut(productId, 80);
      } catch (err) {
        expect(err).toBeInstanceOf(BusinessError);
        expect((err as BusinessError).code).toBe(ErrorCodes.STOCK_INSUFFICIENT);
        expect((err as BusinessError).message).toMatch(/Insufficient stock/);
      }

      const stock = await inventoryService.getStock(productId);
      expect(stock.quantity).toBe(20);
    });

    it('库存不足时不会生成变更记录', async () => {
      try {
        await inventoryService.stockOut(productId, 100);
      } catch {
        /* expected */
      }

      const changes = await inventoryService.getStockChanges(productId);
      const outChanges = changes.filter(c => c.type === 'out');
      expect(outChanges.length).toBe(0);
    });
  });

  describe('变更记录顺序', () => {
    it('多条变更记录按时间倒序排列，最新的在前面', async () => {
      await inventoryService.stockIn(productId, 10, '第一次');
      await inventoryService.stockIn(productId, 5, '第二次');
      await inventoryService.stockOut(productId, 3, '第三次');

      const changes = await inventoryService.getStockChanges(productId);
      expect(changes.length).toBe(3);
      expect(changes[0].type).toBe('out');
      expect(changes[0].remark).toBe('第三次');
      expect(changes[2].remark).toBe('第一次');
    });
  });

  describe('商品不存在时', () => {
    it('getStock 抛出商品不存在错误', async () => {
      await expect(inventoryService.getStock('non-existent-id')).rejects.toThrow(BusinessError);
    });

    it('stockIn 抛出商品不存在错误', async () => {
      await expect(inventoryService.stockIn('non-existent-id', 10)).rejects.toThrow(BusinessError);
    });

    it('stockOut 抛出商品不存在错误', async () => {
      await expect(inventoryService.stockOut('non-existent-id', 5)).rejects.toThrow(BusinessError);
    });
  });

  describe('并发场景', () => {
    beforeEach(async () => {
      await inventoryService.stockIn(productId, 10);
    });

    it('并发出库不会超卖', async () => {
      const results = await Promise.allSettled([
        inventoryService.stockOut(productId, 8, '并发请求A'),
        inventoryService.stockOut(productId, 8, '并发请求B'),
      ]);

      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      const stock = await inventoryService.getStock(productId);
      expect(stock.quantity).toBe(2);

      const changes = await inventoryService.getStockChanges(productId);
      const outChanges = changes.filter(c => c.type === 'out');
      expect(outChanges.length).toBe(1);
    });

    it('并发入库都能正确累加', async () => {
      const results = await Promise.all([
        inventoryService.stockIn(productId, 5, '并发入库A'),
        inventoryService.stockIn(productId, 3, '并发入库B'),
        inventoryService.stockIn(productId, 7, '并发入库C'),
      ]);

      expect(results).toHaveLength(3);
      const stock = await inventoryService.getStock(productId);
      expect(stock.quantity).toBe(25);

      const changes = await inventoryService.getStockChanges(productId);
      const inChanges = changes.filter(c => c.type === 'in');
      expect(inChanges.length).toBe(3);
    });
  });
});
