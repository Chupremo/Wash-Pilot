/* Presentation accessibility only: no auth, storage, network or payment mutations. */
(() => {
  'use strict';
  let sequence = 0;
  let dialog = null;
  let returnFocus = null;
  const focusable = 'a[href],button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]';
  const visible = element => !!element && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden' && !element.closest('[inert]');
  function enhance(root) {
    root.querySelectorAll('.field,.login-field').forEach(field => {
      const label = field.querySelector('label');
      const input = field.querySelector('input:not([type="hidden"]),select,textarea');
      if (label && input && !label.htmlFor && !label.contains(input)) {
        if (!input.id) input.id = 'wp-field-' + (++sequence);
        label.htmlFor = input.id;
      }
    });
    root.querySelectorAll('.close,.wp-signup-close,.wp-tour-close').forEach(button => {
      if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', 'Close dialog');
    });
    root.querySelectorAll('.nav [data-page],.mobile-bottom-nav [data-mobile-page]').forEach(button => {
      if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    root.querySelectorAll('.table-wrap').forEach(table => {
      table.tabIndex = 0;
      table.setAttribute('role', 'region');
      if (!table.hasAttribute('aria-label')) table.setAttribute('aria-label', 'Scrollable data table');
    });
    const toast = document.getElementById('toast');
    if (toast) { toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); }
  }
  function syncDialog() {
    const next = Array.from(document.querySelectorAll('.modal,.wp-signup-card,.forgot-card')).find(visible) || null;
    if (next) {
      const opening = next !== dialog;
      if (opening) returnFocus = document.activeElement;
      dialog = next;
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.tabIndex = -1;
      const heading = dialog.querySelector('h2,h3');
      if (heading) {
        if (!heading.id) heading.id = 'wp-dialog-title-' + (++sequence);
        dialog.setAttribute('aria-labelledby', heading.id);
        dialog.removeAttribute('aria-label');
      } else {
        dialog.removeAttribute('aria-labelledby');
        dialog.setAttribute('aria-label', 'WashPilot dialog');
      }
      if (opening || !dialog.contains(document.activeElement)) {
        (Array.from(dialog.querySelectorAll(focusable)).find(visible) || dialog).focus({preventScroll:true});
      }
    } else if (dialog) {
      dialog = null;
      if (returnFocus?.isConnected && visible(returnFocus)) returnFocus.focus({preventScroll:true});
      returnFocus = null;
    }
  }
  function init() {
    enhance(document);
    let queued = false;
    new MutationObserver(records => {
      // Ignore our own ARIA/label changes; only application DOM/state changes matter.
      if (!records.some(record => record.type === 'childList' || ['class','style','hidden'].includes(record.attributeName))) return;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; enhance(document); syncDialog(); });
    }).observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
    document.addEventListener('keydown', event => {
      const sidebar = document.querySelector('.sidebar.open');
      const region = dialog || (visible(sidebar) ? sidebar : null);
      if (!region) return;
      if (event.key === 'Escape' && dialog) {
        const close = dialog.querySelector('.close,.wp-signup-close');
        if (close) { event.preventDefault(); close.click(); }
      }
      if (event.key !== 'Tab') return;
      const elements = Array.from(region.querySelectorAll(focusable)).filter(visible);
      const first = elements[0], last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); region.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !region.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !region.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
