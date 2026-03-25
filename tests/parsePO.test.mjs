import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchValidation, expandItemsToLabels, parsePOTextToItems } from "../utils/parsePO.js";

test("parses quantity-first format: qty sku product price total", () => {
  const text = "2 AB12CD34 Premium Candle Gift Set 10.00 20.00";
  const items = parsePOTextToItems(text, "po-a.pdf");

  assert.equal(items.length, 1);
  assert.equal(items[0].sku, "AB12CD34");
  assert.equal(items[0].quantity, 2);
  assert.equal(items[0].productName, "Premium Candle Gift Set");
});

test("parses sku-first format: sku product qty price total", () => {
  const text = "ZX90LM12 Luxe Velvet Tray 3 9.99 29.97";
  const items = parsePOTextToItems(text, "po-b.pdf");

  assert.equal(items.length, 1);
  assert.equal(items[0].sku, "ZX90LM12");
  assert.equal(items[0].quantity, 3);
});

test("parses with money format variations ($, commas)", () => {
  const text = "5 SKU-99887 Wine Bottle Set $25.99 $129.95";
  const items = parsePOTextToItems(text, "po-c.pdf");

  assert.equal(items.length, 1);
  assert.equal(items[0].sku, "SKU-99887");
  assert.equal(items[0].quantity, 5);
});

test("skips lines without valid qty + sku combo", () => {
  const text = "INVALID_SKU Luxe Product 10.00 20.00\nSingleChar Product Data";
  const items = parsePOTextToItems(text, "po-d.pdf");

  assert.equal(items.length, 0);
});

test("expands labels strictly by parsed qty and barcode from item", () => {
  const labels = expandItemsToLabels([
    {
      sku: "AB12CD34",
      productName: "Product Alpha",
      quantity: 2,
      barcode: "AB12CD34",
      sourceName: "po-a.pdf"
    }
  ]);

  assert.equal(labels.length, 2);
  assert.equal(labels[0].barcode, "AB12CD34");
  assert.equal(labels[1].copyNumber, 2);
});

test("deduplicates duplicate sku+qty+productName combinations", () => {
  const text = `2 AB12CD34 Premium Candle 10.00 20.00
2 AB12CD34 Premium Candle 10.00 20.00
3 XY98CD21 Luxury Soap 5.99 17.97`;
  const items = parsePOTextToItems(text, "po-dup.pdf");

  assert.equal(items.length, 2);
  assert.equal(items[0].sku, "AB12CD34");
  assert.equal(items[1].sku, "XY98CD21");
});

test("parses the uploaded sample PO template and nearby barcode rows", () => {
  const text = `Purchase Order # PO-20230706-0001
Qty SKU Product ราคา Discount Total
12 WSP1104BU Moet & Chandon Brut Imperial (750 ml) ฿3,622 ฿43,464
Barcode: 3185370001233
Location: S12/2
12 WSP1048BU Moet & Chandon Ice Imperial (750 ml) ฿3,798 ฿45,576
Barcode: 3185370457054
12 LBD0050BU Hennessy V.S.O.P (With Box) (700 ml) ฿2,658 ฿31,896
Barcode: 3245999484319
Grand total ฿129,402`;

  const items = parsePOTextToItems(text, "sample-po.pdf");

  assert.equal(items.length, 3);
  assert.equal(items[0].sku, "WSP1104BU");
  assert.equal(items[0].barcode, "3185370001233");
  assert.equal(items[0].template, "qty-sku-product-price-total");
  assert.equal(items[2].productName, "Hennessy V.S.O.P (With Box) (700 ml)");
});

test("parses the raw pdf text order where price and total appear before sku", () => {
  const text = `12 ฿3,622 ฿43,464 WSP1104BU Moet & Chandon Brut Imperial (750 ml)
Barcode: 3185370001233`;

  const items = parsePOTextToItems(text, "raw-order.pdf");

  assert.equal(items.length, 1);
  assert.equal(items[0].sku, "WSP1104BU");
  assert.equal(items[0].template, "qty-price-total-sku-product");
});

test("rejects header rows that looked like fake sku matches in the confirmation table", () => {
  const text = `Order date : 24 มี.ค. 2026
Estimated delivery : 19 ก.ค. 2023
12 WSP1104BU Moet & Chandon Brut Imperial (750 ml) ฿3,622 ฿43,464
Barcode: 3185370001233
12 WSP1048BU Moet & Chandon Ice Imperial (750 ml) ฿3,798 ฿45,576
Barcode: 3185370457054
12 LBD0050BU Hennessy V.S.O.P (With Box) (700 ml) ฿2,658 ฿31,896
Barcode: 3245999484319`;

  const items = parsePOTextToItems(text, "headers-mixed.pdf");

  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((item) => item.sku),
    ["WSP1104BU", "WSP1048BU", "LBD0050BU"]
  );
});

test("rejects fallback parses when the item name collapses to the sku", () => {
  const text = "12 WSP1104BU";
  const items = parsePOTextToItems(text, "bad-name.pdf");

  assert.equal(items.length, 0);
});

test("builds validation warnings and template counts", () => {
  const items = [
    {
      sku: "WSP1104BU",
      productName: "Moet & Chandon Brut Imperial (750 ml)",
      quantity: 12,
      barcode: "3185370001233",
      sourceName: "sample-po.pdf",
      template: "qty-sku-product-price-total"
    },
    {
      sku: "WSP1048BU",
      productName: "Moet & Chandon Ice Imperial (750 ml)",
      quantity: 12,
      barcode: "WSP1048BU",
      sourceName: "sample-po.pdf",
      template: "qty-sku-product-price-total"
    }
  ];

  const validation = buildBatchValidation(items, ["sample-po.pdf"]);

  assert.equal(validation.itemsParsed, 2);
  assert.equal(validation.labelsToPrint, 24);
  assert.equal(validation.missingBarcodeCount, 1);
  assert.equal(validation.templates[0].name, "qty-sku-product-price-total");
  assert.match(validation.warnings[0], /fallback barcode/i);
});
