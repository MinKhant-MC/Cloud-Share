(function () {
  'use strict';

  function openTelegramBot(event) {
    var link = event.currentTarget;
    var domain = link.getAttribute('data-telegram-domain') || 'Cloudshareweb_bot';
    var webUrl = 'https://t.me/' + encodeURIComponent(domain);
    var appUrl = 'tg://resolve?domain=' + encodeURIComponent(domain);
    var didLeavePage = false;

    event.preventDefault();

    function markLeftPage() {
      if (document.hidden) {
        didLeavePage = true;
      }
    }

    document.addEventListener('visibilitychange', markLeftPage, { once: true });
    window.location.href = appUrl;

    window.setTimeout(function () {
      document.removeEventListener('visibilitychange', markLeftPage);

      if (!didLeavePage) {
        window.location.href = webUrl;
      }
    }, 900);
  }

  function initTelegramLinks() {
    document.querySelectorAll('[data-telegram-domain]').forEach(function (link) {
      link.addEventListener('click', openTelegramBot);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTelegramLinks);
  } else {
    initTelegramLinks();
  }
})();
