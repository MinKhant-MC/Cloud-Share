(function () {
  'use strict';

  window.MMC_CONFIG = Object.freeze({
    API_URL: 'https://script.google.com/macros/s/AKfycbyaIE0z26EO4Vm2uS7vbzF41MUgjPqHiJNVaA2XqXdZyXxJ_zDZ_cPxJIKzj7MaXnNgkg/exec',
    REQUEST_TIMEOUT_MS: 20000,
    STORAGE_KEYS: Object.freeze({
      USER_ID: 'mmc_user_id',
      SESSION_TOKEN: 'mmc_session_token',
      ROLE: 'mmc_role'
    })
  });
})();
