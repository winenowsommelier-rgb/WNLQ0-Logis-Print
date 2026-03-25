const ITEM_LINE_REGEX =
  /^(\d+)\s+([A-Z0-9_-]{3,})\s+(.+?)\s+((?:[$฿])?\d+(?:,\d{3})*(?:\.\d{1,2})?)\s+((?:[$฿])?\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s+Barcode\s*:\s*([A-Za-z0-9-]+))?$/i;
const BARCODE_REGEX = /Barcode\s*:\s*([A-Za-z0-9-]+)/i;
const TEMPLATE_QTY_SKU_PRODUCT_PRICE_TOTAL = "qty-sku-product-price-total";
const TEMPLATE_QTY_PRICE_TOTAL_SKU_PRODUCT = "qty-price-total-sku-product";
const TEMPLATE_SKU_PRODUCT_QTY_PRICE_TOTAL = "sku-product-qty-price-total";

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isCurrencyToken(token) {
  return /^(?:[$฿])?\d+(?:,\d{3})*(?:\.\d{1,2})?$/.test(token);
}

function isLikelySku(token) {
  return /^[A-Z0-9_-]{3,20}$/i.test(token) && /[A-Z]/i.test(token) && /\d/.test(token);
}

function isHeaderOrSummaryLine(line) {
  return (
    /^(purchase order|supplier|manager|order date|estimated delivery|bill to|ship to|qty\s+sku\s+product|barcode:|location:|ราคาสินค้า|shipping & additional|taxes|grand total)/i.test(
      line
    ) || /\b(date|delivery)\s*:/i.test(line)
  );
}

function isUsableProductName(productName, sku) {
  if (!productName) {
    return false;
  }

  const normalizedProductName = productName.trim();
  if (!normalizedProductName || normalizedProductName === sku) {
    return false;
  }

  if (/^\d+(?:[./-]\d+)*$/.test(normalizedProductName)) {
    return false;
  }

  return /[A-Za-zก-๙]/.test(normalizedProductName);
}

function extractBarcode(lines, startIndex, fallbackKey) {
  for (let i = startIndex; i < Math.min(startIndex + 6, lines.length); i += 1) {
    const barcodeMatch = lines[i].match(BARCODE_REGEX);
    if (barcodeMatch) {
      return barcodeMatch[1];
    }
  }

  return fallbackKey;
}

function parseQtySkuProductPriceTotal(line) {
  const lineMatch = line.match(ITEM_LINE_REGEX);
  if (!lineMatch) {
    return null;
  }

  const [, qtyRaw, sku, productName, unitPrice, lineTotal, inlineBarcode] = lineMatch;
  const quantity = Number.parseInt(qtyRaw, 10);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return null;
  }

  return {
    sku,
    productName: productName.trim(),
    quantity,
    unitPrice,
    lineTotal,
    barcode: inlineBarcode || sku,
    template: TEMPLATE_QTY_SKU_PRODUCT_PRICE_TOTAL
  };
}

function parseQtyPriceTotalSkuProduct(line) {
  const match = line.match(
    /^(\d+)\s+((?:[$฿])?\d+(?:,\d{3})*(?:\.\d{1,2})?)\s+((?:[$฿])?\d+(?:,\d{3})*(?:\.\d{1,2})?)\s+([A-Z0-9_-]{3,20})\s+(.+)$/i
  );

  if (!match) {
    return null;
  }

  const [, qtyRaw, unitPrice, lineTotal, sku, productName] = match;
  const quantity = Number.parseInt(qtyRaw, 10);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return null;
  }

  return {
    sku,
    productName: productName.trim(),
    quantity,
    unitPrice,
    lineTotal,
    barcode: sku,
    template: TEMPLATE_QTY_PRICE_TOTAL_SKU_PRODUCT
  };
}

