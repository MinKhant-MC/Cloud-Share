(function () {
  'use strict';

  var api = window.MMC_API;
  var cache = window.MMC_CACHE;
  var products = [];
  var sales = [];
  var selectedProduct = null;
  var currentVoucherSale = null;
  var shopSettings = {
    shop_name: '',
    currency: 'MMK'
  };
  var SALES_COLUMN_COUNT = 11;

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

  function normalizeVariantOptions(options) {
    var normalized = [];

    if (!Array.isArray(options)) {
      return normalized;
    }

    options.forEach(function (option) {
      var name = typeof option === 'string' ? option : option && option.name;
      var cleanName = cleanOptionName(name);

      if (!cleanName) {
        return;
      }

      normalized.push({
        name: cleanName,
        active: !(option && option.active === false),
        quantity: toVariantQuantity(option && option.quantity)
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

    return toNumber(sale && sale.sell_price) * toNumber(sale && sale.sold_quantity);
  }

  function getVoucherFileName(sale) {
    var saleId = cleanOptionName(sale && sale.sale_id) || 'sale';
    var saleDate = cleanOptionName(sale && sale.sale_date) || todayString();

    return ('voucher-' + saleDate + '-' + saleId)
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-');
  }

  function buildVoucherMarkup(sale) {
    var productImageUrl = getProductImageUrl(sale.product_id);
    var variantParts = [];
    var totalIncome = getSaleTotalIncome(sale);
    var imageMarkup = '<div class="voucher-image-placeholder">-</div>';

    if (sale.sale_color) {
      variantParts.push('အရောင် - ' + sale.sale_color);
    }

    if (sale.sale_size) {
      variantParts.push('အရွယ်အစား - ' + sale.sale_size);
    }

    if (productImageUrl) {
      imageMarkup = '<img src="' + escapeHtml(productImageUrl) + '" alt="' + escapeHtml(sale.product_name || 'ကုန်ပစ္စည်းပုံ') + '">';
    }

    return [
      '<div class="voucher-brand">',
      '<strong>' + escapeHtml(getShopName()) + '</strong>',
      '<span>ရောင်းချမှုဘောင်ချာ</span>',
      '</div>',
      '<div class="voucher-meta-grid">',
      '<div><span>ဘောင်ချာနံပါတ်</span><strong>' + escapeHtml(sale.sale_id || '-') + '</strong></div>',
      '<div><span>ရက်စွဲ</span><strong>' + escapeHtml(sale.sale_date || '-') + '</strong></div>',
      '</div>',
      '<div class="voucher-product">',
      '<div class="voucher-product-image">' + imageMarkup + '</div>',
      '<div>',
      '<span>ကုန်ပစ္စည်း</span>',
      '<strong>' + escapeHtml(sale.product_name || '-') + '</strong>',
      '<small>' + escapeHtml(variantParts.length ? variantParts.join(' | ') : 'အရောင် / အရွယ်အစား မရှိပါ') + '</small>',
      '</div>',
      '</div>',
      '<table class="voucher-table">',
      '<thead><tr><th>အကြောင်းအရာ</th><th>တန်ဖိုး</th></tr></thead>',
      '<tbody>',
      '<tr><td>အရေအတွက်</td><td>' + escapeHtml(formatNumber(sale.sold_quantity)) + '</td></tr>',
      '<tr><td>ရောင်းဈေး</td><td>' + escapeHtml(formatMoney(sale.sell_price)) + '</td></tr>',
      '<tr><td>စုစုပေါင်း</td><td>' + escapeHtml(formatMoney(totalIncome)) + '</td></tr>',
      '</tbody>',
      '</table>',
      '<div class="voucher-total"><span>ကျသင့်ငွေ</span><strong>' + escapeHtml(formatMoney(totalIncome)) + '</strong></div>',
      '<p class="voucher-thanks">ဝယ်ယူအားပေးမှုအတွက် ကျေးဇူးတင်ပါသည်။</p>'
    ].join('');
  }

  function buildVoucherDocument(sale) {
    return [
      '<!DOCTYPE html>',
      '<html lang="my">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>ဘောင်ချာ - ' + escapeHtml(sale.sale_id || '') + '</title>',
      '<style>',
      'body{margin:0;padding:18px;background:#f6f7f9;color:#17202a;font-family:"Myanmar Text","Noto Sans Myanmar",Arial,sans-serif;font-size:14px;line-height:1.5;}',
      '.sale-voucher{width:min(100%,80mm);margin:0 auto;padding:18px;background:#fff;border:1px solid #d7dde5;border-radius:8px;}',
      '.voucher-brand{text-align:center;margin-bottom:14px}.voucher-brand strong{display:block;font-size:20px}.voucher-brand span{color:#667085;font-weight:700}',
      '.voucher-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.voucher-meta-grid div{padding:8px;border:1px solid #d7dde5;border-radius:6px}.voucher-meta-grid span,.voucher-product span{display:block;color:#667085;font-size:12px;font-weight:700}.voucher-meta-grid strong,.voucher-product strong{display:block;overflow-wrap:anywhere}',
      '.voucher-product{display:grid;grid-template-columns:58px 1fr;gap:10px;align-items:center;padding:8px;margin-bottom:12px;border:1px solid #d7dde5;border-radius:6px}.voucher-product-image{width:58px;height:58px;display:grid;place-items:center;overflow:hidden;border:1px solid #d7dde5;border-radius:6px;background:#f8fafc}.voucher-product-image img{width:100%;height:100%;object-fit:cover}.voucher-product small{display:block;color:#667085;font-weight:700}',
      '.voucher-table{width:100%;border-collapse:collapse}.voucher-table th,.voucher-table td{padding:8px;border-bottom:1px solid #d7dde5;text-align:left}.voucher-table th{background:#eef3f8;font-size:12px}.voucher-total{display:flex;justify-content:space-between;gap:12px;padding:12px 0;font-size:18px;font-weight:800}.voucher-thanks{text-align:center;color:#667085;font-weight:700}',
      '@media print{body{padding:0;background:#fff}.sale-voucher{width:80mm;border:0;border-radius:0}}',
      '</style>',
      '</head>',
      '<body>',
      '<main class="sale-voucher">',
      buildVoucherMarkup(sale),
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

  function getProductSearchText(product) {
    return [
      product.product_id,
      product.product_name,
      product.category,
      variantSearchText(product.color),
      variantSearchText(product.size),
      product.image_name
    ].join(' ').toLowerCase();
  }

  function getFilteredSaleProducts() {
    var query = getSaleProductSearchQuery();

    if (!query) {
      return products.slice();
    }

    return products.filter(function (product) {
      return getProductSearchText(product).indexOf(query) !== -1;
    });
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

  function createVoucherCell(sale) {
    var cell = document.createElement('td');
    var button = document.createElement('button');

    button.className = 'small-button';
    button.type = 'button';
    button.textContent = 'ဘောင်ချာ';
    button.addEventListener('click', function () {
      showSaleVoucher(sale);
    });

    cell.appendChild(button);
    return setCellLabel(cell, 'ဘောင်ချာ');
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

      option.value = product.product_id;
      option.textContent = productLabel + ' - လက်ကျန် ' + formatNumber(quantity);
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
      'လက်ကျန် ' + formatNumber(selectedProduct.quantity),
      'ရောင်းဈေး ' + formatNumber(selectedProduct.sell_price),
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
    select.required = true;

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
    var available = selectedProduct ? toNumber(selectedProduct.quantity) : 0;
    var colorOptions = selectedProduct ? getActiveVariantOptions(selectedProduct.color) : [];
    var sizeOptions = selectedProduct ? getActiveVariantOptions(selectedProduct.size) : [];
    var selectedColor = getSelectedVariant('color');
    var selectedSize = getSelectedVariant('size');

    if (colorOptions.length && selectedColor) {
      available = Math.min(available, toNumber(selectedColor.quantity));
    }

    if (sizeOptions.length && selectedSize) {
      available = Math.min(available, toNumber(selectedSize.quantity));
    }

    if ((colorOptions.length && !selectedColor) || (sizeOptions.length && !selectedSize)) {
      return 0;
    }

    return available;
  }

  function calculateSale() {
    var quantityInput = byId('soldQuantity');
    var soldQuantity = quantityInput ? toNumber(quantityInput.value) : 0;
    var buyPrice = selectedProduct ? toNumber(selectedProduct.buy_price) : 0;
    var sellPrice = selectedProduct ? toNumber(selectedProduct.sell_price) : 0;
    var availableQuantity = selectedProduct ? getAvailableSaleQuantity() : 0;
    var totalCost = buyPrice * soldQuantity;
    var totalIncome = sellPrice * soldQuantity;
    var profit = totalIncome - totalCost;

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
    renderSelectedProduct();
    calculateSale();
    setMessage('');
  }

  function renderSalesTable() {
    var tableBody = byId('salesTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);
    setText('salesCount', sales.length + ' ခု');

    if (!sales.length) {
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ'));
      return;
    }

    sales.forEach(function (sale) {
      var row = document.createElement('tr');

      row.appendChild(createCell(sale.sale_date, 'ရက်စွဲ'));
      row.appendChild(createImageCell(getProductImageUrl(sale.product_id), sale.product_name, 'ပုံ'));
      row.appendChild(createCell(sale.product_name, 'ကုန်ပစ္စည်းအမည်'));
      row.appendChild(createCell(sale.sale_color || '-', 'အရောင်'));
      row.appendChild(createCell(sale.sale_size || '-', 'အရွယ်အစား'));
      row.appendChild(createCell(formatNumber(sale.sold_quantity), 'အရေအတွက်'));
      row.appendChild(createCell(formatNumber(sale.buy_price), 'ဝယ်ဈေး'));
      row.appendChild(createCell(formatNumber(sale.sell_price), 'ရောင်းဈေး'));
      row.appendChild(createCell(formatNumber(sale.total_income), 'စုစုပေါင်းဝင်ငွေ'));
      row.appendChild(createCell(formatNumber(sale.profit), 'အမြတ်'));
      row.appendChild(createVoucherCell(sale));
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

  function loadProducts() {
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
        renderProductOptions();
        handleProductChange();
      })
      .catch(function (error) {
        setMessage(error && error.message ? error.message : 'ကုန်ပစ္စည်းများ မယူနိုင်ပါ။', 'is-danger');
      });
  }

  function loadSales() {
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

  function setFormBusy(isBusy) {
    var form = byId('saleForm');
    var buttons = form ? form.querySelectorAll('button') : [];

    buttons.forEach(function (button) {
      button.disabled = isBusy;
    });
  }

  function clearSaleFormAfterSubmit(productId) {
    var quantityInput = byId('soldQuantity');

    if (quantityInput) {
      quantityInput.value = '';
    }

    if (productId && byId('saleProduct')) {
      byId('saleProduct').value = productId;
    }

    calculateSale();
  }

  function recordSale(event) {
    var soldQuantity;
    var saleDate;
    var sale;
    var colorOptions;
    var sizeOptions;
    var selectedColor;
    var selectedSize;
    var availableQuantity;
    var savedSale = null;

    event.preventDefault();
    setMessage('');

    if (!selectedProduct) {
      setMessage('ကုန်ပစ္စည်း ရွေးချယ်ပါ။', 'is-danger');
      return;
    }

    soldQuantity = toNumber(byId('soldQuantity').value);
    colorOptions = getActiveVariantOptions(selectedProduct.color);
    sizeOptions = getActiveVariantOptions(selectedProduct.size);
    selectedColor = getSelectedVariant('color');
    selectedSize = getSelectedVariant('size');
    availableQuantity = getAvailableSaleQuantity();

    if (soldQuantity <= 0) {
      setMessage('အရေအတွက် မှန်ကန်စွာ ထည့်ပါ။', 'is-danger');
      return;
    }

    if (colorOptions.length && !selectedColor) {
      setMessage('အရောင် ရွေးချယ်ပါ။', 'is-danger');
      return;
    }

    if (sizeOptions.length && !selectedSize) {
      setMessage('အရွယ်အစား ရွေးချယ်ပါ။', 'is-danger');
      return;
    }

    if (soldQuantity > availableQuantity) {
      setMessage('လက်ကျန်အရေအတွက်ထက် ပိုမရောင်းနိုင်ပါ။', 'is-danger');
      return;
    }

    saleDate = byId('saleDate').value || todayString();
    sale = {
      product_id: selectedProduct.product_id,
      sold_quantity: soldQuantity,
      sale_date: saleDate,
      sale_color: selectedColor ? selectedColor.name : '',
      sale_size: selectedSize ? selectedSize.name : ''
    };

    setFormBusy(true);
    setMessage('သိမ်းနေပါသည်', 'is-warning');

    api.recordSale(sale)
      .then(function (data) {
        if (data && data.sale) {
          savedSale = data.sale;
          sales.unshift(savedSale);
          setCachedSales(sales);
        }

        if (data && data.product) {
          updateProductFromSale(data.product);
        }

        renderSalesTable();
        summarizeToday();
        clearSaleFormAfterSubmit(selectedProduct ? selectedProduct.product_id : '');
        setMessage('ရောင်းချမှုထည့်ပြီးပါပြီ။', 'is-success');

        if (savedSale) {
          showSaleVoucher(savedSale);
        }
      })
      .catch(function (error) {
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
    var productSelect = byId('saleProduct');
    var colorSelect = byId('saleColor');
    var sizeSelect = byId('saleSize');
    var quantityInput = byId('soldQuantity');
    var form = byId('saleForm');
    var printVoucherButton = byId('printVoucherButton');
    var downloadVoucherButton = byId('downloadVoucherButton');

    if (productSearch) {
      productSearch.addEventListener('input', handleProductSearchInput);
    }

    if (productSelect) {
      productSelect.addEventListener('change', handleProductChange);
    }

    if (quantityInput) {
      quantityInput.addEventListener('input', calculateSale);
    }

    if (colorSelect) {
      colorSelect.addEventListener('change', calculateSale);
    }

    if (sizeSelect) {
      sizeSelect.addEventListener('change', calculateSale);
    }

    if (form) {
      form.addEventListener('submit', recordSale);
    }

    if (printVoucherButton) {
      printVoucherButton.addEventListener('click', printSaleVoucher);
    }

    if (downloadVoucherButton) {
      downloadVoucherButton.addEventListener('click', downloadSaleVoucher);
    }

    document.querySelectorAll('[data-close-voucher]').forEach(function (button) {
      button.addEventListener('click', closeSaleVoucher);
    });

    document.addEventListener('mmc:settings-loaded', function (event) {
      applyShopSettings(event.detail || {});
    });

    window.addEventListener('afterprint', finishPrintingVoucher);
  }

  function initSales() {
    if (!document.body || document.body.getAttribute('data-page') !== 'sales') {
      return;
    }

    initDate();
    bindEvents();
    loadProducts().then(loadSales);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSales);
  } else {
    initSales();
  }
})();
