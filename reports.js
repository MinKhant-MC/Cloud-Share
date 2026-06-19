(function () {
  'use strict';

  var api = window.MMC_API;
  var cache = window.MMC_CACHE;
  var latestReport = null;
  var pieColors = [
    '#2563eb',
    '#15803d',
    '#b45309',
    '#b91c1c',
    '#7c3aed',
    '#0891b2',
    '#64748b'
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var element = byId(id);

    if (element) {
      element.textContent = value === undefined || value === null ? '' : String(value);
    }
  }

  function setMessage(message, type) {
    var element = byId('reportMessage');

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

  function formatNumber(value) {
    return toNumber(value).toLocaleString('en-US', {
      maximumFractionDigits: 2
    });
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function dateParts(date) {
    return {
      year: date.getFullYear(),
      month: pad2(date.getMonth() + 1),
      day: pad2(date.getDate())
    };
  }

  function todayString() {
    var parts = dateParts(new Date());
    return parts.year + '-' + parts.month + '-' + parts.day;
  }

  function currentMonthString() {
    var parts = dateParts(new Date());
    return parts.year + '-' + parts.month;
  }

  function currentYearString() {
    return String(new Date().getFullYear());
  }

  function normalizeDate(value) {
    var text;
    var date;
    var parts;

    if (!value) {
      return '';
    }

    text = String(value);

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.substring(0, 10);
    }

    date = new Date(text);

    if (!Number.isNaN(date.getTime())) {
      parts = dateParts(date);
      return parts.year + '-' + parts.month + '-' + parts.day;
    }

    return text.substring(0, 10);
  }

  function readFilters() {
    var dateInput = byId('reportDate');
    var monthInput = byId('reportMonth');
    var yearInput = byId('reportYear');
    var date = dateInput && dateInput.value ? dateInput.value : todayString();
    var month = monthInput && monthInput.value ? monthInput.value : date.substring(0, 7);
    var year = yearInput && yearInput.value ? yearInput.value : date.substring(0, 4);

    return {
      date: date,
      month: month,
      year: year
    };
  }

  function setFilters(filters) {
    if (byId('reportDate')) {
      byId('reportDate').value = filters.date || todayString();
    }

    if (byId('reportMonth')) {
      byId('reportMonth').value = filters.month || currentMonthString();
    }

    if (byId('reportYear')) {
      byId('reportYear').value = filters.year || currentYearString();
    }
  }

  function getCachedProducts() {
    return cache && typeof cache.getProducts === 'function' ? cache.getProducts() : [];
  }

  function getCachedSales() {
    return cache && typeof cache.getSales === 'function' ? cache.getSales() : [];
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

  function buildProductBreakdown(sales) {
    var grouped = {};
    var list;
    var topItems;
    var otherItems;
    var other;

    sales.forEach(function (sale) {
      var productId = String(sale.product_id || '');
      var productName = String(sale.product_name || 'အမည်မရှိ');
      var key = productId || productName;

      if (!grouped[key]) {
        grouped[key] = {
          product_id: productId,
          product_name: productName,
          sale_count: 0,
          sold_quantity: 0,
          total_income: 0,
          profit: 0
        };
      }

      grouped[key].sale_count += 1;
      grouped[key].sold_quantity += toNumber(sale.sold_quantity);
      grouped[key].total_income += toNumber(sale.total_income);
      grouped[key].profit += toNumber(sale.profit);
    });

    list = Object.keys(grouped).map(function (key) {
      return grouped[key];
    }).sort(function (a, b) {
      return toNumber(b.total_income) - toNumber(a.total_income);
    });

    if (list.length <= 6) {
      return list;
    }

    topItems = list.slice(0, 6);
    otherItems = list.slice(6);
    other = {
      product_id: 'OTHER',
      product_name: 'အခြား',
      sale_count: 0,
      sold_quantity: 0,
      total_income: 0,
      profit: 0
    };

    otherItems.forEach(function (item) {
      other.sale_count += toNumber(item.sale_count);
      other.sold_quantity += toNumber(item.sold_quantity);
      other.total_income += toNumber(item.total_income);
      other.profit += toNumber(item.profit);
    });

    topItems.push(other);
    return topItems;
  }

  function getLowStockProducts(products) {
    return products.filter(function (product) {
      return toNumber(product.quantity) <= toNumber(product.low_stock_alert);
    });
  }

  function buildReportFromCache(filters) {
    var products = getCachedProducts();
    var sales = getCachedSales();
    var dailySales = [];
    var monthlySales = [];
    var yearlySales = [];

    sales.forEach(function (sale) {
      var saleDate = normalizeDate(sale.sale_date);

      if (saleDate === filters.date) {
        dailySales.push(sale);
      }

      if (saleDate.substring(0, 7) === filters.month) {
        monthlySales.push(sale);
      }

      if (saleDate.substring(0, 4) === String(filters.year)) {
        yearlySales.push(sale);
      }
    });

    return {
      date: filters.date,
      month: filters.month,
      year: filters.year,
      daily: summarizeSales(dailySales),
      monthly: summarizeSales(monthlySales),
      yearly: summarizeSales(yearlySales),
      daily_product_breakdown: buildProductBreakdown(dailySales),
      monthly_product_breakdown: buildProductBreakdown(monthlySales),
      yearly_product_breakdown: buildProductBreakdown(yearlySales),
      product_breakdown: buildProductBreakdown(monthlySales),
      low_stock_products: getLowStockProducts(products),
      generated_at: new Date().toLocaleString('my-MM')
    };
  }

  function hasCachedReportData() {
    return getCachedProducts().length > 0 || getCachedSales().length > 0;
  }

  function createCell(text) {
    var cell = document.createElement('td');
    cell.textContent = text === undefined || text === null ? '' : String(text);
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
    var tableBody = byId('reportLowStockTable');

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
      var quantityCell = createCell(formatNumber(product.quantity));

      quantityCell.classList.add('is-danger');
      row.appendChild(createCell(product.product_name || 'ကုန်ပစ္စည်းအမည်'));
      row.appendChild(quantityCell);
      row.appendChild(createCell(formatNumber(product.low_stock_alert)));
      tableBody.appendChild(row);
    });
  }

  function getPieItems(report) {
    var items = report && report.product_breakdown ? report.product_breakdown : [];

    if (!items.length && report && report.monthly_product_breakdown) {
      items = report.monthly_product_breakdown;
    }

    return items.filter(function (item) {
      return toNumber(item.total_income) > 0;
    });
  }

  function prepareCanvas(canvas) {
    var rect = canvas.getBoundingClientRect();
    var size = Math.max(220, Math.min(rect.width || 320, rect.height || 320));
    var ratio = window.devicePixelRatio || 1;
    var context;

    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);

    context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    return {
      context: context,
      size: size
    };
  }

  function renderPieLegend(items, total) {
    var legend = byId('productPieLegend');

    if (!legend) {
      return;
    }

    clearElement(legend);

    if (!items.length) {
      legend.appendChild(createEmptyLegend('ဒေတာမရှိပါ'));
      return;
    }

    items.forEach(function (item, index) {
      var row = document.createElement('div');
      var swatch = document.createElement('span');
      var name = document.createElement('span');
      var value = document.createElement('span');
      var percent = total > 0 ? (toNumber(item.total_income) / total) * 100 : 0;

      row.className = 'pie-legend-item';
      swatch.className = 'pie-swatch';
      swatch.style.backgroundColor = pieColors[index % pieColors.length];
      name.className = 'pie-legend-name';
      name.textContent = item.product_name || 'အမည်မရှိ';
      value.className = 'pie-legend-value';
      value.textContent = formatNumber(item.total_income) + ' (' + percent.toFixed(1) + '%)';

      row.appendChild(swatch);
      row.appendChild(name);
      row.appendChild(value);
      legend.appendChild(row);
    });
  }

  function createEmptyLegend(message) {
    var row = document.createElement('div');
    var name = document.createElement('span');

    row.className = 'pie-legend-item';
    name.className = 'pie-legend-name';
    name.textContent = message;
    row.appendChild(document.createElement('span'));
    row.appendChild(name);

    return row;
  }

  function renderPieChart(report) {
    var canvas = byId('productPieChart');
    var emptyText = byId('pieEmptyText');
    var items = getPieItems(report);
    var total = items.reduce(function (sum, item) {
      return sum + toNumber(item.total_income);
    }, 0);
    var prepared;
    var context;
    var size;
    var center;
    var radius;
    var startAngle;

    setText('pieChartTotal', 'စုစုပေါင်း ' + formatNumber(total));

    if (!canvas) {
      renderPieLegend(items, total);
      return;
    }

    prepared = prepareCanvas(canvas);
    context = prepared.context;
    size = prepared.size;
    center = size / 2;
    radius = Math.max(70, center - 8);

    context.clearRect(0, 0, size, size);

    if (!items.length || total <= 0) {
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fillStyle = '#eef3f8';
      context.fill();
      context.strokeStyle = '#d7dde5';
      context.lineWidth = 2;
      context.stroke();

      if (emptyText) {
        emptyText.hidden = false;
      }

      renderPieLegend([], total);
      return;
    }

    if (emptyText) {
      emptyText.hidden = true;
    }

    startAngle = -Math.PI / 2;

    items.forEach(function (item, index) {
      var sliceAngle = (toNumber(item.total_income) / total) * Math.PI * 2;
      var endAngle = startAngle + sliceAngle;

      context.beginPath();
      context.moveTo(center, center);
      context.arc(center, center, radius, startAngle, endAngle);
      context.closePath();
      context.fillStyle = pieColors[index % pieColors.length];
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 3;
      context.stroke();

      startAngle = endAngle;
    });

    renderPieLegend(items, total);
  }

  function renderReport(report) {
    var daily = report && report.daily ? report.daily : {};
    var monthly = report && report.monthly ? report.monthly : {};
    var yearly = report && report.yearly ? report.yearly : {};

    latestReport = report || null;

    setFilters({
      date: report && report.date ? report.date : todayString(),
      month: report && report.month ? report.month : currentMonthString(),
      year: report && report.year ? report.year : currentYearString()
    });

    setText('dailyIncome', formatNumber(daily.total_income));
    setText('dailyProfit', formatNumber(daily.profit));
    setText('monthlyIncome', formatNumber(monthly.total_income));
    setText('monthlyProfit', formatNumber(monthly.profit));
    setText('yearlyIncome', formatNumber(yearly.total_income));
    setText('yearlyProfit', formatNumber(yearly.profit));

    setText('dailySaleCount', formatNumber(daily.sale_count));
    setText('dailySoldQuantity', formatNumber(daily.sold_quantity));
    setText('dailyCost', formatNumber(daily.total_cost));
    setText('reportGeneratedAt', 'ထုတ်ထားချိန်: ' + (report && report.generated_at ? report.generated_at : '-'));

    renderPieChart(report);
    renderLowStockTable(report && report.low_stock_products ? report.low_stock_products : []);
  }

  function setButtonBusy(isBusy) {
    var button = byId('loadReportButton');

    if (!button) {
      return;
    }

    if (isBusy) {
      button.dataset.originalText = button.textContent;
      button.textContent = 'ယူနေပါသည်';
      button.disabled = true;
      return;
    }

    button.disabled = false;

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }

  function loadReports() {
    var filters = readFilters();

    if (hasCachedReportData()) {
      renderReport(buildReportFromCache(filters));
    }

    if (!api || typeof api.getReports !== 'function') {
      setMessage('API ချိတ်ဆက်မှု မရှိပါ။', 'is-danger');
      return Promise.resolve();
    }

    setButtonBusy(true);
    setMessage('အစီရင်ခံစာယူနေပါသည်', 'is-warning');

    return api.getReports(filters)
      .then(function (report) {
        renderReport(report || buildReportFromCache(filters));
        setMessage('အစီရင်ခံစာပြပြီးပါပြီ။', 'is-success');
      })
      .catch(function (error) {
        if (hasCachedReportData()) {
          renderReport(buildReportFromCache(filters));
          setMessage('ယာယီသိမ်းထားသော ဒေတာဖြင့် ပြထားပါသည်။', 'is-warning');
          return;
        }

        setMessage(error && error.message ? error.message : 'အစီရင်ခံစာ မယူနိုင်ပါ။', 'is-danger');
      })
      .finally(function () {
        setButtonBusy(false);
      });
  }

  function initFilters() {
    setFilters({
      date: todayString(),
      month: currentMonthString(),
      year: currentYearString()
    });
  }

  function bindEvents() {
    var button = byId('loadReportButton');

    if (button) {
      button.addEventListener('click', loadReports);
    }

    window.addEventListener('resize', function () {
      if (latestReport) {
        renderPieChart(latestReport);
      }
    });
  }

  function initReports() {
    if (!document.body || document.body.getAttribute('data-page') !== 'reports') {
      return;
    }

    initFilters();
    bindEvents();
    loadReports();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReports);
  } else {
    initReports();
  }
})();
