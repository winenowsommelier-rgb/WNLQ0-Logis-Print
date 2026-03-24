import test from 'node:test';
import assert from 'node:assert/strict';
import { expandItemsToLabels, parsePOTextToItems } from '../utils/parsePO.js';

test('parses PO table format Qty SKU Product and captures barcode/location/totals values', () => {
  const text = `
Qty SKU Product ราคา Discount Total
6 WRW5942GE 2:am Shiraz Barossa Valley ฿2,088 ฿12,528
Barcode: 9349386005751
Location: S12/2
Taxes ฿877
Grand total ฿13,405
`;

  const items = parsePOTextToItems(text, 'po-a.pdf');

  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    line_no: 1,
    qty: 6,
    quantity: 6,
    sku: 'WRW5942GE',
    product_name: '2:am Shiraz Barossa Valley',
    productName: '2:am Shiraz Barossa Valley',
    unit_price_thb: 2088,
    discount_thb: null,
    line_total_thb: 12528,
    barcode: '9349386005751',
    location: 'S12/2',
    sourceName: 'po-a.pdf'
  });
});

test('parses multiple table items and keeps row quantities', () => {
  const text = `
Qty SKU Product ราคา Discount Total
12 WSP1104BU Moet & Chandon Brut Imperial (750 ml) ฿3,622 ฿43,464
Barcode: 3185370001233
Location: S12/2
12 WSP1048BU Moet & Chandon Ice Imperial (750 ml) ฿3,798 ฿45,576
Barcode: 3185370457054
12 LBD0050BU Hennessy V.S.O.P (With Box) (700 ml) ฿2,658 ฿31,896
Barcode: 3245999484319
Location: S9
`;

  const items = parsePOTextToItems(text, 'po-multi.pdf');

  assert.equal(items.length, 3);
  assert.deepEqual(items.map((item) => item.sku), ['WSP1104BU', 'WSP1048BU', 'LBD0050BU']);
  assert.deepEqual(items.map((item) => item.quantity), [12, 12, 12]);
});

test('does not parse address/header lines as SKU rows', () => {
  const text = 'Purchase Order # PO-20260323-0034\nSupplier : SK Liquor\n198-198/1 Soi Sawang1';
  const items = parsePOTextToItems(text, 'po-c.pdf');

  assert.equal(items.length, 0);
});

test('expands labels strictly by qty and barcode uses SKU only', () => {
  const labels = expandItemsToLabels([
    {
      sku: 'WRW5942GE',
      productName: '2:am Shiraz Barossa Valley',
      quantity: 2,
      barcode: 'IGNORED',
      sourceName: 'po-a.pdf'
    }
  ]);

  assert.equal(labels.length, 2);
  assert.equal(labels[0].barcode, 'WRW5942GE');
  assert.equal(labels[1].copyNumber, 2);
});

test('parses column-split rows where qty and sku are on separate lines', () => {
  const text = `
Qty SKU Product
12
WSP1104BU
Moet & Chandon Brut Imperial (750 ml)
Barcode: 3185370001233
12
WSP1048BU
Moet & Chandon Ice Imperial (750 ml)
`;

  const items = parsePOTextToItems(text, 'po-split.pdf');

  assert.equal(items.length, 2);
  assert.deepEqual(items.map((item) => item.sku), ['WSP1104BU', 'WSP1048BU']);
  assert.deepEqual(items.map((item) => item.quantity), [12, 12]);
});
