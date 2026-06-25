(function () {
  'use strict';

  var api = window.MMC_API;
  var cache = window.MMC_CACHE;
  var products = [];
  var sales = [];
  var selectedProduct = null;
  var saleCart = [];
  var currentVoucherSale = null;
  var barcodeScannerStream = null;
  var barcodeScannerTimer = null;
  var barcodeDetector = null;
  var zxingReader = null;
  var zxingScannerControls = null;
  var barcodeScannerStarting = false;
  var OFFLINE_SALES_KEY = 'mmc_offline_sales_queue';
  var shopSettings = {
    shop_name: '',
    currency: 'MMK'
  };
  var SALES_COLUMN_COUNT = 9;

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var element = byId(id);

    if (element) {
      element.textContent = value;
    }
  }

  function setMessage(message, type) {
    var element = byId('saleMessage');

    if (!element) {
      return;
    }

    element.textContent = message || '';
    element.classList.remove('is-success', 'is-warning', 'is-danger');

    if (type) {
      element.classList.add(type);
    }
  }

  function clearElement(element) {
    while (element && element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function toNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function cleanOptionName(value) {
    return String(value === undefined || value === null ? '' : value).trim();
  }

  function toVariantQuantity(value) {
    var quantity = toNumber(value);
    return quantity >= 0 ? quantity : 0;
  }

  function parseVariantTextOption(value) {
    var text = cleanOptionName(value);
    var match;

    if (!text) {
      return {
        name: '',
        quantity: 0
      };
    }

    match = text.match(/^(.+?)\s*(?:-|:|=|x|X)\s*(\d+(?:\.\d+)?)\s*(?:ခု|pcs?|items?)?\s*$/i);

    if (!match) {
      return {
        name: text,
        quantity: 0
      };
    }

    return {
      name: cleanOptionName(match[1]),
      quantity: toVariantQuantity(match[2])
    };
  }

  function normalizeVariantOptions(options) {
    var normalized = [];

    if (!Array.isArray(options)) {
      return normalized;
    }

    options.forEach(function (option) {
      var legacyOption = typeof option === 'string' ? parseVariantTextOption(option) : null;
      var name = legacyOption ? legacyOption.name : option && option.name;
      var cleanName = cleanOptionName(name);
      var quantity = legacyOption ? legacyOption.quantity : toVariantQuantity(option && option.quantity);

      if (!cleanName) {
        return;
      }

      normalized.push({
        name: cleanName,
        active: !(option && option.active === false),
        quantity: quantity
      });
    });

    return normalized;
  }

  function parseVariantOptions(value) {
    var text;
    var parsed;

    if (Array.isArray(value)) {
      return normalizeVariantOptions(value);
    }

    text = cleanOptionName(value);

    if (!text) {
      return [];
    }

    if (text.charAt(0) === '[') {
      try {
        parsed = JSON.parse(text);
        return normalizeVariantOptions(parsed);
      } catch (error) {
        return normalizeVariantOptions([text]);
      }
    }

    return normalizeVariantOptions(text.split(/[\n,]+/));
  }

  function serializeVariantOptions(options) {
    var normalized = normalizeVariantOptions(options);
    return normalized.length ? JSON.stringify(normalized) : '';
  }

  function getActiveVariantOptions(value) {
    return parseVariantOptions(value).filter(function (option) {
      return option.active && toNumber(option.quantity) > 0;
    });
  }

  function getActiveVariantLabels(value) {
    return getActiveVariantOptions(value).map(function (option) {
      return option.name + ' - ' + formatNumber(option.quantity) + ' ခု';
    });
  }

  function variantSearchText(value) {
    return parseVariantOptions(value).map(function (option) {
      return option.name;
    }).join(' ');
  }

  function formatActiveVariants(label, value) {
    var labels = getActiveVariantLabels(value);
    return labels.length ? label + ' ' + labels.join(', ') : '';
  }

  function getCachedProducts() {
    return cache && typeof cache.getProducts === 'function' ? cache.getProducts() : [];
  }

  function setCachedProducts(list) {
    if (cache && typeof cache.setProducts === 'function') {
      cache.setProducts(list);
    }
  }

  function getCachedSales() {
    return cache && typeof cache.getSales === 'function' ? cache.getSales() : [];
  }

  function setCachedSales(list) {
    if (cache && typeof cache.setSales === 'function') {
      cache.setSales(list);
    }
  }

  function renderCachedProducts() {
    var cachedProducts = getCachedProducts();

    if (!cachedProducts.length) {
      return false;
    }

    products = cachedProducts;
    renderSaleCategoryFilter();
    renderProductOptions();
    handleProductChange();
    return true;
  }

  function renderCachedSales() {
    var cachedSales = getCachedSales();

    if (!cachedSales.length) {
      return false;
    }

    sales = cachedSales;
    renderSalesTable();
    summarizeToday();
    return true;
  }

  function formatNumber(value) {
    return toNumber(value).toLocaleString('en-US', {
      maximumFractionDigits: 2
    });
  }

  function getCurrency() {
    return cleanOptionName(shopSettings.currency) || 'MMK';
  }

  function formatMoney(value) {
    return formatNumber(value) + ' ' + getCurrency();
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getShopName() {
    var shopNameElement = byId('shopName');
    var shopName = cleanOptionName(shopSettings.shop_name);
    var displayedShopName = cleanOptionName(shopNameElement ? shopNameElement.textContent : '');

    if (shopName) {
      return shopName;
    }

    if (displayedShopName && displayedShopName !== 'ဆိုင်အမည်') {
      return displayedShopName;
    }

    return 'ဆိုင်အမည်';
  }

  function getSaleCustomerName() {
    var input = byId('saleCustomerName');
    return cleanOptionName(input ? input.value : '');
  }

  function getSelectedPaymentMethod() {
    var select = byId('salePaymentMethod');
    return cleanOptionName(select ? select.value : '') || 'Cash';
  }

  function getSalePaymentMethod(sale) {
    var method = cleanOptionName(sale && (sale.payment_method || sale.payment || sale.pay_method));
    return method || 'Cash';
  }

  function applyShopSettings(settings) {
    settings = settings || {};
    shopSettings.shop_name = cleanOptionName(settings.shop_name) || shopSettings.shop_name;
    shopSettings.currency = cleanOptionName(settings.currency) || shopSettings.currency;

    if (currentVoucherSale) {
      renderSaleVoucher(currentVoucherSale);
    }
  }

  function getSaleTotalIncome(sale) {
    var totalIncome = toNumber(sale && sale.total_income);

    if (totalIncome > 0) {
      return totalIncome;
    }

    return getSaleSubtotal(sale) - getSaleDiscountAmount(sale) + getSaleTaxAmount(sale);
  }

  function getSaleSubtotal(sale) {
    return toNumber(sale && sale.sell_price) * toNumber(sale && sale.sold_quantity);
  }

  function getSaleDiscountAmount(sale) {
    var discountAmount = toNumber(sale && sale.discount_amount);

    if (discountAmount > 0) {
      return discountAmount;
    }

    return getSaleSubtotal(sale) * (toNumber(sale && sale.discount_percent) / 100);
  }

  function getSaleTaxAmount(sale) {
    var taxAmount = toNumber(sale && sale.tax_amount);

    if (taxAmount > 0) {
      return taxAmount;
    }

    return (getSaleSubtotal(sale) - getSaleDiscountAmount(sale)) * (toNumber(sale && sale.tax_percent) / 100);
  }

  function getSaleTotalCost(sale) {
    var totalCost = toNumber(sale && sale.total_cost);

    if (totalCost > 0) {
      return totalCost;
    }

    return toNumber(sale && sale.buy_price) * toNumber(sale && sale.sold_quantity);
  }

  function getSaleProfit(sale) {
    var profit = toNumber(sale && sale.profit);

    if (profit !== 0) {
      return profit;
    }

    return getSaleSubtotal(sale) - getSaleDiscountAmount(sale) - getSaleTotalCost(sale);
  }

  function createVoucherGroup(items, voucherId, customerName) {
    var list = Array.isArray(items) ? items.filter(Boolean) : [];
    var firstSale = list[0] || {};
    var voucherCustomerName = cleanOptionName(customerName) || cleanOptionName(firstSale.customer_name);
    var voucherPaymentMethod = getSalePaymentMethod(firstSale);

    if (!voucherCustomerName) {
      list.some(function (sale) {
        voucherCustomerName = cleanOptionName(sale.customer_name);
        return Boolean(voucherCustomerName);
      });
    }

    if (!voucherPaymentMethod) {
      list.some(function (sale) {
        voucherPaymentMethod = getSalePaymentMethod(sale);
        return Boolean(voucherPaymentMethod);
      });
    }

    return {
      voucher_id: voucherId || cleanOptionName(firstSale.voucher_id) || cleanOptionName(firstSale.sale_id) || ('V-' + Date.now()),
      sale_date: cleanOptionName(firstSale.sale_date) || todayString(),
      customer_name: voucherCustomerName,
      payment_method: voucherPaymentMethod || 'Cash',
      created_at: new Date().toISOString(),
      items: list
    };
  }

  function normalizeVoucher(value) {
    if (Array.isArray(value)) {
      return createVoucherGroup(value);
    }

    if (value && Array.isArray(value.items)) {
      return createVoucherGroup(value.items, value.voucher_id, value.customer_name);
    }

    return createVoucherGroup(value ? [value] : []);
  }

  function getVoucherTotals(voucherInput) {
    var voucher = normalizeVoucher(voucherInput);
    var totals = {
      quantity: 0,
      total_cost: 0,
      subtotal: 0,
      discount_amount: 0,
      tax_amount: 0,
      total_income: 0,
      profit: 0
    };

    voucher.items.forEach(function (sale) {
      totals.quantity += toNumber(sale.sold_quantity);
      totals.total_cost += getSaleTotalCost(sale);
      totals.subtotal += getSaleSubtotal(sale);
      totals.discount_amount += getSaleDiscountAmount(sale);
      totals.tax_amount += getSaleTaxAmount(sale);
      totals.total_income += getSaleTotalIncome(sale);
      totals.profit += getSaleProfit(sale);
    });

    return totals;
  }

  function getVoucherFileName(voucherInput) {
    var voucher = normalizeVoucher(voucherInput);
    var saleId = cleanOptionName(voucher.voucher_id) || 'sale';
    var saleDate = cleanOptionName(voucher.sale_date) || todayString();

    return ('voucher-' + saleDate + '-' + saleId)
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-');
  }

  function getSaleVariantText(sale) {
    var variantParts = [];

    if (sale.sale_color) {
      variantParts.push('အရောင်: ' + sale.sale_color);
    }

    if (sale.sale_size) {
      variantParts.push('အရွယ်အစား: ' + sale.sale_size);
    }

    return variantParts.length ? variantParts.join(' | ') : 'အရောင် / အရွယ်အစား မရှိပါ';
  }

  function buildVoucherRows(items) {
    return items.map(function (sale, index) {
      return [
        '<tr>',
        '<td>',
        '<div class="voucher-item-cell">',
        '<div>',
        '<strong>' + escapeHtml(sale.product_name || '-') + '</strong>',
        '<span>' + escapeHtml(sale.product_id || '-') + '</span>',
        '<small>' + escapeHtml(getSaleVariantText(sale)) + '</small>',
        '</div>',
        '</div>',
        '</td>',
        '<td>' + escapeHtml(formatNumber(sale.sold_quantity)) + '</td>',
        '<td>' + escapeHtml(formatMoney(sale.sell_price)) + '</td>',
        '<td>' + escapeHtml(formatMoney(getSaleTaxAmount(sale))) + '</td>',
        '<td>' + escapeHtml(formatMoney(getSaleTotalIncome(sale))) + '</td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  function buildVoucherMarkup(voucherInput) {
    var voucher = normalizeVoucher(voucherInput);
    var totals = getVoucherTotals(voucher);
    var firstSale = voucher.items[0] || {};

    return [
      '<div class="voucher-brand">',
      '<strong>' + escapeHtml(getShopName()) + '</strong>',
      '<span>ရောင်းချမှုဘောင်ချာ</span>',
      '</div>',
      '<div class="voucher-meta-grid">',
      '<div><span>ဘောင်ချာနံပါတ်</span><strong>' + escapeHtml(voucher.voucher_id || '-') + '</strong></div>',
      '<div><span>ရက်စွဲ</span><strong>' + escapeHtml(voucher.sale_date || firstSale.sale_date || '-') + '</strong></div>',
      voucher.customer_name ? '<div><span>ဖောက်သည်</span><strong>' + escapeHtml(voucher.customer_name) + '</strong></div>' : '',
      '<div><span>Payment</span><strong>' + escapeHtml(voucher.payment_method || 'Cash') + '</strong></div>',
      '<div><span>ပစ္စည်းအရေအတွက်</span><strong>' + escapeHtml(formatNumber(voucher.items.length)) + '</strong></div>',
      '<div><span>စုစုပေါင်းအရေအတွက်</span><strong>' + escapeHtml(formatNumber(totals.quantity)) + '</strong></div>',
      '</div>',
      '<div class="voucher-table-scroll">',
      '<table class="voucher-table">',
      '<thead><tr><th>ပစ္စည်း</th><th>အရေအတွက်</th><th>ဈေး</th><th>အခွန်</th><th>စုစုပေါင်း</th></tr></thead>',
      '<tbody>',
      buildVoucherRows(voucher.items),
      '</tbody>',
      '</table>',
      '</div>',
      '<div class="voucher-total-grid">',
      '<div><span>Subtotal</span><strong>' + escapeHtml(formatMoney(totals.subtotal)) + '</strong></div>',
      '<div><span>Discount</span><strong>' + escapeHtml(formatMoney(totals.discount_amount)) + '</strong></div>',
      '<div><span>အခွန်</span><strong>' + escapeHtml(formatMoney(totals.tax_amount)) + '</strong></div>',
      '<div><span>ပစ္စည်းအရေအတွက်</span><strong>' + escapeHtml(formatNumber(totals.quantity)) + '</strong></div>',
      '</div>',
      '<div class="voucher-total"><span>ကျသင့်ငွေ</span><strong>' + escapeHtml(formatMoney(totals.total_income)) + '</strong></div>',
      '<p class="voucher-thanks">ဝယ်ယူအားပေးမှုအတွက် ကျေးဇူးတင်ပါသည်။</p>'
    ].join('');
  }

  function buildVoucherDocument(voucherInput) {
    var voucher = normalizeVoucher(voucherInput);

    return [
      '<!DOCTYPE html>',
      '<html lang="my">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<meta name="referrer" content="no-referrer">',
      '<meta http-equiv="Content-Security-Policy" content="default-src ' + "'none'" + '; style-src ' + "'unsafe-inline'" + '; img-src data:; base-uri ' + "'none'" + '; form-action ' + "'none'" + '">',
      '<title>ဘောင်ချာ - ' + escapeHtml(voucher.voucher_id || '') + '</title>',
      '<style>',
      'body{margin:0;padding:18px;background:#eef4f8;color:#111827;font-family:"Myanmar Text","Noto Sans Myanmar",Arial,sans-serif;font-size:13px;line-height:1.5;}',
      '.sale-voucher{width:min(100%,170mm);margin:0 auto;padding:18px;background:#fff;border:1px solid #d7dde5;border-radius:8px;box-shadow:0 16px 40px rgba(15,23,42,.12);box-sizing:border-box;overflow:hidden}',
      '.voucher-brand{text-align:center;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #1f6feb}.voucher-brand strong{display:block;font-size:22px;line-height:1.2}.voucher-brand span{color:#111827;font-weight:800}',
      '.voucher-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.voucher-meta-grid div,.voucher-total-grid div{padding:8px;border:1px solid #d7dde5;border-radius:6px;background:#f8fafc}.voucher-meta-grid span,.voucher-total-grid span{display:block;color:#111827;font-size:11px;font-weight:800}.voucher-meta-grid strong,.voucher-total-grid strong{display:block;overflow-wrap:anywhere;color:#000}',
      '.voucher-table-scroll{width:100%;max-width:100%;overflow-x:auto;border:1px solid #d7dde5;border-radius:6px}.voucher-table{width:100%;min-width:0;max-width:100%;table-layout:fixed;border-collapse:collapse}.voucher-table th,.voucher-table td{box-sizing:border-box;padding:8px;border-bottom:1px solid #d7dde5;text-align:left;vertical-align:top;color:#000;white-space:normal;overflow-wrap:anywhere}.voucher-table th{background:#eef3f8;font-size:11px;text-transform:uppercase}.voucher-table th:nth-child(1),.voucher-table td:nth-child(1){width:42%}.voucher-table th:nth-child(2),.voucher-table td:nth-child(2){width:10%}.voucher-table th:nth-child(3),.voucher-table td:nth-child(3),.voucher-table th:nth-child(4),.voucher-table td:nth-child(4),.voucher-table th:nth-child(5),.voucher-table td:nth-child(5){width:16%;text-align:right;font-weight:800;white-space:nowrap;word-break:normal;overflow-wrap:normal}.voucher-item-cell{display:block}.voucher-item-cell strong,.voucher-item-cell span,.voucher-item-cell small{display:block;overflow-wrap:anywhere}.voucher-item-cell span,.voucher-item-cell small{color:#111827;font-size:11px;font-weight:700}.voucher-total-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.voucher-total{display:flex;justify-content:space-between;gap:12px;margin-top:10px;padding:12px;background:#111827;color:#fff;border-radius:8px;font-size:18px;font-weight:900}.voucher-total strong{color:#fff}.voucher-thanks{text-align:center;color:#111827;font-weight:800}',
      '@media print{body{padding:0;background:#fff}.sale-voucher{width:148mm;border:0;border-radius:0;box-shadow:none}.voucher-table-scroll{overflow:visible}.voucher-table{min-width:0}}',
      '</style>',
      '</head>',
      '<body>',
      '<main class="sale-voucher">',
      buildVoucherMarkup(voucher),
      '</main>',
      '</body>',
      '</html>'
    ].join('');
  }

  function todayString() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');

    return now.getFullYear() + '-' + month + '-' + day;
  }

  function findProduct(productId) {
    return products.find(function (product) {
      return product.product_id === productId;
    }) || null;
  }

  function setCellLabel(cell, label) {
    cell.setAttribute('data-label', label);
    return cell;
  }

  function createCell(text, label) {
    var cell = document.createElement('td');
    cell.textContent = text === undefined || text === null ? '' : String(text);
    return label ? setCellLabel(cell, label) : cell;
  }

  function createSaleItemsCell(items) {
    var cell = document.createElement('td');
    var grouped = {};
    var list = document.createElement('div');

    list.className = 'sale-id-list';

    (items || []).forEach(function (sale) {
      var productId = cleanOptionName(sale.product_id) || '-';
      grouped[productId] = (grouped[productId] || 0) + toNumber(sale.sold_quantity);
    });

    Object.keys(grouped).forEach(function (productId) {
      var item = document.createElement('span');
      item.textContent = productId + ' x ' + formatNumber(grouped[productId]);
      list.appendChild(item);
    });

    if (!list.children.length) {
      list.textContent = '-';
    }

    cell.appendChild(list);
    return setCellLabel(cell, 'Product IDs');
  }

  function createEmptyRow(message) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');

    cell.colSpan = SALES_COLUMN_COUNT;
    cell.textContent = message;
    row.appendChild(cell);

    return row;
  }

  function createLoadingRow(message) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    var loading = document.createElement('span');

    cell.colSpan = SALES_COLUMN_COUNT;
    loading.className = 'loading-state';
    loading.textContent = message;
    cell.appendChild(loading);
    row.appendChild(cell);

    return row;
  }

  function createImageCell(imageUrl, altText, labelText) {
    var cell = document.createElement('td');
    var image;
    var placeholder;

    if (!imageUrl) {
      placeholder = document.createElement('span');
      placeholder.className = 'image-placeholder';
      placeholder.textContent = '-';
      cell.appendChild(placeholder);
      return labelText ? setCellLabel(cell, labelText) : cell;
    }

    image = document.createElement('img');
    image.className = 'item-thumb';
    image.src = imageUrl;
    image.alt = altText || 'ကုန်ပစ္စည်းပုံ';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.onerror = function () {
      image.replaceWith(document.createTextNode('-'));
    };
    cell.appendChild(image);

    return labelText ? setCellLabel(cell, labelText) : cell;
  }

  function getProductImageUrl(productId) {
    var product = findProduct(productId);
    return product ? product.image_src || product.image_url || '' : '';
  }

  function getSaleProductSearchQuery() {
    var input = byId('saleProductSearch');
    return input ? input.value.trim().toLowerCase() : '';
  }

  function getSaleBarcodeSearchQuery() {
    var input = byId('saleBarcodeSearch');
    return input ? input.value.trim().toLowerCase() : '';
  }

  function getSaleCategoryFilterValue() {
    var input = byId('saleCategoryFilter');
    return input ? input.value.trim().toLowerCase() : '';
  }

  function getProductSearchText(product) {
    return [
      product.product_id,
      product.barcode,
      product.product_name,
      product.category,
      variantSearchText(product.color),
      variantSearchText(product.size),
      product.expiry_date,
      product.image_name
    ].join(' ').toLowerCase();
  }

  function getFilteredSaleProducts() {
    var query = getSaleProductSearchQuery();
    var category = getSaleCategoryFilterValue();

    return products.filter(function (product) {
      var matchesQuery = !query || getProductSearchText(product).indexOf(query) !== -1;
      var matchesCategory = !category || String(product.category || '').trim().toLowerCase() === category;
      return matchesQuery && matchesCategory;
    });
  }

  function renderSaleCategoryFilter() {
    var select = byId('saleCategoryFilter');
    var currentValue = select ? select.value : '';
    var categories;
    var defaultOption;

    if (!select) {
      return;
    }

    categories = products.map(function (product) {
      return cleanOptionName(product.category);
    }).filter(Boolean).filter(function (value, index, list) {
      return list.indexOf(value) === index;
    }).sort(function (first, second) {
      return first.localeCompare(second);
    });

    clearElement(select);
    defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'All Categories';
    select.appendChild(defaultOption);

    categories.forEach(function (category) {
      var option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });

    if (currentValue && categories.some(function (category) {
      return category === currentValue;
    })) {
      select.value = currentValue;
    }
  }

  function findProductByBarcode(code) {
    var target = cleanOptionName(code).toLowerCase();

    if (!target) {
      return null;
    }

    return products.find(function (product) {
      return cleanOptionName(product.barcode).toLowerCase() === target ||
        cleanOptionName(product.product_id).toLowerCase() === target;
    }) || null;
  }

  function selectProduct(product) {
    var productSelect = byId('saleProduct');

    if (!product || !productSelect) {
      return false;
    }

    renderProductOptions();
    productSelect.value = product.product_id;
    handleProductChange();
    return true;
  }

  function getVoucherDialog() {
    return byId('saleVoucherDialog');
  }

  function openDialog(dialog) {
    if (!dialog) {
      return;
    }

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }

    dialog.setAttribute('open', 'open');
  }

  function closeDialog(dialog) {
    if (!dialog) {
      return;
    }

    if (typeof dialog.close === 'function') {
      dialog.close();
      return;
    }

    dialog.removeAttribute('open');
  }

  function renderSaleVoucher(sale) {
    var voucher = byId('saleVoucher');

    if (!voucher || !sale) {
      return;
    }

    voucher.innerHTML = buildVoucherMarkup(sale);
  }

  function showSaleVoucher(sale) {
    currentVoucherSale = sale || null;

    if (!currentVoucherSale) {
      return;
    }

    renderSaleVoucher(currentVoucherSale);
    openDialog(getVoucherDialog());
  }

  function closeSaleVoucher() {
    closeDialog(getVoucherDialog());
  }

  function printSaleVoucher() {
    if (!currentVoucherSale) {
      return;
    }

    renderSaleVoucher(currentVoucherSale);
    document.body.classList.add('is-printing-voucher');

    window.setTimeout(function () {
      window.print();
      window.setTimeout(finishPrintingVoucher, 1200);
    }, 60);
  }

  function finishPrintingVoucher() {
    document.body.classList.remove('is-printing-voucher');
  }

  function downloadSaleVoucher() {
    var blob;
    var url;
    var link;

    if (!currentVoucherSale) {
      return;
    }

    blob = new Blob([buildVoucherDocument(currentVoucherSale)], {
      type: 'text/html;charset=utf-8'
    });
    url = window.URL.createObjectURL(blob);
    link = document.createElement('a');
    link.href = url;
    link.download = getVoucherFileName(currentVoucherSale) + '.html';
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(function () {
      window.URL.revokeObjectURL(url);
    }, 500);
  }

  function getSaleItemViewText(item, index) {
    return [
      (index + 1) + '. ' + (item.product_name || item.product_id || '-'),
      'ID: ' + (item.product_id || '-'),
      getSaleVariantText(item),
      'Qty: ' + formatNumber(item.sold_quantity),
      'Price: ' + formatMoney(item.sell_price),
      'Total: ' + formatMoney(getSaleTotalIncome(item))
    ].join(' | ');
  }

  function openSaleView(sale) {
    var voucher = normalizeVoucher(sale);
    var totals = getVoucherTotals(voucher);

    if (!window.MMC_TABLE_VIEW) {
      return;
    }

    window.MMC_TABLE_VIEW.open('ရောင်းချမှုအသေးစိတ် - ' + (voucher.voucher_id || '-'), [
      {
        title: 'ရောင်းချမှုအချက်အလက်',
        fields: [
          { label: 'Sale ID', value: voucher.voucher_id || '-' },
          { label: 'ရက်စွဲ', value: voucher.sale_date || '-' },
          { label: 'ဖောက်သည်', value: voucher.customer_name || '-' },
          { label: 'Payment', value: voucher.payment_method || 'Cash' },
          { label: 'ပစ္စည်းအရေအတွက်', value: formatNumber(totals.quantity) },
          { label: 'Subtotal', value: formatMoney(totals.subtotal) },
          { label: 'Discount', value: formatMoney(totals.discount_amount) },
          { label: 'Tax', value: formatMoney(totals.tax_amount) },
          { label: 'စုစုပေါင်းဝင်ငွေ', value: formatMoney(totals.total_income) },
          { label: 'အမြတ်', value: formatMoney(totals.profit) }
        ]
      },
      {
        title: 'ပစ္စည်းများ',
        fields: [
          { label: 'Items', value: voucher.items.map(getSaleItemViewText) }
        ]
      }
    ]);
  }

  function createVoucherCell(sale) {
    var cell = document.createElement('td');
    var actions = document.createElement('div');
    var voucherButton = document.createElement('button');

    actions.className = 'table-actions';

    if (window.MMC_TABLE_VIEW && typeof window.MMC_TABLE_VIEW.createViewButton === 'function') {
      actions.appendChild(window.MMC_TABLE_VIEW.createViewButton(function () {
        openSaleView(sale);
      }, 'ကြည့်ရန်'));
    }

    voucherButton.className = 'small-button icon-voucher';
    voucherButton.type = 'button';
    voucherButton.textContent = 'ဘောင်ချာ';
    voucherButton.addEventListener('click', function () {
      showSaleVoucher(sale);
    });

    actions.appendChild(voucherButton);
    cell.appendChild(actions);
    return setCellLabel(cell, 'လုပ်ဆောင်ချက်');
  }

  function createNextSaleId(value) {
    var text = cleanOptionName(value);
    var match = text.match(/^(.+?)(\d+)$/);
    var prefix;
    var numberText;

    if (!match) {
      return '';
    }

    prefix = match[1].replace(/[^A-Za-z]/g, '').toUpperCase() || 'S';
    numberText = match[2];

    return prefix + String(Number(numberText) + 1).padStart(Math.max(numberText.length, 5), '0');
  }

  function saleIdExists(saleId) {
    var target = cleanOptionName(saleId).toLowerCase();

    return sales.some(function (sale) {
      return cleanOptionName(sale.sale_id).toLowerCase() === target;
    });
  }

  function findLatestSaleId() {
    var latest = '';

    sales.some(function (sale) {
      latest = cleanOptionName(sale.sale_id);
      return Boolean(latest && !/^OFFLINE-/i.test(latest));
    });

    return latest;
  }

  function getSuggestedSaleId() {
    var saleId = createNextSaleId(findLatestSaleId()) || 'S00001';
    var guard = 0;

    while (saleId && saleIdExists(saleId) && guard < 1000) {
      saleId = createNextSaleId(saleId);
      guard += 1;
    }

    return saleId;
  }

  function applyCheckoutSaleId(items) {
    var saleId = getSuggestedSaleId();

    return items.map(function (item) {
      return Object.assign({}, item, {
        sale_id: saleId
      });
    });
  }

  function getCartItemKey(item) {
    return [
      cleanOptionName(item.product_id).toLowerCase(),
      cleanOptionName(item.sale_color).toLowerCase(),
      cleanOptionName(item.sale_size).toLowerCase(),
      String(toNumber(item.tax_percent))
    ].join('::');
  }

  function getCartReservedQuantity(productId, saleColor, saleSize, mode) {
    var productKey = cleanOptionName(productId).toLowerCase();
    var colorKey = cleanOptionName(saleColor).toLowerCase();
    var sizeKey = cleanOptionName(saleSize).toLowerCase();

    return saleCart.reduce(function (sum, item) {
      if (cleanOptionName(item.product_id).toLowerCase() !== productKey) {
        return sum;
      }

      if (mode === 'color' && cleanOptionName(item.sale_color).toLowerCase() !== colorKey) {
        return sum;
      }

      if (mode === 'size' && cleanOptionName(item.sale_size).toLowerCase() !== sizeKey) {
        return sum;
      }

      if (mode === 'exact' &&
          (cleanOptionName(item.sale_color).toLowerCase() !== colorKey ||
          cleanOptionName(item.sale_size).toLowerCase() !== sizeKey)) {
        return sum;
      }

      return sum + toNumber(item.sold_quantity);
    }, 0);
  }

  function getCartTotals() {
    return saleCart.reduce(function (totals, item) {
      totals.quantity += toNumber(item.sold_quantity);
      totals.total_cost += getSaleTotalCost(item);
      totals.subtotal += getSaleSubtotal(item);
      totals.discount_amount += getSaleDiscountAmount(item);
      totals.tax_amount += getSaleTaxAmount(item);
      totals.total_income += getSaleTotalIncome(item);
      totals.profit += getSaleProfit(item);
      return totals;
    }, {
      quantity: 0,
      total_cost: 0,
      subtotal: 0,
      discount_amount: 0,
      tax_amount: 0,
      total_income: 0,
      profit: 0
    });
  }

  function renderSaleCart() {
    var container = byId('saleCartItems');
    var totals = getCartTotals();

    setText('saleCartSummary', saleCart.length + ' ခု | အရေအတွက် ' + formatNumber(totals.quantity));
    setText('saleCartTotal', formatMoney(totals.total_income));
    setText('saleCartProfit', formatMoney(totals.profit));

    if (!container) {
      return;
    }

    clearElement(container);

    if (!saleCart.length) {
      var empty = document.createElement('p');
      empty.className = 'sale-cart-empty';
      empty.textContent = 'ပစ္စည်းများ ထည့်မထားသေးပါ။';
      container.appendChild(empty);
      return;
    }

    saleCart.forEach(function (item) {
      var row = document.createElement('article');
      var imageBox = document.createElement('div');
      var details = document.createElement('div');
      var name = document.createElement('strong');
      var meta = document.createElement('span');
      var quantity = document.createElement('span');
      var total = document.createElement('strong');
      var removeButton = document.createElement('button');
      var image;
      var placeholder;

      row.className = 'sale-cart-item';
      imageBox.className = 'sale-cart-image';

      if (item.product_image) {
        image = document.createElement('img');
        image.src = item.product_image;
        image.alt = item.product_name || 'ကုန်ပစ္စည်းပုံ';
        image.loading = 'lazy';
        image.referrerPolicy = 'no-referrer';
        image.onerror = function () {
          clearElement(imageBox);
          placeholder = document.createElement('span');
          placeholder.textContent = '-';
          imageBox.appendChild(placeholder);
        };
        imageBox.appendChild(image);
      } else {
        placeholder = document.createElement('span');
        placeholder.textContent = '-';
        imageBox.appendChild(placeholder);
      }

      details.className = 'sale-cart-details';
      name.textContent = item.product_name || '-';
      meta.textContent = [
        item.customer_name ? 'ဖောက်သည်: ' + item.customer_name : '',
        item.product_id || '-',
        getSaleVariantText(item)
      ].filter(Boolean).join(' | ');
      details.appendChild(name);
      details.appendChild(meta);

      quantity.className = 'sale-cart-quantity';
      quantity.textContent = 'x ' + formatNumber(item.sold_quantity);

      total.className = 'sale-cart-line-total';
      total.textContent = formatMoney(getSaleTotalIncome(item));

      removeButton.className = 'icon-button sale-cart-remove';
      removeButton.type = 'button';
      removeButton.textContent = '×';
      removeButton.setAttribute('aria-label', 'ဖယ်ရန်');
      removeButton.addEventListener('click', function () {
        removeSaleCartItem(item.cart_id);
      });

      row.appendChild(imageBox);
      row.appendChild(details);
      row.appendChild(quantity);
      row.appendChild(total);
      row.appendChild(removeButton);
      container.appendChild(row);
    });
  }

  function buildCurrentSaleItem() {
    var soldQuantity;
    var colorOptions;
    var sizeOptions;
    var selectedColor;
    var selectedSize;
    var availableQuantity;
    var buyPrice;
    var sellPrice;
    var totalCost;
    var subtotal;
    var discountPercent;
    var discountAmount;
    var taxableSubtotal;
    var taxPercent;
    var taxAmount;
    var totalIncome;

    if (!selectedProduct) {
      throw new Error('ကုန်ပစ္စည်း ရွေးချယ်ပါ။');
    }

    soldQuantity = toNumber(byId('soldQuantity').value);
    colorOptions = getActiveVariantOptions(selectedProduct.color);
    sizeOptions = getActiveVariantOptions(selectedProduct.size);
    selectedColor = getSelectedVariant('color');
    selectedSize = getSelectedVariant('size');
    availableQuantity = getAvailableSaleQuantity();

    if (soldQuantity <= 0) {
      throw new Error('အရေအတွက် မှန်ကန်စွာ ထည့်ပါ။');
    }

    if (colorOptions.length && !selectedColor) {
      throw new Error('အရောင် ရွေးချယ်ပါ။');
    }

    if (sizeOptions.length && !selectedSize) {
      throw new Error('အရွယ်အစား ရွေးချယ်ပါ။');
    }

    if (soldQuantity > availableQuantity) {
      throw new Error('လက်ကျန်အရေအတွက်ထက် ပိုမရောင်းနိုင်ပါ။');
    }

    buyPrice = toNumber(selectedProduct.buy_price);
    sellPrice = toNumber(selectedProduct.sell_price);
    totalCost = buyPrice * soldQuantity;
    subtotal = sellPrice * soldQuantity;
    discountPercent = Math.max(0, toNumber(byId('saleDiscountPercent') ? byId('saleDiscountPercent').value : 0));
    discountAmount = subtotal * (discountPercent / 100);
    taxableSubtotal = Math.max(0, subtotal - discountAmount);
    taxPercent = Math.max(0, toNumber(byId('saleTaxPercent') ? byId('saleTaxPercent').value : 0));
    taxAmount = taxableSubtotal * (taxPercent / 100);
    totalIncome = taxableSubtotal + taxAmount;

    return {
      cart_id: 'C-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      product_id: selectedProduct.product_id,
      product_name: selectedProduct.product_name,
      product_image: selectedProduct.image_src || selectedProduct.image_url || '',
      sold_quantity: soldQuantity,
      buy_price: buyPrice,
      sell_price: sellPrice,
      total_cost: totalCost,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      total_income: totalIncome,
      profit: taxableSubtotal - totalCost,
      sale_color: selectedColor ? selectedColor.name : '',
      sale_size: selectedSize ? selectedSize.name : '',
      customer_name: getSaleCustomerName(),
      payment_method: getSelectedPaymentMethod()
    };
  }

  function addCurrentItemToCart() {
    var item;
    var existing;

    try {
      item = buildCurrentSaleItem();
    } catch (error) {
      setMessage(error.message || 'ပစ္စည်း ထည့်မရပါ။', 'is-danger');
      return;
    }

    existing = saleCart.find(function (cartItem) {
      return getCartItemKey(cartItem) === getCartItemKey(item);
    });

    if (existing) {
      existing.sold_quantity += item.sold_quantity;
      existing.total_cost = existing.buy_price * existing.sold_quantity;
      existing.discount_percent = item.discount_percent;
      existing.discount_amount = getSaleSubtotal(existing) * (toNumber(existing.discount_percent) / 100);
      existing.tax_percent = item.tax_percent;
      existing.tax_amount = getSaleTaxAmount(existing);
      existing.total_income = getSaleTotalIncome(existing);
      existing.profit = getSaleProfit(existing);
      existing.payment_method = item.payment_method || existing.payment_method || getSelectedPaymentMethod();
    } else {
      saleCart.push(item);
    }

    renderSaleCart();
    renderVariantSelect('color');
    renderVariantSelect('size');
    calculateSale();
    clearSaleFormAfterSubmit(item.product_id);
    setMessage('ဘောင်ချာထဲ ထည့်ပြီးပါပြီ။', 'is-success');
  }

  function removeSaleCartItem(cartId) {
    saleCart = saleCart.filter(function (item) {
      return item.cart_id !== cartId;
    });

    renderSaleCart();
    renderVariantSelect('color');
    renderVariantSelect('size');
    calculateSale();
  }

  function clearSaleCart() {
    saleCart = [];
    renderSaleCart();
    renderVariantSelect('color');
    renderVariantSelect('size');
    calculateSale();
    setMessage('');
  }

  function handleCustomerNameInput() {
    var customerName;

    if (!saleCart.length) {
      return;
    }

    customerName = getSaleCustomerName();
    saleCart = saleCart.map(function (item) {
      return Object.assign({}, item, {
        customer_name: customerName
      });
    });
    renderSaleCart();
  }

  function renderProductOptions() {
    var select = byId('saleProduct');
    var currentValue = select ? select.value : '';
    var visibleProducts = getFilteredSaleProducts();
    var placeholder;
    var emptyOption;

    if (!select) {
      return;
    }

    clearElement(select);

    placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'ရွေးချယ်ရန်';
    select.appendChild(placeholder);

    if (!visibleProducts.length) {
      emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = 'ကုန်ပစ္စည်း မတွေ့ပါ';
      emptyOption.disabled = true;
      select.appendChild(emptyOption);
      return;
    }

    visibleProducts.forEach(function (product) {
      var option = document.createElement('option');
      var quantity = toNumber(product.quantity);
      var productLabel = [product.product_id, product.product_name].filter(Boolean).join(' - ');
      var barcodeLabel = product.barcode ? ' | Barcode ' + product.barcode : '';

      option.value = product.product_id;
      option.textContent = productLabel + barcodeLabel + ' - လက်ကျန် ' + formatNumber(quantity);
      option.disabled = quantity <= 0;
      select.appendChild(option);
    });

    if (currentValue && visibleProducts.some(function (product) {
      return product.product_id === currentValue;
    })) {
      select.value = currentValue;
    }
  }

  function handleProductSearchInput() {
    var select = byId('saleProduct');

    renderProductOptions();

    if (select && !select.value) {
      handleProductChange();
    }
  }

  function handleCategoryFilterChange() {
    renderProductOptions();
    handleProductChange();
  }

  // ================================
  // FIX: Auto-fill after barcode scan
  // ================================

  function setDefaultQuantityAfterScan() {
    var quantityInput = byId('soldQuantity');

    if (quantityInput) {
      quantityInput.value = '1';
      calculateSale();
    }
  }

  function autoSelectSingleVariant(type) {
    var select = byId(type === 'color' ? 'saleColor' : 'saleSize');

    if (!select || select.options.length !== 2) {
      return;
    }

    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function handleBarcodeSearchInput(shouldSelectPartial) {
    var input = byId('saleBarcodeSearch');
    var query = getSaleBarcodeSearchQuery();
    var exactProduct;
    var visibleProducts;

    if (!query) {
      return;
    }

    exactProduct = findProductByBarcode(query);
    if (exactProduct) {
      selectProduct(exactProduct);
      setDefaultQuantityAfterScan();
      setMessage('Barcode ဖြင့် ရွေးပြီးပါပြီ။', 'is-success');
      return;
    }

    if (shouldSelectPartial) {
      if (byId('saleProductSearch')) {
        byId('saleProductSearch').value = input ? input.value.trim() : '';
      }

      renderProductOptions();
      visibleProducts = getFilteredSaleProducts();

      if (visibleProducts.length === 1) {
        selectProduct(visibleProducts[0]);
        setDefaultQuantityAfterScan();
        setMessage('Barcode ရှာဖွေမှုဖြင့် ရွေးပြီးပါပြီ။', 'is-success');
        return;
      }

      setMessage('Barcode နှင့်ကိုက်ညီသော ကုန်ပစ္စည်း မတွေ့ပါ။', 'is-danger');
    }
  }

  function stopBarcodeScanner() {
    var video = byId('barcodeScannerVideo');
    var startButton = byId('startBarcodeScanButton');
    var stopButton = byId('stopBarcodeScanButton');

    barcodeScannerStarting = false;

    if (barcodeScannerTimer) {
      window.clearInterval(barcodeScannerTimer);
      barcodeScannerTimer = null;
    }

    if (zxingScannerControls && typeof zxingScannerControls.stop === 'function') {
      zxingScannerControls.stop();
      zxingScannerControls = null;
    }

    if (window.ZXingBrowser &&
        window.ZXingBrowser.BrowserCodeReader &&
        typeof window.ZXingBrowser.BrowserCodeReader.releaseAllStreams === 'function') {
      window.ZXingBrowser.BrowserCodeReader.releaseAllStreams();
    }

    if (barcodeScannerStream) {
      barcodeScannerStream.getTracks().forEach(function (track) {
        track.stop();
      });
      barcodeScannerStream = null;
    }

    if (video) {
      video.pause();
      video.srcObject = null;
      video.hidden = true;
    }

    if (startButton) {
      startButton.hidden = false;
    }

    if (stopButton) {
      stopButton.hidden = true;
    }
  }

  function handleDetectedBarcode(code) {
    var input = byId('saleBarcodeSearch');

    if (input) {
      input.value = code;
    }

    handleBarcodeSearchInput(true);
    stopBarcodeScanner();
  }

  function scanBarcodeFrame(video) {
    if (!barcodeDetector || !video || video.hidden) {
      return;
    }

    barcodeDetector.detect(video)
      .then(function (codes) {
        if (codes && codes.length && codes[0].rawValue) {
          handleDetectedBarcode(codes[0].rawValue);
        }
      })
      .catch(function () {
        stopBarcodeScanner();
        setMessage('Camera barcode scan မအောင်မြင်ပါ။', 'is-danger');
      });
  }

  function setBarcodeScannerUi(isScanning) {
    var video = byId('barcodeScannerVideo');
    var startButton = byId('startBarcodeScanButton');
    var stopButton = byId('stopBarcodeScanButton');

    if (video) {
      video.hidden = !isScanning;
    }

    if (startButton) {
      startButton.hidden = isScanning;
    }

    if (stopButton) {
      stopButton.hidden = !isScanning;
    }
  }

  function getBarcodeFromZxingResult(result) {
    if (!result) {
      return '';
    }

    if (typeof result.getText === 'function') {
      return cleanOptionName(result.getText());
    }

    return cleanOptionName(result.text || result.rawValue || String(result));
  }

  function startZxingScanner(video) {
    var preferredConstraints = {
      video: {
        facingMode: {
          ideal: 'environment'
        },
        width: {
          ideal: 1280
        },
        height: {
          ideal: 720
        }
      },
      audio: false
    };
    var fallbackConstraints = {
      video: true,
      audio: false
    };
    var startWithConstraints;

    if (!window.ZXingBrowser || !window.ZXingBrowser.BrowserMultiFormatReader) {
      return Promise.reject(new Error('ZXing scanner မရှိပါ။'));
    }

    zxingReader = zxingReader || new window.ZXingBrowser.BrowserMultiFormatReader();
    if (video) {
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.muted = true;
    }

    startWithConstraints = function (constraints) {
      return zxingReader.decodeFromConstraints(constraints, video, function (result) {
        var code = getBarcodeFromZxingResult(result);

        if (code) {
          handleDetectedBarcode(code);
        }
      });
    };

    return startWithConstraints(preferredConstraints)
      .catch(function () {
        return startWithConstraints(fallbackConstraints)
          .catch(function () {
            if (typeof zxingReader.decodeFromVideoDevice !== 'function') {
              throw new Error('Camera barcode scan မရပါ။ Barcode ကို ရိုက်ထည့်ပါ။');
            }

            return zxingReader.decodeFromVideoDevice(undefined, video, function (result) {
              var deviceCode = getBarcodeFromZxingResult(result);

              if (deviceCode) {
                handleDetectedBarcode(deviceCode);
              }
            });
          });
      })
      .then(function (controls) {
        zxingScannerControls = controls;
        setBarcodeScannerUi(true);
        setMessage('Camera scanner ဖွင့်ထားပါသည်။ Barcode ကို ကင်မရာရှေ့တွင်ထားပါ။', 'is-warning');
      });
  }

  function startNativeBarcodeScanner(video) {
    barcodeDetector = barcodeDetector || new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
    });

    return navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: 'environment'
        },
        width: {
          ideal: 1280
        },
        height: {
          ideal: 720
        }
      },
      audio: false
    })
      .catch(function () {
        return navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      })
      .then(function (stream) {
        barcodeScannerStream = stream;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;
        setBarcodeScannerUi(true);
        return video.play();
      })
      .then(function () {
        setMessage('Camera scanner ဖွင့်ထားပါသည်။ Barcode ကို ကင်မရာရှေ့တွင်ထားပါ။', 'is-warning');
        barcodeScannerTimer = window.setInterval(function () {
          scanBarcodeFrame(video);
        }, 450);
      });
  }

  function startBarcodeScanner() {
    var video = byId('barcodeScannerVideo');

    if (!video) {
      return;
    }

    if (barcodeScannerStarting) {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMessage('ဤ browser တွင် camera access မရပါ။ HTTPS ဖြင့်ဖွင့်ပြီး ထပ်စမ်းပါ။', 'is-warning');
      return;
    }

    barcodeScannerStarting = true;
    stopBarcodeScanner();
    barcodeScannerStarting = true;
    setMessage('Camera ဖွင့်နေပါသည်...', 'is-warning');

    startZxingScanner(video)
      .catch(function () {
        if (!('BarcodeDetector' in window)) {
          throw new Error('Camera barcode scan မရပါ။ Barcode ကို ရိုက်ထည့်ပါ။');
        }

        return startNativeBarcodeScanner(video);
      })
      .catch(function (error) {
        stopBarcodeScanner();
        setMessage(error && error.message ? error.message : 'Camera ဖွင့်ခွင့် မရပါ။ HTTPS/permission ကိုစစ်ပါ။', 'is-danger');
      })
      .finally(function () {
        barcodeScannerStarting = false;
      });
  }

  function renderSelectedProduct() {
    var preview = byId('saleProductPreview');
    var image = byId('saleProductImage');
    var imageBox;
    var placeholder;
    var meta = '';

    if (!preview) {
      return;
    }

    if (!selectedProduct) {
      preview.hidden = true;
      return;
    }

    preview.hidden = false;
    setText('saleProductName', selectedProduct.product_name || 'ကုန်ပစ္စည်းအမည်');
    meta = [
      'ID ' + (selectedProduct.product_id || '-'),
      selectedProduct.barcode ? 'Barcode ' + selectedProduct.barcode : '',
      'လက်ကျန် ' + formatNumber(selectedProduct.quantity),
      'ရောင်းဈေး ' + formatNumber(selectedProduct.sell_price),
      selectedProduct.expiry_date ? 'သက်တမ်းကုန် ' + selectedProduct.expiry_date : '',
      formatActiveVariants('အရောင်', selectedProduct.color),
      formatActiveVariants('အရွယ်အစား', selectedProduct.size)
    ].filter(Boolean).join(' | ');
    setText('saleProductMeta', meta);

    imageBox = image ? image.parentNode : null;

    if (!imageBox) {
      return;
    }

    clearElement(imageBox);

    if (selectedProduct.image_src || selectedProduct.image_url) {
      image = document.createElement('img');
      image.id = 'saleProductImage';
      image.src = selectedProduct.image_src || selectedProduct.image_url;
      image.alt = selectedProduct.product_name || 'ကုန်ပစ္စည်းပုံ';
      image.referrerPolicy = 'no-referrer';
      image.onerror = function () {
        clearElement(imageBox);
        placeholder = document.createElement('span');
        placeholder.className = 'image-placeholder';
        placeholder.textContent = '-';
        imageBox.appendChild(placeholder);
      };
      imageBox.appendChild(image);
      return;
    }

    placeholder = document.createElement('span');
    placeholder.className = 'image-placeholder';
    placeholder.textContent = '-';
    imageBox.appendChild(placeholder);
  }

  function renderVariantSelect(type) {
    var select = byId(type === 'color' ? 'saleColor' : 'saleSize');
    var field = byId(type === 'color' ? 'saleColorField' : 'saleSizeField');
    var options = selectedProduct ? getActiveVariantOptions(selectedProduct[type]) : [];
    var placeholder;

    if (!select || !field) {
      return;
    }

    clearElement(select);

    placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'ရွေးချယ်ရန်';
    select.appendChild(placeholder);

    if (!options.length) {
      field.hidden = true;
      select.required = false;
      select.value = '';
      return;
    }

    field.hidden = false;
    select.required = false;

    options.forEach(function (option) {
      var item = document.createElement('option');

      item.value = option.name;
      item.textContent = option.name + ' - လက်ကျန် ' + formatNumber(option.quantity);
      item.dataset.quantity = String(toNumber(option.quantity));
      select.appendChild(item);
    });
  }

  function getSelectedVariant(type) {
    var select = byId(type === 'color' ? 'saleColor' : 'saleSize');
    var value = select ? select.value : '';
    var options = selectedProduct ? getActiveVariantOptions(selectedProduct[type]) : [];

    if (!value) {
      return null;
    }

    return options.find(function (option) {
      return option.name === value;
    }) || null;
  }

  function getAvailableSaleQuantity() {
    var productId = selectedProduct ? selectedProduct.product_id : '';
    var available = selectedProduct ? toNumber(selectedProduct.quantity) - getCartReservedQuantity(productId, '', '', 'product') : 0;
    var colorOptions = selectedProduct ? getActiveVariantOptions(selectedProduct.color) : [];
    var sizeOptions = selectedProduct ? getActiveVariantOptions(selectedProduct.size) : [];
    var selectedColor = getSelectedVariant('color');
    var selectedSize = getSelectedVariant('size');

    if (colorOptions.length && selectedColor) {
      available = Math.min(
        available,
        toNumber(selectedColor.quantity) - getCartReservedQuantity(productId, selectedColor.name, '', 'color')
      );
    }

    if (sizeOptions.length && selectedSize) {
      available = Math.min(
        available,
        toNumber(selectedSize.quantity) - getCartReservedQuantity(productId, '', selectedSize.name, 'size')
      );
    }

    if ((colorOptions.length && !selectedColor) || (sizeOptions.length && !selectedSize)) {
      return 0;
    }

    return Math.max(0, available);
  }

  function calculateSale() {
    var quantityInput = byId('soldQuantity');
    var soldQuantity = quantityInput ? toNumber(quantityInput.value) : 0;
    var buyPrice = selectedProduct ? toNumber(selectedProduct.buy_price) : 0;
    var sellPrice = selectedProduct ? toNumber(selectedProduct.sell_price) : 0;
    var discountPercent = Math.max(0, toNumber(byId('saleDiscountPercent') ? byId('saleDiscountPercent').value : 0));
    var taxPercent = Math.max(0, toNumber(byId('saleTaxPercent') ? byId('saleTaxPercent').value : 0));
    var availableQuantity = selectedProduct ? getAvailableSaleQuantity() : 0;
    var totalCost = buyPrice * soldQuantity;
    var subtotal = sellPrice * soldQuantity;
    var discountAmount = subtotal * (discountPercent / 100);
    var taxableSubtotal = Math.max(0, subtotal - discountAmount);
    var taxAmount = taxableSubtotal * (taxPercent / 100);
    var totalIncome = taxableSubtotal + taxAmount;
    var profit = taxableSubtotal - totalCost;

    if (quantityInput) {
      if (selectedProduct && availableQuantity > 0) {
        quantityInput.max = String(availableQuantity);
      } else {
        quantityInput.removeAttribute('max');
      }
    }

    setText('saleBuyPrice', formatNumber(buyPrice));
    setText('saleSellPrice', formatNumber(sellPrice));
    setText('saleTotalCost', formatNumber(totalCost));
    setText('saleDiscountAmount', formatNumber(discountAmount));
    setText('saleTaxAmount', formatNumber(taxAmount));
    setText('saleTotalIncome', formatNumber(totalIncome));
    setText('saleProfit', formatNumber(profit));
    setText('saleAvailableStock', selectedProduct ? formatNumber(availableQuantity) : '0');
  }

  function handleProductChange() {
    var select = byId('saleProduct');
    var productId = select ? select.value : '';

    selectedProduct = productId ? findProduct(productId) : null;
    renderVariantSelect('color');
    renderVariantSelect('size');
    autoSelectSingleVariant('color');
    autoSelectSingleVariant('size');
    renderSelectedProduct();
    calculateSale();
    setMessage('');
  }

  function renderSalesTable() {
    var tableBody = byId('salesTable');
    var groupedSales;

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);
    groupedSales = getGroupedSales();
    setText('salesCount', groupedSales.length + ' ခု');

    if (!groupedSales.length) {
      tableBody.appendChild(createEmptyRow('ရောင်းချမှုမရှိသေးပါ။'));
      return;
    }

    groupedSales.forEach(function (saleGroup) {
      var row = document.createElement('tr');
      var totals = getVoucherTotals(saleGroup);

      row.appendChild(createCell(saleGroup.voucher_id || '-', 'Sale ID'));
      row.appendChild(createCell(saleGroup.sale_date || '-', 'ရက်စွဲ'));
      row.appendChild(createCell(saleGroup.customer_name || '-', 'ဖောက်သည်'));
      row.appendChild(createSaleItemsCell(saleGroup.items));
      row.appendChild(createCell(formatNumber(totals.quantity), 'အရေအတွက်'));
      row.appendChild(createCell(formatMoney(totals.total_income), 'စုစုပေါင်းဝင်ငွေ'));
      row.appendChild(createCell(formatMoney(totals.profit), 'အမြတ်'));
      row.appendChild(createCell(saleGroup.payment_method || 'Cash', 'Payment'));
      row.appendChild(createVoucherCell(saleGroup));
      tableBody.appendChild(row);
    });
  }

  function updateProductFromSale(product) {
    var index;

    if (!product || !product.product_id) {
      return;
    }

    index = products.findIndex(function (item) {
      return item.product_id === product.product_id;
    });

    if (index >= 0) {
      products[index] = product;
    }

    setCachedProducts(products);
    selectedProduct = product;
    renderSaleCategoryFilter();
    renderProductOptions();
    byId('saleProduct').value = product.product_id;
    renderVariantSelect('color');
    renderVariantSelect('size');
    renderSelectedProduct();
    calculateSale();
  }

  function summarizeToday() {
    var today = todayString();
    var income = 0;
    var profit = 0;

    sales.forEach(function (sale) {
      if (String(sale.sale_date).substring(0, 10) === today) {
        income += toNumber(sale.total_income);
        profit += toNumber(sale.profit);
      }
    });

    setText('todayIncome', formatNumber(income));
    setText('todayProfit', formatNumber(profit));
  }

  function setSalesLoading(message, isLoading) {
    var tableBody = byId('salesTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);
    tableBody.appendChild(isLoading ? createLoadingRow(message) : createEmptyRow(message));
  }

  function loadProductsLegacy_() {
    if (!api || typeof api.listProducts !== 'function') {
      renderCachedProducts();
      setMessage('API ချိတ်ဆက်မှု မရှိပါ။', 'is-danger');
      return Promise.resolve();
    }

    renderCachedProducts();

    return api.listProducts()
      .then(function (data) {
        var nextProducts = data && Array.isArray(data.products) ? data.products : [];

        if (!nextProducts.length && products.length) {
          return;
        }

        products = nextProducts;
        setCachedProducts(products);
        renderSaleCategoryFilter();
        renderProductOptions();
        handleProductChange();
      })
      .catch(function (error) {
        setMessage(error && error.message ? error.message : 'ကုန်ပစ္စည်းများ မယူနိုင်ပါ။', 'is-danger');
      });
  }

  function loadProducts() {
    if (!api || typeof api.listProducts !== 'function') {
      renderCachedProducts();
      if (!products.length) {
        setMessage('API ချိတ်ဆက်မှု မရှိပါ။', 'is-danger');
      }
      return Promise.resolve();
    }

    renderCachedProducts();

    return api.listProducts()
      .then(function (data) {
        var nextProducts = data && Array.isArray(data.products) ? data.products : [];

        if (!nextProducts.length && products.length) {
          return;
        }

        products = nextProducts;
        setCachedProducts(products);
        renderSaleCategoryFilter();
        renderProductOptions();
        handleProductChange();
      })
      .catch(function (error) {
        if (products.length) {
          renderProductOptions();
          handleProductChange();
          setMessage(error && error.message ? error.message : 'ယာယီဒေတာဖြင့် ပြထားပါသည်။', 'is-warning');
          return;
        }

        setMessage(error && error.message ? error.message : 'ကုန်ပစ္စည်းများ မယူနိုင်ပါ။', 'is-danger');
      });
  }

  function loadSalesLegacy_() {
    if (!api || typeof api.listSales !== 'function') {
      setSalesLoading('API ချိတ်ဆက်မှု မရှိပါ။', false);
      return Promise.resolve();
    }

    if (!renderCachedSales()) {
      setSalesLoading('ဒေတာယူနေပါသည်', true);
    }

    return api.listSales()
      .then(function (data) {
        var nextSales = data && Array.isArray(data.sales) ? data.sales : [];

        if (!nextSales.length && sales.length) {
          return;
        }

        sales = nextSales;
        setCachedSales(sales);
        renderSalesTable();
        summarizeToday();
      })
      .catch(function (error) {
        setSalesLoading(error && error.message ? error.message : 'ရောင်းချမှုများ မယူနိုင်ပါ။', false);
      });
  }

  function loadSales() {
    if (!api || typeof api.listSales !== 'function') {
      if (!renderCachedSales()) {
        setSalesLoading('API ချိတ်ဆက်မှု မရှိပါ။', false);
      }
      return Promise.resolve();
    }

    if (!renderCachedSales()) {
      setSalesLoading('ဒေတာယူနေပါသည်', true);
    }

    return api.listSales()
      .then(function (data) {
        var nextSales = data && Array.isArray(data.sales) ? data.sales : [];

        if (!nextSales.length && sales.length) {
          return;
        }

        sales = nextSales;
        setCachedSales(sales);
        renderSalesTable();
        summarizeToday();
      })
      .catch(function (error) {
        if (sales.length) {
          renderSalesTable();
          summarizeToday();
          setMessage(error && error.message ? error.message : 'ယာယီဒေတာဖြင့် ပြထားပါသည်။', 'is-warning');
          return;
        }

        setSalesLoading(error && error.message ? error.message : 'ရောင်းချမှုများ မယူနိုင်ပါ။', false);
      });
  }

  function setFormBusy(isBusy) {
    var form = byId('saleForm');
    var buttons = form ? form.querySelectorAll('button') : [];

    buttons.forEach(function (button) {
      button.disabled = isBusy;
    });
  }

  function readOfflineSalesQueue() {
    var raw;

    try {
      raw = localStorage.getItem(OFFLINE_SALES_KEY);
    } catch (error) {
      return [];
    }

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) || [];
    } catch (error) {
      return [];
    }
  }

  function writeOfflineSalesQueue(queue) {
    try {
      localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
      return true;
    } catch (error) {
      return false;
    }
  }

  function isOfflineError(error) {
    var message = String(error && error.message ? error.message : '').toLowerCase();

    return navigator.onLine === false ||
      message.indexOf('fetch') !== -1 ||
      message.indexOf('ချိတ်ဆက်') !== -1 ||
      message.indexOf('offline') !== -1;
  }

  function adjustVariantQuantity(value, selectedName, soldQuantity) {
    var options = parseVariantOptions(value);
    var target = cleanOptionName(selectedName).toLowerCase();

    if (!target) {
      return value;
    }

    options.forEach(function (option) {
      if (cleanOptionName(option.name).toLowerCase() === target) {
        option.quantity = Math.max(0, toNumber(option.quantity) - soldQuantity);
        option.active = option.quantity > 0;
      }
    });

    return serializeVariantOptions(options);
  }

  function buildLocalSalePreview(sale, product) {
    var soldQuantity = toNumber(sale.sold_quantity);
    var buyPrice = toNumber(product.buy_price);
    var sellPrice = toNumber(product.sell_price);
    var totalCost = buyPrice * soldQuantity;
    var subtotal = sellPrice * soldQuantity;
    var discountPercent = Math.max(0, toNumber(sale.discount_percent));
    var discountAmount = subtotal * (discountPercent / 100);
    var taxableSubtotal = Math.max(0, subtotal - discountAmount);
    var taxPercent = Math.max(0, toNumber(sale.tax_percent));
    var taxAmount = taxableSubtotal * (taxPercent / 100);
    var totalIncome = taxableSubtotal + taxAmount;

    return {
      sale_id: cleanOptionName(sale.sale_id) || ('OFFLINE-' + Date.now()),
      product_id: product.product_id,
      product_name: product.product_name,
      sold_quantity: soldQuantity,
      buy_price: buyPrice,
      sell_price: sellPrice,
      total_cost: totalCost,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      total_income: totalIncome,
      profit: taxableSubtotal - totalCost,
      sale_date: sale.sale_date,
      created_at: new Date().toISOString(),
      sale_color: sale.sale_color || '',
      sale_size: sale.sale_size || '',
      customer_name: sale.customer_name || '',
      payment_method: getSalePaymentMethod(sale),
      pending_sync: true
    };
  }

  function applyOfflineStockDeduction(product, sale) {
    var updated = Object.assign({}, product);
    var soldQuantity = toNumber(sale.sold_quantity);

    updated.quantity = Math.max(0, toNumber(updated.quantity) - soldQuantity);
    updated.color = adjustVariantQuantity(updated.color, sale.sale_color, soldQuantity);
    updated.size = adjustVariantQuantity(updated.size, sale.sale_size, soldQuantity);

    updateProductFromSale(updated);
  }

  function queueOfflineSale(sale, product) {
    var queue = readOfflineSalesQueue();
    var preview = buildLocalSalePreview(sale, product);

    queue.push({
      sale: sale,
      queued_at: new Date().toISOString()
    });
    writeOfflineSalesQueue(queue);

    sales.unshift(preview);
    setCachedSales(sales);
    applyOfflineStockDeduction(product, sale);
    renderSalesTable();
    summarizeToday();
    showSaleVoucher(preview);
    setMessage('Internet မရှိသေးပါ။ ရောင်းချမှုကို သိမ်းထားပြီး Online ပြန်ရလျှင် Sync လုပ်ပါမည်။', 'is-warning');
  }

  function createSalePayloadFromItem(item) {
    return {
      sale_id: cleanOptionName(item.sale_id),
      product_id: item.product_id,
      sold_quantity: toNumber(item.sold_quantity),
      sale_date: byId('saleDate') && byId('saleDate').value ? byId('saleDate').value : todayString(),
      sale_color: item.sale_color || '',
      sale_size: item.sale_size || '',
      customer_name: cleanOptionName(item.customer_name),
      payment_method: getSalePaymentMethod(item),
      discount_percent: Math.max(0, toNumber(item.discount_percent)),
      tax_percent: Math.max(0, toNumber(item.tax_percent))
    };
  }

  function applyCheckoutCustomerName(items) {
    var customerName = getSaleCustomerName();

    return items.map(function (item) {
      return Object.assign({}, item, {
        customer_name: customerName || cleanOptionName(item.customer_name)
      });
    });
  }

  function applyCheckoutPaymentMethod(items) {
    var paymentMethod = getSelectedPaymentMethod();

    return items.map(function (item) {
      return Object.assign({}, item, {
        payment_method: paymentMethod || getSalePaymentMethod(item)
      });
    });
  }

  function getGroupedSales() {
    var grouped = [];
    var byId = {};

    sales.forEach(function (sale) {
      var saleId = cleanOptionName(sale.sale_id) || ('SALE-' + grouped.length);

      if (!byId[saleId]) {
        byId[saleId] = createVoucherGroup([], saleId, sale.customer_name);
        byId[saleId].sale_date = cleanOptionName(sale.sale_date) || todayString();
        byId[saleId].created_at = cleanOptionName(sale.created_at);
        grouped.push(byId[saleId]);
      }

      if (!byId[saleId].customer_name && sale.customer_name) {
        byId[saleId].customer_name = sale.customer_name;
      }

      byId[saleId].items.push(sale);
    });

    return grouped;
  }

  function addSavedSalesToTable(savedSales) {
    if (!savedSales || !savedSales.length) {
      return;
    }

    sales = savedSales.slice().reverse().concat(sales);
    setCachedSales(sales);
    renderSalesTable();
    summarizeToday();
  }

  function queueOfflineSaleItems(items) {
    var queue = readOfflineSalesQueue();
    var previews = [];

    items.forEach(function (item) {
      var sale = createSalePayloadFromItem(item);
      var product = findProduct(item.product_id) || item;
      var preview = buildLocalSalePreview(sale, product);

      queue.push({
        sale: sale,
        queued_at: new Date().toISOString()
      });

      sales.unshift(preview);
      previews.push(preview);

      if (product) {
        applyOfflineStockDeduction(product, sale);
      }
    });

    writeOfflineSalesQueue(queue);
    setCachedSales(sales);
    renderSalesTable();
    summarizeToday();

    return previews;
  }

  function saveSaleItemsOnline(items) {
    var savedSales = [];

    function saveNext(index) {
      if (index >= items.length) {
        return Promise.resolve(savedSales);
      }

      var payload = createSalePayloadFromItem(items[index]);

      return api.recordSale(payload)
        .then(function (data) {
          if (data && data.sale) {
            if (!data.sale.payment_method) {
              data.sale.payment_method = getSalePaymentMethod(payload);
            }
            savedSales.push(data.sale);
          }

          if (data && data.product) {
            updateProductFromSale(data.product);
          }

          return saveNext(index + 1);
        })
        .catch(function (error) {
          error.savedSales = savedSales.slice();
          error.failedIndex = index;
          throw error;
        });
    }

    return saveNext(0);
  }

  function syncOfflineSalesQueue() {
    var queue = readOfflineSalesQueue();
    var item;

    if (!queue.length || !api || typeof api.recordSale !== 'function' || navigator.onLine === false) {
      return Promise.resolve();
    }

    item = queue[0];

    return api.recordSale(item.sale, {
      silentLoading: true
    })
      .then(function (data) {
        queue.shift();
        writeOfflineSalesQueue(queue);

        if (data && data.sale) {
          sales = sales.filter(function (sale) {
            return !(sale.pending_sync &&
              sale.product_id === data.sale.product_id &&
              sale.sale_date === data.sale.sale_date);
          });
          sales.unshift(data.sale);
          setCachedSales(sales);
        }

        if (data && data.product) {
          updateProductFromSale(data.product);
        }

        renderSalesTable();
        summarizeToday();

        if (queue.length) {
          return syncOfflineSalesQueue();
        }

        setMessage('Offline ရောင်းချမှုများ Sync ပြီးပါပြီ။', 'is-success');
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  function clearSaleFormAfterSubmit(productId, clearCustomer) {
    var quantityInput = byId('soldQuantity');
    var customerInput = byId('saleCustomerName');
    var taxInput = byId('saleTaxPercent');

    if (quantityInput) {
      quantityInput.value = '';
    }

    if (clearCustomer && customerInput) {
      customerInput.value = '';
    }

    if (clearCustomer && taxInput) {
      taxInput.value = '';
    }

    if (productId && byId('saleProduct')) {
      byId('saleProduct').value = productId;
    }

    calculateSale();
  }

  function recordSale(event) {
    var items;
    var directItem;

    event.preventDefault();
    setMessage('');

    items = saleCart.slice();

    if (!items.length) {
      try {
        directItem = buildCurrentSaleItem();
        items = [directItem];
      } catch (error) {
        setMessage(error.message || 'ရောင်းချမှု မမှန်ပါ။', 'is-danger');
        return;
      }
    }

    items = applyCheckoutSaleId(applyCheckoutPaymentMethod(applyCheckoutCustomerName(items)));

    setFormBusy(true);
    setMessage('ဘောင်ချာ သိမ်းနေပါသည်', 'is-warning');

    saveSaleItemsOnline(items)
      .then(function (savedSales) {
        var voucher = createVoucherGroup(savedSales, 'V-' + Date.now());

        addSavedSalesToTable(savedSales);
        saleCart = [];
        renderSaleCart();
        clearSaleFormAfterSubmit(selectedProduct ? selectedProduct.product_id : '', true);
        setMessage('ဘောင်ချာ သိမ်းပြီးပါပြီ။', 'is-success');
        showSaleVoucher(voucher);
      })
      .catch(function (error) {
        var savedSales = error && error.savedSales ? error.savedSales : [];
        var failedIndex = Number.isFinite(error && error.failedIndex) ? error.failedIndex : 0;
        var remainingItems = items.slice(failedIndex);
        var offlinePreviews;
        var voucherItems;

        if (savedSales.length) {
          addSavedSalesToTable(savedSales);
        }

        if (isOfflineError(error)) {
          offlinePreviews = queueOfflineSaleItems(remainingItems);
          voucherItems = savedSales.concat(offlinePreviews);
          saleCart = [];
          renderSaleCart();
          clearSaleFormAfterSubmit(selectedProduct ? selectedProduct.product_id : '', true);
          setMessage('Internet မရှိသေးပါ။ ကျန်ရောင်းချမှုများကို Offline သိမ်းထားပါသည်။', 'is-warning');
          if (voucherItems.length) {
            showSaleVoucher(createVoucherGroup(voucherItems, 'OFFLINE-' + Date.now()));
          }
          return;
        }

        if (savedSales.length) {
          saleCart = remainingItems;
          renderSaleCart();
        }

        setMessage(error && error.message ? error.message : 'ရောင်းချမှုထည့်ခြင်း မအောင်မြင်ပါ။', 'is-danger');
      })
      .finally(function () {
        setFormBusy(false);
      });
  }

  function initDate() {
    var input = byId('saleDate');

    if (input && !input.value) {
      input.value = todayString();
    }
  }

  function bindEvents() {
    var productSearch = byId('saleProductSearch');
    var categoryFilter = byId('saleCategoryFilter');
    var barcodeSearch = byId('saleBarcodeSearch');
    var productSelect = byId('saleProduct');
    var colorSelect = byId('saleColor');
    var sizeSelect = byId('saleSize');
    var quantityInput = byId('soldQuantity');
    var taxInput = byId('saleTaxPercent');
    var paymentSelect = byId('salePaymentMethod');
    var customerInput = byId('saleCustomerName');
    var form = byId('saleForm');
    var printVoucherButton = byId('printVoucherButton');
    var downloadVoucherButton = byId('downloadVoucherButton');
    var startBarcodeScanButton = byId('startBarcodeScanButton');
    var stopBarcodeScanButton = byId('stopBarcodeScanButton');
    var addSaleItemButton = byId('addSaleItemButton');
    var clearSaleCartButton = byId('clearSaleCartButton');

    if (productSearch) {
      productSearch.addEventListener('input', handleProductSearchInput);
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', handleCategoryFilterChange);
    }

    if (barcodeSearch) {
      barcodeSearch.addEventListener('input', function () {
        handleBarcodeSearchInput(false);
      });
      barcodeSearch.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleBarcodeSearchInput(true);
        }
      });
      barcodeSearch.addEventListener('change', function () {
        handleBarcodeSearchInput(true);
      });
    }

    if (productSelect) {
      productSelect.addEventListener('change', handleProductChange);
    }

    if (quantityInput) {
      quantityInput.addEventListener('input', calculateSale);
    }

    if (taxInput) {
      taxInput.addEventListener('input', calculateSale);
    }

    if (paymentSelect) {
      paymentSelect.addEventListener('change', calculateSale);
    }

    if (customerInput) {
      customerInput.addEventListener('input', handleCustomerNameInput);
    }

    if (colorSelect) {
      colorSelect.addEventListener('change', calculateSale);
    }

    if (sizeSelect) {
      sizeSelect.addEventListener('change', calculateSale);
    }

    if (form) {
      form.noValidate = true;
      form.addEventListener('invalid', function (invalidEvent) {
        invalidEvent.preventDefault();
      }, true);
      form.addEventListener('submit', recordSale);
    }

    if (addSaleItemButton) {
      addSaleItemButton.addEventListener('click', addCurrentItemToCart);
    }

    if (clearSaleCartButton) {
      clearSaleCartButton.addEventListener('click', clearSaleCart);
    }

    if (printVoucherButton) {
      printVoucherButton.addEventListener('click', printSaleVoucher);
    }

    if (downloadVoucherButton) {
      downloadVoucherButton.addEventListener('click', downloadSaleVoucher);
    }

    if (startBarcodeScanButton) {
      startBarcodeScanButton.addEventListener('click', startBarcodeScanner);
    }

    if (stopBarcodeScanButton) {
      stopBarcodeScanButton.addEventListener('click', stopBarcodeScanner);
    }

    document.querySelectorAll('[data-close-voucher]').forEach(function (button) {
      button.addEventListener('click', closeSaleVoucher);
    });

    document.addEventListener('mmc:settings-loaded', function (event) {
      applyShopSettings(event.detail || {});
    });

    window.addEventListener('afterprint', finishPrintingVoucher);
    window.addEventListener('online', syncOfflineSalesQueue);
    window.addEventListener('beforeunload', stopBarcodeScanner);
  }

  function initSales() {
    if (!document.body || document.body.getAttribute('data-page') !== 'sales') {
      return;
    }

    initDate();
    bindEvents();
    renderSaleCart();
    loadProducts().then(loadSales).then(syncOfflineSalesQueue);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSales);
  } else {
    initSales();
  }
})();
