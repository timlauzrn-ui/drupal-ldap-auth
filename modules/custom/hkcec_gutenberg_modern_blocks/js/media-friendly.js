/**
 * @file
 * Shared media UX helpers for HKCEC Gutenberg blocks (labels + tip only).
 */
(function (Drupal, drupalSettings, once) {
  'use strict';

  window.hkcecMediaUi = window.hkcecMediaUi || {
    /**
     * Friendly MediaPlaceholder labels emphasizing drag-and-drop.
     */
    labels: function (title) {
      return {
        title: title || Drupal.t('Drag a photo here, or click to choose'),
        instructions: Drupal.t('Drop an image from your computer, or browse files / Media library.'),
      };
    },

    /**
     * Short instruction under the drop zone.
     */
    hint: function () {
      const folder = (drupalSettings.hkcecMedia && drupalSettings.hkcecMedia.folderLabel)
        ? drupalSettings.hkcecMedia.folderLabel
        : '';
      if (folder) {
        return Drupal.t('Tip: drag and drop works here. Images are saved under @folder for your department.', {
          '@folder': folder,
        });
      }
      return Drupal.t('Tip: drag and drop a photo onto this box, or click to choose from your computer / Media library.');
    },
  };

  /**
   * Show a one-time tip above the Gutenberg canvas (form markup is often hidden by Gin/Gutenberg).
   */
  function tipText() {
    const folder = (drupalSettings.hkcecMedia && drupalSettings.hkcecMedia.folderLabel)
      ? drupalSettings.hkcecMedia.folderLabel
      : '';
    if (folder) {
      return Drupal.t('Drag and drop onto a photo box in the layout, or click to browse. Files go to @folder automatically — no need to upload elsewhere first.', {
        '@folder': folder,
      });
    }
    return Drupal.t('Drag and drop onto a photo box in the layout, or click to browse / Media library. No need to upload to a folder first.');
  }

  function insertTip(root) {
    if (!root || root.querySelector('.hkcec-media-tip')) {
      return;
    }
    const tip = document.createElement('div');
    tip.className = 'hkcec-media-tip';
    tip.setAttribute('role', 'status');
    const strong = document.createElement('strong');
    strong.textContent = Drupal.t('Images');
    tip.appendChild(strong);
    tip.appendChild(document.createTextNode(tipText()));
    root.insertBefore(tip, root.firstChild);
  }

  function findTipHost() {
    return document.querySelector('.edit-post-visual-editor')
      || document.querySelector('.interface-interface-skeleton__content')
      || document.querySelector('.gutenberg__editor')
      || document.querySelector('.field--gutenberg')
      || null;
  }

  Drupal.behaviors.hkcecMediaFriendlyTip = {
    attach: function (context) {
      once('hkcec-media-friendly-tip', 'body', context).forEach(function () {
        if (!(drupalSettings.hkcecMedia && drupalSettings.hkcecMedia.dragDropHint)) {
          return;
        }
        let tries = 0;
        const timer = window.setInterval(function () {
          tries += 1;
          const host = findTipHost();
          if (host) {
            insertTip(host);
            window.clearInterval(timer);
          }
          else if (tries >= 40) {
            window.clearInterval(timer);
          }
        }, 250);
      });
    },
  };
})(window.Drupal, window.drupalSettings || {}, window.once);