import { productService } from '../../src/services/ProductService';
import { inventoryService } from '../../src/services/InventoryService';
import { resetStore, createTestProduct } from '../helpers/test-helpers';

describe('ProductService - 库存预警', () => {
  const SAFETY_THRESHOLD = 10;
  let productId: string;

  beforeEach(async () => {
    resetStore();
    const product = await createTestProduct({
      sku: 'WARN-001',
      name: '预警测试商品',
      safetyThreshold: SAFETY_THRESHOLD,
    });
    productId = product.id;
  });

  describe('预警状态判断规则', () => {
    it('库存为 0 且阈值为 10 时，状态为 warning', async () => {
      const product = await productService.getProductById(productId);

      expect(product.stockQuantity).toBe(0);
      expect(product.safetyThreshold).toBe(SAFETY_THRESHOLD);
      expect(product.warningStatus).toBe('warning');
    });

    it('库存低于阈值时，状态为 warning', async () => {
      await inventoryService.stockIn(productId, 5);
      const product = await productService.getProductById(productId);

      expect(product.stockQuantity).toBe(5);
      expect(product.warningStatus).toBe('warning');
    });

    it('库存等于阈值时，状态为 normal（不低于即正常）', async () => {
      await inventoryService.stockIn(productId, SAFETY_THRESHOLD);
      const product = await productService.getProductById(productId);

      expect(product.stockQuantity).toBe(SAFETY_THRESHOLD);
      expect(product.warningStatus).toBe('normal');
    });

    it('库存高于阈值时，状态为 normal', async () => {
      await inventoryService.stockIn(productId, 20);
      const product = await productService.getProductById(productId);

      expect(product.stockQuantity).toBe(20);
      expect(product.warningStatus).toBe('normal');
    });
  });

  describe('出库导致的预警状态变化', () => {
    beforeEach(async () => {
      await inventoryService.stockIn(productId, 20);
    });

    it('出库后库存仍高于阈值，状态保持 normal', async () => {
      await inventoryService.stockOut(productId, 5);
      const product = await productService.getProductById(productId);

      expect(product.stockQuantity).toBe(15);
      expect(product.warningStatus).toBe('normal');
    });

    it('出库后库存刚好等于阈值，状态变为 normal（不算预警）', async () => {
      await inventoryService.stockOut(productId, 10);
      const product = await productService.getProductById(productId);

      expect(product.stockQuantity).toBe(10);
      expect(product.warningStatus).toBe('normal');
    });

    it('出库后库存低于阈值，状态变为 warning', async () => {
      await inventoryService.stockOut(productId, 15);
      const product = await productService.getProductById(productId);

      expect(product.stockQuantity).toBe(5);
      expect(product.warningStatus).toBe('warning');
    });

    it('库存从充足连续出库到 0，最终为 warning 状态', async () => {
      await inventoryService.stockOut(productId, 8);
      await inventoryService.stockOut(productId, 8);
      await inventoryService.stockOut(productId, 4);

      const product = await productService.getProductById(productId);
      expect(product.stockQuantity).toBe(0);
      expect(product.warningStatus).toBe('warning');
    });
  });

  describe('入库（补货）导致的预警状态恢复', () => {
    it('库存从低于阈值补货后等于阈值，状态恢复 normal', async () => {
      await inventoryService.stockIn(productId, 3);

      let product = await productService.getProductById(productId);
      expect(product.warningStatus).toBe('warning');

      await inventoryService.stockIn(productId, 7);

      product = await productService.getProductById(productId);
      expect(product.stockQuantity).toBe(10);
      expect(product.warningStatus).toBe('normal');
    });

    it('库存从低于阈值补货后超过阈值，状态恢复 normal', async () => {
      await inventoryService.stockIn(productId, 2);

      let product = await productService.getProductById(productId);
      expect(product.warningStatus).toBe('warning');

      await inventoryService.stockIn(productId, 30);

      product = await productService.getProductById(productId);
      expect(product.stockQuantity).toBe(32);
      expect(product.warningStatus).toBe('normal');
    });

    it('多次补货逐步恢复，跨过阈值时状态切换', async () => {
      const step1 = await inventoryService.stockIn(productId, 3);
      expect(step1.warningStatus).toBe('warning');

      const step2 = await inventoryService.stockIn(productId, 4);
      expect(step2.warningStatus).toBe('warning');

      const step3 = await inventoryService.stockIn(productId, 3);
      expect(step3.quantity).toBe(10);
      expect(step3.warningStatus).toBe('normal');

      const step4 = await inventoryService.stockIn(productId, 5);
      expect(step4.warningStatus).toBe('normal');
    });
  });

  describe('预警商品列表查询', () => {
    beforeEach(async () => {
      await createTestProduct({ sku: 'WARN-002', name: '商品B', safetyThreshold: 5 });
      await createTestProduct({ sku: 'WARN-003', name: '商品C', safetyThreshold: 20 });
    });

    it('getWarningProducts 返回所有处于预警状态的商品', async () => {
      const result = await productService.getWarningProducts();

      expect(result.count).toBe(3);
      expect(result.products.every(p => p.warningStatus === 'warning')).toBe(true);
    });

    it('部分商品补货后，预警列表只包含仍在预警的商品', async () => {
      const allProducts = await productService.getProducts();
      const targetId = allProducts.find(p => p.sku === 'WARN-003')!.id;

      await inventoryService.stockIn(targetId, 50);

      const result = await productService.getWarningProducts();
      expect(result.count).toBe(2);
      expect(result.products.map(p => p.sku)).toEqual(expect.arrayContaining(['WARN-001', 'WARN-002']));
      expect(result.products.map(p => p.sku)).not.toContain('WARN-003');
    });

    it('商品列表支持按 warning 查询参数筛选', async () => {
      const allProducts = await productService.getProducts();
      const product003 = allProducts.find(p => p.sku === 'WARN-003')!;
      await inventoryService.stockIn(product003.id, 50);

      const warningOnes = await productService.getProducts({ warning: 'true' });
      expect(warningOnes.length).toBe(2);
      expect(warningOnes.every(p => p.warningStatus === 'warning')).toBe(true);

      const normalOnes = await productService.getProducts({ warning: 'normal' });
      expect(normalOnes.length).toBe(1);
      expect(normalOnes[0].sku).toBe('WARN-003');
      expect(normalOnes[0].warningStatus).toBe('normal');
    });
  });

  describe('调整安全阈值影响预警状态', () => {
    beforeEach(async () => {
      await inventoryService.stockIn(productId, 15);
    });

    it('提高阈值到库存以上，状态从 normal 变为 warning', async () => {
      let product = await productService.getProductById(productId);
      expect(product.warningStatus).toBe('normal');

      product = await productService.setSafetyThreshold(productId, 20);
      expect(product.safetyThreshold).toBe(20);
      expect(product.warningStatus).toBe('warning');
    });

    it('降低阈值到库存以下，状态保持 normal', async () => {
      const product = await productService.setSafetyThreshold(productId, 5);

      expect(product.safetyThreshold).toBe(5);
      expect(product.warningStatus).toBe('normal');
    });

    it('阈值设为 0 时，库存为 0 也不算预警', async () => {
      await inventoryService.stockOut(productId, 15);

      let product = await productService.getProductById(productId);
      expect(product.warningStatus).toBe('warning');

      product = await productService.setSafetyThreshold(productId, 0);
      expect(product.warningStatus).toBe('normal');
    });
  });
});
