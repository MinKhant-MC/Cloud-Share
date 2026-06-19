(function () {
  'use strict';

  var api = window.MMC_API;
  var cache = window.MMC_CACHE;
  var products = [];
  var filteredProducts = [];
  var variantOptionState = {
    color: [],
    size: []
  };

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

  function normalizeVariantOptions(options) {
    var normalized = [];

    if (!Array.isArray(options)) {
      return normalized;
    }

    options.forEach(function (option) {
      var name = typeof option === 'string' ? option : option && option.name;
      var cleanName = cleanOptionName(name);
      var existing;

      if (!cleanName) {
        return;
      }

      existing = normalized.find(function (item) {
        return item.name.toLowerCase() === cleanName.toLowerCase();
      });

      if (existing) {
        existing.active = existing.active || !(option && option.active === false);
        existing.quantity = Math.max(existing.quantity, toVariantQuantity(option && option.quantity));
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

    cell.colSpan = 10;
    cell.textContent = message;
    row.appendChild(cell);

    return row;
  }

  function createLoadingRow(message) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    var loading = document.createElement('span');

    cell.colSpan = 10;
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

  function renderProducts() {
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
      row.appendChild(createCell(product.product_name, 'ကုန်ပစ္စည်းအမည်'));
      row.appendChild(createCell(product.category, 'အမျိုးအစား'));
      row.appendChild(createVariantCell(product.color, 'အရောင်'));
      row.appendChild(createVariantCell(product.size, 'အရွယ်အစား'));

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
      actions.appendChild(createActionButton('ပြင်ရန်', 'small-button', function () {
        openProductDialog(product);
      }));
      actions.appendChild(createActionButton('ဖျက်ရန်', 'small-button danger-button', function () {
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

    if (!options.silent && !renderCachedProducts()) {
      setTableLoading('ဒေတာယူနေပါသည်', true);
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
      .catch(function (error) {
        if (!options.silent && !products.length) {
          setTableLoading(error && error.message ? error.message : 'ကုန်ပစ္စည်းများ မယူနိုင်ပါ။', false);
          return;
        }

        if (!options.silent) {
          window.alert(error && error.message ? error.message : 'ကုန်ပစ္စည်းများ မယူနိုင်ပါ။');
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
    if (!dialog) {
      return;
    }

    if (typeof dialog.close === 'function') {
      dialog.close();
      return;
    }

    dialog.removeAttribute('open');
  }

  function fillProductForm(product) {
    setText('productFormTitle', product ? 'ကုန်ပစ္စည်းပြင်ရန်' : 'ကုန်ပစ္စည်းထည့်ရန်');
    byId('productId').value = product ? product.product_id || '' : '';
    byId('productName').value = product ? product.product_name || '' : '';
    byId('productImageFile').value = '';
    byId('productCategory').value = product ? product.category || '' : '';
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
      product_name: byId('productName').value.trim(),
      category: byId('productCategory').value.trim(),
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

        return product.product_id
          ? api.updateProduct(product)
          : api.addProduct(product);
      })
      .then(function (data) {
        clearSearch();

        if (data && data.product) {
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
    var colorInput = byId('productColorNew');
    var sizeInput = byId('productSizeNew');

    if (openButton) {
      openButton.addEventListener('click', function () {
        openProductDialog(null);
      });
    }

    if (form) {
      form.addEventListener('submit', saveProduct);
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

    bindDialogCloseButtons();
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
