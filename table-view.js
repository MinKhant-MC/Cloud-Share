(function () {
  'use strict';

  var dialog;
  var titleElement;
  var bodyElement;

  function t(key, fallback) {
    if (window.MMC_I18N && typeof window.MMC_I18N.translate === 'function') {
      return window.MMC_I18N.translate(key) || fallback || key;
    }

    return fallback || key;
  }

  function clearElement(element) {
    while (element && element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function normalizeValue(value) {
    if (Array.isArray(value)) {
      return value.length ? value.join('\n') : '-';
    }

    if (value === undefined || value === null || value === '') {
      return '-';
    }

    return String(value);
  }

  function openDialog(element) {
    if (!element) {
      return;
    }

    if (typeof element.showModal === 'function') {
      element.showModal();
      return;
    }

    element.setAttribute('open', 'open');
  }

  function closeDialog(element) {
    if (!element) {
      return;
    }

    if (typeof element.close === 'function') {
      element.close();
      return;
    }

    element.removeAttribute('open');
  }

  function ensureDialog() {
    var closeButton;
    var section;
    var header;
    var footer;
    var footerButton;

    if (dialog) {
      return dialog;
    }

    dialog = document.createElement('dialog');
    dialog.id = 'tableViewDialog';
    dialog.className = 'modal table-view-modal';

    section = document.createElement('section');
    section.className = 'table-view-shell';

    header = document.createElement('header');
    header.className = 'modal-header';

    titleElement = document.createElement('h2');
    titleElement.textContent = t('details', 'အသေးစိတ်');

    closeButton = document.createElement('button');
    closeButton.className = 'icon-button';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', t('close', 'ပိတ်ရန်'));
    closeButton.textContent = '×';
    closeButton.addEventListener('click', function () {
      closeDialog(dialog);
    });

    bodyElement = document.createElement('div');
    bodyElement.className = 'table-view-body';

    footer = document.createElement('footer');
    footer.className = 'modal-actions';

    footerButton = document.createElement('button');
    footerButton.className = 'ghost-button';
    footerButton.type = 'button';
    footerButton.textContent = t('close', 'ပိတ်ရန်');
    footerButton.addEventListener('click', function () {
      closeDialog(dialog);
    });

    header.appendChild(titleElement);
    header.appendChild(closeButton);
    footer.appendChild(footerButton);
    section.appendChild(header);
    section.appendChild(bodyElement);
    section.appendChild(footer);
    dialog.appendChild(section);
    document.body.appendChild(dialog);

    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) {
        closeDialog(dialog);
      }
    });

    return dialog;
  }

  function setDialogMode(mode) {
    var modal = ensureDialog();

    modal.classList.toggle('table-view-modal--wide', mode === 'full-table');
    bodyElement.classList.toggle('is-full-table', mode === 'full-table');
  }

  function appendField(list, field) {
    var term = document.createElement('dt');
    var description = document.createElement('dd');
    var image;

    term.textContent = field.label || '-';

    if (field.type === 'image' && field.value) {
      image = document.createElement('img');
      image.className = 'table-view-image';
      image.src = field.value;
      image.alt = field.alt || field.label || 'Image';
      image.referrerPolicy = 'no-referrer';
      image.loading = 'lazy';
      description.appendChild(image);
    } else {
      description.textContent = normalizeValue(field.value);
    }

    list.appendChild(term);
    list.appendChild(description);
  }

  function open(title, sections) {
    var modal = ensureDialog();

    setDialogMode('detail');
    titleElement.textContent = title || t('details', 'အသေးစိတ်');
    clearElement(bodyElement);

    (sections || []).forEach(function (sectionData) {
      var section = document.createElement('section');
      var heading = document.createElement('h3');
      var list = document.createElement('dl');

      section.className = 'table-view-section';
      heading.textContent = sectionData.title || t('details', 'အသေးစိတ်');
      list.className = 'table-view-detail-list';

      (sectionData.fields || []).forEach(function (field) {
        appendField(list, field || {});
      });

      section.appendChild(heading);
      section.appendChild(list);
      bodyElement.appendChild(section);
    });

    if (!bodyElement.children.length) {
      var empty = document.createElement('p');
      empty.className = 'panel-note';
      empty.textContent = t('noData', 'ဒေတာမရှိပါ');
      bodyElement.appendChild(empty);
    }

    openDialog(modal);
  }

  function createViewButton(onClick, label) {
    var button = document.createElement('button');

    button.type = 'button';
    button.className = 'small-button icon-view';
    button.textContent = label || t('view', 'ကြည့်ရန်');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof onClick === 'function') {
        onClick(event);
      }
    });

    return button;
  }

  function createViewCell(onClick, labelText) {
    var cell = document.createElement('td');
    cell.setAttribute('data-label', labelText || t('details', 'အသေးစိတ်'));
    cell.appendChild(createViewButton(onClick));
    return cell;
  }

  function getTableTitle(table) {
    var panel;
    var heading;
    var pageHeading;

    if (!table) {
      return t('view', 'ကြည့်ရန်');
    }

    panel = table.closest('.panel');
    if (panel) {
      heading = panel.querySelector('.panel-header h2');
      if (heading && heading.textContent.trim()) {
        return heading.textContent.trim();
      }
    }

    pageHeading = document.querySelector('.page-header h1');
    if (pageHeading && pageHeading.textContent.trim()) {
      return pageHeading.textContent.trim();
    }

    return t('view', 'ကြည့်ရန်');
  }

  function stripDuplicateIds(element) {
    var elementsWithIds;

    if (!element) {
      return;
    }

    element.removeAttribute('id');
    elementsWithIds = element.querySelectorAll('[id]');
    elementsWithIds.forEach(function (item) {
      item.removeAttribute('id');
    });
  }

  function makeCloneReadOnly(table) {
    var clone = table.cloneNode(true);
    var buttons;
    var inputs;
    var links;

    stripDuplicateIds(clone);
    clone.classList.add('full-size-table');
    clone.removeAttribute('style');

    buttons = clone.querySelectorAll('button');
    buttons.forEach(function (button) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.tabIndex = -1;
    });

    inputs = clone.querySelectorAll('input, select, textarea');
    inputs.forEach(function (input) {
      input.disabled = true;
      input.tabIndex = -1;
    });

    links = clone.querySelectorAll('a');
    links.forEach(function (link) {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      link.tabIndex = -1;
    });

    return clone;
  }

  function openFullTable(title, table) {
    var modal;
    var wrap;
    var hint;

    if (!table) {
      return;
    }

    modal = ensureDialog();
    setDialogMode('full-table');
    titleElement.textContent = title || getTableTitle(table);
    clearElement(bodyElement);

    hint = document.createElement('p');
    hint.className = 'panel-note full-table-hint';
    hint.textContent = 'Full table view — swipe left/right and up/down to see everything.';

    wrap = document.createElement('div');
    wrap.className = 'full-table-view-wrap';
    wrap.appendChild(makeCloneReadOnly(table));

    bodyElement.appendChild(hint);
    bodyElement.appendChild(wrap);
    openDialog(modal);
  }

  function findPanelHeader(tableWrap) {
    var panel;

    if (!tableWrap) {
      return null;
    }

    panel = tableWrap.closest('.panel');
    if (!panel) {
      return null;
    }

    return panel.querySelector('.panel-header');
  }

  function addFullTableButton(table) {
    var tableWrap;
    var header;
    var button;
    var bar;

    if (!table || table.dataset.fullTableViewAttached === 'true') {
      return;
    }

    if (table.classList.contains('voucher-table') || table.closest('.voucher-modal')) {
      return;
    }

    tableWrap = table.closest('.table-wrap');
    if (!tableWrap || tableWrap.dataset.fullTableView === 'off') {
      return;
    }

    button = createViewButton(function () {
      openFullTable(getTableTitle(table), table);
    }, 'Full Table');
    button.classList.add('full-table-button');
    button.setAttribute('aria-label', 'ဇယားအပြည့်ကြည့်ရန်');
    button.setAttribute('title', 'ဇယားအပြည့်ကြည့်ရန်');

    header = findPanelHeader(tableWrap);
    if (header) {
      header.appendChild(button);
    } else {
      bar = document.createElement('div');
      bar.className = 'table-view-button-bar';
      bar.appendChild(button);
      tableWrap.parentNode.insertBefore(bar, tableWrap);
    }

    table.dataset.fullTableViewAttached = 'true';
  }

  function setupFullTableButtons(root) {
    var container = root || document;
    var tables = container.querySelectorAll('.table-wrap > table');

    tables.forEach(addFullTableButton);
  }

  function init() {
    setupFullTableButtons(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MMC_TABLE_VIEW = {
    open: open,
    openFullTable: openFullTable,
    setupFullTableButtons: setupFullTableButtons,
    createViewButton: createViewButton,
    createViewCell: createViewCell
  };
}());
