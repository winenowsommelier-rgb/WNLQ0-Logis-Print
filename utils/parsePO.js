const SKU_REGEX = /^(?=.*[A-Za-z])[A-Za-z0-9_-]{8,12}$/;
const QTY_REGEX = /^\d{1,4}$/;
const MONEY_REGEX = /^\d+\.\d{1,2}$/;

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function findSkuIndex(tokens) {
  return tokens.findIndex((token) => SKU_REGEX.test(token));
}

function parseQuantity(tokens, skuIndex) {
  const before = skuIndex > 0 ? tokens[skuIndex - 1] : null;
  const after = skuIndex + 1 < tokens.length ? tokens[skuIndex + 1] : null;

  if (before && QTY_REGEX.test(before)) {
    return Number.parseInt(before, 10);
  }

  if (after && QTY_REGEX.test(after)) {
    return Number.parseInt(after, 10);
  }

  // Fallback: for sku-first rows, qty often appears near the end before price/total.
  const afterSku = tokens.slice(skuIndex + 1);
  const moneyIndex = afterSku.findIndex((token) => MONEY_REGEX.test(token));
  const qtySearchTokens = moneyIndex >= 0 ? afterSku.slice(0, moneyIndex) : afterSku;

  for (let i = qtySearchTokens.length - 1; i >= 0; i -= 1) {
    if (QTY_REGEX.test(qtySearchTokens[i])) {
      return Number.parseInt(qtySearchTokens[i], 10);
    }
  }

  return 1;
}

function parseProductName(tokens, skuIndex) {
  const afterSku = tokens.slice(skuIndex + 1);

  // If PO row contains trailing price/total values, drop them from product name.
  let cutIndex = afterSku.length;
  for (let i = 0; i < afterSku.length - 1; i += 1) {
    if (MONEY_REGEX.test(afterSku[i]) && MONEY_REGEX.test(afterSku[i + 1])) {
      cutIndex = i;
      break;
    }
  }

  const productTokens = afterSku.slice(0, cutIndex);
  return productTokens.join(" ").trim();
}

export function parsePOTextToItems(text, sourceName = "unknown.pdf") {
  const lines = normalizeText(text);
  const items = [];

  for (const line of lines) {
    const tokens = line.split(" ");
    const skuIndex = findSkuIndex(tokens);

    if (skuIndex < 0) {
      continue;
    }

    const sku = tokens[skuIndex];
    const quantity = parseQuantity(tokens, skuIndex);
    const productName = parseProductName(tokens, skuIndex);

    if (!productName) {
      continue;
    }

    items.push({
      sku,
      productName,
      quantity,
      // Barcode for scanners must be SKU only.
      barcode: sku,
      sourceName
    });
  }

  return items;
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
