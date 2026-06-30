(function () {
  'use strict';

  var api = window.MMC_API;
  var cache = window.MMC_CACHE;
  var allSales = [];
  var customerSummaries = [];
  var selectedCustomerKey = '';

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
    var element = byId('customersMessage');

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

  function cleanText(value) {
    return String(value === undefined || value === null ? '' : value).trim();
  }

  function normalizeDate(value) {
    var text = cleanText(value);
    var date;

    if (!text) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.substring(0, 10);
    }

    date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
    }

    return text.substring(0, 10);
  }

  function getCustomerName(sale) {
    return cleanText(sale && sale.customer_name) || cleanText(sale && sale.customer_phone) || 'အမည်မထည့်ထားသောဖောက်သည်';
  }

  function getCustomerPhone(sale) {
    return cleanText(sale && sale.customer_phone);
  }

  function getCustomerKey(sale) {
    var rawPhone = cleanText(sale && sale.customer_phone).replace(/[\s\-()+]/g, '');
    var rawName = cleanText(sale && sale.customer_name);

    if (rawPhone) {
      return 'phone::' + rawPhone.toLowerCase();
    }

    return rawName ? 'name::' + rawName.toLowerCase() : '__unnamed_customer__';
  }

  function getVariantText(sale) {
    var parts = [];

    if (sale.sale_color) {
      parts.push(sale.sale_color);
    }

    if (sale.sale_size) {
      parts.push(sale.sale_size);
    }

    return parts.length ? parts.join(' / ') : '-';
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

    cell.colSpan = colSpan;
    cell.textContent = message;
    row.appendChild(cell);

    return row;
  }

  function createLoadingRow(message, colSpan) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    var loading = document.createElement('span');

    cell.colSpan = colSpan;
    loading.className = 'loading-state';
    loading.textContent = message;
    cell.appendChild(loading);
    row.appendChild(cell);

    return row;
  }


  function openCustomerView(customer) {
    if (!window.MMC_TABLE_VIEW || !customer) {
      return;
    }

    window.MMC_TABLE_VIEW.open('ဖောက်သည်အသေးစိတ် - ' + (customer.customer_name || customer.customer_phone || '-'), [
      {
        title: 'ဖောက်သည်အချက်အလက်',
        fields: [
          { label: 'ဖောက်သည်', value: customer.customer_name || '-' },
          { label: 'ဖုန်းနံပါတ်', value: customer.customer_phone || '-' },
          { label: 'ဝယ်ယူအကြိမ်', value: formatNumber(customer.sale_count) },
          { label: 'ပစ္စည်းအရေအတွက်', value: formatNumber(customer.sold_quantity) },
          { label: 'ဆိုင်ကုန်ကျစရိတ်', value: formatNumber(customer.total_cost) },
          { label: 'ကျသင့်ငွေ', value: formatNumber(customer.total_income) },
          { label: 'အမြတ်', value: formatNumber(customer.profit) },
          { label: 'နောက်ဆုံးရက်', value: customer.last_sale_date || '-' }
        ]
      },
      {
        title: 'ယူထားသောပစ္စည်းများ',
        fields: [
          { label: 'ပစ္စည်းများ', value: (customer.product_list || []).map(function (product, index) {
            return (index + 1) + '. ' + (product.product_name || '-') + ' | ' +
              (product.variant || '-') + ' | Qty: ' + formatNumber(product.sold_quantity) +
              ' | Income: ' + formatNumber(product.total_income);
          }) }
        ]
      }
    ]);
  }

  function openCustomerProductView(customer, product) {
    if (!window.MMC_TABLE_VIEW || !product) {
      return;
    }

    window.MMC_TABLE_VIEW.open('ပစ္စည်းအသေးစိတ် - ' + (product.product_name || '-'), [
      {
        title: customer ? (customer.customer_name || 'ဖောက်သည်') : 'ဖောက်သည်',
        fields: [
          { label: 'ကုန်ပစ္စည်း ID', value: product.product_id || '-' },
          { label: 'ကုန်ပစ္စည်း', value: product.product_name || '-' },
          { label: 'အရောင်/အရွယ်', value: product.variant || '-' },
          { label: 'အရေအတွက်', value: formatNumber(product.sold_quantity) },
          { label: 'ဆိုင်ကုန်ကျစရိတ်', value: formatNumber(product.total_cost) },
          { label: 'ကျသင့်ငွေ', value: formatNumber(product.total_income) },
          { label: 'အမြတ်', value: formatNumber(product.profit) }
        ]
      }
    ]);
  }

  function createViewCell(onClick, label) {
    if (window.MMC_TABLE_VIEW && typeof window.MMC_TABLE_VIEW.createViewCell === 'function') {
      return window.MMC_TABLE_VIEW.createViewCell(onClick, label || 'ကြည့်ရန်');
    }

    var cell = document.createElement('td');
    var button = document.createElement('button');
    button.className = 'small-button icon-view';
    button.type = 'button';
    button.textContent = 'ကြည့်ရန်';
    button.addEventListener('click', onClick);
    cell.appendChild(button);
    cell.setAttribute('data-label', label || 'ကြည့်ရန်');
    return cell;
  }

  function getCachedSales() {
    return cache && typeof cache.getSales === 'function' ? cache.getSales() : [];
  }

  function setCachedSales(list) {
    if (cache && typeof cache.setSales === 'function') {
      cache.setSales(list);
    }
  }

  function readFilters() {
    var fromInput = byId('customerFromDate');
    var toInput = byId('customerToDate');
    var searchInput = byId('customerSearch');
    var fromDate = fromInput && fromInput.value ? fromInput.value : '';
    var toDate = toInput && toInput.value ? toInput.value : '';
    var swapDate;

    if (fromDate && toDate && fromDate > toDate) {
      swapDate = fromDate;
      fromDate = toDate;
      toDate = swapDate;
    }

    return {
      from_date: fromDate,
      to_date: toDate,
      query: searchInput ? searchInput.value.trim().toLowerCase() : ''
    };
  }

  function saleMatchesFilters(sale, filters) {
    var saleDate = normalizeDate(sale.sale_date);
    var searchText;

    if (filters.from_date && saleDate < filters.from_date) {
      return false;
    }

    if (filters.to_date && saleDate > filters.to_date) {
      return false;
    }

    if (!filters.query) {
      return true;
    }

    searchText = [
      getCustomerName(sale),
      getCustomerPhone(sale),
      sale.product_id,
      sale.product_name,
      sale.sale_color,
      sale.sale_size,
      sale.sale_date
    ].join(' ').toLowerCase();

    return searchText.indexOf(filters.query) !== -1;
  }

  function getProductKey(sale) {
    return [
      cleanText(sale.product_id).toLowerCase(),
      cleanText(sale.product_name).toLowerCase(),
      cleanText(sale.sale_color).toLowerCase(),
      cleanText(sale.sale_size).toLowerCase()
    ].join('::');
  }

  function addSaleToCustomer(summary, sale) {
    var productKey = getProductKey(sale);
    var product;
    var saleDate = normalizeDate(sale.sale_date);
    var quantity = toNumber(sale.sold_quantity);
    var totalCost = toNumber(sale.total_cost);
    var totalIncome = toNumber(sale.total_income);
    var profit = toNumber(sale.profit);

    summary.sale_count += 1;
    summary.sold_quantity += quantity;
    summary.total_cost += totalCost;
    summary.total_income += totalIncome;
    summary.profit += profit;

    if (saleDate && (!summary.last_sale_date || saleDate > summary.last_sale_date)) {
      summary.last_sale_date = saleDate;
    }

    if (!summary.products[productKey]) {
      summary.products[productKey] = {
        product_id: cleanText(sale.product_id),
        product_name: cleanText(sale.product_name) || 'ကုန်ပစ္စည်းအမည်မရှိ',
        variant: getVariantText(sale),
        sold_quantity: 0,
        total_cost: 0,
        total_income: 0,
        profit: 0
      };
    }

    product = summary.products[productKey];
    product.sold_quantity += quantity;
    product.total_cost += totalCost;
    product.total_income += totalIncome;
    product.profit += profit;
  }

  function buildCustomerSummaries(sales) {
    var grouped = {};

    sales.forEach(function (sale) {
      var key = getCustomerKey(sale);

      if (!grouped[key]) {
        grouped[key] = {
          key: key,
          customer_name: getCustomerName(sale),
          customer_phone: getCustomerPhone(sale),
          sale_count: 0,
          sold_quantity: 0,
          total_cost: 0,
          total_income: 0,
          profit: 0,
          last_sale_date: '',
          products: {}
        };
      }

      if (!grouped[key].customer_phone && getCustomerPhone(sale)) {
        grouped[key].customer_phone = getCustomerPhone(sale);
      }

      if ((!grouped[key].customer_name || grouped[key].customer_name === grouped[key].customer_phone) && cleanText(sale.customer_name)) {
        grouped[key].customer_name = cleanText(sale.customer_name);
      }

      addSaleToCustomer(grouped[key], sale);
    });

    return Object.keys(grouped).map(function (key) {
      var summary = grouped[key];

      summary.product_list = Object.keys(summary.products).map(function (productKey) {
        return summary.products[productKey];
      }).sort(function (a, b) {
        return toNumber(b.total_income) - toNumber(a.total_income);
      });

      return summary;
    }).sort(function (a, b) {
      return toNumber(b.total_income) - toNumber(a.total_income);
    });
  }

  function summarizeCustomers(list) {
    return list.reduce(function (totals, customer) {
      totals.customer_count += 1;
      totals.sold_quantity += toNumber(customer.sold_quantity);
      totals.total_cost += toNumber(customer.total_cost);
      totals.total_income += toNumber(customer.total_income);
      totals.profit += toNumber(customer.profit);
      return totals;
    }, {
      customer_count: 0,
      sold_quantity: 0,
      total_cost: 0,
      total_income: 0,
      profit: 0
    });
  }

  function renderSummaryCards(list) {
    var totals = summarizeCustomers(list);

    setText('customerCount', formatNumber(totals.customer_count));
    setText('customerItemQuantity', formatNumber(totals.sold_quantity));
    setText('customerTotalIncome', formatNumber(totals.total_income));
    setText('customerTotalProfit', formatNumber(totals.profit));
    setText('customerTableCount', formatNumber(list.length) + ' ယောက်');
    setText('customersStatus', 'ရောင်းချမှု ' + formatNumber(allSales.length) + ' ကြောင်းမှ စုထားပါသည်');
  }

  function renderCustomerDetails(customer) {
    var tableBody = byId('customerDetailTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);

    if (!customer) {
      setText('customerDetailName', 'ဖောက်သည်အသေးစိတ်');
      setText('customerDetailMeta', 'ဖောက်သည်ရွေးချယ်ပါ');
      setText('detailQuantity', '0');
      setText('detailIncome', '0');
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ', 5));
      return;
    }

    setText('customerDetailName', customer.customer_name || customer.customer_phone);
    setText('customerDetailMeta', (customer.customer_phone ? 'ဖုန်း ' + customer.customer_phone + ' | ' : '') + 'ဝယ်ယူအကြိမ် ' + formatNumber(customer.sale_count) + ' | နောက်ဆုံးရက် ' + (customer.last_sale_date || '-'));
    setText('detailQuantity', formatNumber(customer.sold_quantity));
    setText('detailIncome', formatNumber(customer.total_income));

    if (!customer.product_list.length) {
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ', 5));
      return;
    }

    customer.product_list.forEach(function (product) {
      var row = document.createElement('tr');
      row.appendChild(createCell(product.product_name, 'ကုန်ပစ္စည်း'));
      row.appendChild(createCell(product.variant, 'အရောင်/အရွယ်'));
      row.appendChild(createCell(formatNumber(product.sold_quantity), 'အရေအတွက်'));
      row.appendChild(createCell(formatNumber(product.total_income), 'ကျသင့်ငွေ'));
      row.appendChild(createViewCell(function () {
        openCustomerProductView(customer, product);
      }, 'ကြည့်ရန်'));
      tableBody.appendChild(row);
    });
  }

  function selectCustomer(customerKey) {
    selectedCustomerKey = customerKey;
    renderCustomerTable(customerSummaries);
    renderCustomerDetails(customerSummaries.find(function (customer) {
      return customer.key === selectedCustomerKey;
    }) || null);
  }

  function createDetailButton(customer) {
    var cell = document.createElement('td');
    var button = document.createElement('button');

    button.className = 'small-button icon-view';
    button.type = 'button';
    button.textContent = 'ကြည့်ရန်';
    button.addEventListener('click', function () {
      selectCustomer(customer.key);
      openCustomerView(customer);
    });

    cell.appendChild(button);
    cell.setAttribute('data-label', 'အသေးစိတ်');
    return cell;
  }

  function renderCustomerTable(list) {
    var tableBody = byId('customersTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);

    if (!list.length) {
      tableBody.appendChild(createEmptyRow('ဒေတာမရှိပါ', 9));
      return;
    }

    list.forEach(function (customer) {
      var row = document.createElement('tr');

      if (customer.key === selectedCustomerKey) {
        row.className = 'is-selected-row';
      }

      row.appendChild(createCell(customer.customer_name, 'ဖောက်သည်'));
      row.appendChild(createCell(customer.customer_phone || '-', 'ဖုန်းနံပါတ်'));
      row.appendChild(createCell(formatNumber(customer.sale_count), 'ဝယ်ယူအကြိမ်'));
      row.appendChild(createCell(formatNumber(customer.sold_quantity), 'ပစ္စည်းအရေအတွက်'));
      row.appendChild(createCell(formatNumber(customer.total_cost), 'ဆိုင်ကုန်ကျစရိတ်'));
      row.appendChild(createCell(formatNumber(customer.total_income), 'ကျသင့်ငွေ'));
      row.appendChild(createCell(formatNumber(customer.profit), 'အမြတ်'));
      row.appendChild(createCell(customer.last_sale_date || '-', 'နောက်ဆုံးရက်'));
      row.appendChild(createDetailButton(customer));
      tableBody.appendChild(row);
    });
  }

  function renderCustomers() {
    var filters = readFilters();
    var filteredSales = allSales.filter(function (sale) {
      return saleMatchesFilters(sale, filters);
    });

    customerSummaries = buildCustomerSummaries(filteredSales);

    if (!customerSummaries.some(function (customer) {
      return customer.key === selectedCustomerKey;
    })) {
      selectedCustomerKey = customerSummaries.length ? customerSummaries[0].key : '';
    }

    renderSummaryCards(customerSummaries);
    renderCustomerTable(customerSummaries);
    renderCustomerDetails(customerSummaries.find(function (customer) {
      return customer.key === selectedCustomerKey;
    }) || null);
  }

  function setCustomersLoading(message, isLoading) {
    var tableBody = byId('customersTable');

    if (!tableBody) {
      return;
    }

    clearElement(tableBody);
    tableBody.appendChild(isLoading ? createLoadingRow(message, 9) : createEmptyRow(message, 8));
  }

  function renderCachedSales() {
    var cachedSales = getCachedSales();

    if (!cachedSales.length) {
      return false;
    }

    allSales = cachedSales;
    renderCustomers();
    return true;
  }

  function loadCustomers() {
    var filters = readFilters();
    var requestFilters = {};

    setMessage('');

    if (filters.from_date) {
      requestFilters.from_date = filters.from_date;
    }

    if (filters.to_date) {
      requestFilters.to_date = filters.to_date;
    }

    if (!api || typeof api.listSales !== 'function') {
      if (!renderCachedSales()) {
        setCustomersLoading('API ချိတ်ဆက်မှု မရှိပါ။', false);
      }
      return Promise.resolve();
    }

    renderCachedSales();

    return api.listSales(requestFilters)
      .then(function (data) {
        allSales = data && Array.isArray(data.sales) ? data.sales : [];
        setCachedSales(allSales);
        renderCustomers();
      })
      .catch(function () {
        renderCachedSales();
      });
  }

  function bindEvents() {
    var searchInput = byId('customerSearch');
    var fromInput = byId('customerFromDate');
    var toInput = byId('customerToDate');
    var loadButton = byId('loadCustomersButton');

    if (searchInput) {
      searchInput.addEventListener('input', renderCustomers);
    }

    if (fromInput) {
      fromInput.addEventListener('change', loadCustomers);
    }

    if (toInput) {
      toInput.addEventListener('change', loadCustomers);
    }

    if (loadButton) {
      loadButton.addEventListener('click', loadCustomers);
    }

    window.addEventListener('mmc:sales-updated', function (event) {
      allSales = event && event.detail && Array.isArray(event.detail.sales) ? event.detail.sales : getCachedSales();
      renderCustomers();
    });
  }

  function initCustomers() {
    if (!document.body || document.body.getAttribute('data-page') !== 'customers') {
      return;
    }

    bindEvents();
    loadCustomers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomers);
  } else {
    initCustomers();
  }
})();
