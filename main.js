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

  function t(key, fallback) {
    if (window.MMC_I18N && typeof window.MMC_I18N.translate === 'function') {
      return window.MMC_I18N.translate(key);
    }

    return fallback || key;
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

  function applyThemeColors(settings) {
    if (window.MMC_AUTH && typeof window.MMC_AUTH.applyThemeColors === 'function') {
      window.MMC_AUTH.applyThemeColors(settings);
      return;
    }

    applyThemeColor(settings && (settings.primary_color || settings.theme_color));
  }

  function clearElement(element) {
    while (element && element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function readSettingsImageUpload() {
    var input = byId('settingsBackgroundImage');
    var file = input && input.files && input.files[0] ? input.files[0] : null;

    if (!file) {
      return Promise.resolve(null);
    }

    if (file.type.indexOf('image/') !== 0) {
      return Promise.reject(new Error('Background image must be an image file.'));
    }

    if (file.size > 5 * 1024 * 1024) {
      return Promise.reject(new Error('Background image must be 5MB or smaller.'));
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
        reject(new Error('Background image could not be read.'));
      };
      reader.readAsDataURL(file);
    });
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

  function getCssColor(name, fallback) {
    var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function addDays(date, amount) {
    var next = new Date(date.getTime());
    next.setDate(next.getDate() + amount);
    return next;
  }

  function formatChartDate(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function getLastSevenDayTrend(sales) {
    var today = new Date();
    var days = [];
    var map = {};
    var saleDays = [];
    var hasRecentSales = false;

    sales = Array.isArray(sales) ? sales : [];

    for (var i = 6; i >= 0; i -= 1) {
      var date = addDays(today, -i);
      var key = formatChartDate(date);
      map[key] = {
        label: String(date.getDate()),
        income: 0,
        profit: 0
      };
      days.push(map[key]);
    }

    sales.forEach(function (sale) {
      var key = normalizeDate(sale.sale_date);
      if (key && saleDays.indexOf(key) === -1) {
        saleDays.push(key);
      }
      if (map[key]) {
        map[key].income += toNumber(sale.total_income);
        map[key].profit += toNumber(sale.profit);
        hasRecentSales = true;
      }
    });

    if (!hasRecentSales && saleDays.length) {
      saleDays.sort();
      days = [];
      map = {};

      saleDays.slice(-7).forEach(function (key) {
        map[key] = {
          label: String(Number(key.substring(8, 10)) || key.substring(5)),
          income: 0,
          profit: 0
        };
        days.push(map[key]);
      });

      sales.forEach(function (sale) {
        var key = normalizeDate(sale.sale_date);
        if (map[key]) {
          map[key].income += toNumber(sale.total_income);
          map[key].profit += toNumber(sale.profit);
        }
      });
    }

    return days;
  }

  function getDaySummary(sales, offset) {
    var date = addDays(new Date(), offset || 0);
    var key = formatChartDate(date);

    return summarizeSales((sales || []).filter(function (sale) {
      return normalizeDate(sale.sale_date) === key;
    }));
  }

  function getMonthSummary(sales, offset) {
    var date = new Date();
    var monthKey;

    date.setMonth(date.getMonth() + (offset || 0));
    monthKey = date.getFullYear() + '-' + pad2(date.getMonth() + 1);

    return summarizeSales((sales || []).filter(function (sale) {
      return normalizeDate(sale.sale_date).substring(0, 7) === monthKey;
    }));
  }

  function percentChange(current, previous) {
    current = toNumber(current);
    previous = toNumber(previous);

    if (!previous && current > 0) {
      return null;
    }

    if (!previous) {
      return 0;
    }

    return ((current - previous) / Math.abs(previous)) * 100;
  }

  function formatGrowth(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }

    var number = Number.isFinite(value) ? value : 0;
    var icon = number < 0 ? '↘ ' : '↗ ';

    return icon + Math.abs(number).toFixed(1).replace(/\.0$/, '') + '%';
  }

  function setGrowthBadge(id, value) {
    var element = byId(id);

    if (!element) {
      return;
    }

    element.textContent = formatGrowth(value);
    element.classList.toggle('is-down', value < 0);
  }

  function drawRoundedLabel(context, text, x, y) {
    var metrics;
    var width;
    var height = 30;
    var radius = 9;

    context.save();
    context.font = '800 15px Arial, sans-serif';
    metrics = context.measureText(text);
    width = metrics.width + 22;
    x = Math.max(10, Math.min(x - width / 2, context.canvas.width - width - 10));
    y = Math.max(10, y - 42);
    context.fillStyle = 'rgba(229, 255, 82, 0.94)';
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
    context.fill();
    context.fillStyle = '#343840';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, x + width / 2, y + height / 2 + 1);
    context.restore();
  }

  function drawDashboardTrendChart(sales) {
    var canvas = byId('dashboardTrendChart');
    var trend;
    var maxValue;
    var rect;
    var ratio;
    var context;
    var width;
    var height;
    var paddingX = 48;
    var paddingTop = 30;
    var paddingBottom = 42;
    var chartWidth;
    var chartHeight;
    var yMax;
    var highlight;

    if (!canvas) {
      return;
    }

    trend = getLastSevenDayTrend(Array.isArray(sales) ? sales : getCachedSales());
    maxValue = trend.reduce(function (max, item) {
      return Math.max(max, item.income, item.profit);
    }, 0);
    rect = canvas.getBoundingClientRect();
    ratio = window.devicePixelRatio || 1;
    width = Math.max(320, Math.round((rect.width || 680) * ratio));
    height = Math.max(180, Math.round((rect.height || 260) * ratio));
    canvas.width = width;
    canvas.height = height;
    context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    width = width / ratio;
    height = height / ratio;
    chartWidth = width - paddingX * 2;
    chartHeight = height - paddingTop - paddingBottom;
    yMax = Math.max(1, Math.ceil((maxValue || 1) / 1000) * 1000);

    context.clearRect(0, 0, width, height);
    context.save();
    context.lineWidth = 1.4;
    context.strokeStyle = 'rgba(46, 50, 57, 0.10)';

    for (var gridX = 0; gridX < trend.length; gridX += 1) {
      var xLine = paddingX + (chartWidth / Math.max(1, trend.length - 1)) * gridX;
      context.beginPath();
      context.moveTo(xLine, paddingTop);
      context.lineTo(xLine, height - paddingBottom);
      context.stroke();
    }

    context.fillStyle = '#747985';
    context.font = '700 12px Arial, sans-serif';
    context.textAlign = 'right';
    context.textBaseline = 'middle';

    for (var gridY = 0; gridY <= 4; gridY += 1) {
      var value = yMax - (yMax / 4) * gridY;
      var yLine = paddingTop + (chartHeight / 4) * gridY;
      context.fillText(value >= 1000 ? Math.round(value / 1000) + 'k' : String(Math.round(value)), paddingX - 12, yLine);
    }

    function point(item, index, key) {
      var x = paddingX + (chartWidth / Math.max(1, trend.length - 1)) * index;
      var y = height - paddingBottom - (toNumber(item[key]) / yMax) * chartHeight;
      return { x: x, y: y };
    }

    function drawLine(key, color) {
      var points = trend.map(function (item, index) {
        return point(item, index, key);
      });

      if (!points.length) {
        return;
      }

      context.beginPath();
      points.forEach(function (pt, index) {
        var previous;
        var next;
        var cp1x;
        var cp2x;

        if (index === 0) {
          context.moveTo(pt.x, pt.y);
        } else {
          previous = points[index - 1];
          next = points[index + 1] || pt;
          cp1x = previous.x + (pt.x - previous.x) * 0.48;
          cp2x = pt.x - (next.x - previous.x) * 0.18;
          context.bezierCurveTo(cp1x, previous.y, cp2x, pt.y, pt.x, pt.y);
        }
      });
      context.lineWidth = 3.4;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 5;
      context.shadowOffsetY = 0;
      context.stroke();
      context.shadowBlur = 0;
    }

    drawLine('income', '#ffb33f');
    drawLine('profit', '#8b63ff');

    context.fillStyle = '#667085';
    context.font = '800 12px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    trend.forEach(function (item, index) {
      var labelPoint = point(item, index, 'income');
      context.fillText(item.label, labelPoint.x, height - 12);
    });

    highlight = trend.reduce(function (best, item, index) {
      return toNumber(item.income) > toNumber(best.item.income) ? { item: item, index: index } : best;
    }, { item: trend[0] || { income: 0 }, index: 0 });

    if (highlight && toNumber(highlight.item.income) > 0) {
      var highlightPoint = point(highlight.item, highlight.index, 'income');
      context.fillStyle = '#ffb33f';
      context.beginPath();
      context.arc(highlightPoint.x, highlightPoint.y, 4, 0, Math.PI * 2);
      context.fill();
      drawRoundedLabel(context, formatNumber(highlight.item.income), highlightPoint.x, highlightPoint.y);
    }

    context.restore();
  }

  function getTopProducts(sales) {
    var grouped = {};

    (sales || []).forEach(function (sale) {
      var key = sale.product_id || sale.product_name || 'item';

      if (!grouped[key]) {
        grouped[key] = {
          product_id: sale.product_id || '',
          product_name: sale.product_name || '-',
          sold_quantity: 0,
          total_income: 0
        };
      }

      grouped[key].sold_quantity += toNumber(sale.sold_quantity);
      grouped[key].total_income += toNumber(sale.total_income);
    });

    return Object.keys(grouped).map(function (key) {
      return grouped[key];
    }).sort(function (a, b) {
      return b.total_income - a.total_income;
    }).slice(0, 5);
  }

  function renderTopProducts(sales) {
    var container = byId('dashboardTopProducts');
    var items = getTopProducts(sales || getCachedSales());

    if (!container) {
      return;
    }

    clearElement(container);

    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = t('noData', 'ဒေတာမရှိပါ');
      container.appendChild(empty);
      return;
    }

    items.forEach(function (item, index) {
      var row = document.createElement('div');
      var rank = document.createElement('span');
      var name = document.createElement('strong');
      var meta = document.createElement('small');

      row.className = 'compact-product-row';
      rank.className = 'compact-rank';
      rank.textContent = String(index + 1);
      name.textContent = item.product_name || item.product_id || '-';
      meta.textContent = formatNumber(item.total_income) + ' | ' + formatNumber(item.sold_quantity) + ' ' + t('itemUnit', 'ခု');

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(meta);
      container.appendChild(row);
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

    cell.colSpan = 4;
    cell.textContent = message;
    row.appendChild(cell);

    return row;
  }

  function openLowStockView(product) {
    if (!window.MMC_TABLE_VIEW || !product) {
      return;
    }

    window.MMC_TABLE_VIEW.open(t('details', 'အသေးစိတ်') + ' - ' + (product.product_name || product.product_id || '-'), [
      {
        title: t('stockOverview', 'လက်ကျန်အခြေအနေ'),
        fields: [
          { label: t('productId', 'ကုန်ပစ္စည်း ID'), value: product.product_id || '-' },
          { label: t('productName', 'ကုန်ပစ္စည်းအမည်'), value: product.product_name || '-' },
          { label: t('quantity', 'အရေအတွက်'), value: formatNumber(product.quantity) },
          { label: t('lowStockLimit', 'သတ်မှတ်ချက်'), value: formatNumber(product.low_stock_alert) }
        ]
      }
    ]);
  }

  function createViewCell(product) {
    if (window.MMC_TABLE_VIEW && typeof window.MMC_TABLE_VIEW.createViewCell === 'function') {
      return window.MMC_TABLE_VIEW.createViewCell(function () {
        openLowStockView(product);
      }, t('view', 'ကြည့်ရန်'));
    }

    var cell = document.createElement('td');
    var button = document.createElement('button');
    button.className = 'small-button icon-view';
    button.type = 'button';
    button.textContent = t('view', 'ကြည့်ရန်');
    button.addEventListener('click', function () {
      openLowStockView(product);
    });
    cell.setAttribute('data-label', t('view', 'ကြည့်ရန်'));
    cell.appendChild(button);
    return cell;
  }

  function renderLowStockTableLegacy_(products) {
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
      row.appendChild(createViewCell(product));
      tableBody.appendChild(row);
    });
  }

  function renderLowStockTable(products) {
    var tableBody = byId('lowStockTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);

    if (!products || !products.length) {
      tableBody.appendChild(createEmptyRow(t('noData', 'ဒေတာမရှိပါ')));
      return;
    }

    products.forEach(function (product) {
      var row = document.createElement('tr');
      var quantityCell = createCell(formatNumber(product.quantity), t('quantity', 'အရေအတွက်'));

      quantityCell.classList.add('is-danger');
      row.appendChild(createCell(product.product_name || t('productName', 'ကုန်ပစ္စည်းအမည်'), t('productName', 'ကုန်ပစ္စည်းအမည်')));
      row.appendChild(quantityCell);
      row.appendChild(createCell(formatNumber(product.low_stock_alert), t('lowStock', 'လက်ကျန်နည်းနေပါသည်')));
      row.appendChild(createViewCell(product));
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
    var sales = dashboard && Array.isArray(dashboard.sales) ? dashboard.sales : getCachedSales();
    var yesterday = getDaySummary(sales, -1);
    var previousMonth = getMonthSummary(sales, -1);

    if (cache && typeof cache.setSales === 'function' && Array.isArray(dashboard && dashboard.sales)) {
      cache.setSales(dashboard.sales);
    }

    if (cache && typeof cache.setProducts === 'function' && Array.isArray(dashboard && dashboard.products)) {
      cache.setProducts(dashboard.products);
    }

    if (settings.shop_name) {
      setText('shopName', settings.shop_name);
    }

    setText('dashboardDate', reports.generated_at ? 'ထုတ်ထားချိန်: ' + reports.generated_at : todayString());
    setText('dashboardDate', reports.generated_at ? t('generatedAt', 'ထုတ်ထားချိန်') + ': ' + reports.generated_at : todayString());
    setText('todayIncome', formatNumber(daily.total_income));
    setText('todayProfit', formatNumber(daily.profit));
    setText('monthIncome', formatNumber(monthly.total_income));
    setText('monthProfit', formatNumber(monthly.profit));
    setGrowthBadge('todayIncomeGrowth', percentChange(daily.total_income, yesterday.total_income));
    setGrowthBadge('todayProfitGrowth', percentChange(daily.profit, yesterday.profit));
    setGrowthBadge('monthIncomeGrowth', percentChange(monthly.total_income, previousMonth.total_income));
    setGrowthBadge('monthProfitGrowth', percentChange(monthly.profit, previousMonth.profit));
    setText('productCount', formatNumber(dashboard ? dashboard.product_count : 0));
    setText('stockQuantity', formatNumber(dashboard ? dashboard.stock_quantity : 0));
    setText('salesCount', formatNumber(dashboard ? dashboard.sales_count : 0));
    renderLowStockTable(dashboard && dashboard.low_stock_products ? dashboard.low_stock_products : []);
    drawDashboardTrendChart(sales);
    renderTopProducts(sales);
  }

  function loadDashboard() {
    var filters = {
      date: todayString(),
      month: currentMonthString(),
      year: currentYearString()
    };

    drawDashboardTrendChart(getCachedSales());
    renderTopProducts(getCachedSales());

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
      byId('settingsThemeColor').value = settings.primary_color || settings.theme_color || '#2563eb';
    }

    if (byId('settingsAccentColor')) {
      byId('settingsAccentColor').value = settings.accent_color || '#0f766e';
    }

    if (byId('settingsBackgroundColor')) {
      byId('settingsBackgroundColor').value = settings.background_color || '#f6f7f9';
    }

    if (byId('settingsBackgroundImageName')) {
      byId('settingsBackgroundImageName').textContent = settings.background_image_name || '';
    }

    applyThemeColors(settings);

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
      theme_color: byId('settingsThemeColor') ? byId('settingsThemeColor').value : '#2563eb',
      primary_color: byId('settingsThemeColor') ? byId('settingsThemeColor').value : '#2563eb',
      accent_color: byId('settingsAccentColor') ? byId('settingsAccentColor').value : '#0f766e',
      background_color: byId('settingsBackgroundColor') ? byId('settingsBackgroundColor').value : '#f6f7f9'
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

    readSettingsImageUpload()
      .then(function (imageUpload) {
        if (imageUpload) {
          settings.background_image_upload = imageUpload;
        }

        return api.updateSettings(settings);
      })
      .then(function (data) {
        fillSettings(data && data.settings ? data.settings : settings);
        if (byId('settingsBackgroundImage')) {
          byId('settingsBackgroundImage').value = '';
        }
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
    var accentColorInput = byId('settingsAccentColor');
    var backgroundColorInput = byId('settingsBackgroundColor');
    var backgroundImageInput = byId('settingsBackgroundImage');
    var previewTheme = function () {
      applyThemeColors({
        primary_color: themeColorInput ? themeColorInput.value : '#2563eb',
        theme_color: themeColorInput ? themeColorInput.value : '#2563eb',
        accent_color: accentColorInput ? accentColorInput.value : '#0f766e',
        background_color: backgroundColorInput ? backgroundColorInput.value : '#f6f7f9'
      });
    };

    if (form) {
      form.addEventListener('submit', saveSettings);
    }

    if (themeColorInput) {
      themeColorInput.addEventListener('input', previewTheme);
    }

    if (accentColorInput) {
      accentColorInput.addEventListener('input', previewTheme);
    }

    if (backgroundColorInput) {
      backgroundColorInput.addEventListener('input', previewTheme);
    }

    if (backgroundImageInput) {
      backgroundImageInput.addEventListener('change', function () {
        var file = backgroundImageInput.files && backgroundImageInput.files[0] ? backgroundImageInput.files[0] : null;

        if (byId('settingsBackgroundImageName')) {
          byId('settingsBackgroundImageName').textContent = file ? file.name : '';
        }
      });
    }

    loadSettings();
  }

  function bindDashboardInteractions() {
    window.addEventListener('resize', function () {
      drawDashboardTrendChart(getCachedSales());
    });

    window.addEventListener('mmc:languagechange', function () {
      if (pageName() === 'dashboard') {
        renderDashboard(buildDashboardFromCache());
      }
    });
  }

  function initMain() {
    if (pageName() === 'dashboard') {
      bindDashboardInteractions();
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
