(function () {
  'use strict';

  var api = window.MMC_API;
  var cache = window.MMC_CACHE;
  var products = [];
  var filteredProducts = [];
  var editingProductId = '';
  var lastAddedProductId = '';
  var PRODUCT_COLUMN_COUNT = 13;
  var productBarcodeScannerStream = null;
  var productBarcodeScannerTimer = null;
  var productBarcodeDetector = null;
  var productZxingReader = null;
  var productZxingScannerControls = null;
  var productBarcodeScannerStarting = false;
  var variantOptionState = {
    color: [],
    size: []
  };

  function isStaffRole() {
    return Boolean(window.MMC_AUTH && typeof window.MMC_AUTH.isStaffRole === 'function' && window.MMC_AUTH.isStaffRole());
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var element = byId(id);

    if (element) {
      element.textContent = value;
    }
  }

  function t(key, fallback) {
    if (window.MMC_I18N && typeof window.MMC_I18N.translate === 'function') {
      return window.MMC_I18N.translate(key);
    }

    return fallback || key;
  }

  function setMessage(message, type) {
    var element = byId('productMessage');

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
      var existing;
      var quantity = legacyOption ? legacyOption.quantity : toVariantQuantity(option && option.quantity);

      if (!cleanName) {
        return;
      }

      existing = normalized.find(function (item) {
        return item.name.toLowerCase() === cleanName.toLowerCase();
      });

      if (existing) {
        existing.active = existing.active || !(option && option.active === false);
        existing.quantity = Math.max(existing.quantity, quantity);
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

  function variantSearchText(value) {
    return parseVariantOptions(value).map(function (option) {
      return option.name;
    }).join(' ');
  }

  function getVariantConfig(type) {
    if (type === 'color') {
      return {
        hiddenId: 'productColor',
        inputId: 'productColorNew',
        listId: 'productColorOptions',
        emptyText: 'အရောင်မရှိသေးပါ'
      };
    }

    return {
      hiddenId: 'productSize',
      inputId: 'productSizeNew',
      listId: 'productSizeOptions',
      emptyText: 'အရွယ်အစားမရှိသေးပါ'
    };
  }

  function syncVariantInput(type) {
    var config = getVariantConfig(type);
    var hiddenInput = byId(config.hiddenId);

    if (hiddenInput) {
      hiddenInput.value = serializeVariantOptions(variantOptionState[type]);
    }
  }

  function setVariantOptions(type, value) {
    variantOptionState[type] = parseVariantOptions(value);
    syncVariantInput(type);
    renderVariantOptions(type);
  }

  function addVariantOption(type) {
    var config = getVariantConfig(type);
    var input = byId(config.inputId);
    var name = cleanOptionName(input ? input.value : '');
    var existing;

    if (!name) {
      return;
    }

    existing = variantOptionState[type].find(function (option) {
      return option.name.toLowerCase() === name.toLowerCase();
    });

    if (existing) {
      existing.active = true;
    } else {
      variantOptionState[type].push({
        name: name,
        active: true,
        quantity: 0
      });
    }

    if (input) {
      input.value = '';
      input.focus();
    }

    syncVariantInput(type);
    renderVariantOptions(type);
  }

  function removeVariantOption(type, index) {
    variantOptionState[type].splice(index, 1);
    syncVariantInput(type);
    renderVariantOptions(type);
  }

  function renderVariantOptions(type) {
    var config = getVariantConfig(type);
    var list = byId(config.listId);
    var options = variantOptionState[type];

    if (!list) {
      return;
    }

    clearElement(list);

    if (!options.length) {
      var empty = document.createElement('span');
      empty.className = 'option-empty';
      empty.textContent = config.emptyText;
      list.appendChild(empty);
      return;
    }

    options.forEach(function (option, index) {
      var label = document.createElement('label');
      var checkbox = document.createElement('input');
      var text = document.createElement('span');
      var quantityInput = document.createElement('input');
      var removeButton = document.createElement('button');

      label.className = option.active ? 'option-check-chip' : 'option-check-chip is-inactive';
      checkbox.type = 'checkbox';
      checkbox.checked = option.active;
      checkbox.addEventListener('change', function () {
        option.active = checkbox.checked;
        syncVariantInput(type);
        renderVariantOptions(type);
      });

      text.textContent = option.name;
      quantityInput.type = 'number';
      quantityInput.min = '0';
      quantityInput.step = '1';
      quantityInput.className = 'option-quantity-input';
      quantityInput.value = toVariantQuantity(option.quantity);
      quantityInput.setAttribute('aria-label', option.name + ' အရေအတွက်');
      quantityInput.addEventListener('click', function (event) {
        event.stopPropagation();
      });
      quantityInput.addEventListener('input', function () {
        option.quantity = toVariantQuantity(quantityInput.value);
        syncVariantInput(type);
      });

      removeButton.type = 'button';
      removeButton.className = 'option-remove-button';
      removeButton.setAttribute('aria-label', 'ဖယ်ရန်');
      removeButton.textContent = '×';
      removeButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        removeVariantOption(type, index);
      });

      label.appendChild(checkbox);
      label.appendChild(text);
      label.appendChild(quantityInput);
      label.appendChild(removeButton);
      list.appendChild(label);
    });
  }

  function getCachedProducts() {
    return cache && typeof cache.getProducts === 'function' ? cache.getProducts() : [];
  }

  function setCachedProducts(list) {
    if (cache && typeof cache.setProducts === 'function') {
      cache.setProducts(list);
    }
  }

  function renderCachedProducts() {
    var cachedProducts = getCachedProducts();

    if (!cachedProducts.length) {
      return false;
    }

    products = cachedProducts;
    filteredProducts = products.slice();
    applySearch();
    return true;
  }

  function formatNumber(value) {
    return toNumber(value).toLocaleString('en-US', {
      maximumFractionDigits: 2
    });
  }

  function isLowStock(product) {
    return toNumber(product.quantity) <= toNumber(product.low_stock_alert);
  }

  function createNextProductId(value) {
    var text = String(value || '').trim();
    var match = text.match(/^(.+?)(\d+)$/);
    var prefix;
    var numberText;
    var nextNumberText;

    if (!match) {
      return '';
    }

    prefix = match[1].replace(/[^A-Za-z]/g, '').toUpperCase() || 'P';
    numberText = match[2];
    nextNumberText = String(Number(numberText) + 1).padStart(Math.max(numberText.length, 5), '0');

    return prefix + nextNumberText;
  }

  function productIdExists(productId) {
    var target = String(productId || '').trim().toLowerCase();

    if (!target) {
      return false;
    }

    return products.some(function (product) {
      return String(product.product_id || '').trim().toLowerCase() === target;
    });
  }

  function findLatestProductId() {
    if (lastAddedProductId) {
      return lastAddedProductId;
    }

    if (!products.length) {
      return '';
    }

    return products[products.length - 1].product_id || '';
  }

  function getSuggestedProductId() {
    var nextId = createNextProductId(findLatestProductId()) || 'P00001';
    var guard = 0;

    while (nextId && productIdExists(nextId) && guard < 1000) {
      nextId = createNextProductId(nextId);
      guard += 1;
    }

    return nextId;
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

    cell.colSpan = PRODUCT_COLUMN_COUNT;
    cell.textContent = message;
    row.appendChild(cell);

    return row;
  }

  function createLoadingRow(message) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    var loading = document.createElement('span');

    cell.colSpan = PRODUCT_COLUMN_COUNT;
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

  function createVariantCell(value, labelText) {
    var cell = document.createElement('td');
    var options = parseVariantOptions(value);
    var list;

    if (!options.length) {
      cell.textContent = '-';
      return labelText ? setCellLabel(cell, labelText) : cell;
    }

    list = document.createElement('div');
    list.className = 'variant-pill-list';

    options.forEach(function (option) {
      var pill = document.createElement('span');
      var quantityText = formatNumber(option.quantity);

      pill.className = option.active ? 'variant-pill' : 'variant-pill is-inactive';
      pill.textContent = option.name + ' - ' + quantityText + ' ခု';
      list.appendChild(pill);
    });

    cell.appendChild(list);
    return labelText ? setCellLabel(cell, labelText) : cell;
  }

  function createActionButton(label, className, onClick) {
    var button = document.createElement('button');

    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', onClick);

    return button;
  }


  function variantViewText(value) {
    var options = parseVariantOptions(value);

    if (!options.length) {
      return '-';
    }

    return options.map(function (option) {
      return option.name + ' - ' + formatNumber(option.quantity) + ' ' + t('itemUnit', 'ခု');
    });
  }

  function openProductView(product) {
    var imageSrc = product && (product.image_src || product.image_url);

    if (!window.MMC_TABLE_VIEW || !product) {
      return;
    }

    window.MMC_TABLE_VIEW.open(t('details', 'အသေးစိတ်') + ' - ' + (product.product_name || product.product_id || t('products', 'ကုန်ပစ္စည်း')), [
      {
        title: t('products', 'ကုန်ပစ္စည်းများ'),
        fields: [
          { label: t('image', 'ပုံ'), value: imageSrc, alt: product.product_name, type: imageSrc ? 'image' : '' },
          { label: t('productId', 'ကုန်ပစ္စည်း ID'), value: product.product_id || '-' },
          { label: t('barcode', 'Barcode'), value: product.barcode || '-' },
          { label: t('productName', 'ကုန်ပစ္စည်းအမည်'), value: product.product_name || '-' },
          { label: t('category', 'အမျိုးအစား'), value: product.category || '-' },
          { label: t('color', 'အရောင်'), value: variantViewText(product.color) },
          { label: t('size', 'အရွယ်အစား'), value: variantViewText(product.size) },
          { label: t('expiryDate', 'သက်တမ်းကုန်ရက်'), value: product.expiry_date || '-' }
        ]
      },
      {
        title: t('stockOverview', 'လက်ကျန်အခြေအနေ'),
        fields: [
          { label: t('quantity', 'အရေအတွက်'), value: formatNumber(product.quantity) },
          { label: t('buyPrice', 'ဝယ်ဈေး'), value: formatNumber(product.buy_price) },
          { label: t('sellPrice', 'ရောင်းဈေး'), value: formatNumber(product.sell_price) },
          { label: t('lowStockLimit', 'သတ်မှတ်ချက်'), value: formatNumber(product.low_stock_alert) },
          { label: t('lowStock', 'လက်ကျန်နည်းနေပါသည်'), value: isLowStock(product) ? t('lowStock', 'လက်ကျန်နည်းနေပါသည်') : '-' }
        ]
      }
    ]);
  }

  function createProductViewButton(product) {
    if (window.MMC_TABLE_VIEW && typeof window.MMC_TABLE_VIEW.createViewButton === 'function') {
      return window.MMC_TABLE_VIEW.createViewButton(function () {
        openProductView(product);
      }, t('view', 'ကြည့်ရန်'));
    }

    return createActionButton(t('view', 'ကြည့်ရန်'), 'small-button icon-view', function () {
      openProductView(product);
    });
  }

  function renderProductsLegacy_() {
    var tableBody = byId('productsTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);
    setText('productsCount', filteredProducts.length + ' ခု');

    if (!filteredProducts.length) {
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ'));
      return;
    }

    filteredProducts.forEach(function (product) {
      var row = document.createElement('tr');
      var lowStock = isLowStock(product);
      var stockCell;
      var alertCell;
      var actionsCell;
      var actions;

      row.appendChild(createImageCell(product.image_src || product.image_url, product.product_name, 'ပုံ'));
      row.appendChild(createCell(product.product_id || '-', 'ကုန်ပစ္စည်း ID'));
      row.appendChild(createCell(product.barcode || '-', 'Barcode'));
      row.appendChild(createCell(product.product_name, 'ကုန်ပစ္စည်းအမည်'));
      row.appendChild(createCell(product.category, 'အမျိုးအစား'));
      row.appendChild(createVariantCell(product.color, 'အရောင်'));
      row.appendChild(createVariantCell(product.size, 'အရွယ်အစား'));
      row.appendChild(createCell(product.expiry_date || '-', 'သက်တမ်းကုန်ရက်'));

      stockCell = createCell(formatNumber(product.quantity), 'အရေအတွက်');
      if (lowStock) {
        stockCell.classList.add('is-danger');
      }
      row.appendChild(stockCell);

      row.appendChild(createCell(formatNumber(product.buy_price), 'ဝယ်ဈေး'));
      row.appendChild(createCell(formatNumber(product.sell_price), 'ရောင်းဈေး'));

      alertCell = document.createElement('td');
      alertCell.setAttribute('data-label', 'လက်ကျန်နည်းနေပါသည်');
      alertCell.textContent = lowStock ? 'လက်ကျန်နည်းနေပါသည်' : formatNumber(product.low_stock_alert);
      if (lowStock) {
        alertCell.classList.add('is-danger');
      }
      row.appendChild(alertCell);

      actionsCell = document.createElement('td');
      actionsCell.setAttribute('data-label', 'လုပ်ဆောင်ချက်');
      actions = document.createElement('div');
      actions.className = 'table-actions';
      actions.appendChild(createProductViewButton(product));
      actions.appendChild(createActionButton('ပြင်ရန်', 'small-button icon-edit', function () {
        openProductDialog(product);
      }));
      actions.appendChild(createActionButton('ဖျက်ရန်', 'small-button danger-button icon-delete', function () {
        deleteProduct(product);
      }));
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);

      tableBody.appendChild(row);
    });

    if (isStaffRole()) {
      tableBody.querySelectorAll('.table-actions').forEach(function (actions) {
        var cell = actions.parentElement;
        actions.remove();
        if (cell) {
          cell.textContent = '-';
        }
      });
    }
  }

  function renderProducts() {
    var tableBody = byId('productsTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);
    setText('productsCount', filteredProducts.length + ' ' + t('itemUnit', 'ခု'));

    if (!filteredProducts.length) {
      tableBody.appendChild(createEmptyRow(t('noData', 'ဒေတာမရှိပါ')));
      return;
    }

    filteredProducts.forEach(function (product) {
      var row = document.createElement('tr');
      var lowStock = isLowStock(product);
      var stockCell;
      var alertCell;
      var actionsCell;
      var actions;

      row.className = lowStock ? 'is-low-stock-row' : '';
      row.appendChild(createImageCell(product.image_src || product.image_url, product.product_name, 'Image'));
      row.appendChild(createCell(product.product_id || '-', t('productId', 'ကုန်ပစ္စည်း ID')));
      row.appendChild(createCell(product.barcode || '-', t('barcode', 'Barcode')));
      row.appendChild(createCell(product.product_name, t('productName', 'ကုန်ပစ္စည်းအမည်')));
      row.appendChild(createCell(product.category, t('category', 'အမျိုးအစား')));
      row.appendChild(createVariantCell(product.color, t('color', 'အရောင်')));
      row.appendChild(createVariantCell(product.size, t('size', 'အရွယ်အစား')));
      row.appendChild(createCell(product.expiry_date || '-', t('expiryDate', 'သက်တမ်းကုန်ရက်')));

      stockCell = createCell(formatNumber(product.quantity), t('quantity', 'အရေအတွက်'));
      if (lowStock) {
        stockCell.classList.add('is-danger');
      }
      row.appendChild(stockCell);

      row.appendChild(createCell(formatNumber(product.buy_price), t('buyPrice', 'ဝယ်ဈေး')));
      row.appendChild(createCell(formatNumber(product.sell_price), t('sellPrice', 'ရောင်းဈေး')));

      alertCell = document.createElement('td');
      alertCell.setAttribute('data-label', t('lowStock', 'လက်ကျန်နည်းနေပါသည်'));
      alertCell.textContent = lowStock ? t('lowStock', 'လက်ကျန်နည်းနေပါသည်') : formatNumber(product.low_stock_alert);
      if (lowStock) {
        alertCell.classList.add('is-danger');
      }
      row.appendChild(alertCell);

      actionsCell = document.createElement('td');
      actionsCell.setAttribute('data-label', t('action', 'လုပ်ဆောင်ချက်'));
      actions = document.createElement('div');
      actions.className = 'table-actions';
      actions.appendChild(createProductViewButton(product));
      actions.appendChild(createActionButton(t('edit', 'ပြင်ရန်'), 'small-button icon-edit', function () {
        openProductDialog(product);
      }));
      actions.appendChild(createActionButton(t('delete', 'ဖျက်ရန်'), 'small-button danger-button icon-delete', function () {
        deleteProduct(product);
      }));
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);

      tableBody.appendChild(row);
    });
  }

  function applySearch() {
    var searchInput = byId('productSearch');
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (!query) {
      filteredProducts = products.slice();
      renderProducts();
      return;
    }

    filteredProducts = products.filter(function (product) {
      return [
        product.product_id,
        product.product_name,
        product.category,
        variantSearchText(product.color),
        variantSearchText(product.size),
        product.barcode,
        product.expiry_date,
        product.image_name
      ].join(' ').toLowerCase().indexOf(query) !== -1;
    });

    renderProducts();
  }

  function clearSearch() {
    var searchInput = byId('productSearch');

    if (searchInput) {
      searchInput.value = '';
    }
  }

  function upsertProduct(product) {
    var foundIndex;

    if (!product || !product.product_id) {
      return;
    }

    foundIndex = products.findIndex(function (item) {
      return item.product_id === product.product_id;
    });

    if (foundIndex >= 0) {
      products[foundIndex] = product;
    } else {
      products.unshift(product);
    }

    setCachedProducts(products);
    applySearch();
  }

  function removeProduct(productId) {
    products = products.filter(function (product) {
      return product.product_id !== productId;
    });

    setCachedProducts(products);
    applySearch();
  }

  function setTableLoading(message, isLoading) {
    var tableBody = byId('productsTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);
    tableBody.appendChild(isLoading ? createLoadingRow(message) : createEmptyRow(message));
  }

  function loadProducts(options) {
    options = options || {};

    if (!api || typeof api.listProducts !== 'function') {
      var hadCachedProducts = renderCachedProducts();

      if (!options.silent && !hadCachedProducts) {
        setTableLoading('API ချိတ်ဆက်မှု မရှိပါ။', false);
      }
      return Promise.resolve();
    }

    if (!options.silent) {
      renderCachedProducts();
    }

    return api.listProducts()
      .then(function (data) {
        var nextProducts = data && Array.isArray(data.products) ? data.products : [];

        if (!nextProducts.length && products.length) {
          return;
        }

        products = nextProducts;
        setCachedProducts(products);
        filteredProducts = products.slice();
        applySearch();
      })
      .catch(function () {
        if (!options.silent) {
          renderCachedProducts();
        }
      });
  }

  function refreshProductsSilently(options) {
    options = options || {};
    options.silent = true;
    return loadProducts(options);
  }

  function getDialog() {
    return byId('productDialog');
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
    stopProductBarcodeScanner();

    if (!dialog) {
      return;
    }

    if (typeof dialog.close === 'function') {
      dialog.close();
      return;
    }

    dialog.removeAttribute('open');
  }

  function setProductBarcodeScannerUi(isScanning) {
    var video = byId('productBarcodeScannerVideo');
    var startButton = byId('startProductBarcodeScanButton');
    var stopButton = byId('stopProductBarcodeScanButton');

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

  function stopProductBarcodeScanner() {
    var video = byId('productBarcodeScannerVideo');

    productBarcodeScannerStarting = false;

    if (productBarcodeScannerTimer) {
      window.clearInterval(productBarcodeScannerTimer);
      productBarcodeScannerTimer = null;
    }

    if (productZxingScannerControls && typeof productZxingScannerControls.stop === 'function') {
      productZxingScannerControls.stop();
      productZxingScannerControls = null;
    }

    if (window.ZXingBrowser &&
        window.ZXingBrowser.BrowserCodeReader &&
        typeof window.ZXingBrowser.BrowserCodeReader.releaseAllStreams === 'function') {
      window.ZXingBrowser.BrowserCodeReader.releaseAllStreams();
    }

    if (productBarcodeScannerStream) {
      productBarcodeScannerStream.getTracks().forEach(function (track) {
        track.stop();
      });
      productBarcodeScannerStream = null;
    }

    if (video) {
      video.pause();
      video.srcObject = null;
      video.hidden = true;
    }

    setProductBarcodeScannerUi(false);
  }

  function getBarcodeFromScannerResult(result) {
    if (!result) {
      return '';
    }

    if (typeof result.getText === 'function') {
      return cleanOptionName(result.getText());
    }

    return cleanOptionName(result.text || result.rawValue || String(result));
  }

  function handleDetectedProductBarcode(code) {
    var input = byId('productBarcode');

    if (input) {
      input.value = code;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    }

    stopProductBarcodeScanner();
    setMessage('Barcode scanned.', 'is-success');
  }

  function scanProductBarcodeFrame(video) {
    if (!productBarcodeDetector || !video || video.hidden) {
      return;
    }

    productBarcodeDetector.detect(video)
      .then(function (codes) {
        if (codes && codes.length && codes[0].rawValue) {
          handleDetectedProductBarcode(codes[0].rawValue);
        }
      })
      .catch(function () {
        stopProductBarcodeScanner();
        setMessage('Camera barcode scan failed.', 'is-danger');
      });
  }

  function startProductZxingScanner(video) {
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
      return Promise.reject(new Error('ZXing scanner is not available.'));
    }

    productZxingReader = productZxingReader || new window.ZXingBrowser.BrowserMultiFormatReader();
    if (video) {
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.muted = true;
    }

    startWithConstraints = function (constraints) {
      return productZxingReader.decodeFromConstraints(constraints, video, function (result) {
        var code = getBarcodeFromScannerResult(result);

        if (code) {
          handleDetectedProductBarcode(code);
        }
      });
    };

    return startWithConstraints(preferredConstraints)
      .catch(function () {
        return startWithConstraints(fallbackConstraints);
      })
      .then(function (controls) {
        productZxingScannerControls = controls;
        setProductBarcodeScannerUi(true);
        setMessage('Camera scanner is open. Put the barcode in front of the camera.', 'is-warning');
      });
  }

  function startNativeProductBarcodeScanner(video) {
    productBarcodeDetector = productBarcodeDetector || new window.BarcodeDetector({
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
        productBarcodeScannerStream = stream;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;
        setProductBarcodeScannerUi(true);
        return video.play();
      })
      .then(function () {
        setMessage('Camera scanner is open. Put the barcode in front of the camera.', 'is-warning');
        productBarcodeScannerTimer = window.setInterval(function () {
          scanProductBarcodeFrame(video);
        }, 450);
      });
  }

  function startProductBarcodeScanner() {
    var video = byId('productBarcodeScannerVideo');

    if (!video || productBarcodeScannerStarting) {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMessage('Camera access is not available. Open with HTTPS or use the APK.', 'is-warning');
      return;
    }

    productBarcodeScannerStarting = true;
    stopProductBarcodeScanner();
    productBarcodeScannerStarting = true;
    setMessage('Opening camera...', 'is-warning');

    startProductZxingScanner(video)
      .catch(function () {
        if (!('BarcodeDetector' in window)) {
          throw new Error('Camera barcode scan is not available. Type the barcode manually.');
        }

        return startNativeProductBarcodeScanner(video);
      })
      .catch(function (error) {
        stopProductBarcodeScanner();
        setMessage(error && error.message ? error.message : 'Camera permission is not available.', 'is-danger');
      })
      .finally(function () {
        productBarcodeScannerStarting = false;
      });
  }

  function fillProductForm(product) {
    var productIdInput = byId('productId');

    editingProductId = product ? product.product_id || '' : '';
    setText('productFormTitle', product ? 'ကုန်ပစ္စည်းပြင်ရန်' : 'ကုန်ပစ္စည်းထည့်ရန်');

    productIdInput.value = product ? product.product_id || '' : getSuggestedProductId();
    productIdInput.readOnly = Boolean(product);
    productIdInput.placeholder = product ? '' : 'P00001';

    byId('productBarcode').value = product ? product.barcode || '' : '';
    byId('productName').value = product ? product.product_name || '' : '';
    byId('productImageFile').value = '';
    byId('productCategory').value = product ? product.category || '' : '';
    byId('productExpiryDate').value = product ? String(product.expiry_date || '').substring(0, 10) : '';
    setVariantOptions('color', product ? product.color || '' : '');
    setVariantOptions('size', product ? product.size || '' : '');
    byId('productQuantity').value = product ? product.quantity || 0 : '';
    byId('buyPrice').value = product ? product.buy_price || 0 : '';
    byId('sellPrice').value = product ? product.sell_price || 0 : '';
    byId('lowStockAlert').value = product ? product.low_stock_alert || 0 : 0;
  }

  function openProductDialog(product) {
    var dialog = getDialog();

    setMessage('');
    fillProductForm(product || null);
    openDialog(dialog);
  }

  function collectProductForm() {
    return {
      product_id: byId('productId').value.trim(),
      barcode: byId('productBarcode').value.trim(),
      product_name: byId('productName').value.trim(),
      category: byId('productCategory').value.trim(),
      expiry_date: byId('productExpiryDate').value,
      color: serializeVariantOptions(variantOptionState.color),
      size: serializeVariantOptions(variantOptionState.size),
      quantity: toNumber(byId('productQuantity').value),
      buy_price: toNumber(byId('buyPrice').value),
      sell_price: toNumber(byId('sellPrice').value),
      low_stock_alert: toNumber(byId('lowStockAlert').value)
    };
  }

  function validateProduct(product) {
    if (!product.product_name) {
      return 'ကုန်ပစ္စည်းအမည် ထည့်ပါ။';
    }

    if (product.quantity < 0) {
      return 'အရေအတွက် မမှန်ပါ။';
    }

    if (product.buy_price < 0) {
      return 'ဝယ်ဈေး မမှန်ပါ။';
    }

    if (product.sell_price < 0) {
      return 'ရောင်းဈေး မမှန်ပါ။';
    }

    if (product.low_stock_alert < 0) {
      return 'လက်ကျန်နည်း သတ်မှတ်ချက် မမှန်ပါ။';
    }

    return '';
  }

  function readImageUpload() {
    var input = byId('productImageFile');
    var file = input && input.files && input.files[0] ? input.files[0] : null;

    if (!file) {
      return Promise.resolve(null);
    }

    if (file.type.indexOf('image/') !== 0) {
      return Promise.reject(new Error('ပုံဖိုင်သာ ရွေးချယ်ပါ။'));
    }

    if (file.size > 5 * 1024 * 1024) {
      return Promise.reject(new Error('ပုံဖိုင်အရွယ်အစား 5MB ထက်မကြီးရပါ။'));
    }

    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function () {
        resolve({
          name: file.name,
          mime_type: file.type,
          data_url: reader.result
        });
      };
      reader.onerror = function () {
        reject(new Error('ပုံဖိုင် ဖတ်၍မရပါ။'));
      };
      reader.readAsDataURL(file);
    });
  }

  function setFormBusy(isBusy) {
    var form = byId('productForm');
    var buttons = form ? form.querySelectorAll('button') : [];

    buttons.forEach(function (button) {
      button.disabled = isBusy;
    });
  }

  function saveProduct(event) {
    var product;
    var validationMessage;
    var request;

    event.preventDefault();

    if (isStaffRole()) {
      setMessage('Sale staff cannot add or edit products.', 'is-danger');
      return;
    }

    if (!api) {
      setMessage('API ချိတ်ဆက်မှု မရှိပါ။', 'is-danger');
      return;
    }

    product = collectProductForm();
    validationMessage = validateProduct(product);

    if (validationMessage) {
      setMessage(validationMessage, 'is-danger');
      return;
    }

    setFormBusy(true);
    setMessage('သိမ်းနေပါသည်', 'is-warning');

    readImageUpload()
      .then(function (imageUpload) {
        if (imageUpload) {
          product.image_upload = imageUpload;
        }

        return editingProductId
          ? api.updateProduct(product)
          : api.addProduct(product);
      })
      .then(function (data) {
        clearSearch();

        if (data && data.product) {
          if (!editingProductId) {
            lastAddedProductId = data.product.product_id || lastAddedProductId;
          }
          upsertProduct(data.product);
        }

        setMessage('သိမ်းပြီးပါပြီ။', 'is-success');
        closeDialog(getDialog());
        return refreshProductsSilently({ preserveOnEmpty: true });
      })
      .catch(function (error) {
        setMessage(error && error.message ? error.message : 'သိမ်းခြင်း မအောင်မြင်ပါ။', 'is-danger');
      })
      .finally(function () {
        setFormBusy(false);
      });
  }

  function deleteProduct(product) {
    if (isStaffRole()) {
      window.alert('Sale staff cannot delete products.');
      return;
    }

    var productName = product.product_name || '';
    var confirmed = window.confirm('ဖျက်ရန် သေချာပါသလား။ ' + productName);

    if (!confirmed) {
      return;
    }

    api.deleteProduct(product.product_id)
      .then(function () {
        removeProduct(product.product_id);
        return refreshProductsSilently();
      })
      .catch(function (error) {
        window.alert(error && error.message ? error.message : 'ဖျက်ခြင်း မအောင်မြင်ပါ။');
      });
  }

  function bindDialogCloseButtons() {
    document.querySelectorAll('[data-close-dialog]').forEach(function (button) {
      button.addEventListener('click', function () {
        closeDialog(getDialog());
      });
    });
  }

  function bindEvents() {
    var openButton = byId('openProductFormButton');
    var form = byId('productForm');
    var searchInput = byId('productSearch');
    var addColorButton = byId('addColorOptionButton');
    var addSizeButton = byId('addSizeOptionButton');
    var startBarcodeScanButton = byId('startProductBarcodeScanButton');
    var stopBarcodeScanButton = byId('stopProductBarcodeScanButton');
    var colorInput = byId('productColorNew');
    var sizeInput = byId('productSizeNew');

    if (openButton) {
      if (isStaffRole()) {
        openButton.hidden = true;
      }

      openButton.addEventListener('click', function () {
        if (isStaffRole()) {
          setMessage('Sale staff cannot add products.', 'is-danger');
          return;
        }

        openProductDialog(null);
      });
    }

    if (form) {
      form.addEventListener('submit', saveProduct);
    }

    if (startBarcodeScanButton) {
      startBarcodeScanButton.addEventListener('click', startProductBarcodeScanner);
    }

    if (stopBarcodeScanButton) {
      stopBarcodeScanButton.addEventListener('click', stopProductBarcodeScanner);
    }

    if (searchInput) {
      searchInput.addEventListener('input', applySearch);
    }

    if (addColorButton) {
      addColorButton.addEventListener('click', function () {
        addVariantOption('color');
      });
    }

    if (addSizeButton) {
      addSizeButton.addEventListener('click', function () {
        addVariantOption('size');
      });
    }

    if (colorInput) {
      colorInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          addVariantOption('color');
        }
      });
    }

    if (sizeInput) {
      sizeInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          addVariantOption('size');
        }
      });
    }

    window.addEventListener('mmc:products-updated', function (event) {
      products = event && event.detail && Array.isArray(event.detail.products) ? event.detail.products : getCachedProducts();
      filteredProducts = products.slice();
      applySearch();
    });

    window.addEventListener('mmc:languagechange', renderProducts);

    bindDialogCloseButtons();
    window.addEventListener('beforeunload', stopProductBarcodeScanner);
    window.addEventListener('pagehide', stopProductBarcodeScanner);
  }

  function initProducts() {
    if (!document.body || document.body.getAttribute('data-page') !== 'products') {
      return;
    }

    bindEvents();
    loadProducts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProducts);
  } else {
    initProducts();
  }
})();
