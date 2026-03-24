import test from 'node:test';
import assert from 'node:assert/strict';
import { expandItemsToLabels, parsePOTextToItems } from '../utils/parsePO.js';

test('parses 8-12 char SKU with qty before SKU and ignores trailing price/total', () => {
  const text = '2 AB12CD34 Premium Candle Gift Set 123456789012 10.00 20.00';
  const items = parsePOTextToItems(text, 'po-a.pdf');

  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    sku: 'AB12CD34',
    productName: 'Premium Candle Gift Set 123456789012',
    quantity: 2,
    barcode: 'AB12CD34',
    sourceName: 'po-a.pdf'
  });
});

test('parses sku-first style with qty after product text', () => {
  const text = 'ZX90LM12 Luxe Velvet Tray 3 9.99 29.97';
  const items = parsePOTextToItems(text, 'po-b.pdf');

  assert.equal(items.length, 1);
  assert.equal(items[0].sku, 'ZX90LM12');
  assert.equal(items[0].quantity, 3);
  assert.equal(items[0].barcode, 'ZX90LM12');
});

test('skips sku line when quantity is missing to avoid false label inflation', () => {
  const text = 'SKU998877 Premium Bundle Pack BarcodeValueInsideName';
  const items = parsePOTextToItems(text, 'po-c.pdf');

  assert.equal(items.length, 0);
});

test('expands labels strictly by parsed qty and barcode uses SKU only', () => {
  const labels = expandItemsToLabels([
    {
      sku: 'AB12CD34',
      productName: 'Product Alpha',
      quantity: 2,
      barcode: 'IGNORED',
      sourceName: 'po-a.pdf'
    }
  ]);

  assert.equal(labels.length, 2);
  assert.equal(labels[0].barcode, 'AB12CD34');
  assert.equal(labels[1].copyNumber, 2);
});
