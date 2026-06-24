(function () {
  'use strict';

  var config = window.MMC_CONFIG || {};
  var api = window.MMC_API;
  var storageKeys = config.STORAGE_KEYS || {};

  var keys = {
    USER_ID: storageKeys.USER_ID || 'mmc_user_id',
    SESSION_TOKEN: storageKeys.SESSION_TOKEN || 'mmc_session_token'
  };

  function getPageName() {
    return document.body ? document.body.getAttribute('data-page') || '' : '';
  }

  function getLoginUrl() {
    return 'index.html';
  }

  function getDashboardUrl() {
    return 'dashboard.html';
  }

  function setText(id, value) {
    var element = document.getElementById(id);

    if (element) {
      element.textContent = value || '';
    }
  }

  function setMessage(id, message, type) {
    var element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent = message || '';
    element.classList.remove('is-success', 'is-warning', 'is-danger');

    if (type) {
      element.classList.add(type);
    }
  }

  function normalizeHexColor(value) {
    var color = String(value || '').trim();

    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      return color;
    }

    return '';
  }

  function hexToRgb(hex) {
    var color = normalizeHexColor(hex);

    if (!color) {
      return null;
    }

    return {
      r: parseInt(color.slice(1, 3), 16),
      g: parseInt(color.slice(3, 5), 16),
      b: parseInt(color.slice(5, 7), 16)
    };
  }

  function rgbToHex(rgb) {
    return '#' + [rgb.r, rgb.g, rgb.b].map(function (value) {
      return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
    }).join('');
  }

  function mixHexColor(firstColor, secondColor, weight) {
    var first = hexToRgb(firstColor);
    var second = hexToRgb(secondColor);

    if (!first || !second) {
      return normalizeHexColor(firstColor);
    }

    return rgbToHex({
      r: first.r + ((second.r - first.r) * weight),
      g: first.g + ((second.g - first.g) * weight),
      b: first.b + ((second.b - first.b) * weight)
    });
  }

  function applyThemeColor(themeColor) {
    var color = normalizeHexColor(themeColor);
    var root = document.documentElement;
    var rgb;

    if (!color || !root) {
      return;
    }

    rgb = hexToRgb(color);
    root.style.setProperty('--color-primary', color);
    root.style.setProperty('--color-primary-dark', mixHexColor(color, '#000000', 0.18));
    root.style.setProperty('--color-primary-soft', mixHexColor(color, '#ffffff', 0.88));
    root.style.setProperty('--focus-ring', '0 0 0 3px rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.16)');
  }

  function applyThemeColors(settings) {
    var primaryColor;
    var accentColor;
    var backgroundColor;
    var root = document.documentElement;

    if (typeof settings === 'string') {
      applyThemeColor(settings);
      return;
    }

    settings = settings || {};
    primaryColor = normalizeHexColor(settings.primary_color || settings.theme_color);
    accentColor = normalizeHexColor(settings.accent_color);
    backgroundColor = normalizeHexColor(settings.background_color);

    if (primaryColor) {
      applyThemeColor(primaryColor);
    }

    if (root && accentColor) {
      root.style.setProperty('--color-accent', accentColor);
      root.style.setProperty('--color-accent-soft', mixHexColor(accentColor, '#ffffff', 0.9));
    }

    if (root && backgroundColor) {
      root.style.setProperty('--color-bg', backgroundColor);
    }
  }

  function setButtonBusy(button, isBusy, busyText) {
    if (!button) {
      return;
    }

    if (isBusy) {
      button.dataset.originalText = button.textContent;
      button.textContent = busyText || 'လုပ်ဆောင်နေပါသည်';
      button.disabled = true;
      return;
    }

    button.disabled = false;

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }

  function getSession() {
    return {
      user_id: localStorage.getItem(keys.USER_ID) || '',
      session_token: localStorage.getItem(keys.SESSION_TOKEN) || ''
    };
  }

  function hasSession() {
    var session = getSession();
    return Boolean(session.user_id && session.session_token);
  }

  function saveSession(loginData) {
    if (!loginData || !loginData.user_id || !loginData.session_token) {
      throw new Error('Login response မမှန်ပါ။');
    }

    localStorage.setItem(keys.USER_ID, loginData.user_id);
    localStorage.setItem(keys.SESSION_TOKEN, loginData.session_token);
  }

  function clearSession() {
    if (window.MMC_CACHE && typeof window.MMC_CACHE.clearAll === 'function') {
      window.MMC_CACHE.clearAll();
    }

    localStorage.removeItem(keys.USER_ID);
    localStorage.removeItem(keys.SESSION_TOKEN);
  }

  function redirectToLogin() {
    window.location.href = getLoginUrl();
  }

  function redirectToDashboard() {
    window.location.href = getDashboardUrl();
  }

  function renderStoredShopName() {
    setText('shopName', 'ဆိုင်အမည်');
    setText('loginShopName', 'Cloud Share');
  }

  function loadShopNameFromApi() {
    var pageName = getPageName();

    if (pageName === 'login' || !hasSession() || !api || typeof api.getSettings !== 'function') {
      return;
    }

    api.getSettings()
      .then(function (data) {
        var settings = data && data.settings ? data.settings : {};
        var shopName = settings.shop_name || 'ဆိုင်အမည်';

        applyThemeColors(settings);
        setText('shopName', shopName);
        document.dispatchEvent(new CustomEvent('mmc:settings-loaded', {
          detail: settings
        }));
      })
      .catch(function () {
        setText('shopName', 'ဆိုင်အမည်');
      });
  }

  function protectPage() {
    var pageName = getPageName();

    if (pageName === 'contact') {
      return;
    }

    if (pageName === 'login') {
      if (hasSession()) {
        redirectToDashboard();
      }

      return;
    }

    if (!hasSession()) {
      redirectToLogin();
    }
  }

  function handleLoginSubmit(event) {
    var form = event.currentTarget;
    var button = document.getElementById('loginButton');
    var usernameInput = document.getElementById('username');
    var passwordInput = document.getElementById('password');
    var username = usernameInput ? usernameInput.value.trim() : '';
    var password = passwordInput ? passwordInput.value : '';

    event.preventDefault();
    setMessage('loginMessage', '');

    if (!username || !password) {
      setMessage('loginMessage', 'အသုံးပြုသူအမည်နှင့် စကားဝှက် ထည့်ပါ။', 'is-danger');
      return;
    }

    if (!api || typeof api.login !== 'function') {
      setMessage('loginMessage', 'API ချိတ်ဆက်မှု မရှိပါ။', 'is-danger');
      return;
    }

    setButtonBusy(button, true, 'စစ်ဆေးနေပါသည်');

    api.login(username, password)
      .then(function (data) {
        saveSession(data);
        setMessage('loginMessage', 'အကောင့်ဝင်ပြီးပါပြီ။', 'is-success');
        form.reset();
        redirectToDashboard();
      })
      .catch(function (error) {
        setMessage(
          'loginMessage',
          error && error.message ? error.message : 'အကောင့်ဝင်ခြင်း မအောင်မြင်ပါ။',
          'is-danger'
        );
      })
      .finally(function () {
        setButtonBusy(button, false);
      });
  }

  function bindLoginForm() {
    var form = document.getElementById('loginForm');

    if (form) {
      form.addEventListener('submit', handleLoginSubmit);
    }
  }

  function bindPasswordToggle() {
    var passwordInput = document.getElementById('password');
    var toggleButton = document.getElementById('togglePasswordButton');

    if (!passwordInput || !toggleButton) {
      return;
    }

    toggleButton.addEventListener('click', function () {
      var shouldShow = passwordInput.type === 'password';

      passwordInput.type = shouldShow ? 'text' : 'password';
      toggleButton.classList.toggle('is-visible', shouldShow);
      toggleButton.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
      toggleButton.setAttribute('aria-label', shouldShow ? 'စကားဝှက် ဖျောက်ရန်' : 'စကားဝှက် ပြရန်');
      passwordInput.focus();
    });
  }

  function handleLogout() {
    var button = document.getElementById('logoutButton');
    var shouldCallApi = api && typeof api.logout === 'function' && hasSession();

    setButtonBusy(button, true, 'ထွက်နေပါသည်');

    var logoutRequest = shouldCallApi ? api.logout() : Promise.resolve();

    logoutRequest
      .catch(function () {
        return null;
      })
      .finally(function () {
        clearSession();
        redirectToLogin();
      });
  }

  function bindLogoutButton() {
    var button = document.getElementById('logoutButton');

    if (button) {
      button.addEventListener('click', handleLogout);
    }
  }

  function initAuth() {
    protectPage();
    renderStoredShopName();
    bindLoginForm();
    bindPasswordToggle();
    bindLogoutButton();
    loadShopNameFromApi();
  }

  window.MMC_AUTH = Object.freeze({
    getSession: getSession,
    hasSession: hasSession,
    saveSession: saveSession,
    clearSession: clearSession,
    protectPage: protectPage,
    redirectToLogin: redirectToLogin,
    redirectToDashboard: redirectToDashboard,
    applyThemeColor: applyThemeColor,
    applyThemeColors: applyThemeColors
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }
})();
