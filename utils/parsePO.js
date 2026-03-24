const SKU_REGEX = /^(?=.*[A-Za-z])[A-Za-z0-9_-]{8,12}$/;
const QTY_REGEX = /^\d{1,4}$/;
const MONEY_REGEX = /^\d+\.\d{1,2}$/;
const MAX_REASONABLE_QTY = 500;

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

function findQuantity(tokens, skuIndex) {
  const qtyCandidates = [];

  // Strong candidates: immediate neighbors.
  const before = tokens[skuIndex - 1];
  const after = tokens[skuIndex + 1];
  if (before && QTY_REGEX.test(before)) {
    qtyCandidates.push({ score: 3, value: Number.parseInt(before, 10) });
  }
  if (after && QTY_REGEX.test(after)) {
    qtyCandidates.push({ score: 3, value: Number.parseInt(after, 10) });
  }

  // Secondary candidates: near SKU and before price columns.
  const moneyIndex = tokens.findIndex((token) => MONEY_REGEX.test(token));
  for (let i = 0; i < tokens.length; i += 1) {
    if (!QTY_REGEX.test(tokens[i])) {
      continue;
    }

    const value = Number.parseInt(tokens[i], 10);
    if (value < 1 || value > MAX_REASONABLE_QTY) {
      continue;
    }

    const distance = Math.abs(i - skuIndex);
    const beforePrices = moneyIndex < 0 || i < moneyIndex;
    if (distance <= 6 && beforePrices) {
      qtyCandidates.push({ score: 2, value });
    }
  }

  if (!qtyCandidates.length) {
    return null;
  }

  qtyCandidates.sort((a, b) => b.score - a.score);
  return qtyCandidates[0].value;
}

function parseProductName(tokens, skuIndex) {
  const afterSku = tokens.slice(skuIndex + 1);

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
  const seen = new Set();
  const items = [];

  for (const line of lines) {
    const tokens = line.split(" ");
    const skuIndex = findSkuIndex(tokens);

    if (skuIndex < 0) {
      continue;
    }

    const sku = tokens[skuIndex];
    const quantity = findQuantity(tokens, skuIndex);
    if (!quantity) {
      continue;
    }

    const productName = parseProductName(tokens, skuIndex);
    const dedupeKey = `${sku}|${quantity}|${productName}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);

    items.push({
      sku,
      productName: productName || sku,
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
