(function () {
  'use strict';

  window.MMC_CONFIG = Object.freeze({
    API_URL: 'https://script.google.com/macros/s/AKfycbxiM8yxocs6ZRg7apITquDJpAaWCYK9PKzwEBRPvv-vNkG6_cbhx-ffE91YGpbrW6NKlg/exec',
    REQUEST_TIMEOUT_MS: 20000,
    STORAGE_KEYS: Object.freeze({
      USER_ID: 'mmc_user_id',
      SESSION_TOKEN: 'mmc_session_token',
      ROLE: 'mmc_role'
    })
  });
})();
