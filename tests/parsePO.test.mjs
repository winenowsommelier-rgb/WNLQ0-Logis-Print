import test from 'node:test';
import assert from 'node:assert/strict';
import { expandItemsToLabels, parsePOTextToItems } from '../utils/parsePO.js';

test('parsePOTextToItems parses qty-first line items and nearby barcode fallback', () => {
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
});

test('parsePOTextToItems supports sku-first table format', () => {
  const text = 'SKU777 Premium Candle Set 3 9.99 29.97 Barcode: IN777';
  const items = parsePOTextToItems(text, 'po-b.pdf');

  assert.equal(items.length, 1);
  assert.equal(items[0].sku, 'SKU777');
  assert.equal(items[0].quantity, 3);
  assert.equal(items[0].barcode, 'IN777');
});

test('parsePOTextToItems supports heuristic mixed line format', () => {
  const text = '4 AB12-CD Luxe Velvet Tray 24.00 96.00';
  const items = parsePOTextToItems(text, 'po-c.pdf');

  assert.equal(items.length, 1);
  assert.equal(items[0].sku, 'AB12-CD');
  assert.equal(items[0].quantity, 4);
  assert.equal(items[0].productName, 'Luxe Velvet Tray');
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
