/**
 * @file
 * Restore Gutenberg Patterns in the inserter (core layouts).
 *
 * Drupal Gutenberg only shows the Patterns tab when block patterns are
 * registered. Core/block stays available via Gutenberg's defaultBlocks, but a
 * narrow allowed-blocks list unregisters most pattern inner blocks, so the tab
 * looks empty. These patterns use only common core blocks.
 */
(function (Drupal) {
  'use strict';

  function registerPatterns() {
    const wp = window.wp;
    if (!wp || !wp.blocks || typeof wp.blocks.registerBlockPattern !== 'function') {
      return false;
    }
    if (window.hkcecPatternsRegistered) {
      return true;
    }

    const registerCategory = wp.blocks.registerBlockPatternCategory;
    const registerPattern = wp.blocks.registerBlockPattern;

    if (typeof registerCategory === 'function') {
      try {
        registerCategory('hkcec-intranet', {
          title: Drupal.t('HKCEC Intranet'),
        });
      }
      catch (e) {
        // Category may already exist.
      }
      try {
        registerCategory('text', { title: Drupal.t('Text') });
      }
      catch (e) {
        // Ignore duplicate.
      }
      try {
        registerCategory('columns', { title: Drupal.t('Columns') });
      }
      catch (e) {
        // Ignore duplicate.
      }
    }

    const patterns = [
      {
        name: 'hkcec/pattern-heading-text',
        settings: {
          title: Drupal.t('Heading and text'),
          description: Drupal.t('A heading followed by a paragraph.'),
          categories: ['hkcec-intranet', 'text'],
          content: '<!-- wp:heading -->\n<h2 class="wp-block-heading"></h2>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p></p>\n<!-- /wp:paragraph -->',
        },
      },
      {
        name: 'hkcec/pattern-two-columns',
        settings: {
          title: Drupal.t('Two columns'),
          description: Drupal.t('Two equal columns, each with a heading and text.'),
          categories: ['hkcec-intranet', 'columns'],
          content: '<!-- wp:columns -->\n<div class="wp-block-columns"><!-- wp:column -->\n<div class="wp-block-column"><!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading"></h3>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p></p>\n<!-- /wp:paragraph --></div>\n<!-- /wp:column -->\n\n<!-- wp:column -->\n<div class="wp-block-column"><!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading"></h3>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p></p>\n<!-- /wp:paragraph --></div>\n<!-- /wp:column --></div>\n<!-- /wp:columns -->',
        },
      },
      {
        name: 'hkcec/pattern-image-text',
        settings: {
          title: Drupal.t('Image and text'),
          description: Drupal.t('An image with a heading and paragraph underneath.'),
          categories: ['hkcec-intranet'],
          content: '<!-- wp:image -->\n<figure class="wp-block-image"><img alt=""/></figure>\n<!-- /wp:image -->\n\n<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading"></h3>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p></p>\n<!-- /wp:paragraph -->',
        },
      },
      {
        name: 'hkcec/pattern-buttons',
        settings: {
          title: Drupal.t('Buttons'),
          description: Drupal.t('A row of two buttons.'),
          categories: ['hkcec-intranet'],
          content: '<!-- wp:buttons -->\n<div class="wp-block-buttons"><!-- wp:button -->\n<div class="wp-block-button"><a class="wp-block-button__link wp-element-button"></a></div>\n<!-- /wp:button -->\n\n<!-- wp:button -->\n<div class="wp-block-button"><a class="wp-block-button__link wp-element-button"></a></div>\n<!-- /wp:button --></div>\n<!-- /wp:buttons -->',
        },
      },
    ];

    patterns.forEach(function (item) {
      try {
        registerPattern(item.name, item.settings);
      }
      catch (e) {
        // Pattern may already be registered.
      }
    });

    window.hkcecPatternsRegistered = true;
    return true;
  }

  Drupal.behaviors.hkcecEditorPatterns = {
    attach: function () {
      if (registerPatterns()) {
        return;
      }
      window.setTimeout(registerPatterns, 400);
      window.setTimeout(registerPatterns, 1200);
    },
  };
})(window.Drupal);
