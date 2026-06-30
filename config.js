(function () {
  'use strict';

  window.MMC_CONFIG = Object.freeze({
    API_URL: 'https://script.google.com/macros/s/AKfycbyG0nvON8UuQJ0tleGau1YtiH1rcc_0VFEzXFSxrE6lPVB7o9u7B_FUxDfcIXLfHrBBOA/exec',
    REQUEST_TIMEOUT_MS: 20000,
    STORAGE_KEYS: Object.freeze({
      USER_ID: 'mmc_user_id',
      SESSION_TOKEN: 'mmc_session_token',
      ROLE: 'mmc_role'
    })
  });
})();
