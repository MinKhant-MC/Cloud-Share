<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>အစီရင်ခံစာများ</title>
  <link rel="stylesheet" href="style.css">
</head>
<body class="app-page" data-page="reports">
  <div class="app-shell">
    <aside class="sidebar" aria-label="မီနူး">
      <a class="brand" href="dashboard.html">
        <span id="shopName">ဆိုင်အမည်</span>
      </a>

      <nav class="nav-list" aria-label="အဓိကမီနူး">
        <a class="nav-link" href="dashboard.html">Dashboard</a>
        <a class="nav-link" href="products.html">ကုန်ပစ္စည်းများ</a>
        <a class="nav-link" href="sales.html">ရောင်းချမှုများ</a>
        <a class="nav-link is-active" href="reports.html">အစီရင်ခံစာများ</a>
        <a class="nav-link" href="settings.html">ဆက်တင်များ</a>
      </nav>

      <button id="logoutButton" class="ghost-button" type="button">ထွက်ရန်</button>
    </aside>

    <main class="content">
      <header class="page-header">
        <div>
          <h1>အစီရင်ခံစာများ</h1>
          <p id="reportGeneratedAt">ယနေ့</p>
        </div>
      </header>

      <section class="toolbar" aria-label="အစီရင်ခံစာရွေးချယ်ရန်">
        <div class="field">
          <label for="reportDate">နေ့စဉ်</label>
          <input id="reportDate" name="date" type="date">
        </div>
        <div class="field">
          <label for="reportMonth">လစဉ်</label>
          <input id="reportMonth" name="month" type="month">
        </div>
        <div class="field">
          <label for="reportYear">နှစ်စဉ်</label>
          <input id="reportYear" name="year" type="number" min="2000" max="2100" step="1">
        </div>
        <button id="loadReportButton" class="primary-button" type="button">အစီရင်ခံစာများ</button>
      </section>
      <p id="reportMessage" class="form-message"></p>

      <section class="summary-grid" aria-label="အစီရင်ခံစာအနှစ်ချုပ်">
        <article class="summary-card">
          <span>ယနေ့ဝင်ငွေ</span>
          <strong id="dailyIncome">0</strong>
        </article>
        <article class="summary-card">
          <span>ယနေ့အမြတ်</span>
          <strong id="dailyProfit">0</strong>
        </article>
        <article class="summary-card">
          <span>လစဉ်ဝင်ငွေ</span>
          <strong id="monthlyIncome">0</strong>
        </article>
        <article class="summary-card">
          <span>လစဉ်အမြတ်</span>
          <strong id="monthlyProfit">0</strong>
        </article>
        <article class="summary-card">
          <span>နှစ်စဉ်ဝင်ငွေ</span>
          <strong id="yearlyIncome">0</strong>
        </article>
        <article class="summary-card">
          <span>နှစ်စဉ်အမြတ်</span>
          <strong id="yearlyProfit">0</strong>
        </article>
      </section>

      <section class="report-chart-grid" aria-label="ပိုင်ချား">
        <article class="panel">
          <div class="panel-header">
            <h2>လစဉ် ကုန်ပစ္စည်းဝင်ငွေ ပိုင်ချား</h2>
            <span id="pieChartTotal" class="panel-note">0</span>
          </div>
          <div class="pie-layout">
            <div class="pie-canvas-wrap">
              <canvas id="productPieChart" width="320" height="320" aria-label="လစဉ် ကုန်ပစ္စည်းဝင်ငွေ ပိုင်ချား"></canvas>
              <span id="pieEmptyText" class="pie-empty-text">ဒေတာမရှိပါ</span>
            </div>
            <div id="productPieLegend" class="pie-legend" aria-label="ပိုင်ချားစာရင်း"></div>
          </div>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel">
          <div class="panel-header">
            <h2>နေ့စဉ်</h2>
          </div>
          <div class="metric-list">
            <div>
              <span>ရောင်းချမှုအရေအတွက်</span>
              <strong id="dailySaleCount">0</strong>
            </div>
            <div>
              <span>ရောင်းပြီးအရေအတွက်</span>
              <strong id="dailySoldQuantity">0</strong>
            </div>
            <div>
              <span>စုစုပေါင်းကုန်ကျစရိတ်</span>
              <strong id="dailyCost">0</strong>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <h2>လက်ကျန်နည်းနေပါသည်</h2>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ကုန်ပစ္စည်းအမည်</th>
                  <th>အရေအတွက်</th>
                  <th>သတ်မှတ်ချက်</th>
                </tr>
              </thead>
              <tbody id="reportLowStockTable">
                <tr>
                  <td colspan="3">ဒေတာမရှိပါ</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  </div>

  <script src="config.js"></script>
  <script src="api.js"></script>
  <script src="auth.js"></script>
  <script src="reports.js"></script>
</body>
</html>
