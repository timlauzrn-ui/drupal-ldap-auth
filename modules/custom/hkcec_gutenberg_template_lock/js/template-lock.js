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
        const editPost = wp.data.dispatch('core/edit-post');
        const editor = wp.data.dispatch('core/editor');
        if (editor && typeof editor.updateEditorSettings === 'function') {
          editor.updateEditorSettings({ templateLock: lockValue });
        }
        // Some builds expose template lock via edit-post preferences.
        if (editPost && typeof editPost.updatePreferredStyleVariations === 'function') {
          // no-op; keep for compatibility
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
