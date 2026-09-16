/**
 * Shared Word/Excel-style helpers + force full-width Gutenberg canvas
 * (including styles inside the editor iframe).
 */
(function (wp, Drupal) {
  'use strict';

  const { createElement: el } = wp.element;

  window.hkcecEditor = Object.assign({}, window.hkcecEditor || {}, {
    helpBox: function (title, steps) {
      return el(
        'div',
        { className: 'gb-help' },
        el('p', { className: 'gb-help__title' }, title),
        el(
          'ol',
          { className: 'gb-help__steps' },
          (steps || []).map(function (step, i) {
            return el('li', { key: 'hs-' + i }, step);
          }),
        ),
      );
    },
    excelHead: function () {
      return el(
        'div',
        { className: 'gb-excel__head' },
        el('span', null, Drupal.t('Name people see')),
        el('span', { className: 'gb-excel__col-action' }, ''),
      );
    },
  });

  const FULL_WIDTH_CSS = [
    '.editor-styles-wrapper{--wp--style--global--content-size:100%;--wp--style--global--wide-size:100%;}',
    '.editor-styles-wrapper .is-root-container{max-width:none!important;width:100%!important;}',
    'html :where(.wp-block),.wp-block,html :where(.wp-block)[data-align=wide]{max-width:none!important;width:100%!important;margin-left:0!important;margin-right:0!important;}',
    '.gb-ad-slider--editor,.gb-resource-grid--editor,.gb-hot-news--editor,.gb-dept-layout--editor,.gb-page-intro--editor{max-width:none!important;width:100%!important;box-sizing:border-box;}',
    '.gb-dept-layout.gb-dept-layout--editor{display:flex!important;flex-direction:column!important;grid-template-columns:none!important;}',
    '.gb-dept-layout__editor-grid{max-width:none!important;width:100%!important;}',
    '.edit-post-visual-editor,.interface-interface-skeleton__content,.editor-styles-wrapper,.gutenberg,.gutenberg__editor,.field--gutenberg,.region-content{max-width:none!important;width:100%!important;}',
  ].join('');

  function injectInto(doc) {
    if (!doc || !doc.head || doc.getElementById('hkcec-editor-fullwidth')) {
      return;
    }
    if (!doc.querySelector('.editor-styles-wrapper, .gutenberg__editor, .block-editor-block-list__layout, .edit-post-visual-editor, body')) {
      return;
    }
    const style = doc.createElement('style');
    style.id = 'hkcec-editor-fullwidth';
    style.textContent = FULL_WIDTH_CSS;
    doc.head.appendChild(style);
  }

  function injectAll() {
    injectInto(document);
    const iframes = document.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
      try {
        const frame = iframes[i];
        injectInto(frame.contentDocument);
        if (!frame.getAttribute('data-hkcec-fullwidth')) {
          frame.setAttribute('data-hkcec-fullwidth', '1');
          frame.addEventListener('load', function () {
            injectInto(frame.contentDocument);
          });
        }
      }
      catch (e) {
        // Cross-origin iframe; ignore.
      }
    }
  }

  if (typeof MutationObserver !== 'undefined' && !window.hkcecFullWidthObserver) {
    window.hkcecFullWidthObserver = new MutationObserver(function () {
      injectAll();
    });
    if (document.documentElement) {
      window.hkcecFullWidthObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (Drupal && Drupal.behaviors) {
    Drupal.behaviors.hkcecEditorFullWidth = {
      attach: function () {
        injectAll();
        window.setTimeout(injectAll, 300);
        window.setTimeout(injectAll, 1200);
      },
    };
  }
  else {
    injectAll();
    window.setTimeout(injectAll, 300);
  }
})(window.wp, window.Drupal);
