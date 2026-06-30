(function () {
  'use strict';

  var originalApi = window.MMC_API || null;
  var config = window.MMC_CONFIG || {};
  var storageKeys = config.STORAGE_KEYS || {};
  var syncTimer = null;
  var syncRunning = false;
  var CACHE_PREFIX = 'mmc_local_first_cache_v3_';
  var QUEUE_PREFIX = 'mmc_local_first_queue_v3_';

  function clean(value) {
    return String(value === undefined || value === null ? '' : value).trim();
  }

  function toNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function getStoredSession() {
    if (originalApi && typeof originalApi.getStoredSession === 'function') {
      return originalApi.getStoredSession();
    }

    return {
      user_id: localStorage.getItem(storageKeys.USER_ID || 'mmc_user_id') || '',
      session_token: localStorage.getItem(storageKeys.SESSION_TOKEN || 'mmc_session_token') || ''
    };
  }

  function hasSession() {
    var session = getStoredSession();
    return Boolean(clean(session.user_id) && clean(session.session_token));
  }

  function getUserKey() {
    var session = getStoredSession();
    return clean(session.user_id) || 'guest';
  }

  function storageKey(name) {
    return CACHE_PREFIX + getUserKey() + '_' + name;
  }

  function queueKey() {
    return QUEUE_PREFIX + getUserKey();
  }

  function safeRead(key, fallback) {
    var raw;

    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      return fallback;
    }

    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function getCachedList(name) {
    var value = safeRead(storageKey(name), []);
    return Array.isArray(value) ? value : [];
  }

  function setCachedList(name, list) {
    return safeWrite(storageKey(name), Array.isArray(list) ? list : []);
  }

  function getCachedObject(name) {
    var value = safeRead(storageKey(name), {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function setCachedObject(name, value) {
    return safeWrite(storageKey(name), value && typeof value === 'object' ? value : {});
  }

  function dispatch(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, {
        detail: detail || {}
      }));
    } catch (error) {
      // CustomEvent may not exist in very old browsers. Safe to ignore.
    }
  }

  function makeFilterKey(filters) {
    try {
      return JSON.stringify(filters || {});
    } catch (error) {
      return '{}';
    }
  }

  function hasList(name) {
    return getCachedList(name).length > 0;
  }

  function dateOnly(value) {
    return clean(value).substring(0, 10);
  }

  function filterSalesByDate(list, filters) {
    filters = filters || {};
    return (Array.isArray(list) ? list : []).filter(function (sale) {
      var saleDate = dateOnly(sale && sale.sale_date);

      if (filters.from_date && saleDate && saleDate < filters.from_date) {
        return false;
      }

      if (filters.to_date && saleDate && saleDate > filters.to_date) {
        return false;
      }

      return true;
    });
  }

  function todayString() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }

  function firstDayOfCurrentMonth() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
  }

  function summarizeSales(list) {
    return (Array.isArray(list) ? list : []).reduce(function (totals, sale) {
      totals.sold_quantity += toNumber(sale && sale.sold_quantity);
      totals.total_cost += toNumber(sale && sale.total_cost);
      totals.total_income += toNumber(sale && sale.total_income);
      totals.profit += toNumber(sale && sale.profit);
      return totals;
    }, {
      sold_quantity: 0,
      total_cost: 0,
      total_income: 0,
      profit: 0
    });
  }

  function lowStockProducts(products) {
    return (Array.isArray(products) ? products : []).filter(function (product) {
      var alert = toNumber(product && product.low_stock_alert);
      return alert > 0 && toNumber(product && product.quantity) <= alert;
    });
  }

  function buildDashboardFromLocal(filters) {
    var products = getCachedList('products');
    var sales = getCachedList('sales');
    var today = todayString();
    var month = today.substring(0, 7);
    var year = today.substring(0, 4);
    var dailySales = sales.filter(function (sale) { return dateOnly(sale.sale_date) === today; });
    var monthlySales = sales.filter(function (sale) { return dateOnly(sale.sale_date).substring(0, 7) === month; });
    var yearlySales = sales.filter(function (sale) { return dateOnly(sale.sale_date).substring(0, 4) === year; });
    var stockQuantity = products.reduce(function (sum, product) { return sum + toNumber(product.quantity); }, 0);

    return {
      product_count: products.length,
      stock_quantity: stockQuantity,
      sales_count: sales.length,
      products: products,
      sales: sales,
      settings: getCachedObject('settings'),
      reports: {
        date: today,
        month: month,
        year: year,
        daily: summarizeSales(dailySales),
        monthly: summarizeSales(monthlySales),
        yearly: summarizeSales(yearlySales),
        generated_at: new Date().toLocaleString('my-MM')
      },
      low_stock_products: lowStockProducts(products),
      local_first: true
    };
  }

  function upsertCachedProduct(product) {
    var list;
    var index;

    if (!product || !product.product_id) {
      return false;
    }

    list = getCachedList('products');
    index = list.findIndex(function (item) {
      return clean(item.product_id).toLowerCase() === clean(product.product_id).toLowerCase();
    });

    if (index >= 0) {
      list[index] = product;
    } else {
      list.unshift(product);
    }

    setCachedList('products', list);
    dispatch('mmc:products-updated', { products: list, source: 'local' });
    return true;
  }

  function removeCachedProduct(productId) {
    var target = clean(productId).toLowerCase();
    var list = getCachedList('products').filter(function (product) {
      return clean(product.product_id).toLowerCase() !== target;
    });

    setCachedList('products', list);
    dispatch('mmc:products-updated', { products: list, source: 'local' });
    return true;
  }

  function addOrReplaceCachedSale(sale) {
    var list;
    var saleId;
    var replaced = false;

    if (!sale) {
      return false;
    }

    saleId = clean(sale.sale_id);
    list = getCachedList('sales').map(function (item) {
      if (saleId && clean(item.sale_id) === saleId && clean(item.product_id) === clean(sale.product_id)) {
        replaced = true;
        return sale;
      }
      return item;
    });

    if (!replaced) {
      list.unshift(sale);
    }

    setCachedList('sales', list);
    dispatch('mmc:sales-updated', { sales: list, source: 'local' });
    return true;
  }

  function clearAllLocalCache() {
    [
      'products',
      'sales',
      'settings',
      'dashboard',
      'reports',
      'customers'
    ].forEach(function (name) {
      safeRemove(storageKey(name));
    });
  }

  function getQueue() {
    var queue = safeRead(queueKey(), []);
    return Array.isArray(queue) ? queue : [];
  }

  function setQueue(queue) {
    safeWrite(queueKey(), Array.isArray(queue) ? queue : []);
    dispatch('mmc:sync-queue-changed', { count: getQueue().length });
  }

  function stripClientFields(value) {
    var copy = clone(value || {});

    if (copy && typeof copy === 'object') {
      delete copy.__sync_status;
      delete copy.__local_id;
      delete copy.pending_sync;
      delete copy.product_image;
    }

    return copy;
  }

  function enqueue(action, data) {
    var queue = getQueue();

    queue.push({
      id: 'Q-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
      action: action,
      data: stripClientFields(data || {}),
      created_at: new Date().toISOString(),
      attempts: 0
    });

    setQueue(queue);
    scheduleSync(700);
  }

  function callOriginal(action, data) {
    if (!originalApi) {
      return Promise.reject(new Error('API ချိတ်ဆက်မှု မရှိပါ။'));
    }

    if (typeof originalApi.requestWithSession === 'function') {
      return originalApi.requestWithSession(action, data || {}, {
        silentLoading: true,
        timeoutMs: 30000
      });
    }

    return Promise.reject(new Error('API action မရှိပါ။'));
  }

  function applyNetworkResult(action, data) {
    if (!data) {
      return;
    }

    if ((action === 'addProduct' || action === 'updateProduct' || action === 'recordSale') && data.product) {
      upsertCachedProduct(data.product);
    }

    if (action === 'deleteProduct') {
      removeCachedProduct(data.product_id);
    }

    if (action === 'recordSale' && data.sale) {
      addOrReplaceCachedSale(data.sale);
    }

    if (action === 'updateSettings' && data.settings) {
      setCachedObject('settings', data.settings);
      dispatch('mmc:settings-updated', { settings: data.settings, source: 'network' });
    }
  }

  function syncQueue() {
    var queue;
    var item;

    if (syncRunning || !originalApi || navigator.onLine === false) {
      return Promise.resolve();
    }

    queue = getQueue();

    if (!queue.length) {
      return Promise.resolve();
    }

    syncRunning = true;
    item = queue[0];

    return callOriginal(item.action, item.data)
      .then(function (data) {
        applyNetworkResult(item.action, Object.assign({}, item.data || {}, data || {}));
        queue = getQueue();
        queue.shift();
        setQueue(queue);
        dispatch('mmc:sync-success', { action: item.action, remaining: queue.length });
      })
      .catch(function () {
        queue = getQueue();
        if (queue.length) {
          queue[0].attempts = toNumber(queue[0].attempts) + 1;
          queue[0].last_error_at = new Date().toISOString();
          setQueue(queue);
        }
      })
      .finally(function () {
        syncRunning = false;
        if (getQueue().length && navigator.onLine !== false) {
          scheduleSync(5000);
        }
      });
  }

  function scheduleSync(delay) {
    if (syncTimer) {
      window.clearTimeout(syncTimer);
    }

    syncTimer = window.setTimeout(function () {
      syncTimer = null;
      syncQueue();
    }, delay || 1200);
  }

  function refreshProductsInBackground() {
    if (!originalApi || typeof originalApi.listProducts !== 'function' || navigator.onLine === false) {
      return;
    }

    originalApi.requestWithSession('listProducts', {}, { silentLoading: true })
      .then(function (data) {
        var list = data && Array.isArray(data.products) ? data.products : [];
        if (list.length) {
          setCachedList('products', list);
          dispatch('mmc:products-updated', { products: list, source: 'network' });
        }
      })
      .catch(function () {});
  }

  function refreshSalesInBackground(filters) {
    if (!originalApi || typeof originalApi.listSales !== 'function' || navigator.onLine === false) {
      return;
    }

    originalApi.requestWithSession('listSales', filters || {}, { silentLoading: true })
      .then(function (data) {
        var list = data && Array.isArray(data.sales) ? data.sales : [];
        if (list.length) {
          setCachedList('sales', list);
          dispatch('mmc:sales-updated', { sales: list, source: 'network' });
        }
      })
      .catch(function () {});
  }

  function refreshSettingsInBackground() {
    if (!originalApi || typeof originalApi.getSettings !== 'function' || navigator.onLine === false) {
      return;
    }

    originalApi.requestWithSession('getSettings', {}, { silentLoading: true })
      .then(function (data) {
        if (data && data.settings) {
          setCachedObject('settings', data.settings);
          dispatch('mmc:settings-updated', { settings: data.settings, source: 'network' });
        }
      })
      .catch(function () {});
  }

  function refreshDashboardInBackground(filters) {
    if (!originalApi || typeof originalApi.getDashboard !== 'function' || navigator.onLine === false) {
      return;
    }

    originalApi.requestWithSession('getDashboard', filters || {}, { silentLoading: true })
      .then(function (data) {
        var wrapper = getCachedObject('dashboard');
        wrapper[makeFilterKey(filters)] = data || {};
        setCachedObject('dashboard', wrapper);
        if (data && Array.isArray(data.products)) {
          setCachedList('products', data.products);
        }
        if (data && Array.isArray(data.sales)) {
          setCachedList('sales', data.sales);
        }
        dispatch('mmc:dashboard-updated', { dashboard: data || {}, source: 'network' });
      })
      .catch(function () {});
  }

  function refreshReportsInBackground(filters) {
    if (!originalApi || typeof originalApi.getReports !== 'function' || navigator.onLine === false) {
      return;
    }

    originalApi.requestWithSession('getReports', filters || {}, { silentLoading: true })
      .then(function (data) {
        var wrapper = getCachedObject('reports');
        wrapper[makeFilterKey(filters)] = data || {};
        setCachedObject('reports', wrapper);
        dispatch('mmc:reports-updated', { report: data || {}, source: 'network' });
      })
      .catch(function () {});
  }

  function prefetchAll() {
    var filters;

    if (!hasSession()) {
      return;
    }

    filters = {
      from_date: firstDayOfCurrentMonth(),
      to_date: todayString(),
      date: todayString(),
      month: todayString().substring(0, 7),
      year: todayString().substring(0, 4)
    };

    refreshProductsInBackground();
    refreshSalesInBackground({});
    refreshSettingsInBackground();
    refreshDashboardInBackground(filters);
    refreshReportsInBackground(filters);
    scheduleSync(1200);
  }

  function parseVariantOptions(value) {
    var parsed;

    if (Array.isArray(value)) {
      return value;
    }

    value = clean(value);

    if (!value) {
      return [];
    }

    if (value.charAt(0) === '[') {
      try {
        parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    return value.split(/[\n,]+/).map(function (text) {
      var match = clean(text).match(/^(.+?)\s*(?:-|:|=|x|X)\s*(\d+(?:\.\d+)?)\s*(?:ခု|pcs?|items?)?\s*$/i);
      return match ? { name: clean(match[1]), quantity: toNumber(match[2]), active: true } : { name: clean(text), quantity: 0, active: true };
    }).filter(function (option) {
      return option.name;
    });
  }

  function serializeVariantOptions(options) {
    return Array.isArray(options) && options.length ? JSON.stringify(options) : '';
  }

  function adjustVariantQuantity(value, selectedName, soldQuantity) {
    var target = clean(selectedName).toLowerCase();
    var options;

    if (!target) {
      return value;
    }

    options = parseVariantOptions(value);
    options.forEach(function (option) {
      if (clean(option.name).toLowerCase() === target) {
        option.quantity = Math.max(0, toNumber(option.quantity) - soldQuantity);
        option.active = option.quantity > 0;
      }
    });

    return serializeVariantOptions(options);
  }

  function findProduct(productId) {
    var target = clean(productId).toLowerCase();
    return getCachedList('products').find(function (product) {
      return clean(product.product_id).toLowerCase() === target;
    }) || null;
  }

  function buildLocalSale(sale, product) {
    var soldQuantity = toNumber(sale && sale.sold_quantity);
    var buyPrice = toNumber(product && product.buy_price);
    var sellPrice = toNumber(product && product.sell_price);
    var subtotal = sellPrice * soldQuantity;
    var discountPercent = Math.max(0, toNumber(sale && sale.discount_percent));
    var discountAmount = subtotal * (discountPercent / 100);
    var taxableSubtotal = Math.max(0, subtotal - discountAmount);
    var taxPercent = Math.max(0, toNumber(sale && sale.tax_percent));
    var taxAmount = taxableSubtotal * (taxPercent / 100);

    return {
      sale_id: clean(sale && sale.sale_id) || ('LOCAL-' + Date.now()),
      product_id: clean(sale && sale.product_id),
      product_name: clean(product && product.product_name) || clean(sale && sale.product_name),
      sold_quantity: soldQuantity,
      buy_price: buyPrice,
      sell_price: sellPrice,
      total_cost: buyPrice * soldQuantity,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      total_income: taxableSubtotal + taxAmount,
      profit: taxableSubtotal - (buyPrice * soldQuantity),
      sale_date: clean(sale && sale.sale_date) || new Date().toISOString().substring(0, 10),
      sale_color: clean(sale && sale.sale_color),
      sale_size: clean(sale && sale.sale_size),
      customer_name: clean(sale && sale.customer_name),
      customer_phone: clean(sale && sale.customer_phone),
      payment_method: clean(sale && sale.payment_method) || clean(sale && sale.payment) || 'Cash',
      created_at: new Date().toISOString(),
      pending_sync: true
    };
  }

  function deductLocalStock(product, sale) {
    var updated;
    var soldQuantity;

    if (!product) {
      return null;
    }

    updated = Object.assign({}, product);
    soldQuantity = toNumber(sale && sale.sold_quantity);
    updated.quantity = Math.max(0, toNumber(updated.quantity) - soldQuantity);
    updated.color = adjustVariantQuantity(updated.color, sale.sale_color, soldQuantity);
    updated.size = adjustVariantQuantity(updated.size, sale.sale_size, soldQuantity);
    updated.__sync_status = 'pending_upload';
    upsertCachedProduct(updated);
    return updated;
  }

  function makeLocalProduct(product, status) {
    var local = Object.assign({}, product || {});
    local.__sync_status = status || 'pending_upload';
    local.updated_at = local.updated_at || new Date().toISOString();
    return local;
  }

  window.MMC_CACHE = Object.freeze({
    getProducts: function () {
      return getCachedList('products');
    },
    setProducts: function (list) {
      var ok = setCachedList('products', list);
      dispatch('mmc:products-updated', { products: list || [], source: 'cache' });
      return ok;
    },
    updateProduct: upsertCachedProduct,
    removeProduct: removeCachedProduct,
    getSales: function () {
      return getCachedList('sales');
    },
    setSales: function (list) {
      var ok = setCachedList('sales', list);
      dispatch('mmc:sales-updated', { sales: list || [], source: 'cache' });
      return ok;
    },
    addSale: addOrReplaceCachedSale,
    getSettings: function () {
      return getCachedObject('settings');
    },
    setSettings: function (settings) {
      return setCachedObject('settings', settings || {});
    },
    getQueueCount: function () {
      return getQueue().length;
    },
    syncNow: syncQueue,
    clearAll: clearAllLocalCache
  });

  if (!originalApi) {
    return;
  }

  window.MMC_API = Object.freeze(Object.assign({}, originalApi, {
    listProducts: function () {
      var cached = getCachedList('products');
      refreshProductsInBackground();
      return Promise.resolve({ products: cached, local_first: true, background_sync: true });
    },

    listSales: function (filters) {
      var cached = getCachedList('sales');
      refreshSalesInBackground(filters || {});
      return Promise.resolve({ sales: filterSalesByDate(cached, filters || {}), local_first: true, background_sync: true });
    },

    getSettings: function () {
      var settings = getCachedObject('settings');
      refreshSettingsInBackground();
      return Promise.resolve({ settings: settings, local_first: true, background_sync: true });
    },

    getDashboard: function (filters) {
      var wrapper = getCachedObject('dashboard');
      var key = makeFilterKey(filters);
      var cachedDashboard = wrapper[key] || buildDashboardFromLocal(filters || {});

      refreshDashboardInBackground(filters || {});
      return Promise.resolve(Object.assign({}, cachedDashboard, { local_first: true, background_sync: true }));
    },

    getReports: function (filters) {
      var wrapper = getCachedObject('reports');
      var key = makeFilterKey(filters);
      var cachedReport = wrapper[key] || null;

      refreshReportsInBackground(filters || {});
      if (cachedReport) {
        return Promise.resolve(Object.assign({}, cachedReport, { local_first: true, background_sync: true }));
      }

      return Promise.resolve({ local_first: true, background_sync: true });
    },

    addProduct: function (product) {
      var localProduct = makeLocalProduct(product, 'pending_add');
      upsertCachedProduct(localProduct);
      enqueue('addProduct', { product: product });
      return Promise.resolve({ product: localProduct, local_first: true, background_sync: true });
    },

    updateProduct: function (product) {
      var localProduct = makeLocalProduct(product, 'pending_update');
      upsertCachedProduct(localProduct);
      enqueue('updateProduct', { product: product });
      return Promise.resolve({ product: localProduct, local_first: true, background_sync: true });
    },

    deleteProduct: function (productId) {
      removeCachedProduct(productId);
      enqueue('deleteProduct', { product_id: productId });
      return Promise.resolve({ product_id: productId, local_first: true, background_sync: true });
    },

    recordSale: function (sale) {
      var product = findProduct(sale && sale.product_id);
      var preview = buildLocalSale(sale, product || {});
      var updatedProduct = deductLocalStock(product, sale || {});

      enqueue('recordSale', { sale: sale });
      addOrReplaceCachedSale(preview);
      return Promise.resolve({
        sale: preview,
        product: updatedProduct || product,
        local_first: true,
        background_sync: true
      });
    },

    updateSettings: function (settings) {
      setCachedObject('settings', settings || {});
      dispatch('mmc:settings-updated', { settings: settings || {}, source: 'local' });
      enqueue('updateSettings', { settings: settings || {} });
      return Promise.resolve({ settings: settings || {}, local_first: true, background_sync: true });
    },

    syncQueuedData: syncQueue,
    prefetchAllLocalData: prefetchAll,
    getLocalQueueCount: function () {
      return getQueue().length;
    }
  }));

  window.MMC_LOCAL_SYNC = Object.freeze({
    prefetchAll: prefetchAll,
    syncNow: syncQueue,
    getQueueCount: function () {
      return getQueue().length;
    }
  });

  window.addEventListener('online', function () {
    prefetchAll();
    scheduleSync(700);
  });

  window.addEventListener('beforeunload', function () {
    if (getQueue().length && navigator.sendBeacon && originalApi && typeof originalApi.getApiUrl === 'function') {
      // Apps Script POST requires normal fetch for the app payload, so the queue remains saved safely.
    }
  });

  window.setTimeout(function () {
    prefetchAll();
  }, 250);
})();
