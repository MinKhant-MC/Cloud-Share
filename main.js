(function () {
  'use strict';

  var api = window.MMC_API;
  var cache = window.MMC_CACHE;

  function byId(id) {
    return document.getElementById(id);
  }

  function pageName() {
    return document.body ? document.body.getAttribute('data-page') || '' : '';
  }

  function setText(id, value) {
    var element = byId(id);

    if (element) {
      element.textContent = value === undefined || value === null ? '' : String(value);
    }
  }

  function setMessage(id, message, type) {
    var element = byId(id);

    if (!element) {
      return;
    }

    element.textContent = message || '';
    element.classList.remove('is-success', 'is-warning', 'is-danger');

    if (type) {
      element.classList.add(type);
    }
  }

  function applyThemeColor(themeColor) {
    if (window.MMC_AUTH && typeof window.MMC_AUTH.applyThemeColor === 'function') {
      window.MMC_AUTH.applyThemeColor(themeColor);
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

  function formatNumber(value) {
    return toNumber(value).toLocaleString('en-US', {
      maximumFractionDigits: 2
    });
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function todayString() {
    var now = new Date();
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  }

  function currentMonthString() {
    var now = new Date();
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1);
  }

  function currentYearString() {
    return String(new Date().getFullYear());
  }

  function normalizeDate(value) {
    var text;
    var date;

    if (!value) {
      return '';
    }

    text = String(value);

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.substring(0, 10);
    }

    date = new Date(text);

    if (!Number.isNaN(date.getTime())) {
      return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    }

    return text.substring(0, 10);
  }

  function summarizeSales(sales) {
    var summary = {
      sale_count: 0,
      sold_quantity: 0,
      total_cost: 0,
      total_income: 0,
      profit: 0
    };

    sales.forEach(function (sale) {
      summary.sale_count += 1;
      summary.sold_quantity += toNumber(sale.sold_quantity);
      summary.total_cost += toNumber(sale.total_cost);
      summary.total_income += toNumber(sale.total_income);
      summary.profit += toNumber(sale.profit);
    });

    return summary;
  }

  function getCachedProducts() {
    return cache && typeof cache.getProducts === 'function' ? cache.getProducts() : [];
  }

  function getCachedSales() {
    return cache && typeof cache.getSales === 'function' ? cache.getSales() : [];
  }

  function getLowStockProducts(products) {
    return products.filter(function (product) {
      return toNumber(product.quantity) <= toNumber(product.low_stock_alert);
    });
  }

  function createCell(text, label) {
    var cell = document.createElement('td');
    cell.textContent = text === undefined || text === null ? '' : String(text);

    if (label) {
      cell.setAttribute('data-label', label);
    }

    return cell;
  }

  function createEmptyRow(message) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');

    cell.colSpan = 3;
    cell.textContent = message;
    row.appendChild(cell);

    return row;
  }

  function renderLowStockTable(products) {
    var tableBody = byId('lowStockTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);

    if (!products || !products.length) {
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ'));
      return;
    }

    products.forEach(function (product) {
      var row = document.createElement('tr');
      var quantityCell = createCell(formatNumber(product.quantity), 'အရေအတွက်');

      quantityCell.classList.add('is-danger');
      row.appendChild(createCell(product.product_name || 'ကုန်ပစ္စည်းအမည်', 'ကုန်ပစ္စည်းအမည်'));
      row.appendChild(quantityCell);
      row.appendChild(createCell(formatNumber(product.low_stock_alert), 'သတ်မှတ်ချက်'));
      tableBody.appendChild(row);
    });
  }

  function buildDashboardFromCache() {
    var products = getCachedProducts();
    var sales = getCachedSales();
    var today = todayString();
    var month = currentMonthString();
    var year = currentYearString();
    var dailySales = [];
    var monthlySales = [];
    var yearlySales = [];
    var stockQuantity = 0;

    products.forEach(function (product) {
      stockQuantity += toNumber(product.quantity);
    });

    sales.forEach(function (sale) {
      var saleDate = normalizeDate(sale.sale_date);

      if (saleDate === today) {
        dailySales.push(sale);
      }

      if (saleDate.substring(0, 7) === month) {
        monthlySales.push(sale);
      }

      if (saleDate.substring(0, 4) === year) {
        yearlySales.push(sale);
      }
    });

    return {
      product_count: products.length,
      stock_quantity: stockQuantity,
      sales_count: sales.length,
      reports: {
        date: today,
        month: month,
        year: year,
        daily: summarizeSales(dailySales),
        monthly: summarizeSales(monthlySales),
        yearly: summarizeSales(yearlySales),
        generated_at: new Date().toLocaleString('my-MM')
      },
      low_stock_products: getLowStockProducts(products)
    };
  }

  function hasDashboardCache() {
    return getCachedProducts().length > 0 || getCachedSales().length > 0;
  }

  function renderDashboard(dashboard) {
    var reports = dashboard && dashboard.reports ? dashboard.reports : {};
    var daily = reports.daily || {};
    var monthly = reports.monthly || {};
    var settings = dashboard && dashboard.settings ? dashboard.settings : {};

    if (settings.shop_name) {
      setText('shopName', settings.shop_name);
    }

    setText('dashboardDate', reports.generated_at ? 'ထုတ်ထားချိန်: ' + reports.generated_at : todayString());
    setText('todayIncome', formatNumber(daily.total_income));
    setText('todayProfit', formatNumber(daily.profit));
    setText('monthIncome', formatNumber(monthly.total_income));
    setText('monthProfit', formatNumber(monthly.profit));
    setText('productCount', formatNumber(dashboard ? dashboard.product_count : 0));
    setText('stockQuantity', formatNumber(dashboard ? dashboard.stock_quantity : 0));
    setText('salesCount', formatNumber(dashboard ? dashboard.sales_count : 0));
    renderLowStockTable(dashboard && dashboard.low_stock_products ? dashboard.low_stock_products : []);
  }

  function loadDashboard() {
    var filters = {
      date: todayString(),
      month: currentMonthString(),
      year: currentYearString()
    };

    if (hasDashboardCache()) {
      renderDashboard(buildDashboardFromCache());
    } else {
      setText('dashboardDate', 'ဒေတာယူနေပါသည်');
    }

    if (!api || typeof api.getDashboard !== 'function') {
      if (!hasDashboardCache()) {
        renderLowStockTable([]);
        setText('dashboardDate', 'API ချိတ်ဆက်မှု မရှိပါ။');
      }

      return Promise.resolve();
    }

    return api.getDashboard(filters)
      .then(function (dashboard) {
        renderDashboard(dashboard || buildDashboardFromCache());
      })
      .catch(function (error) {
        if (hasDashboardCache()) {
          renderDashboard(buildDashboardFromCache());
          setText('dashboardDate', 'ယာယီသိမ်းထားသော ဒေတာဖြင့် ပြထားပါသည်။');
          return;
        }

        renderLowStockTable([]);
        setText('dashboardDate', error && error.message ? error.message : 'Dashboard ဒေတာ မယူနိုင်ပါ။');
      });
  }

  function setSettingsBusy(isBusy) {
    var form = byId('settingsForm');
    var button = form ? form.querySelector('button[type="submit"]') : null;

    if (!button) {
      return;
    }

    if (isBusy) {
      button.dataset.originalText = button.textContent;
      button.textContent = 'သိမ်းနေပါသည်';
      button.disabled = true;
      return;
    }

    button.disabled = false;

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }

  function fillSettings(settings) {
    settings = settings || {};

    if (byId('settingsShopName')) {
      byId('settingsShopName').value = settings.shop_name || '';
    }

    if (byId('settingsCurrency')) {
      byId('settingsCurrency').value = settings.currency || 'MMK';
    }

    if (byId('settingsThemeColor')) {
      byId('settingsThemeColor').value = settings.theme_color || '#2563eb';
    }

    applyThemeColor(settings.theme_color);

    if (settings.shop_name) {
      setText('shopName', settings.shop_name);
    }
  }

  function loadSettings() {
    if (!api || typeof api.getSettings !== 'function') {
      setMessage('settingsMessage', 'API ချိတ်ဆက်မှု မရှိပါ။', 'is-danger');
      return Promise.resolve();
    }

    setMessage('settingsMessage', 'ဒေတာယူနေပါသည်', 'is-warning');

    return api.getSettings()
      .then(function (data) {
        fillSettings(data && data.settings ? data.settings : {});
        setMessage('settingsMessage', '');
      })
      .catch(function (error) {
        setMessage('settingsMessage', error && error.message ? error.message : 'ဆက်တင်များ မယူနိုင်ပါ။', 'is-danger');
      });
  }

  function saveSettings(event) {
    var settings = {
      shop_name: byId('settingsShopName') ? byId('settingsShopName').value.trim() : '',
      currency: byId('settingsCurrency') ? byId('settingsCurrency').value.trim() : 'MMK',
      theme_color: byId('settingsThemeColor') ? byId('settingsThemeColor').value : '#2563eb'
    };

    event.preventDefault();

    if (!settings.shop_name) {
      setMessage('settingsMessage', 'ဆိုင်အမည် ထည့်ပါ။', 'is-danger');
      return;
    }

    if (!settings.currency) {
      setMessage('settingsMessage', 'ငွေကြေး ထည့်ပါ။', 'is-danger');
      return;
    }

    if (!api || typeof api.updateSettings !== 'function') {
      setMessage('settingsMessage', 'API ချိတ်ဆက်မှု မရှိပါ။', 'is-danger');
      return;
    }

    setSettingsBusy(true);
    setMessage('settingsMessage', 'သိမ်းနေပါသည်', 'is-warning');

    api.updateSettings(settings)
      .then(function (data) {
        fillSettings(data && data.settings ? data.settings : settings);
        setMessage('settingsMessage', 'သိမ်းပြီးပါပြီ။', 'is-success');
      })
      .catch(function (error) {
        setMessage('settingsMessage', error && error.message ? error.message : 'ဆက်တင်များ မသိမ်းနိုင်ပါ။', 'is-danger');
      })
      .finally(function () {
        setSettingsBusy(false);
      });
  }

  function initSettings() {
    var form = byId('settingsForm');
    var themeColorInput = byId('settingsThemeColor');

    if (form) {
      form.addEventListener('submit', saveSettings);
    }

    if (themeColorInput) {
      themeColorInput.addEventListener('input', function () {
        applyThemeColor(themeColorInput.value);
      });
    }

    loadSettings();
  }

  function initMain() {
    if (pageName() === 'dashboard') {
      loadDashboard();
      return;
    }

    if (pageName() === 'settings') {
      initSettings();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMain);
  } else {
    initMain();
  }
})();
