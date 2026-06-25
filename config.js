(function () {
  'use strict';

  window.MMC_CONFIG = Object.freeze({
    API_URL: 'https://script.google.com/macros/s/AKfycbyDadUu7HdTGbZUl40QyuQpb2e8yLjgGwXrRxxsVkau8vqZOlUV2w1nLHZoQ35FzMIngQ/exec',
    REQUEST_TIMEOUT_MS: 20000,
    STORAGE_KEYS: Object.freeze({
      USER_ID: 'mmc_user_id',
      SESSION_TOKEN: 'mmc_session_token',
      ROLE: 'mmc_role'
    })
  });
})();
