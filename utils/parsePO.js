const SKU_REGEX = /^[A-Za-z0-9_-]{8,12}$/;
const TABLE_HEADER_REGEX = /\bqty\b\s+\bsku\b\s+\bproduct\b/i;
const IGNORE_LINE_REGEX = /(grand total|shipping|taxes|subtotal|purchase order|bill to|ship to|supplier|manager|order date|estimated delivery)/i;
const META_ITEM_LINE_REGEX = /^(barcode|location)\s*:/i;
const MAX_REASONABLE_QTY = 500;

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanProductName(raw) {
  return raw
    .replace(/\s+฿?[\d,]+(?:\.\d+)?(?:\s+฿?[\d,]+(?:\.\d+)?)*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildItem(sku, quantity, productName, sourceName) {
  return {
    sku,
    productName: productName || sku,
    quantity,
    barcode: sku,
    sourceName
  };
}

function parseQtySkuLine(line) {
  const match = line.match(/^(\d{1,4})\s+([A-Za-z0-9_-]{8,12})(?:\s+(.+))?$/);
  if (!match) {
    return null;
  }

  const quantity = Number.parseInt(match[1], 10);
  const sku = match[2];
  const productTail = cleanProductName(match[3] || "");

  if (!SKU_REGEX.test(sku) || !Number.isFinite(quantity) || quantity < 1 || quantity > MAX_REASONABLE_QTY) {
    return null;
  }

  return { quantity, sku, productTail };
}

function parseTableStyle(lines, sourceName) {
  const itemsMap = new Map();
  let inItemsSection = false;
  let current = null;

  const flushCurrent = () => {
    if (!current) {
      return;
    }

    const key = `${current.sku}|${current.productName || current.sku}`;
    const existing = itemsMap.get(key);
    if (existing) {
      existing.quantity += current.quantity;
    } else {
      itemsMap.set(key, buildItem(current.sku, current.quantity, current.productName, sourceName));
    }

    current = null;
  };

  for (const line of lines) {
    if (TABLE_HEADER_REGEX.test(line)) {
      inItemsSection = true;
      continue;
    }

    if (!inItemsSection) {
      continue;
    }

    if (IGNORE_LINE_REGEX.test(line)) {
      flushCurrent();
      continue;
    }

    const qtySku = parseQtySkuLine(line);
    if (qtySku) {
      flushCurrent();
      current = {
        sku: qtySku.sku,
        quantity: qtySku.quantity,
        productName: qtySku.productTail
      };
      continue;
    }

    if (!current || META_ITEM_LINE_REGEX.test(line)) {
      continue;
    }

    // Product continuation lines in multi-line PO rows.
    const continuation = cleanProductName(line);
    if (continuation) {
      current.productName = `${current.productName} ${continuation}`.trim();
    }
  }

  flushCurrent();
  return Array.from(itemsMap.values());
}

function parseFallback(lines, sourceName) {
  const itemsMap = new Map();

  for (const line of lines) {
    if (META_ITEM_LINE_REGEX.test(line) || IGNORE_LINE_REGEX.test(line)) {
      continue;
    }

    const tokens = line.split(" ");
    for (let i = 0; i < tokens.length - 1; i += 1) {
      const qtyToken = tokens[i];
      const skuToken = tokens[i + 1];
      if (!/^\d{1,4}$/.test(qtyToken) || !SKU_REGEX.test(skuToken)) {
        continue;
      }

      const quantity = Number.parseInt(qtyToken, 10);
      if (quantity < 1 || quantity > MAX_REASONABLE_QTY) {
        continue;
      }

      const productName = cleanProductName(tokens.slice(i + 2).join(" "));
      const key = `${skuToken}|${productName || skuToken}`;

      if (!itemsMap.has(key)) {
        itemsMap.set(key, buildItem(skuToken, quantity, productName, sourceName));
      }

      break;
    }
  }

  return Array.from(itemsMap.values());
}

export function parsePOTextToItems(text, sourceName = "unknown.pdf") {
  const lines = normalizeText(text);

  const tableItems = parseTableStyle(lines, sourceName);
  if (tableItems.length) {
    return tableItems;
  }

  return parseFallback(lines, sourceName);
}

export function expandItemsToLabels(items) {
  const labels = [];

  for (const item of items) {
    for (let copy = 0; copy < item.quantity; copy += 1) {
      labels.push({
        id: `${item.sourceName}-${item.sku}-${copy}`,
        sku: item.sku,
        productName: item.productName,
        barcode: item.sku,
        quantity: item.quantity,
        copyNumber: copy + 1,
        sourceName: item.sourceName
      });
    }
  }

  return labels;
}
