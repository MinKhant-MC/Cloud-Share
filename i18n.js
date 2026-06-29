(function () {
  'use strict';

  var LANGUAGE_KEY = 'mmc_language';
  var LANGUAGES = [
    { code: 'my', label: 'မြန်မာ' },
    { code: 'en', label: 'Eng' },
    { code: 'zh', label: '中文' }
  ];

  var translations = {
    my: {
      login: 'အကောင့်ဝင်ရန်',
      chatBot: 'Customer Service Bot',
      contact: 'ဆက်သွယ်ရန်',
      contactSubtitle: 'Customer service နှင့် payment service အတွက် Telegram Chat Bot ကိုနှိပ်ပါ။',
      username: 'အသုံးပြုသူအမည်',
      password: 'စကားဝှက်',
      dashboard: 'Dashboard',
      products: 'ကုန်ပစ္စည်းများ',
      addProduct: 'ကုန်ပစ္စည်းထည့်ရန်',
      sales: 'ရောင်းချမှုများ',
      addSale: 'ရောင်းချမှုထည့်ရန်',
      customers: 'ဖောက်သည်များ',
      customerName: 'ဖောက်သည်အမည် (မထည့်လည်းရ)',
      reports: 'အစီရင်ခံစာများ',
      settings: 'ဆက်တင်များ',
      logout: 'ထွက်ရန်',
      search: 'ရှာရန်',
      productId: 'ကုန်ပစ္စည်း ID',
      barcode: 'Barcode',
      expiryDate: 'သက်တမ်းကုန်ရက်',
      productName: 'ကုန်ပစ္စည်းအမည်',
      category: 'အမျိုးအစား',
      color: 'အရောင်',
      size: 'အရွယ်အစား',
      quantity: 'အရေအတွက်',
      buyPrice: 'ဝယ်ဈေး',
      sellPrice: 'ရောင်းဈေး',
      lowStock: 'လက်ကျန်နည်းနေပါသည်',
      fromDate: 'စတင်ရက်',
      toDate: 'ဆုံးရက်',
      save: 'သိမ်းရန်',
      cancel: 'ပယ်ဖျက်ရန်',
      shopName: 'ဆိုင်အမည်',
      currency: 'ငွေကြေး',
      primaryColor: 'အဓိကအရောင်',
      accentColor: 'ဒုတိယအရောင်',
      backgroundColor: 'နောက်ခံအရောင်',
      ask: 'မေးရန်',
      scan: 'Scan',
      stop: 'Stop',
      print: 'ပရင့်ထုတ်ရန်',
      download: 'ဒေါင်းလုဒ်လုပ်ရန်',
      refresh: 'ပြန်ယူရန်'
      ,
      image: 'ပုံ',
      note: 'သတ်မှတ်ချက်',
      select: 'ရွေးချယ်ရန်',
      add: 'ထည့်ရန်',
      clear: 'ရှင်းရန်',
      date: 'ရက်စွဲ',
      saleId: 'Sale ID',
      discount: 'လျှော့ဈေး',
      tax: 'အခွန်',
      available: 'လက်ကျန်',
      customerList: 'ဖောက်သည်စာရင်း',
      customerDetails: 'ဖောက်သည်အသေးစိတ်',
      timesPurchased: 'ဝယ်ယူအကြိမ်',
      details: 'အသေးစိတ်',
      view: 'ကြည့်ရန်',
      close: 'ပိတ်ရန်',
      lastDate: 'နောက်ဆုံးရက်',
      salesHistory: 'ရောင်းချမှုမှတ်တမ်း',
      recordSaleTitle: 'ရောင်းချမှုထည့်ရန်',
      cartItems: 'ဘောင်ချာပစ္စည်းများ',
      rangeProductIncomeChart: 'ရွေးထားသောကာလ ကုန်ပစ္စည်းဝင်ငွေ ပိုင်ခွား',
      restockDaysLeft: 'ကျန်နိုင်သည့်ရက်',
      reorderAmount: 'ပြန်မှာရန်',
      dailySold: 'နေ့စဉ်ရောင်းအား',
      lowStockLimit: 'သတ်မှတ်ချက်'
      ,
      edit: 'ပြင်ရန်',
      delete: 'ဖျက်ရန်',
      action: 'လုပ်ဆောင်ချက်',
      noData: 'ဒေတာမရှိပါ',
      itemUnit: 'ခု',
      loading: 'ယူနေပါသည်',
      generatedAt: 'ထုတ်ထားချိန်',
      selectedRangeIncome: 'ရွေးထားသောကာလ ဝင်ငွေ',
      selectedRangeProfit: 'ရွေးထားသောကာလ အမြတ်',
      totalCost: 'စုစုပေါင်းကုန်ကျစရိတ်',
      soldQuantity: 'ရောင်းပြီးအရေအတွက်',
      saleCount: 'ရောင်းချမှုအကြိမ်',
      profitMargin: 'အမြတ်နှုန်း',
      total: 'စုစုပေါင်း',
      bestSellers: 'ရောင်းအားကောင်းသော ပစ္စည်းများ',
      topProducts: 'Top Products',
      trend: 'အရောင်းလမ်းကြောင်း',
      stockOverview: 'လက်ကျန်အခြေအနေ',
      assistantExamples: 'ဥပမာ: best sellers, restock, expiry, profit, Cargo stock'
    },
    en: {
      login: 'Login',
      chatBot: 'Customer Service Bot',
      contact: 'Contact',
      contactSubtitle: 'Tap the Telegram bot for customer service and payment service.',
      username: 'Username',
      password: 'Password',
      dashboard: 'Dashboard',
      products: 'Products',
      addProduct: 'Add Product',
      sales: 'Sales',
      addSale: 'Record Sale',
      customers: 'Customer',
      customerName: 'Customer Name (optional)',
      reports: 'Reports',
      settings: 'Settings',
      logout: 'Logout',
      search: 'Search',
      productId: 'Product ID',
      barcode: 'Barcode',
      expiryDate: 'Expiry Date',
      productName: 'Product Name',
      category: 'Category',
      color: 'Color',
      size: 'Size',
      quantity: 'Quantity',
      buyPrice: 'Buy Price',
      sellPrice: 'Sell Price',
      lowStock: 'Low Stock Alert',
      fromDate: 'From Date',
      toDate: 'To Date',
      save: 'Save',
      cancel: 'Cancel',
      shopName: 'Shop Name',
      currency: 'Currency',
      primaryColor: 'Primary Color',
      accentColor: 'Accent Color',
      backgroundColor: 'Background Color',
      ask: 'Ask',
      scan: 'Scan',
      stop: 'Stop',
      print: 'Print',
      download: 'Download',
      refresh: 'Refresh'
      ,
      image: 'Image',
      note: 'Note',
      select: 'Select',
      add: 'Add',
      clear: 'Clear',
      date: 'Date',
      saleId: 'Sale ID',
      discount: 'Discount',
      tax: 'Tax',
      available: 'Available',
      customerList: 'Customer List',
      customerDetails: 'Customer Details',
      timesPurchased: 'Times Purchased',
      details: 'Details',
      view: 'View',
      close: 'Close',
      lastDate: 'Last Date',
      salesHistory: 'Sales History',
      recordSaleTitle: 'Record Sale',
      cartItems: 'Cart Items',
      rangeProductIncomeChart: 'Range Product Income Chart',
      restockDaysLeft: 'Days Left',
      reorderAmount: 'Reorder',
      dailySold: 'Daily Sold',
      lowStockLimit: 'Limit'
      ,
      edit: 'Edit',
      delete: 'Delete',
      action: 'Action',
      noData: 'No data',
      itemUnit: 'items',
      loading: 'Loading',
      generatedAt: 'Generated at',
      selectedRangeIncome: 'Range Income',
      selectedRangeProfit: 'Range Profit',
      totalCost: 'Total Cost',
      soldQuantity: 'Sold Quantity',
      saleCount: 'Sale Count',
      profitMargin: 'Profit Margin',
      total: 'Total',
      bestSellers: 'Best Sellers',
      topProducts: 'Top Products',
      trend: 'Sales Trend',
      stockOverview: 'Stock Overview',
      assistantExamples: 'Try: best sellers, restock, expiry, profit, Cargo stock'
    },
    zh: {
      login: '登录',
      chatBot: '客服机器人',
      contact: '联系',
      contactSubtitle: '点击 Telegram 机器人获取客服和付款服务。',
      username: '用户名',
      password: '密码',
      dashboard: '仪表板',
      products: '商品',
      addProduct: '添加商品',
      sales: '销售',
      addSale: '记录销售',
      customers: '客户',
      customerName: '客户名称（可选）',
      reports: '报表',
      settings: '设置',
      logout: '退出',
      search: '搜索',
      productId: '商品 ID',
      barcode: '条码',
      expiryDate: '到期日',
      productName: '商品名称',
      category: '类别',
      color: '颜色',
      size: '尺码',
      quantity: '数量',
      buyPrice: '进价',
      sellPrice: '售价',
      lowStock: '低库存提醒',
      fromDate: '开始日期',
      toDate: '结束日期',
      save: '保存',
      cancel: '取消',
      shopName: '店铺名称',
      currency: '货币',
      primaryColor: '主色',
      accentColor: '辅助色',
      backgroundColor: '背景色',
      ask: '提问',
      scan: '扫描',
      stop: '停止',
      print: '打印',
      download: '下载',
      refresh: '刷新'
      ,
      image: '图片',
      note: '说明',
      select: '选择',
      add: '添加',
      clear: '清空',
      date: '日期',
      saleId: '销售 ID',
      discount: '折扣',
      tax: '税',
      available: '库存',
      customerList: '客户列表',
      customerDetails: '客户详情',
      timesPurchased: '购买次数',
      details: '详情',
      view: '查看',
      close: '关闭',
      lastDate: '最近日期',
      salesHistory: '销售记录',
      recordSaleTitle: '记录销售',
      cartItems: '购物项',
      rangeProductIncomeChart: '时间范围商品收入图',
      restockDaysLeft: '剩余天数',
      reorderAmount: '建议补货',
      dailySold: '日均销量',
      lowStockLimit: '提醒值'
      ,
      edit: '编辑',
      delete: '删除',
      action: '操作',
      noData: '暂无数据',
      itemUnit: '件',
      loading: '加载中',
      generatedAt: '生成时间',
      selectedRangeIncome: '区间收入',
      selectedRangeProfit: '区间利润',
      totalCost: '总成本',
      soldQuantity: '已售数量',
      saleCount: '销售次数',
      profitMargin: '利润率',
      total: '总计',
      bestSellers: '畅销商品',
      topProducts: '热门商品',
      trend: '销售趋势',
      stockOverview: '库存概览',
      assistantExamples: '试试：best sellers, restock, expiry, profit, Cargo stock'
    }
  };

  Object.assign(translations.my, {
    todayIncome: 'ယနေ့ဝင်ငွေ',
    todayProfit: 'ယနေ့အမြတ်',
    monthIncome: 'လစဉ်ဝင်ငွေ',
    monthProfit: 'လစဉ်အမြတ်',
    lowStockTitle: 'လက်ကျန်နည်းနေပါသည်',
    salesOverview: 'ရောင်းချမှုအနှစ်ချုပ်',
    productCount: 'ကုန်ပစ္စည်းအရေအတွက်',
    stockQuantity: 'စုစုပေါင်းလက်ကျန်',
    restockAssistant: 'Smart Restock Assistant',
    expiryTracker: 'Smart Expiry Tracker',
    profitAdvisor: 'AI Profit Advisor',
    businessAssistant: 'Smart Business Assistant'
  });

  Object.assign(translations.en, {
    todayIncome: "Today's Income",
    todayProfit: "Today's Profit",
    monthIncome: 'Monthly Income',
    monthProfit: 'Monthly Profit',
    lowStockTitle: 'Low Stock Alert',
    salesOverview: 'Sales Overview',
    productCount: 'Product Count',
    stockQuantity: 'Total Stock',
    restockAssistant: 'Smart Restock Assistant',
    expiryTracker: 'Smart Expiry Tracker',
    profitAdvisor: 'AI Profit Advisor',
    businessAssistant: 'Smart Business Assistant'
  });

  Object.assign(translations.zh, {
    todayIncome: '今日收入',
    todayProfit: '今日利润',
    monthIncome: '月收入',
    monthProfit: '月利润',
    lowStockTitle: '低库存提醒',
    salesOverview: '销售概览',
    productCount: '商品数量',
    stockQuantity: '总库存',
    restockAssistant: '智能补货助手',
    expiryTracker: '智能到期追踪',
    profitAdvisor: 'AI 利润顾问',
    businessAssistant: '智能业务助手'
  });

  var textTargets = [
    ['#loginTitle', 'login'],
    ['#loginButton', 'login'],
    ['#chatBotButton', 'chatBot'],
    ['#contactTitle', 'contact'],
    ['#contactSubtitle', 'contactSubtitle'],
    ['#backToLoginButton', 'login'],
    ['label[for="username"]', 'username'],
    ['label[for="password"]', 'password'],
    ['.nav-link[href="dashboard.html"]', 'dashboard'],
    ['.nav-link[href="products.html"]', 'products'],
    ['.nav-link[href="sales.html"]', 'sales'],
    ['.nav-link[href="customers.html"]', 'customers'],
    ['.nav-link[href="reports.html"]', 'reports'],
    ['.nav-link[href="settings.html"]', 'settings'],
    ['#logoutButton', 'logout'],
    ['body[data-page="dashboard"] h1', 'dashboard'],
    ['body[data-page="products"] h1', 'products'],
    ['body[data-page="sales"] h1', 'sales'],
    ['body[data-page="customers"] h1', 'customers'],
    ['body[data-page="reports"] h1', 'reports'],
    ['body[data-page="settings"] h1', 'settings'],
    ['body[data-page="contact"] h1', 'contact'],
    ['body[data-page="dashboard"] .summary-grid .summary-card:nth-child(1) > span:first-child', 'todayIncome'],
    ['body[data-page="dashboard"] .summary-grid .summary-card:nth-child(2) > span:first-child', 'todayProfit'],
    ['body[data-page="dashboard"] .summary-grid .summary-card:nth-child(3) > span:first-child', 'monthIncome'],
    ['body[data-page="dashboard"] .summary-grid .summary-card:nth-child(4) > span:first-child', 'monthProfit'],
    ['#dashboardTrendTitle', 'trend'],
    ['#dashboardTopProductsTitle', 'topProducts'],
    ['body[data-page="dashboard"] .dashboard-grid .panel:nth-child(1) h2', 'lowStockTitle'],
    ['body[data-page="dashboard"] .dashboard-grid .panel:nth-child(2) h2', 'salesOverview'],
    ['body[data-page="dashboard"] .metric-list div:nth-child(1) span', 'productCount'],
    ['body[data-page="dashboard"] .metric-list div:nth-child(2) span', 'stockQuantity'],
    ['body[data-page="dashboard"] .metric-list div:nth-child(3) span', 'saleCount'],
    ['body[data-page="reports"] .summary-grid .summary-card:nth-child(1) span', 'selectedRangeIncome'],
    ['body[data-page="reports"] .summary-grid .summary-card:nth-child(2) span', 'selectedRangeProfit'],
    ['body[data-page="reports"] .summary-grid .summary-card:nth-child(3) span', 'totalCost'],
    ['body[data-page="reports"] .summary-grid .summary-card:nth-child(4) span', 'soldQuantity'],
    ['body[data-page="reports"] .summary-grid .summary-card:nth-child(5) span', 'saleCount'],
    ['body[data-page="reports"] .summary-grid .summary-card:nth-child(6) span', 'profitMargin'],
    ['#productPieLegendTitle', 'bestSellers'],
    ['body[data-page="dashboard"] .chart-legend .legend-income', 'selectedRangeIncome'],
    ['body[data-page="dashboard"] .chart-legend .legend-profit', 'selectedRangeProfit'],
    ['body[data-page="dashboard"] .dashboard-grid .panel:nth-child(1) .text-link', 'products'],
    ['body[data-page="dashboard"] .dashboard-grid .panel:nth-child(1) thead th:nth-child(1)', 'productName'],
    ['body[data-page="dashboard"] .dashboard-grid .panel:nth-child(1) thead th:nth-child(2)', 'quantity'],
    ['body[data-page="dashboard"] .dashboard-grid .panel:nth-child(1) thead th:nth-child(3)', 'lowStockLimit'],
    ['body[data-page="dashboard"] .dashboard-grid .panel:nth-child(1) thead th:nth-child(4)', 'view'],
    ['body[data-page="dashboard"] .dashboard-grid .panel:nth-child(2) .text-link', 'addSale'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(1) .panel:nth-child(1) h2', 'restockAssistant'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(1) .panel:nth-child(2) h2', 'lowStockTitle'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(2) .panel:nth-child(1) h2', 'expiryTracker'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(2) .panel:nth-child(2) h2', 'profitAdvisor'],
    ['body[data-page="reports"] .smart-assistant-panel h2', 'businessAssistant'],
    ['#reportRestockTitle', 'restockAssistant'],
    ['#reportExpiryTitle', 'expiryTracker'],
    ['#reportProfitTitle', 'profitAdvisor'],
    ['#reportBusinessAssistantTitle', 'businessAssistant'],
    ['#openProductFormButton', 'addProduct'],
    ['#productFormTitle', 'addProduct'],
    ['body[data-page="products"] thead th:nth-child(1)', 'image'],
    ['body[data-page="products"] thead th:nth-child(2)', 'productId'],
    ['body[data-page="products"] thead th:nth-child(3)', 'barcode'],
    ['body[data-page="products"] thead th:nth-child(4)', 'productName'],
    ['body[data-page="products"] thead th:nth-child(5)', 'category'],
    ['body[data-page="products"] thead th:nth-child(6)', 'color'],
    ['body[data-page="products"] thead th:nth-child(7)', 'size'],
    ['body[data-page="products"] thead th:nth-child(8)', 'expiryDate'],
    ['body[data-page="products"] thead th:nth-child(9)', 'quantity'],
    ['body[data-page="products"] thead th:nth-child(10)', 'buyPrice'],
    ['body[data-page="products"] thead th:nth-child(11)', 'sellPrice'],
    ['body[data-page="products"] thead th:nth-child(12)', 'lowStock'],
    ['body[data-page="products"] thead th:nth-child(13)', 'action'],
    ['label[for="productImageFile"]', 'image'],
    ['#addColorOptionButton', 'add'],
    ['#addSizeOptionButton', 'add'],
    ['label[for="productSearch"]', 'search'],
    ['label[for="productId"]', 'productId'],
    ['label[for="productBarcode"]', 'barcode'],
    ['label[for="productName"]', 'productName'],
    ['label[for="productCategory"]', 'category'],
    ['label[for="productExpiryDate"]', 'expiryDate'],
    ['label[for="productColorNew"]', 'color'],
    ['label[for="productSizeNew"]', 'size'],
    ['label[for="productQuantity"]', 'quantity'],
    ['label[for="buyPrice"]', 'buyPrice'],
    ['label[for="sellPrice"]', 'sellPrice'],
    ['label[for="lowStockAlert"]', 'lowStock'],
    ['label[for="saleProductSearch"]', 'search'],
    ['label[for="saleCustomerName"]', 'customerName'],
    ['label[for="saleBarcodeSearch"]', 'barcode'],
    ['label[for="saleProduct"]', 'products'],
    ['label[for="saleColor"]', 'color'],
    ['label[for="saleSize"]', 'size'],
    ['label[for="soldQuantity"]', 'quantity'],
    ['body[data-page="sales"] .panel:first-child .panel-header h2', 'recordSaleTitle'],
    ['label[for="saleDiscountPercent"]', 'discount'],
    ['label[for="saleTaxPercent"]', 'tax'],
    ['label[for="saleDate"]', 'date'],
    ['body[data-page="sales"] .calc-grid div:nth-child(4) span', 'discount'],
    ['body[data-page="sales"] .calc-grid div:nth-child(5) span', 'tax'],
    ['body[data-page="sales"] .calc-grid div:nth-child(8) span', 'available'],
    ['body[data-page="sales"] .sale-cart-header strong', 'cartItems'],
    ['#clearSaleCartButton', 'clear'],
    ['#addSaleItemButton', 'add'],
    ['body[data-page="sales"] .sale-form-actions .primary-button', 'addSale'],
    ['body[data-page="sales"] .panel:nth-child(2) .panel-header h2', 'todayIncome'],
    ['body[data-page="sales"] thead th:nth-child(1)', 'saleId'],
    ['body[data-page="sales"] thead th:nth-child(2)', 'date'],
    ['body[data-page="sales"] thead th:nth-child(3)', 'customerName'],
    ['body[data-page="sales"] thead th:nth-child(4)', 'productId'],
    ['body[data-page="sales"] thead th:nth-child(5)', 'quantity'],
    ['body[data-page="sales"] thead th:nth-child(6)', 'selectedRangeIncome'],
    ['body[data-page="sales"] thead th:nth-child(7)', 'profit'],
    ['body[data-page="sales"] thead th:nth-child(8)', 'action'],
    ['#startBarcodeScanButton', 'scan'],
    ['#stopBarcodeScanButton', 'stop'],
    ['#downloadVoucherButton', 'download'],
    ['#printVoucherButton', 'print'],
    ['label[for="customerSearch"]', 'search'],
    ['label[for="customerFromDate"]', 'fromDate'],
    ['label[for="customerToDate"]', 'toDate'],
    ['#loadCustomersButton', 'refresh'],
    ['#customersStatus', 'customerList'],
    ['body[data-page="customers"] .summary-grid .summary-card:nth-child(1) span', 'customers'],
    ['body[data-page="customers"] .summary-grid .summary-card:nth-child(2) span', 'quantity'],
    ['body[data-page="customers"] .summary-grid .summary-card:nth-child(3) span', 'selectedRangeIncome'],
    ['body[data-page="customers"] .summary-grid .summary-card:nth-child(4) span', 'selectedRangeProfit'],
    ['body[data-page="customers"] .dashboard-grid .panel:first-child h2', 'customerList'],
    ['body[data-page="customers"] .dashboard-grid .panel:last-child h2', 'customerDetails'],
    ['body[data-page="customers"] #customersTable thead th:nth-child(1)', 'customers'],
    ['body[data-page="customers"] #customersTable thead th:nth-child(2)', 'timesPurchased'],
    ['body[data-page="customers"] #customersTable thead th:nth-child(3)', 'quantity'],
    ['body[data-page="customers"] #customersTable thead th:nth-child(4)', 'totalCost'],
    ['body[data-page="customers"] #customersTable thead th:nth-child(5)', 'selectedRangeIncome'],
    ['body[data-page="customers"] #customersTable thead th:nth-child(6)', 'selectedRangeProfit'],
    ['body[data-page="customers"] #customersTable thead th:nth-child(7)', 'lastDate'],
    ['body[data-page="customers"] #customersTable thead th:nth-child(8)', 'details'],
    ['body[data-page="customers"] #customerDetailTable thead th:nth-child(1)', 'products'],
    ['body[data-page="customers"] #customerDetailTable thead th:nth-child(3)', 'quantity'],
    ['body[data-page="customers"] #customerDetailTable thead th:nth-child(4)', 'selectedRangeIncome'],
    ['body[data-page="customers"] #customerDetailTable thead th:nth-child(5)', 'view'],
    ['label[for="reportFromDate"]', 'fromDate'],
    ['label[for="reportToDate"]', 'toDate'],
    ['#loadReportButton', 'reports'],
    ['body[data-page="reports"] .report-chart-grid .panel h2', 'rangeProductIncomeChart'],
    ['body[data-page="reports"] #reportRestockTable thead th:nth-child(1)', 'products'],
    ['body[data-page="reports"] #reportRestockTable thead th:nth-child(2)', 'available'],
    ['body[data-page="reports"] #reportRestockTable thead th:nth-child(3)', 'dailySold'],
    ['body[data-page="reports"] #reportRestockTable thead th:nth-child(4)', 'restockDaysLeft'],
    ['body[data-page="reports"] #reportRestockTable thead th:nth-child(5)', 'reorderAmount'],
    ['body[data-page="reports"] #reportRestockTable thead th:nth-child(6)', 'view'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(1) .panel:nth-child(2) thead th:nth-child(1)', 'productName'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(1) .panel:nth-child(2) thead th:nth-child(2)', 'quantity'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(1) .panel:nth-child(2) thead th:nth-child(3)', 'lowStockLimit'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(1) .panel:nth-child(2) thead th:nth-child(4)', 'view'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(2) .panel:nth-child(1) thead th:nth-child(5)', 'view'],
    ['body[data-page="reports"] .dashboard-grid:nth-of-type(2) .panel:nth-child(2) thead th:nth-child(5)', 'view'],
    ['#askAssistantButton', 'ask'],
    ['label[for="settingsShopName"]', 'shopName'],
    ['label[for="settingsCurrency"]', 'currency'],
    ['label[for="settingsThemeColor"]', 'primaryColor'],
    ['label[for="settingsAccentColor"]', 'accentColor'],
    ['label[for="settingsBackgroundColor"]', 'backgroundColor']
  ];

  var placeholderTargets = [
    ['#productSearch', { my: 'P00001', en: 'P00001', zh: 'P00001' }],
    ['#saleProductSearch', { my: 'P00001', en: 'P00001', zh: 'P00001' }],
    ['#saleCustomerName', { my: 'C00001 / Customer name (optional)', en: 'C00001 / Customer name (optional)', zh: 'C00001 / Customer name (optional)' }],
    ['#saleBarcodeSearch', { my: 'Barcode ရိုက်ထည့် / Scanner ဖြင့်ဖတ်ပါ', en: 'Type or scan barcode', zh: '输入或扫描条码' }],
    ['#customerSearch', { my: 'ဖောက်သည်အမည် / ကုန်ပစ္စည်း', en: 'Customer / product', zh: '客户 / 商品' }],
    ['#assistantQuestion', { my: 'ဥပမာ - What sold best this week?', en: 'Example - What sold best this week?', zh: '例如：本周什么卖得最好？' }]
  ];

  function getLanguage() {
    var saved = localStorage.getItem(LANGUAGE_KEY);
    return translations[saved] ? saved : 'my';
  }

  function translate(key) {
    var lang = getLanguage();
    return translations[lang][key] || translations.my[key] || key;
  }

  function applyLanguage() {
    var lang = getLanguage();

    document.documentElement.lang = lang === 'zh' ? 'zh' : lang;

    textTargets.forEach(function (target) {
      document.querySelectorAll(target[0]).forEach(function (element) {
        element.textContent = translate(target[1]);
      });
    });

    placeholderTargets.forEach(function (target) {
      document.querySelectorAll(target[0]).forEach(function (element) {
        element.placeholder = target[1][lang] || target[1].my || '';
      });
    });

    document.querySelectorAll('[data-language-button]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-language-button') === lang);
    });

    window.dispatchEvent(new CustomEvent('mmc:languagechange', {
      detail: {
        language: lang
      }
    }));
  }

  function injectSwitcher() {
    var host = document.querySelector('.sidebar') || document.querySelector('.auth-panel');
    var switcher;

    if (!host || document.querySelector('.language-switcher')) {
      return;
    }

    switcher = document.createElement('div');
    switcher.className = 'language-switcher';

    LANGUAGES.forEach(function (language) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = language.label;
      button.setAttribute('data-language-button', language.code);
      button.addEventListener('click', function () {
        localStorage.setItem(LANGUAGE_KEY, language.code);
        applyLanguage();
      });
      switcher.appendChild(button);
    });

    if (host.classList.contains('sidebar')) {
      host.insertBefore(switcher, host.querySelector('.nav-list'));
    } else {
      host.insertBefore(switcher, host.querySelector('form'));
    }
  }

  function initI18n() {
    injectSwitcher();
    applyLanguage();
  }

  window.MMC_I18N = {
    applyLanguage: applyLanguage,
    translate: translate,
    getLanguage: getLanguage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
})();
