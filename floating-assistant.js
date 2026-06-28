(function () {
  'use strict';

  var api = window.MMC_API;
  var cache = window.MMC_CACHE;
  var state = {
    products: [],
    sales: [],
    loaded: false,
    loading: false
  };
  var ASSISTANT_CHAT_KEY = 'cloud_share_floating_assistant_chat_v2';

  function toNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function clean(value) {
    return String(value === undefined || value === null ? '' : value).trim();
  }

  function formatNumber(value) {
    return toNumber(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function todayString() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
  }

  function normalizeDate(value) {
    var text = clean(value);
    var date;

    if (!text) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.substring(0, 10);
    }

    date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }

    return text.substring(0, 10);
  }

  function money(value) {
    var currency = 'MMK';
    var settings;

    try {
      settings = cache && typeof cache.getSettings === 'function' ? cache.getSettings() : {};
      currency = clean(settings && settings.currency) || currency;
    } catch (error) {
      currency = 'MMK';
    }

    return formatNumber(value) + ' ' + currency;
  }

  function setText(selector, text) {
    var element = document.querySelector(selector);
    if (element) {
      element.textContent = text;
    }
  }

  function getCachedProducts() {
    return cache && typeof cache.getProducts === 'function' ? cache.getProducts() : [];
  }

  function getCachedSales() {
    return cache && typeof cache.getSales === 'function' ? cache.getSales() : [];
  }

  function saveProducts(list) {
    if (cache && typeof cache.setProducts === 'function' && Array.isArray(list)) {
      cache.setProducts(list);
    }
  }

  function saveSales(list) {
    if (cache && typeof cache.setSales === 'function' && Array.isArray(list)) {
      cache.setSales(list);
    }
  }

  function loadData() {
    var productRequest;
    var salesRequest;

    if (state.loading) {
      return Promise.resolve(state);
    }

    state.products = getCachedProducts();
    state.sales = getCachedSales();

    if (state.products.length && state.sales.length) {
      state.loaded = true;
      return Promise.resolve(state);
    }

    if (!api) {
      state.loaded = true;
      return Promise.resolve(state);
    }

    state.loading = true;

    productRequest = state.products.length || typeof api.listProducts !== 'function'
      ? Promise.resolve({ products: state.products })
      : api.listProducts().catch(function () { return { products: state.products }; });

    salesRequest = state.sales.length || typeof api.listSales !== 'function'
      ? Promise.resolve({ sales: state.sales })
      : api.listSales().catch(function () { return { sales: state.sales }; });

    return Promise.all([productRequest, salesRequest]).then(function (results) {
      var products = Array.isArray(results[0] && results[0].products) ? results[0].products : state.products;
      var sales = Array.isArray(results[1] && results[1].sales) ? results[1].sales : state.sales;

      state.products = products;
      state.sales = sales;
      saveProducts(products);
      saveSales(sales);
      state.loaded = true;
      return state;
    }).finally(function () {
      state.loading = false;
    });
  }

  function getLowStockProducts() {
    return state.products.filter(function (product) {
      var alertQty = toNumber(product.low_stock_alert);
      return alertQty > 0 && toNumber(product.quantity) <= alertQty;
    }).sort(function (a, b) {
      return toNumber(a.quantity) - toNumber(b.quantity);
    });
  }

  function getExpiringProducts() {
    var now = new Date();
    var soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return state.products.filter(function (product) {
      var expiry = clean(product.expiry_date);
      var date;

      if (!expiry) {
        return false;
      }

      date = new Date(expiry);
      return !Number.isNaN(date.getTime()) && date >= now && date <= soon;
    }).sort(function (a, b) {
      return new Date(a.expiry_date) - new Date(b.expiry_date);
    });
  }

  function summarizeByProduct() {
    var map = {};

    state.sales.forEach(function (sale) {
      var key = clean(sale.product_id) || clean(sale.product_name) || 'Unknown';

      if (!map[key]) {
        map[key] = {
          product_id: clean(sale.product_id),
          product_name: clean(sale.product_name) || key,
          quantity: 0,
          income: 0,
          profit: 0
        };
      }

      map[key].quantity += toNumber(sale.sold_quantity);
      map[key].income += toNumber(sale.total_income);
      map[key].profit += toNumber(sale.profit);
    });

    return Object.keys(map).map(function (key) { return map[key]; });
  }

  function summarizePayments() {
    var map = {};

    state.sales.forEach(function (sale) {
      var method = clean(sale.payment_method || sale.payment || sale.pay_method) || 'Cash';
      if (!map[method]) {
        map[method] = { count: 0, income: 0 };
      }
      map[method].count += 1;
      map[method].income += toNumber(sale.total_income);
    });

    return ['KBZ Pay', 'Wave Pay', 'Cash'].map(function (method) {
      var item = map[method] || { count: 0, income: 0 };
      return method + ': ' + item.count + ' sales / ' + money(item.income);
    }).join('\n');
  }


  function dateToKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function getStartOfWeek(date) {
    var start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return start;
  }

  function getSalesForQuestion(q) {
    var now = new Date();
    var today = todayString();
    var yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    var weekStart = getStartOfWeek(now);
    var monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var last7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    if (q.indexOf('yesterday') !== -1 || q.indexOf('မနေ့') !== -1) {
      return state.sales.filter(function (sale) { return normalizeDate(sale.sale_date) === dateToKey(yesterday); });
    }

    if (q.indexOf('week') !== -1 || q.indexOf('7 day') !== -1 || q.indexOf('last 7') !== -1 || q.indexOf('ပတ်') !== -1) {
      return state.sales.filter(function (sale) {
        var key = normalizeDate(sale.sale_date);
        var date = key ? new Date(key + 'T00:00:00') : null;
        return date && !Number.isNaN(date.getTime()) && (q.indexOf('last 7') !== -1 || q.indexOf('7 day') !== -1 ? date >= last7 : date >= weekStart);
      });
    }

    if (q.indexOf('month') !== -1 || q.indexOf('လ') !== -1) {
      return state.sales.filter(function (sale) { return normalizeDate(sale.sale_date).substring(0, 7) === monthKey; });
    }

    if (q.indexOf('today') !== -1 || q.indexOf('ယနေ့') !== -1) {
      return state.sales.filter(function (sale) { return normalizeDate(sale.sale_date) === today; });
    }

    return state.sales.slice();
  }

  function summarizeSalesList(items, label) {
    var count = items.length;
    var quantity = items.reduce(function (sum, sale) { return sum + toNumber(sale.sold_quantity); }, 0);
    var income = items.reduce(function (sum, sale) { return sum + toNumber(sale.total_income); }, 0);
    var profit = items.reduce(function (sum, sale) { return sum + toNumber(sale.profit); }, 0);

    return [
      label + ' sales: ' + count,
      'Sold quantity: ' + formatNumber(quantity),
      'Income: ' + money(income),
      'Profit: ' + money(profit)
    ].join('\n');
  }

  function summarizeStockValue() {
    var totalQty = 0;
    var costValue = 0;
    var sellingValue = 0;

    state.products.forEach(function (product) {
      var qty = toNumber(product.quantity);
      totalQty += qty;
      costValue += qty * toNumber(product.buy_price);
      sellingValue += qty * toNumber(product.sell_price);
    });

    return [
      'Total products: ' + state.products.length,
      'Total stock quantity: ' + formatNumber(totalQty),
      'Stock cost value: ' + money(costValue),
      'Stock selling value: ' + money(sellingValue)
    ].join('\n');
  }

  function summarizeCustomers() {
    var map = {};

    state.sales.forEach(function (sale) {
      var name = clean(sale.customer_name) || 'Walk-in customer';
      if (!map[name]) {
        map[name] = { name: name, count: 0, income: 0 };
      }
      map[name].count += 1;
      map[name].income += toNumber(sale.total_income);
    });

    return topList(Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) { return b.income - a.income; }), function (item) {
      return item.name + ' - ' + item.count + ' sales / ' + money(item.income);
    }, 'No customer sales data yet.');
  }

  function getAssistantHistory() {
    try {
      return JSON.parse(localStorage.getItem(ASSISTANT_CHAT_KEY) || '[]') || [];
    } catch (error) {
      return [];
    }
  }

  function saveAssistantHistory(items) {
    try {
      localStorage.setItem(ASSISTANT_CHAT_KEY, JSON.stringify(items.slice(-100)));
    } catch (error) {
      return false;
    }
    return true;
  }

  function topList(items, formatter, emptyText) {
    if (!items.length) {
      return emptyText;
    }

    return items.slice(0, 5).map(function (item, index) {
      return (index + 1) + '. ' + formatter(item);
    }).join('\n');
  }

  function buildSummary() {
    var today = todayString();
    var todaySales = state.sales.filter(function (sale) {
      return normalizeDate(sale.sale_date) === today;
    });
    var todayIncome = todaySales.reduce(function (sum, sale) { return sum + toNumber(sale.total_income); }, 0);
    var todayProfit = todaySales.reduce(function (sum, sale) { return sum + toNumber(sale.profit); }, 0);
    var lowStock = getLowStockProducts();
    var top = summarizeByProduct().sort(function (a, b) { return b.quantity - a.quantity; })[0];

    return [
      'Today sales: ' + todaySales.length + ' / ' + money(todayIncome),
      'Today profit: ' + money(todayProfit),
      'Products: ' + state.products.length,
      'Low stock: ' + lowStock.length,
      'Best seller: ' + (top ? top.product_name + ' (' + formatNumber(top.quantity) + ')' : '-')
    ].join('\n');
  }

  function answerQuestion(question) {
    var q = clean(question).toLowerCase();
    var lowStock = getLowStockProducts();
    var expiring = getExpiringProducts();
    var byProduct = summarizeByProduct();
    var totalIncome = state.sales.reduce(function (sum, sale) { return sum + toNumber(sale.total_income); }, 0);
    var totalProfit = state.sales.reduce(function (sum, sale) { return sum + toNumber(sale.profit); }, 0);

    if (!state.products.length && !state.sales.length) {
      return 'No business data found yet. Open Products/Sales once or login with your shop account first.';
    }

    if (!q || q === 'summary') {
      return buildSummary();
    }

    if (q.indexOf('help') !== -1 || q.indexOf('what can') !== -1 || q.indexOf('question') !== -1) {
      return 'You can ask many questions, for example:\n- today sales\n- this week income\n- this month profit\n- best seller\n- low stock\n- payment summary\n- stock value\n- customer summary\n- expiring products';
    }

    if (q.indexOf('stock value') !== -1 || q.indexOf('inventory value') !== -1 || q.indexOf('total stock') !== -1 || q.indexOf('product count') !== -1 || q.indexOf('how many product') !== -1) {
      return summarizeStockValue();
    }

    if (q.indexOf('customer') !== -1 || q.indexOf('ဖောက်သည်') !== -1) {
      return summarizeCustomers();
    }

    if (q.indexOf('week') !== -1 || q.indexOf('month') !== -1 || q.indexOf('yesterday') !== -1 || q.indexOf('7 day') !== -1 || q.indexOf('last 7') !== -1 || q.indexOf('ယနေ့') !== -1 || q.indexOf('မနေ့') !== -1 || q.indexOf('ပတ်') !== -1 || q.indexOf('လ') !== -1) {
      return summarizeSalesList(getSalesForQuestion(q), q.indexOf('yesterday') !== -1 || q.indexOf('မနေ့') !== -1 ? 'Yesterday' : q.indexOf('month') !== -1 || q.indexOf('လ') !== -1 ? 'This month' : q.indexOf('week') !== -1 || q.indexOf('ပတ်') !== -1 || q.indexOf('7 day') !== -1 || q.indexOf('last 7') !== -1 ? 'Selected range' : 'Today');
    }

    if (q.indexOf('payment') !== -1 || q.indexOf('kbz') !== -1 || q.indexOf('wave') !== -1 || q.indexOf('cash') !== -1) {
      return summarizePayments();
    }

    if (q.indexOf('low') !== -1 || q.indexOf('stock') !== -1 || q.indexOf('restock') !== -1) {
      return topList(lowStock, function (product) {
        return (product.product_name || product.product_id || '-') + ' - left ' + formatNumber(product.quantity) + ', alert ' + formatNumber(product.low_stock_alert);
      }, 'No low-stock product right now.');
    }

    if (q.indexOf('expiry') !== -1 || q.indexOf('expire') !== -1 || q.indexOf('date') !== -1) {
      return topList(expiring, function (product) {
        return (product.product_name || product.product_id || '-') + ' - expiry ' + clean(product.expiry_date);
      }, 'No product expiring in the next 30 days.');
    }

    if (q.indexOf('best') !== -1 || q.indexOf('top') !== -1 || q.indexOf('seller') !== -1 || q.indexOf('sold') !== -1) {
      return topList(byProduct.sort(function (a, b) { return b.quantity - a.quantity; }), function (item) {
        return item.product_name + ' - sold ' + formatNumber(item.quantity) + ', income ' + money(item.income);
      }, 'No sales data yet.');
    }

    if (q.indexOf('profit') !== -1 || q.indexOf('income') !== -1 || q.indexOf('revenue') !== -1) {
      return 'Total income: ' + money(totalIncome) + '\nTotal profit: ' + money(totalProfit) + '\n' + topList(byProduct.sort(function (a, b) { return b.profit - a.profit; }), function (item) {
        return item.product_name + ' - profit ' + money(item.profit);
      }, 'No profit data yet.');
    }

    if (q.indexOf('today') !== -1) {
      return buildSummary();
    }

    return buildSummary() + '\n\nTry asking: today sales, this week income, this month profit, best seller, low stock, payment, stock value, customer summary, expiry.';
  }

  function addMessage(role, text, skipSave) {
    var log = document.querySelector('.floating-assistant-messages');
    var bubble;
    var history;

    if (!log) {
      return;
    }

    bubble = document.createElement('div');
    bubble.className = 'floating-assistant-message is-' + role;
    bubble.textContent = text;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;

    if (!skipSave) {
      history = getAssistantHistory();
      history.push({ role: role, text: text, time: Date.now() });
      saveAssistantHistory(history);
    }
  }

  function restoreMessages() {
    var history = getAssistantHistory();

    if (!history.length) {
      return false;
    }

    history.slice(-60).forEach(function (item) {
      if (item && item.role && item.text) {
        addMessage(item.role, item.text, true);
      }
    });

    return true;
  }

  function clearAssistantMessages() {
    var log = document.querySelector('.floating-assistant-messages');

    if (log) {
      log.textContent = '';
    }

    try {
      localStorage.removeItem(ASSISTANT_CHAT_KEY);
    } catch (error) {
      return;
    }

    addMessage('bot', 'Chat cleared. Ask me about sales, stock, profit, payments, customers, or reports.');
  }

  function ask(question) {
    var input = document.querySelector('#floatingAssistantInput');
    var text = clean(question || (input ? input.value : ''));

    if (input) {
      input.value = '';
    }

    addMessage('user', text || 'summary');
    addMessage('bot', 'Checking business data...');

    loadData().then(function () {
      var messages = document.querySelectorAll('.floating-assistant-message.is-bot');
      var latest = messages[messages.length - 1];
      if (latest && latest.textContent === 'Checking business data...') {
        latest.textContent = answerQuestion(text);
      } else {
        addMessage('bot', answerQuestion(text));
      }
    });
  }

  function togglePanel(open) {
    var panel = document.querySelector('.floating-assistant-panel');
    var button = document.querySelector('.floating-assistant-button');
    var shouldOpen;

    if (!panel || !button) {
      return;
    }

    shouldOpen = typeof open === 'boolean' ? open : panel.hidden;
    panel.hidden = !shouldOpen;
    button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

    if (shouldOpen && !panel.getAttribute('data-welcomed')) {
      panel.setAttribute('data-welcomed', 'true');
      if (!restoreMessages()) {
        addMessage('bot', 'Hi, I am your Smart Business Assistant. You can ask many questions about sales, stock, profit, payments, customers, reports, expiry, or best sellers.');
      }
    }
  }

  function createAssistant() {
    var wrapper;
    var button;
    var panel;

    if (!document.body || document.querySelector('.floating-assistant')) {
      return;
    }

    wrapper = document.createElement('div');
    wrapper.className = 'floating-assistant';

    button = document.createElement('button');
    button.className = 'floating-assistant-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Open Smart Business Assistant');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span>AI</span><strong>Smart Business Assistant</strong>';

    panel = document.createElement('section');
    panel.className = 'floating-assistant-panel';
    panel.hidden = true;
    panel.innerHTML = [
      '<header class="floating-assistant-header">',
      '<div><strong>Smart Business Assistant</strong><span>Ask many business questions</span></div>',
      '<div class="floating-assistant-header-actions"><button class="floating-assistant-clear" type="button">Clear</button><button class="floating-assistant-close" type="button" aria-label="Close">×</button></div>',
      '</header>',
      '<div class="floating-assistant-messages" aria-live="polite"></div>',
      '<div class="floating-assistant-quick">',
      '<button type="button" data-assistant-question="today sales">Today</button>',
      '<button type="button" data-assistant-question="this week income">This week</button>',
      '<button type="button" data-assistant-question="this month profit">This month</button>',
      '<button type="button" data-assistant-question="best seller">Best seller</button>',
      '<button type="button" data-assistant-question="low stock">Low stock</button>',
      '<button type="button" data-assistant-question="payment summary">Payment</button>',
      '<button type="button" data-assistant-question="stock value">Stock value</button>',
      '<button type="button" data-assistant-question="help">Help</button>',
      '</div>',
      '<div class="floating-assistant-input-row">',
      '<textarea id="floatingAssistantInput" rows="2" placeholder="Ask many questions: this week sales, stock value, best seller..."></textarea>',
      '<button type="button" id="floatingAssistantAskButton">Ask</button>',
      '</div>'
    ].join('');

    wrapper.appendChild(panel);
    wrapper.appendChild(button);
    document.body.appendChild(wrapper);

    button.addEventListener('click', function () { togglePanel(); });
    panel.querySelector('.floating-assistant-close').addEventListener('click', function () { togglePanel(false); });
    panel.querySelector('.floating-assistant-clear').addEventListener('click', function () { clearAssistantMessages(); });
    panel.querySelector('#floatingAssistantAskButton').addEventListener('click', function () { ask(); });
    panel.querySelector('#floatingAssistantInput').addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        ask();
      }
    });
    panel.querySelectorAll('[data-assistant-question]').forEach(function (quickButton) {
      quickButton.addEventListener('click', function () {
        ask(quickButton.getAttribute('data-assistant-question'));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createAssistant);
  } else {
    createAssistant();
  }
}());