function parseSkuProductQtyPriceTotal(line) {
  const tokens = line.split(/\s+/);
  if (tokens.length < 5 || !isLikelySku(tokens[0])) {
    return null;
  }

  const quantityIndex = tokens.findIndex(
    (token, index) =>
      index > 0 &&
      /^\d{1,4}$/.test(token) &&
      isCurrencyToken(tokens[index + 1] ?? "") &&
      isCurrencyToken(tokens[index + 2] ?? "")
  );

  if (quantityIndex < 0) {
    return null;
  }

  const quantity = Number.parseInt(tokens[quantityIndex], 10);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return null;
  }

  const productName = tokens.slice(1, quantityIndex).join(" ").trim();
  if (!isUsableProductName(productName, tokens[0])) {
    return null;
  }

  return {
    sku: tokens[0],
    productName,
    quantity,
    unitPrice: tokens[quantityIndex + 1],
    lineTotal: tokens[quantityIndex + 2],
    barcode: tokens[0],
    template: TEMPLATE_SKU_PRODUCT_QTY_PRICE_TOTAL
  };
}

function parseFlexibleLine(line) {
  const tokens = line.split(/\s+/);
  if (tokens.length < 3) {
    return null;
  }

  const quantityIndex = tokens.findIndex((token) => /^\d{1,4}$/.test(token));
  const skuIndex = tokens.findIndex((token) => isLikelySku(token));

  if (quantityIndex < 0 || skuIndex < 0 || quantityIndex === skuIndex) {
    return null;
  }

  const quantity = Number.parseInt(tokens[quantityIndex], 10);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return null;
  }

  const rightSideTokens = tokens.slice(Math.max(quantityIndex, skuIndex) + 1);
  const trailingMoneyCount = rightSideTokens.filter(isCurrencyToken).length;
  const productEnd = trailingMoneyCount >= 2 ? tokens.length - 2 : tokens.length;
  const productStart = Math.min(quantityIndex, skuIndex) + 1;
  const productName = tokens.slice(productStart, productEnd).join(" ").trim();

  if (!isUsableProductName(productName, tokens[skuIndex])) {
    return null;
  }

  return {
    sku: tokens[skuIndex],
    productName,
    quantity,
    barcode: tokens[skuIndex],
    template: "flexible-fallback"
  };
}

function parseLineItem(line) {
  if (isHeaderOrSummaryLine(line)) {
    return null;
  }

  return (
    parseQtySkuProductPriceTotal(line) ||
    parseQtyPriceTotalSkuProduct(line) ||
    parseSkuProductQtyPriceTotal(line) ||
    parseFlexibleLine(line)
  );
}

export function parsePOTextToItems(text, sourceName = "unknown.pdf") {
  const lines = normalizeText(text);
  const items = [];
  const seen = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseLineItem(lines[index]);

    if (!parsed) {
      continue;
    }

    const barcode = extractBarcode(lines, index, parsed.barcode);
    const dedupeKey = `${parsed.sku}|${parsed.quantity}|${parsed.productName}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);

    items.push({
      sku: parsed.sku,
      productName: parsed.productName,
      quantity: parsed.quantity,
      barcode,
      sourceName,
      template: parsed.template,
      unitPrice: parsed.unitPrice ?? null,
      lineTotal: parsed.lineTotal ?? null
    });
  }

  console.log(`[${sourceName}] Parsed ${items.length} items from ${lines.length} lines`);
  return items;
}

export function expandItemsToLabels(items) {
  const labels = [];

  for (const item of items) {
    for (let copy = 0; copy < item.quantity; copy += 1) {
      labels.push({
        id: `${item.sourceName}-${item.sku}-${item.barcode}-${copy}`,
        sku: item.sku,
        productName: item.productName,
        barcode: item.barcode,
        quantity: item.quantity,
        copyNumber: copy + 1,
        sourceName: item.sourceName
      });
    }
  }

  return labels;
}

export function buildBatchValidation(items, files = []) {
  const missingBarcodeCount = items.filter((item) => !item.barcode || item.barcode === item.sku).length;
  const templates = Object.entries(
    items.reduce((accumulator, item) => {
      accumulator[item.template] = (accumulator[item.template] ?? 0) + 1;
      return accumulator;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  const warnings = [];

  if (!items.length && files.length) {
    warnings.push("No line items were extracted from the uploaded PDF(s).");
  }

  if (missingBarcodeCount) {
    warnings.push(
      `${missingBarcodeCount} item(s) are using the SKU as a fallback barcode because no nearby Barcode field was found.`
    );
  }

  return {
    filesProcessed: files.length,
    itemsParsed: items.length,
    labelsToPrint: items.reduce((sum, item) => sum + item.quantity, 0),
    missingBarcodeCount,
    templates,
    warnings
  };
}
