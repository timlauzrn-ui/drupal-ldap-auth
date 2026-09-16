/**
 * @file
 * Apply role-aware Gutenberg templateLock from Drupal settings.
 */
(function (Drupal, drupalSettings, once) {
  'use strict';

  /**
   * Patch Gutenberg editor settings before/when the editor boots.
   */
  function applyTemplateLock() {
    const settings = drupalSettings.hkcec_gutenberg_template_lock;
    if (!settings || typeof settings.templateLock === 'undefined') {
      return;
    }

    const lockValue = settings.templateLock; // false | 'all' | 'insert' | 'contentOnly'

    // Gutenberg Drupal stores editor init under drupalSettings.gutenberg.
    if (drupalSettings.gutenberg) {
      drupalSettings.gutenberg.templateLock = lockValue;
      drupalSettings.gutenberg['template-lock'] = lockValue === false ? 'none' : lockValue;
      if (drupalSettings.gutenberg.editor) {
        drupalSettings.gutenberg.editor.templateLock = lockValue;
      }
      if (drupalSettings.gutenberg.nodeType) {
        drupalSettings.gutenberg.nodeType.templateLock = lockValue;
      }
    }

    // Also patch wp.data if the editor store is already available.
    if (window.wp && wp.data && wp.data.dispatch) {
      try {
        const editor = wp.data.dispatch('core/editor');
        const blockEditor = wp.data.dispatch('core/block-editor');
        if (editor && typeof editor.updateEditorSettings === 'function') {
          editor.updateEditorSettings({ templateLock: lockValue });
        }
        if (blockEditor && typeof blockEditor.updateSettings === 'function') {
          blockEditor.updateSettings({ templateLock: lockValue });
        }
      } catch (e) {
        // Editor may not be ready yet; settings patch above is enough for init.
      }
    }
  }

  Drupal.behaviors.gutenbergTemplateLock = {
    attach: function attach(context) {
      once('gutenberg-template-lock', 'body', context).forEach(function () {
        applyTemplateLock();
        // Re-apply shortly after Gutenberg scripts initialize.
        window.setTimeout(applyTemplateLock, 0);
        window.setTimeout(applyTemplateLock, 500);
        window.setTimeout(applyTemplateLock, 1500);
      });
    },
  };
})(Drupal, drupalSettings, once);
