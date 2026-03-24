import test from 'node:test';
import assert from 'node:assert/strict';
import { expandItemsToLabels, parsePOTextToItems } from '../utils/parsePO.js';

test('parsePOTextToItems parses line items and nearby barcode fallback', () => {
  const text = `
2 SKU123 Product Alpha 10.00 20.00
Barcode: BAR123
1 SKU999 Tape Roll 3.50 3.50
Barcode: XYZ999
  `;

  const items = parsePOTextToItems(text, 'po-a.pdf');

  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    sku: 'SKU123',
    productName: 'Product Alpha',
    quantity: 2,
    barcode: 'BAR123',
    sourceName: 'po-a.pdf'
  });
  assert.deepEqual(items[1], {
    sku: 'SKU999',
    productName: 'Tape Roll',
    quantity: 1,
    barcode: 'XYZ999',
    sourceName: 'po-a.pdf'
  });
});

test('parsePOTextToItems supports inline barcode pattern', () => {
  const text = '3 SKU777 Inline Item 9.99 29.97 Barcode: IN777';
  const items = parsePOTextToItems(text, 'po-b.pdf');

  assert.equal(items.length, 1);
  assert.equal(items[0].barcode, 'IN777');
  assert.equal(items[0].quantity, 3);
});

test('expandItemsToLabels creates one label per quantity', () => {
  const labels = expandItemsToLabels([
    {
      sku: 'SKU123',
      productName: 'Product Alpha',
      quantity: 2,
      barcode: 'BAR123',
      sourceName: 'po-a.pdf'
    },
    {
      sku: 'SKU999',
      productName: 'Tape Roll',
      quantity: 1,
      barcode: 'XYZ999',
      sourceName: 'po-a.pdf'
    }
  ]);

  assert.equal(labels.length, 3);
  assert.equal(labels[0].copyNumber, 1);
  assert.equal(labels[1].copyNumber, 2);
  assert.equal(labels[2].copyNumber, 1);
  assert.equal(labels[2].sku, 'SKU999');
});
