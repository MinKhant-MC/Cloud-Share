(function () {
  'use strict';

  var api = window.MMC_API;
  var cache = window.MMC_CACHE;
  var latestReport = null;
  var pieColors = [
    '#245cff',
    '#00a389',
    '#00b7d8',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
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

  function lang() {
    return window.MMC_I18N && typeof window.MMC_I18N.getLanguage === 'function'
      ? window.MMC_I18N.getLanguage()
      : 'my';
  }

  function t(key, fallback) {
    if (window.MMC_I18N && typeof window.MMC_I18N.translate === 'function') {
      return window.MMC_I18N.translate(key);
    }

    return fallback || key;
  }

  var assistantText = {
    my: {
      restockOk: 'ပြန်မှာရန် အရေးကြီးသော ပစ္စည်းမတွေ့ပါ။',
      restockNeed: 'ပြန်မှာရန် စစ်သင့်သော ပစ္စည်း',
      expiryNeed: 'သက်တမ်းကုန်/ကုန်နီးသော ပစ္စည်း',
      expiryOk: 'နောက် 30 ရက်အတွင်း သက်တမ်းကုန်နီးသော ပစ္စည်းမတွေ့ပါ။',
      profitNeed: 'အမြတ်နည်းသော ပစ္စည်း',
      bestProfit: 'အမြတ်အကောင်းဆုံး',
      bestSeller: 'ရောင်းအားအကောင်းဆုံး',
      noSales: 'ရွေးထားသောကာလအတွက် ရောင်းချမှုဒေတာမရှိသေးပါ။',
      lowStock: 'လက်ကျန်နည်း',
      stockLooksOk: 'လက်ကျန်အခြေအနေကောင်းပါသည်။',
      itemStock: 'လက်ကျန်',
      sold: 'ရောင်းပြီး',
      income: 'ဝင်ငွေ',
      profit: 'အမြတ်',
      restockQty: 'ပြန်မှာရန်',
      expiry: 'သက်တမ်းကုန်ရက်',
      noItem: 'အဲဒီကုန်ပစ္စည်းအမည်/ID ကို မတွေ့ပါ။',
      examples: 'မေးနိုင်သည်: best sellers, restock, expiry, profit, low stock, Cargo stock'
    },
    en: {
      restockOk: 'No urgent restock item found.',
      restockNeed: 'Restock review item',
      expiryNeed: 'Expired or near-expiry item',
      expiryOk: 'No product is expiring in the next 30 days.',
      profitNeed: 'Low-profit item',
      bestProfit: 'Best profit item',
      bestSeller: 'Best seller',
      noSales: 'No sales data for the selected range yet.',
      lowStock: 'Low stock',
      stockLooksOk: 'Stock looks okay.',
      itemStock: 'Stock',
      sold: 'Sold',
      income: 'Income',
      profit: 'Profit',
      restockQty: 'Reorder',
      expiry: 'Expiry',
      noItem: 'I cannot find that product name or ID.',
      examples: 'Try: best sellers, restock, expiry, profit, low stock, Cargo stock'
    },
    zh: {
      restockOk: '没有需要紧急补货的商品。',
      restockNeed: '建议补货商品',
      expiryNeed: '已过期或临期商品',
      expiryOk: '未来 30 天没有临期商品。',
      profitNeed: '低利润商品',
      bestProfit: '利润最高商品',
      bestSeller: '畅销商品',
      noSales: '所选日期范围暂无销售数据。',
      lowStock: '低库存',
      stockLooksOk: '库存状态良好。',
      itemStock: '库存',
      sold: '已售',
      income: '收入',
      profit: '利润',
      restockQty: '建议补货',
      expiry: '到期',
      noItem: '找不到该商品名称或 ID。',
      examples: '试试：best sellers, restock, expiry, profit, low stock, Cargo stock'
    }
  };

  function a(key) {
    var current = assistantText[lang()] || assistantText.my;
    return current[key] || assistantText.en[key] || key;
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

  function firstDayOfCurrentMonth() {
    var parts = dateParts(new Date());
    return parts.year + '-' + parts.month + '-01';
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
    var fromInput = byId('reportFromDate');
    var toInput = byId('reportToDate');
    var fromDate = fromInput && fromInput.value ? fromInput.value : firstDayOfCurrentMonth();
    var toDate = toInput && toInput.value ? toInput.value : todayString();
    var swapDate;

    if (fromDate > toDate) {
      swapDate = fromDate;
      fromDate = toDate;
      toDate = swapDate;
    }

    return {
      from_date: fromDate,
      to_date: toDate,
      date: toDate,
      month: toDate.substring(0, 7),
      year: toDate.substring(0, 4)
    };
  }

  function setFilters(filters) {
    if (byId('reportFromDate')) {
      byId('reportFromDate').value = filters.from_date || firstDayOfCurrentMonth();
    }

    if (byId('reportToDate')) {
      byId('reportToDate').value = filters.to_date || todayString();
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

  function dateFromString(value) {
    var date = normalizeDate(value);

    if (!date) {
      return null;
    }

    return new Date(date + 'T00:00:00');
  }

  function daysBetween(fromDate, toDate) {
    var from = dateFromString(fromDate);
    var to = dateFromString(toDate);

    if (!from || !to) {
      return 0;
    }

    return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  }

  function groupSalesByProduct(sales) {
    var grouped = {};

    sales.forEach(function (sale) {
      var productId = String(sale.product_id || '');

      if (!productId) {
        return;
      }

      if (!grouped[productId]) {
        grouped[productId] = {
          product_id: productId,
          product_name: String(sale.product_name || ''),
          sold_quantity: 0,
          total_income: 0,
          profit: 0
        };
      }

      grouped[productId].sold_quantity += toNumber(sale.sold_quantity);
      grouped[productId].total_income += toNumber(sale.total_income);
      grouped[productId].profit += toNumber(sale.profit);
    });

    return grouped;
  }

  function buildRestockSuggestions(products, sales, fromDate, toDate) {
    var grouped = groupSalesByProduct(sales);
    var days = Math.max(daysBetween(fromDate, toDate) + 1, 1);
    var suggestions = [];

    products.forEach(function (product) {
      var productId = String(product.product_id || '');
      var soldQuantity = grouped[productId] ? grouped[productId].sold_quantity : 0;
      var quantity = toNumber(product.quantity);
      var lowAlert = toNumber(product.low_stock_alert);
      var avgDaily = soldQuantity / days;
      var daysLeft = avgDaily > 0 ? quantity / avgDaily : 9999;
      var targetQuantity = avgDaily > 0 ? Math.ceil(avgDaily * 14) : Math.max(lowAlert * 2, lowAlert + 1);
      var reorder = Math.max(0, targetQuantity - quantity);

      if (quantity > lowAlert && daysLeft > 7 && !(reorder > 0 && avgDaily > 0)) {
        return;
      }

      suggestions.push({
        product_id: productId,
        product_name: product.product_name || '',
        quantity: quantity,
        low_stock_alert: lowAlert,
        avg_daily_sold: avgDaily,
        days_left: daysLeft === 9999 ? '' : daysLeft,
        suggested_reorder_qty: Math.ceil(reorder)
      });
    });

    return suggestions.sort(function (a, b) {
      var left = a.days_left === '' ? 9999 : toNumber(a.days_left);
      var right = b.days_left === '' ? 9999 : toNumber(b.days_left);
      return left - right;
    }).slice(0, 20);
  }

  function getExpiringProducts(products) {
    var today = todayString();
    var list = [];

    products.forEach(function (product) {
      var expiryDate = normalizeDate(product.expiry_date);
      var daysRemaining;
      var suggestion;

      if (!expiryDate) {
        return;
      }

      daysRemaining = daysBetween(today, expiryDate);
      if (daysRemaining > 30) {
        return;
      }

      if (daysRemaining < 0) {
        suggestion = 'Expired - remove/check';
      } else if (daysRemaining <= 7) {
        suggestion = '20% discount';
      } else if (daysRemaining <= 14) {
        suggestion = '10% discount';
      } else {
        suggestion = '5% discount';
      }

      list.push({
        product_id: product.product_id || '',
        product_name: product.product_name || '',
        quantity: toNumber(product.quantity),
        expiry_date: expiryDate,
        days_remaining: daysRemaining,
        discount_suggestion: suggestion
      });
    });

    return list.sort(function (a, b) {
      return toNumber(a.days_remaining) - toNumber(b.days_remaining);
    });
  }

  function buildProfitAdvice(sales, products) {
    var grouped = groupSalesByProduct(sales);
    var topProducts = [];
    var lowProfitProducts = [];

    products.forEach(function (product) {
      if (toNumber(product.sell_price) <= toNumber(product.buy_price)) {
        lowProfitProducts.push({
          product_id: product.product_id || '',
          product_name: product.product_name || '',
          total_income: 0,
          profit: 0,
          reason: 'Sell price <= buy price'
        });
      }
    });

    Object.keys(grouped).forEach(function (productId) {
      var item = grouped[productId];
      var margin = item.total_income > 0 ? (item.profit / item.total_income) * 100 : 0;
      var record = {
        product_id: productId,
        product_name: item.product_name || '',
        total_income: item.total_income,
        profit: item.profit,
        profit_margin: margin,
        reason: item.profit <= 0 ? 'No profit/loss' : 'Low margin'
      };

      if (item.profit > 0) {
        topProducts.push(record);
      }

      if (item.profit <= 0 || margin < 5) {
        lowProfitProducts.push(record);
      }
    });

    topProducts.sort(function (a, b) {
      return toNumber(b.profit) - toNumber(a.profit);
    });
    lowProfitProducts.sort(function (a, b) {
      return toNumber(a.profit) - toNumber(b.profit);
    });

    return {
      top_products: topProducts.slice(0, 10),
      low_profit_products: lowProfitProducts.slice(0, 20)
    };
  }

  function buildAssistantSummary(restock, expiry, profitAdvice) {
    var summary = [];

    summary.push(restock.length ? a('restockNeed') + ': ' + restock[0].product_name + ' (' + formatNumber(restock[0].suggested_reorder_qty) + ')' : a('restockOk'));
    if (expiry.length) {
      summary.push(a('expiryNeed') + ': ' + expiry[0].product_name + ' (' + expiry[0].expiry_date + ')');
    }
    if (profitAdvice.low_profit_products.length) {
      summary.push(a('profitNeed') + ': ' + profitAdvice.low_profit_products[0].product_name);
    } else if (profitAdvice.top_products.length) {
      summary.push(a('bestProfit') + ': ' + profitAdvice.top_products[0].product_name);
    }

    return summary;
  }

  function buildReportFromCache(filters) {
    var products = getCachedProducts();
    var sales = getCachedSales();
    var dailySales = [];
    var monthlySales = [];
    var yearlySales = [];
    var rangeSales = [];
    var rangeBreakdown;
    var restockSuggestions;
    var expiringProducts;
    var profitAdvice;

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

      if (saleDate >= filters.from_date && saleDate <= filters.to_date) {
        rangeSales.push(sale);
      }
    });

    rangeBreakdown = buildProductBreakdown(rangeSales);
    restockSuggestions = buildRestockSuggestions(products, rangeSales.length ? rangeSales : sales, filters.from_date, filters.to_date);
    expiringProducts = getExpiringProducts(products);
    profitAdvice = buildProfitAdvice(rangeSales.length ? rangeSales : sales, products);

    return {
      date: filters.date,
      month: filters.month,
      year: filters.year,
      from_date: filters.from_date,
      to_date: filters.to_date,
      daily: summarizeSales(dailySales),
      monthly: summarizeSales(monthlySales),
      yearly: summarizeSales(yearlySales),
      range: summarizeSales(rangeSales),
      daily_product_breakdown: buildProductBreakdown(dailySales),
      monthly_product_breakdown: buildProductBreakdown(monthlySales),
      yearly_product_breakdown: buildProductBreakdown(yearlySales),
      range_product_breakdown: rangeBreakdown,
      product_breakdown: rangeBreakdown,
      low_stock_products: getLowStockProducts(products),
      expiring_products: expiringProducts,
      restock_suggestions: restockSuggestions,
      profit_advice: profitAdvice,
      assistant_summary: buildAssistantSummary(restockSuggestions, expiringProducts, profitAdvice),
      generated_at: new Date().toLocaleString('my-MM')
    };
  }

  function hasCachedReportData() {
    return getCachedProducts().length > 0 || getCachedSales().length > 0;
  }

  function createCell(text, label) {
    var cell = document.createElement('td');
    cell.textContent = text === undefined || text === null ? '' : String(text);

    if (label) {
      cell.setAttribute('data-label', label);
    }

    return cell;
  }

  function createEmptyRow(message, colSpan) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');

    cell.colSpan = colSpan || 3;
    cell.textContent = message;
    row.appendChild(cell);

    return row;
  }


  function createViewCell(onClick) {
    if (window.MMC_TABLE_VIEW && typeof window.MMC_TABLE_VIEW.createViewCell === 'function') {
      return window.MMC_TABLE_VIEW.createViewCell(onClick, 'ကြည့်ရန်');
    }

    var cell = document.createElement('td');
    var button = document.createElement('button');
    button.className = 'small-button icon-view';
    button.type = 'button';
    button.textContent = 'ကြည့်ရန်';
    button.addEventListener('click', onClick);
    cell.appendChild(button);
    cell.setAttribute('data-label', 'ကြည့်ရန်');
    return cell;
  }

  function openReportView(title, fields) {
    if (!window.MMC_TABLE_VIEW) {
      return;
    }

    window.MMC_TABLE_VIEW.open(title, [
      {
        title: 'အသေးစိတ်',
        fields: fields
      }
    ]);
  }

  function openLowStockView(product) {
    openReportView('လက်ကျန်နည်းနေသောပစ္စည်း - ' + (product.product_name || product.product_id || '-'), [
      { label: 'ကုန်ပစ္စည်း ID', value: product.product_id || '-' },
      { label: 'ကုန်ပစ္စည်းအမည်', value: product.product_name || '-' },
      { label: 'အရေအတွက်', value: formatNumber(product.quantity) },
      { label: 'သတ်မှတ်ချက်', value: formatNumber(product.low_stock_alert) }
    ]);
  }

  function openRestockView(item) {
    openReportView('Restock အသေးစိတ် - ' + (item.product_name || item.product_id || '-'), [
      { label: 'ကုန်ပစ္စည်း ID', value: item.product_id || '-' },
      { label: 'ကုန်ပစ္စည်း', value: item.product_name || '-' },
      { label: 'လက်ကျန်', value: formatNumber(item.quantity) },
      { label: 'နေ့စဉ်ရောင်းအား', value: formatNumber(item.avg_daily_sold) },
      { label: 'ကျန်နိုင်သည့်ရက်', value: item.days_left === '' ? '-' : formatNumber(item.days_left) },
      { label: 'ပြန်မှာရန်', value: formatNumber(item.suggested_reorder_qty) }
    ]);
  }

  function openExpiryView(item) {
    openReportView('သက်တမ်းကုန်အသေးစိတ် - ' + (item.product_name || item.product_id || '-'), [
      { label: 'ကုန်ပစ္စည်း ID', value: item.product_id || '-' },
      { label: 'ကုန်ပစ္စည်း', value: item.product_name || '-' },
      { label: 'သက်တမ်းကုန်ရက်', value: item.expiry_date || '-' },
      { label: 'ကျန်ရက်', value: formatNumber(item.days_remaining) },
      { label: 'အကြံပြုချက်', value: item.discount_suggestion || '-' }
    ]);
  }

  function openProfitView(item) {
    openReportView('အမြတ်အသေးစိတ် - ' + (item.product_name || item.product_id || '-'), [
      { label: 'ကုန်ပစ္စည်း ID', value: item.product_id || '-' },
      { label: 'ကုန်ပစ္စည်း', value: item.product_name || '-' },
      { label: 'ဝင်ငွေ', value: formatNumber(item.total_income) },
      { label: 'အမြတ်', value: formatNumber(item.profit) },
      { label: 'မှတ်ချက်', value: item.reason || '-' }
    ]);
  }

  function renderLowStockTable(products) {
    var tableBody = byId('reportLowStockTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);

    if (!products || !products.length) {
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ', 4));
      return;
    }

    products.forEach(function (product) {
      var row = document.createElement('tr');
      var quantityCell = createCell(formatNumber(product.quantity), 'အရေအတွက်');

      quantityCell.classList.add('is-danger');
      row.appendChild(createCell(product.product_name || 'ကုန်ပစ္စည်းအမည်', 'ကုန်ပစ္စည်းအမည်'));
      row.appendChild(quantityCell);
      row.appendChild(createCell(formatNumber(product.low_stock_alert), 'သတ်မှတ်ချက်'));
      row.appendChild(createViewCell(function () {
        openLowStockView(product);
      }));
      tableBody.appendChild(row);
    });
  }

  function renderRestockTable(items) {
    var tableBody = byId('reportRestockTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);

    if (!items || !items.length) {
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ', 6));
      return;
    }

    items.forEach(function (item) {
      var row = document.createElement('tr');

      row.appendChild(createCell(item.product_name || item.product_id || '-', 'ကုန်ပစ္စည်း'));
      row.appendChild(createCell(formatNumber(item.quantity), 'လက်ကျန်'));
      row.appendChild(createCell(formatNumber(item.avg_daily_sold), 'နေ့စဉ်ရောင်းအား'));
      row.appendChild(createCell(item.days_left === '' ? '-' : formatNumber(item.days_left), 'ကျန်နိုင်သည့်ရက်'));
      row.appendChild(createCell(formatNumber(item.suggested_reorder_qty), 'ပြန်မှာရန်'));
      row.appendChild(createViewCell(function () {
        openRestockView(item);
      }));
      tableBody.appendChild(row);
    });
  }

  function renderExpiryTable(items) {
    var tableBody = byId('reportExpiryTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);

    if (!items || !items.length) {
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ', 5));
      return;
    }

    items.forEach(function (item) {
      var row = document.createElement('tr');
      var daysCell = createCell(formatNumber(item.days_remaining), 'ကျန်ရက်');

      if (toNumber(item.days_remaining) <= 7) {
        daysCell.classList.add('is-danger');
      }

      row.appendChild(createCell(item.product_name || item.product_id || '-', 'ကုန်ပစ္စည်း'));
      row.appendChild(createCell(item.expiry_date || '-', 'သက်တမ်းကုန်ရက်'));
      row.appendChild(daysCell);
      row.appendChild(createCell(item.discount_suggestion || '-', 'အကြံပြုချက်'));
      row.appendChild(createViewCell(function () {
        openExpiryView(item);
      }));
      tableBody.appendChild(row);
    });
  }

  function renderProfitTable(profitAdvice) {
    var tableBody = byId('reportProfitTable');
    var items = profitAdvice && profitAdvice.low_profit_products ? profitAdvice.low_profit_products : [];

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);

    if (!items.length) {
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ', 5));
      return;
    }

    items.forEach(function (item) {
      var row = document.createElement('tr');

      row.appendChild(createCell(item.product_name || item.product_id || '-', 'ကုန်ပစ္စည်း'));
      row.appendChild(createCell(formatNumber(item.total_income), 'ဝင်ငွေ'));
      row.appendChild(createCell(formatNumber(item.profit), 'အမြတ်'));
      row.appendChild(createCell(item.reason || '-', 'မှတ်ချက်'));
      row.appendChild(createViewCell(function () {
        openProfitView(item);
      }));
      tableBody.appendChild(row);
    });
  }

  function renderAssistantSummary(report) {
    var container = byId('assistantSummary');
    var summary = report && report.assistant_summary ? report.assistant_summary : [];

    if (!container) {
      return;
    }

    clearElement(container);

    if (!summary.length) {
      container.textContent = 'ဒေတာမရှိပါ';
      return;
    }

    summary.forEach(function (text) {
      var item = document.createElement('div');
      item.className = 'assistant-summary-item';
      item.textContent = text;
      container.appendChild(item);
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
      value.textContent = formatNumber(item.total_income) + ' | ' + percent.toFixed(1) + '%';

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
    var innerRadius;
    var startAngle;
    var centerText;

    setText('pieChartTotal', t('total', 'စုစုပေါင်း') + ' ' + formatNumber(total));

    if (!canvas) {
      renderPieLegend(items, total);
      return;
    }

    prepared = prepareCanvas(canvas);
    context = prepared.context;
    size = prepared.size;
    center = size / 2;
    radius = Math.max(70, center - 12);
    innerRadius = Math.max(42, radius * 0.58);

    context.clearRect(0, 0, size, size);
    context.save();
    context.shadowColor = 'rgba(16, 24, 39, 0.12)';
    context.shadowBlur = 18;
    context.shadowOffsetY = 8;

    if (!items.length || total <= 0) {
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.arc(center, center, innerRadius, Math.PI * 2, 0, true);
      context.fillStyle = '#eef3f8';
      context.fill();
      context.restore();
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
      var gradient = context.createLinearGradient(0, 0, size, size);

      gradient.addColorStop(0, pieColors[index % pieColors.length]);
      gradient.addColorStop(1, pieColors[(index + 2) % pieColors.length]);

      context.beginPath();
      context.arc(center, center, radius, startAngle, endAngle);
      context.arc(center, center, innerRadius, endAngle, startAngle, true);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 4;
      context.stroke();

      startAngle = endAngle;
    });

    context.restore();
    context.beginPath();
    context.arc(center, center, innerRadius - 2, 0, Math.PI * 2);
    context.fillStyle = '#ffffff';
    context.fill();
    context.strokeStyle = '#dbe4ee';
    context.lineWidth = 1;
    context.stroke();

    centerText = formatNumber(total);
    context.fillStyle = '#101827';
    context.font = '800 18px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(centerText, center, center - 6);
    context.fillStyle = '#627086';
    context.font = '700 11px Arial, sans-serif';
    context.fillText('TOTAL', center, center + 15);

    renderPieLegend(items, total);
  }

  function renderReport(report) {
    var range = report && report.range ? report.range : {};
    var margin = toNumber(range.total_income) > 0 ? (toNumber(range.profit) / toNumber(range.total_income)) * 100 : 0;

    latestReport = report || null;
    if (latestReport && latestReport.restock_suggestions && latestReport.expiring_products && latestReport.profit_advice) {
      latestReport.assistant_summary = buildAssistantSummary(
        latestReport.restock_suggestions,
        latestReport.expiring_products,
        latestReport.profit_advice
      );
    }

    setFilters({
      from_date: report && report.from_date ? report.from_date : firstDayOfCurrentMonth(),
      to_date: report && report.to_date ? report.to_date : todayString()
    });

    setText('rangeIncome', formatNumber(range.total_income));
    setText('rangeProfit', formatNumber(range.profit));
    setText('rangeCost', formatNumber(range.total_cost));
    setText('rangeSoldQuantity', formatNumber(range.sold_quantity));
    setText('rangeSaleCount', formatNumber(range.sale_count));
    setText('rangeMargin', margin.toFixed(1) + '%');
    setText('reportGeneratedAt', 'ထုတ်ထားချိန်: ' + (report && report.generated_at ? report.generated_at : '-'));

    setText('reportGeneratedAt', t('generatedAt', 'ထုတ်ထားချိန်') + ': ' + (report && report.generated_at ? report.generated_at : '-'));
    renderPieChart(report);
    renderLowStockTable(report && report.low_stock_products ? report.low_stock_products : []);
    renderRestockTable(report && report.restock_suggestions ? report.restock_suggestions : []);
    renderExpiryTable(report && report.expiring_products ? report.expiring_products : []);
    renderProfitTable(report && report.profit_advice ? report.profit_advice : {});
    renderAssistantSummary(report);
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

  function answerAssistantQuestionLegacy_() {
    var input = byId('assistantQuestion');
    var answer = byId('assistantAnswer');
    var question = input ? input.value.trim().toLowerCase() : '';
    var report = latestReport || buildReportFromCache(readFilters());
    var restock = report.restock_suggestions || [];
    var expiry = report.expiring_products || [];
    var profitAdvice = report.profit_advice || {};
    var topProducts = profitAdvice.top_products || [];
    var lowProfit = profitAdvice.low_profit_products || [];
    var breakdown = report.product_breakdown || [];
    var text;

    if (!answer) {
      return;
    }

    if (!question) {
      answer.textContent = 'မေးခွန်း ထည့်ပါ။';
      return;
    }

    if (question.indexOf('restock') !== -1 || question.indexOf('reorder') !== -1 || question.indexOf('မှာ') !== -1) {
      text = restock.length
        ? 'ပြန်မှာရန် အရေးကြီးဆုံး: ' + restock.slice(0, 3).map(function (item) {
          return item.product_name + ' (' + formatNumber(item.suggested_reorder_qty) + ')';
        }).join(', ')
        : 'ယခုရွေးထားသောကာလအရ ပြန်မှာရန် အရေးကြီးသောပစ္စည်း မတွေ့ပါ။';
    } else if (question.indexOf('expire') !== -1 || question.indexOf('expiry') !== -1 || question.indexOf('သက်တမ်း') !== -1) {
      text = expiry.length
        ? 'သက်တမ်းကုန်နီး: ' + expiry.slice(0, 3).map(function (item) {
          return item.product_name + ' (' + item.expiry_date + ')';
        }).join(', ')
        : 'နောက် ၃၀ ရက်အတွင်း သက်တမ်းကုန်နီးသောပစ္စည်း မတွေ့ပါ။';
    } else if (question.indexOf('profit') !== -1 || question.indexOf('အမြတ်') !== -1) {
      if (question.indexOf('low') !== -1 || question.indexOf('lose') !== -1 || question.indexOf('နည်း') !== -1) {
        text = lowProfit.length
          ? 'အမြတ်စစ်ရန်: ' + lowProfit.slice(0, 3).map(function (item) {
            return item.product_name + ' (' + formatNumber(item.profit) + ')';
          }).join(', ')
          : 'အမြတ်နည်း/ဆုံးရှုံးနေသောပစ္စည်း မတွေ့ပါ။';
      } else {
        text = topProducts.length
          ? 'အမြတ်အကောင်းဆုံး: ' + topProducts.slice(0, 3).map(function (item) {
            return item.product_name + ' (' + formatNumber(item.profit) + ')';
          }).join(', ')
          : 'အမြတ်ဒေတာ မရှိသေးပါ။';
      }
    } else if (question.indexOf('best') !== -1 || question.indexOf('sold') !== -1 || question.indexOf('ရောင်း') !== -1) {
      text = breakdown.length
        ? 'ရောင်းအား/ဝင်ငွေအကောင်းဆုံး: ' + breakdown.slice(0, 3).map(function (item) {
          return item.product_name + ' (' + formatNumber(item.total_income) + ')';
        }).join(', ')
        : 'ရွေးထားသောကာလအတွက် ရောင်းချမှုဒေတာ မရှိသေးပါ။';
    } else {
      text = (report.assistant_summary || []).join(' ');
    }

    answer.textContent = text || 'ဒေတာမရှိပါ။';
  }

  function normalizeQuestionText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findByProductId(items, productId) {
    var target = normalizeQuestionText(productId);

    return (items || []).find(function (item) {
      return normalizeQuestionText(item.product_id) === target;
    }) || null;
  }

  function findMentionedProduct(question, report) {
    var products = getCachedProducts();
    var pools = []
      .concat(products || [])
      .concat(report && report.product_breakdown ? report.product_breakdown : [])
      .concat(report && report.restock_suggestions ? report.restock_suggestions : [])
      .concat(report && report.expiring_products ? report.expiring_products : [])
      .concat(report && report.profit_advice && report.profit_advice.top_products ? report.profit_advice.top_products : [])
      .concat(report && report.profit_advice && report.profit_advice.low_profit_products ? report.profit_advice.low_profit_products : []);
    var normalizedQuestion = normalizeQuestionText(question);
    var seen = {};

    return pools.find(function (item) {
      var id = normalizeQuestionText(item.product_id);
      var name = normalizeQuestionText(item.product_name);
      var key = id || name;

      if (!key || seen[key]) {
        return false;
      }

      seen[key] = true;

      if (id && normalizedQuestion.indexOf(id) !== -1) {
        return true;
      }

      return name.length >= 2 && normalizedQuestion.indexOf(name) !== -1;
    }) || null;
  }

  function summarizeProductForAssistant(product, report) {
    var products = getCachedProducts();
    var fullProduct = products.find(function (item) {
      return normalizeQuestionText(item.product_id) === normalizeQuestionText(product.product_id);
    }) || product;
    var breakdown = findByProductId(report.product_breakdown || [], fullProduct.product_id) || {};
    var restock = findByProductId(report.restock_suggestions || [], fullProduct.product_id);
    var expiry = findByProductId(report.expiring_products || [], fullProduct.product_id);
    var lowProfit = findByProductId((report.profit_advice || {}).low_profit_products || [], fullProduct.product_id);
    var parts = [
      (fullProduct.product_name || fullProduct.product_id || '-') + ':',
      a('itemStock') + ' ' + formatNumber(fullProduct.quantity),
      a('sold') + ' ' + formatNumber(breakdown.sold_quantity),
      a('income') + ' ' + formatNumber(breakdown.total_income),
      a('profit') + ' ' + formatNumber(breakdown.profit)
    ];

    if (restock) {
      parts.push(a('restockQty') + ' ' + formatNumber(restock.suggested_reorder_qty));
    }

    if (expiry) {
      parts.push(a('expiry') + ' ' + (expiry.expiry_date || '-'));
    }

    if (lowProfit) {
      parts.push(a('profitNeed'));
    }

    return parts.join(' | ');
  }

  function listAssistantItems(prefix, items, valueKey) {
    if (!items || !items.length) {
      return prefix + ': ' + a('noSales');
    }

    return prefix + ': ' + items.slice(0, 5).map(function (item) {
      var value = valueKey ? ' (' + formatNumber(item[valueKey]) + ')' : '';
      return (item.product_name || item.product_id || '-') + value;
    }).join(', ');
  }

  function answerAssistantQuestion() {
    var input = byId('assistantQuestion');
    var answer = byId('assistantAnswer');
    var question = input ? input.value.trim() : '';
    var normalized = normalizeQuestionText(question);
    var report = latestReport || buildReportFromCache(readFilters());
    var restock = report.restock_suggestions || [];
    var expiry = report.expiring_products || [];
    var profitAdvice = report.profit_advice || {};
    var topProducts = profitAdvice.top_products || [];
    var lowProfit = profitAdvice.low_profit_products || [];
    var breakdown = report.product_breakdown || [];
    var lowStock = report.low_stock_products || [];
    var range = report.range || {};
    var mentionedProduct;
    var text;

    if (!answer) {
      return;
    }

    if (!question) {
      answer.textContent = a('examples');
      return;
    }

    mentionedProduct = findMentionedProduct(normalized, report);
    if (mentionedProduct) {
      answer.textContent = summarizeProductForAssistant(mentionedProduct, report);
      return;
    }

    if (containsAnyText_(normalized, ['restock', 'reorder', 'order', 'မှာ'])) {
      text = restock.length
        ? listAssistantItems(a('restockNeed'), restock, 'suggested_reorder_qty')
        : a('restockOk');
    } else if (containsAnyText_(normalized, ['expire', 'expiry', 'date', 'သက်တမ်း'])) {
      text = expiry.length
        ? listAssistantItems(a('expiryNeed'), expiry, 'days_remaining')
        : a('expiryOk');
    } else if (containsAnyText_(normalized, ['low stock', 'stock low', 'stock', 'inventory', 'လက်ကျန်'])) {
      text = lowStock.length
        ? listAssistantItems(a('lowStock'), lowStock, 'quantity')
        : a('stockLooksOk');
    } else if (containsAnyText_(normalized, ['low profit', 'lose', 'loss', 'အမြတ်နည်း'])) {
      text = lowProfit.length
        ? listAssistantItems(a('profitNeed'), lowProfit, 'profit')
        : a('stockLooksOk');
    } else if (containsAnyText_(normalized, ['profit', 'အမြတ်'])) {
      text = topProducts.length
        ? listAssistantItems(a('bestProfit'), topProducts, 'profit')
        : a('noSales');
    } else if (containsAnyText_(normalized, ['best', 'top', 'sold', 'ရောင်း'])) {
      text = breakdown.length
        ? listAssistantItems(a('bestSeller'), breakdown, 'total_income')
        : a('noSales');
    } else if (containsAnyText_(normalized, ['income', 'revenue', 'sales', 'ဝင်ငွေ'])) {
      text = a('income') + ': ' + formatNumber(range.total_income) +
        ' | ' + a('sold') + ': ' + formatNumber(range.sold_quantity) +
        ' | ' + a('profit') + ': ' + formatNumber(range.profit);
    } else {
      text = (report.assistant_summary || []).join(' | ') + ' | ' + a('examples');
    }

    answer.textContent = text || a('noSales');
  }

  function containsAnyText_(value, words) {
    return words.some(function (word) {
      return value.indexOf(String(word).toLowerCase()) !== -1;
    });
  }

  function initFilters() {
    setFilters({
      from_date: firstDayOfCurrentMonth(),
      to_date: todayString()
    });
  }

  function bindEvents() {
    var button = byId('loadReportButton');
    var askButton = byId('askAssistantButton');
    var assistantInput = byId('assistantQuestion');

    if (button) {
      button.addEventListener('click', loadReports);
    }

    if (askButton) {
      askButton.addEventListener('click', answerAssistantQuestion);
    }

    if (assistantInput) {
      assistantInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          answerAssistantQuestion();
        }
      });
    }

    window.addEventListener('mmc:languagechange', function () {
      var answer = byId('assistantAnswer');

      if (latestReport) {
        renderReport(latestReport);
      }

      if (answer && answer.textContent) {
        answerAssistantQuestion();
      }
    });

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
