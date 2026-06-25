(function () {
  'use strict';

  var config = window.MMC_CONFIG || {};
  var storageKeys = config.STORAGE_KEYS || {};
  var activeRequestCount = 0;
  var loaderHideTimer = null;
  var loaderForceHideTimer = null;

  function getApiUrl() {
    return String(config.API_URL || '').trim();
  }

  function isConfigured() {
    var apiUrl = getApiUrl();
    return Boolean(apiUrl && apiUrl.indexOf('PASTE_') !== 0);
  }

  function createApiError(message, details) {
    var error = new Error(message || 'လုပ်ဆောင်မှု မအောင်မြင်ပါ။');
    error.details = details || null;
    return error;
  }

  function ensureGlobalLoader() {
    var overlay = document.getElementById('globalLoadingOverlay');
    var panel;
    var spinner;
    var text;
    var bar;
    var i;

    if (overlay) {
      return overlay;
    }

    if (!document.body) {
      return null;
    }

    overlay = document.createElement('div');
    overlay.id = 'globalLoadingOverlay';
    overlay.className = 'global-loading-overlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'ဒေတာယူနေပါသည်');

    panel = document.createElement('div');
    panel.className = 'global-loading-panel';

    spinner = document.createElement('div');
    spinner.className = 'global-loading-spinner';
    spinner.setAttribute('aria-hidden', 'true');

    for (i = 0; i < 12; i += 1) {
      bar = document.createElement('span');
      bar.className = 'global-loading-bar';
      bar.style.setProperty('--angle', (i * 30) + 'deg');
      bar.style.setProperty('--delay', (i * 0.08) + 's');
      spinner.appendChild(bar);
    }

    text = document.createElement('div');
    text.className = 'global-loading-text';
    text.textContent = 'ဒေတာယူနေပါသည်...';

    panel.appendChild(spinner);
    panel.appendChild(text);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    return overlay;
  }

  function showGlobalLoader(options) {
    var overlay;

    options = options || {};

    if (options.silentLoading) {
      return false;
    }

    overlay = ensureGlobalLoader();

    if (!overlay) {
      return false;
    }

    activeRequestCount += 1;

    if (loaderHideTimer) {
      window.clearTimeout(loaderHideTimer);
      loaderHideTimer = null;
    }

    if (loaderForceHideTimer) {
      window.clearTimeout(loaderForceHideTimer);
      loaderForceHideTimer = null;
    }

    overlay.hidden = false;
    document.body.classList.add('is-global-loading');

    window.requestAnimationFrame(function () {
      overlay.classList.add('is-visible');
    });

    loaderForceHideTimer = window.setTimeout(function () {
      forceHideGlobalLoader();
    }, options.maxLoadingMs || 8000);

    return true;
  }

  function forceHideGlobalLoader() {
    var overlay = document.getElementById('globalLoadingOverlay');

    activeRequestCount = 0;

    if (loaderHideTimer) {
      window.clearTimeout(loaderHideTimer);
      loaderHideTimer = null;
    }

    if (loaderForceHideTimer) {
      window.clearTimeout(loaderForceHideTimer);
      loaderForceHideTimer = null;
    }

    document.body.classList.remove('is-global-loading');

    if (overlay) {
      overlay.classList.remove('is-visible');
      overlay.hidden = true;
    }
  }

  function hideGlobalLoader(wasShown) {
    var overlay;

    if (!wasShown) {
      return;
    }

    activeRequestCount = Math.max(0, activeRequestCount - 1);

    if (activeRequestCount > 0) {
      return;
    }

    if (loaderForceHideTimer) {
      window.clearTimeout(loaderForceHideTimer);
      loaderForceHideTimer = null;
    }

    overlay = document.getElementById('globalLoadingOverlay');
    document.body.classList.remove('is-global-loading');

    if (!overlay) {
      return;
    }

    overlay.classList.remove('is-visible');
    loaderHideTimer = window.setTimeout(function () {
      if (activeRequestCount === 0) {
        overlay.hidden = true;
      }
    }, 180);
  }

  function getStoredSession() {
    return {
      user_id: localStorage.getItem(storageKeys.USER_ID || 'mmc_user_id') || '',
      session_token: localStorage.getItem(storageKeys.SESSION_TOKEN || 'mmc_session_token') || ''
    };
  }

  function getCacheKey(name) {
    var session = getStoredSession();
    return 'mmc_tab_cache_' + (session.user_id || 'guest') + '_' + name;
  }

  function readSessionCache(name, fallbackValue) {
    var raw;

    try {
      raw = window.sessionStorage.getItem(getCacheKey(name));
    } catch (error) {
      return fallbackValue;
    }

    if (!raw) {
      return fallbackValue;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallbackValue;
    }
  }

  function writeSessionCache(name, value) {
    try {
      window.sessionStorage.setItem(getCacheKey(name), JSON.stringify(value));
    } catch (error) {
      return false;
    }

    return true;
  }

  function removeSessionCache(name) {
    try {
      window.sessionStorage.removeItem(getCacheKey(name));
    } catch (error) {
      return false;
    }

    return true;
  }

  function getCachedList(name) {
    var value = readSessionCache(name, []);
    return Array.isArray(value) ? value : [];
  }

  function setCachedList(name, list) {
    return writeSessionCache(name, Array.isArray(list) ? list : []);
  }

  function upsertCachedProduct(product) {
    var list;
    var foundIndex;

    if (!product || !product.product_id) {
      return false;
    }

    list = getCachedList('products');
    foundIndex = list.findIndex(function (item) {
      return item.product_id === product.product_id;
    });

    if (foundIndex >= 0) {
      list[foundIndex] = product;
    } else {
      list.unshift(product);
    }

    return setCachedList('products', list);
  }

  function removeCachedProduct(productId) {
    var list = getCachedList('products').filter(function (product) {
      return product.product_id !== productId;
    });

    return setCachedList('products', list);
  }

  function addCachedSale(sale) {
    var list;

    if (!sale || !sale.sale_id) {
      return false;
    }

    list = getCachedList('sales');
    list.unshift(sale);

    return setCachedList('sales', list);
  }

  function clearAllSessionCache() {
    removeSessionCache('products');
    removeSessionCache('sales');
    removeSessionCache('dashboard');
    removeSessionCache('settings');
  }

  function withSession(data, action) {
    var session = getStoredSession();
    var payload = {};
    var key;

    data = data || {};

    for (key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        payload[key] = data[key];
      }
    }

    payload.user_id = session.user_id;
    payload.session_token = session.session_token;
    payload.__action = action || '';

    return payload;
  }

  function buildRequestBody(action, data) {
    return JSON.stringify({
      action: action,
      data: data || {}
    });
  }

  function parseApiResponse(text) {
    if (!text) {
      throw createApiError('API တုံ့ပြန်ချက် မရှိပါ။');
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw createApiError('API တုံ့ပြန်ချက် JSON မမှန်ပါ။', text);
    }
  }

  function request(action, data, options) {
    var apiUrl = getApiUrl();
    var controller;
    var timeoutId;
    var timeoutMs = Number(config.REQUEST_TIMEOUT_MS || 20000);
    var loaderShown;

    options = options || {};

    if (!isConfigured()) {
      return Promise.reject(createApiError('Apps Script API URL မသတ်မှတ်ရသေးပါ။'));
    }

    if (!action) {
      return Promise.reject(createApiError('လုပ်ဆောင်ချက် မပါရှိပါ။'));
    }

    if (window.AbortController) {
      controller = new AbortController();
      timeoutId = window.setTimeout(function () {
        controller.abort();
      }, options.timeoutMs || timeoutMs);
    }

    loaderShown = showGlobalLoader(options);

    return fetch(apiUrl, {
      method: 'POST',
      redirect: 'follow',
      credentials: 'omit',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: buildRequestBody(action, data),
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        if (!response.ok) {
          throw createApiError('API ဆက်သွယ်မှု မအောင်မြင်ပါ။', {
            status: response.status,
            statusText: response.statusText
          });
        }

        return response.text();
      })
      .then(parseApiResponse)
      .then(function (payload) {
        if (!payload || payload.success !== true) {
          throw createApiError(
            payload && payload.message ? payload.message : 'လုပ်ဆောင်မှု မအောင်မြင်ပါ။',
            payload
          );
        }

        return payload.data || {};
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') {
          throw createApiError('API ဆက်သွယ်ချိန် ကုန်ဆုံးသွားပါပြီ။');
        }

        if (error && error.name === 'TypeError' && String(error.message || '').toLowerCase().indexOf('fetch') !== -1) {
          throw createApiError('API ကို ချိတ်ဆက်မရပါ။ Apps Script Web App access ကို Anyone အဖြစ် Deploy ပြန်လုပ်ပါ။');
        }

        throw error;
      })
      .finally(function () {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }

        hideGlobalLoader(loaderShown);
      });
  }

  function requestWithSession(action, data, options) {
    return request(action, withSession(data, action), options);
  }

  window.MMC_CACHE = Object.freeze({
    getProducts: function () {
      return getCachedList('products');
    },
    setProducts: function (list) {
      return setCachedList('products', list);
    },
    updateProduct: upsertCachedProduct,
    removeProduct: removeCachedProduct,
    getSales: function () {
      return getCachedList('sales');
    },
    setSales: function (list) {
      return setCachedList('sales', list);
    },
    addSale: addCachedSale,
    clearAll: clearAllSessionCache
  });

  window.MMC_API = Object.freeze({
    isConfigured: isConfigured,
    getApiUrl: getApiUrl,
    getStoredSession: getStoredSession,
    request: request,
    requestWithSession: requestWithSession,
    showGlobalLoader: showGlobalLoader,
    hideGlobalLoader: hideGlobalLoader,
    forceHideGlobalLoader: forceHideGlobalLoader,
    login: function (username, password) {
      return request('login', {
        username: username,
        password: password
      });
    },
    logout: function () {
      return requestWithSession('logout');
    },
    getDashboard: function (filters) {
      return requestWithSession('getDashboard', filters || {});
    },
    listProducts: function () {
      return requestWithSession('listProducts');
    },
    searchProducts: function (query) {
      return requestWithSession('searchProducts', {
        query: query || ''
      });
    },
    addProduct: function (product) {
      return requestWithSession('addProduct', {
        product: product
      });
    },
    updateProduct: function (product) {
      return requestWithSession('updateProduct', {
        product: product
      });
    },
    deleteProduct: function (productId) {
      return requestWithSession('deleteProduct', {
        product_id: productId
      });
    },
    listSales: function (filters) {
      return requestWithSession('listSales', filters || {});
    },
    recordSale: function (sale, options) {
      return requestWithSession('recordSale', {
        sale: sale
      }, options || {});
    },
    getReports: function (filters) {
      return requestWithSession('getReports', filters || {});
    },
    getSettings: function () {
      return requestWithSession('getSettings');
    },
    updateSettings: function (settings) {
      return requestWithSession('updateSettings', {
        settings: settings
      });
    }
  });
})();
