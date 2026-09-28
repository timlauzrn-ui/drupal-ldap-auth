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
    if (!wp || !wp.blocks) {
      return false;
    }
    const registerPattern = wp.blocks.registerBlockPattern;
    const registerVariation = wp.blocks.registerBlockVariation;
    if (typeof registerPattern !== 'function' && typeof registerVariation !== 'function') {
      return false;
    }
    if (window.hkcecPatternsRegistered) {
      return true;
    }

    const registerCategory = wp.blocks.registerBlockPatternCategory;

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
      try {
        registerCategory('hkcec-department', { title: Drupal.t('Department page') });
      }
      catch (e) {
        // Ignore duplicate.
      }
    }

    function deptCard(title, items) {
      const list = items.map(function (item) {
        return '<li>' + item + '</li>';
      }).join('');
      return '<!-- wp:group {"className":"hkcec-origin-card"} -->\n'
        + '<div class="wp-block-group hkcec-origin-card"><!-- wp:heading {"level":3} -->\n'
        + '<h3 class="wp-block-heading">' + title + '</h3>\n'
        + '<!-- /wp:heading -->\n\n'
        + '<!-- wp:list -->\n'
        + '<ul class="wp-block-list">' + list + '</ul>\n'
        + '<!-- /wp:list --></div>\n'
        + '<!-- /wp:group -->';
    }

    function deptColumn(inner) {
      return '<!-- wp:column -->\n<div class="wp-block-column">' + inner + '</div>\n<!-- /wp:column -->';
    }

    function deptCardRow(count, columns) {
      const className = 'hkcec-origin-cards-' + count;
      return '<!-- wp:columns {"className":"' + className + '"} -->\n'
        + '<div class="wp-block-columns ' + className + '">'
        + columns.map(deptColumn).join('\n\n')
        + '</div>\n<!-- /wp:columns -->';
    }

    function deptPage(navItems, rows) {
      const nav = navItems.map(function (item) {
        return '<li>' + item + '</li>';
      }).join('');
      return '<!-- wp:heading {"level":1,"className":"hkcec-dept-title"} -->\n'
        + '<h1 class="wp-block-heading hkcec-dept-title">Department name</h1>\n'
        + '<!-- /wp:heading -->\n\n'
        + '<!-- wp:columns {"className":"hkcec-dept-shell"} -->\n'
        + '<div class="wp-block-columns hkcec-dept-shell"><!-- wp:column {"width":"28%","className":"hkcec-dept-nav"} -->\n'
        + '<div class="wp-block-column hkcec-dept-nav" style="flex-basis:28%"><!-- wp:heading {"level":2} -->\n'
        + '<h2 class="wp-block-heading">Quick Navigation</h2>\n'
        + '<!-- /wp:heading -->\n\n'
        + '<!-- wp:list -->\n'
        + '<ul class="wp-block-list">' + nav + '</ul>\n'
        + '<!-- /wp:list --></div>\n'
        + '<!-- /wp:column -->\n\n'
        + '<!-- wp:column {"width":"72%","className":"hkcec-dept-main"} -->\n'
        + '<div class="wp-block-column hkcec-dept-main" style="flex-basis:72%">'
        + rows.join('\n\n')
        + '</div>\n'
        + '<!-- /wp:column --></div>\n'
        + '<!-- /wp:columns -->';
    }

    const infoCard = deptCard('General Information', ['Organisational Chart', 'Department Objectives', 'System Availability', 'Helpdesk']);
    const infoCardBrief = deptCard('General Information', ['Organisational Chart', 'Department Objectives', 'System Availability']);
    const formCard = deptCard('Form', ['Request procedure', 'Access form', 'Change request']);
    const policyCard = deptCard('Policy &amp; Procedure', ['Department policy', 'Working procedure']);
    const topicCard = deptCard('Another topic', ['Guide one', 'Guide two', 'Guide three']);
    const guidesCard = deptCard('Guides', ['Guide one', 'Guide two', 'Guide three']);
    const helpdeskCard = deptCard('Helpdesk', ['Open a ticket', 'Service hours']);
    const contactsCard = deptCard('Contacts', ['Department contact', 'Duty officer']);

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
      {
        name: 'hkcec/department-page-1-column',
        settings: {
          title: Drupal.t('Department page — 1 column'),
          description: Drupal.t('Quick Navigation plus topic cards stacked in one column.'),
          categories: ['hkcec-department', 'hkcec-intranet'],
          content: deptPage(
            ['General Information', 'Form', 'Policy &amp; Procedure'],
            [deptCardRow(1, [infoCard + '\n\n' + formCard + '\n\n' + policyCard])]
          ),
        },
      },
      {
        name: 'hkcec/department-page-2-columns',
        settings: {
          title: Drupal.t('Department page — 2 columns'),
          description: Drupal.t('Quick Navigation plus topic cards in two columns.'),
          categories: ['hkcec-department', 'hkcec-intranet'],
          content: deptPage(
            ['General Information', 'Form', 'Policy &amp; Procedure', 'Another topic'],
            [
              deptCardRow(2, [infoCard, formCard]),
              deptCardRow(2, [policyCard, topicCard]),
            ]
          ),
        },
      },
      {
        name: 'hkcec/department-page-3-columns',
        settings: {
          title: Drupal.t('Department page — 3 columns'),
          description: Drupal.t('Quick Navigation plus topic cards in three columns.'),
          categories: ['hkcec-department', 'hkcec-intranet'],
          content: deptPage(
            ['General Information', 'Form', 'Policy &amp; Procedure', 'Guides', 'Helpdesk', 'Contacts'],
            [
              deptCardRow(3, [infoCardBrief, formCard, policyCard]),
              deptCardRow(3, [guidesCard, helpdeskCard, contactsCard]),
            ]
          ),
        },
      },
    ];

    if (typeof registerPattern === 'function') {
      patterns.forEach(function (item) {
        try {
          registerPattern(item.name, item.settings);
        }
        catch (e) {
          // Pattern may already be registered.
        }
      });
    }

    if (typeof registerVariation === 'function') {
      function listValues(items) {
        return '<li>' + items.join('</li><li>') + '</li>';
      }
      function cardBlocks(title, items) {
        return ['core/group', { className: 'hkcec-origin-card' }, [
          ['core/heading', { level: 3, content: title }],
          ['core/list', { values: listValues(items) }],
        ]];
      }
      function departmentVariation(name, title, description, navItems, rows) {
        return {
          name: name,
          title: title,
          description: description,
          scope: ['inserter'],
          attributes: { className: 'hkcec-dept-layout-insert' },
          innerBlocks: [
            ['core/heading', { level: 1, content: 'Department name', className: 'hkcec-dept-title' }],
            ['core/columns', { className: 'hkcec-dept-shell' }, [
              ['core/column', { width: '28%', className: 'hkcec-dept-nav' }, [
                ['core/heading', { level: 2, content: 'Quick Navigation' }],
                ['core/list', { values: listValues(navItems) }],
              ]],
              ['core/column', { width: '72%', className: 'hkcec-dept-main' }, rows],
            ]],
          ],
        };
      }
      const info = cardBlocks('General Information', ['Organisational Chart', 'Department Objectives', 'System Availability', 'Helpdesk']);
      const infoBrief = cardBlocks('General Information', ['Organisational Chart', 'Department Objectives', 'System Availability']);
      const form = cardBlocks('Form', ['Request procedure', 'Access form', 'Change request']);
      const policy = cardBlocks('Policy & Procedure', ['Department policy', 'Working procedure']);
      const topic = cardBlocks('Another topic', ['Guide one', 'Guide two', 'Guide three']);
      const guides = cardBlocks('Guides', ['Guide one', 'Guide two', 'Guide three']);
      const helpdesk = cardBlocks('Helpdesk', ['Open a ticket', 'Service hours']);
      const contacts = cardBlocks('Contacts', ['Department contact', 'Duty officer']);
      const variations = [
        departmentVariation(
          'hkcec-department-1-column',
          Drupal.t('Department page — 1 column'),
          Drupal.t('Quick Navigation plus topic cards stacked in one column.'),
          ['General Information', 'Form', 'Policy & Procedure'],
          [['core/columns', { className: 'hkcec-origin-cards-1' }, [
            ['core/column', {}, [info, form, policy]],
          ]]]
        ),
        departmentVariation(
          'hkcec-department-2-columns',
          Drupal.t('Department page — 2 columns'),
          Drupal.t('Quick Navigation plus topic cards in two columns.'),
          ['General Information', 'Form', 'Policy & Procedure', 'Another topic'],
          [
            ['core/columns', { className: 'hkcec-origin-cards-2' }, [
              ['core/column', {}, [info]],
              ['core/column', {}, [form]],
            ]],
            ['core/columns', { className: 'hkcec-origin-cards-2' }, [
              ['core/column', {}, [policy]],
              ['core/column', {}, [topic]],
            ]],
          ]
        ),
        departmentVariation(
          'hkcec-department-3-columns',
          Drupal.t('Department page — 3 columns'),
          Drupal.t('Quick Navigation plus topic cards in three columns.'),
          ['General Information', 'Form', 'Policy & Procedure', 'Guides', 'Helpdesk', 'Contacts'],
          [
            ['core/columns', { className: 'hkcec-origin-cards-3' }, [
              ['core/column', {}, [infoBrief]],
              ['core/column', {}, [form]],
              ['core/column', {}, [policy]],
            ]],
            ['core/columns', { className: 'hkcec-origin-cards-3' }, [
              ['core/column', {}, [guides]],
              ['core/column', {}, [helpdesk]],
              ['core/column', {}, [contacts]],
            ]],
          ]
        ),
      ];
      variations.forEach(function (variation) {
        try {
          registerVariation('core/group', variation);
        }
        catch (e) {
          // Variation may already be registered.
        }
      });
    }

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
