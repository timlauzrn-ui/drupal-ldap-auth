/**
 * @file
 * Department content layout: Quick Nav sidebar + service cards (Figma HR).
 * Single block avoids nested columns (safer on Drupal Gutenberg 3.0.6).
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText } = wp.blockEditor;
  const { PanelBody, TextControl, Button, SelectControl } = wp.components;

  function emptyLink() {
    return { label: '', url: '' };
  }

  function emptyCard() {
    return { title: '', links: [emptyLink(), emptyLink(), emptyLink(), emptyLink()] };
  }

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const navItems = a.navItems && a.navItems.length ? a.navItems : [emptyLink()];
    const cards = a.cards && a.cards.length ? a.cards : [emptyCard()];
    const blockProps = useBlockProps({ className: 'gb-dept-layout gb-dept-layout--editor' });

    function updateNav(index, patch) {
      setAttributes({
        navItems: navItems.map(function (item, i) {
          return i === index ? Object.assign({}, item, patch) : item;
        }),
      });
    }

    function updateCard(index, patch) {
      setAttributes({
        cards: cards.map(function (card, i) {
          return i === index ? Object.assign({}, card, patch) : card;
        }),
      });
    }

    function updateCardLink(ci, li, patch) {
      const card = cards[ci] || emptyCard();
      updateCard(ci, {
        links: (card.links || []).map(function (link, i) {
          return i === li ? Object.assign({}, link, patch) : link;
        }),
      });
    }

    return el(
      Fragment,
      null,
      el(
        InspectorControls,
        null,
        el(
          PanelBody,
          { title: Drupal.t('Layout'), initialOpen: true },
          el(SelectControl, {
            label: Drupal.t('Service card columns'),
            value: a.cardColumns || '2',
            options: [
              { label: '2', value: '2' },
              { label: '3', value: '3' },
              { label: '1', value: '1' },
            ],
            onChange: function (v) {
              setAttributes({ cardColumns: v });
            },
          }),
          el(TextControl, {
            label: Drupal.t('Quick nav icon'),
            value: a.navIcon || '📖',
            onChange: function (v) {
              setAttributes({ navIcon: v });
            },
          }),
        ),
      ),
      el(
        'div',
        blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Department layout (sidebar + cards)')),
        el(
          'div',
          { className: 'gb-dept-layout__editor-grid' },
          el(
            'div',
            { className: 'gb-dept-layout__editor-nav' },
            el(RichText, {
              tagName: 'h2',
              className: 'gb-quick-nav__title',
              placeholder: Drupal.t('Quick Navigation'),
              value: a.navTitle || '',
              onChange: function (v) {
                setAttributes({ navTitle: v });
              },
            }),
            navItems.map(function (item, i) {
              return el(
                'div',
                { key: 'n-' + i, className: 'gb-quick-nav__row' },
                el(TextControl, {
                  label: Drupal.t('Nav label'),
                  value: item.label || '',
                  onChange: function (v) {
                    updateNav(i, { label: v });
                  },
                }),
                el(TextControl, {
                  label: Drupal.t('Nav URL'),
                  value: item.url || '',
                  onChange: function (v) {
                    updateNav(i, { url: v });
                  },
                }),
                el(Button, {
                  isSmall: true,
                  isDestructive: true,
                  onClick: function () {
                    setAttributes({
                      navItems: navItems.filter(function (_x, idx) {
                        return idx !== i;
                      }),
                    });
                  },
                }, Drupal.t('Remove')),
              );
            }),
            el(Button, {
              isSecondary: true,
              onClick: function () {
                setAttributes({ navItems: navItems.concat([emptyLink()]) });
              },
            }, Drupal.t('Add nav link')),
          ),
          el(
            'div',
            { className: 'gb-dept-layout__editor-cards' },
            cards.map(function (card, ci) {
              return el(
                'div',
                { key: 'c-' + ci, className: 'gb-resource-card gb-resource-card--editor' },
                el('div', { className: 'gb-modern__row-tools' },
                  el('strong', null, Drupal.t('Service card @n', { '@n': ci + 1 })),
                  el(Button, {
                    isSmall: true,
                    isDestructive: true,
                    onClick: function () {
                      setAttributes({
                        cards: cards.filter(function (_x, idx) {
                          return idx !== ci;
                        }),
                      });
                    },
                  }, Drupal.t('Remove')),
                ),
                el(TextControl, {
                  label: Drupal.t('Card title'),
                  value: card.title || '',
                  onChange: function (v) {
                    updateCard(ci, { title: v });
                  },
                }),
                (card.links || []).map(function (link, li) {
                  return el(
                    'div',
                    { key: 'cl-' + ci + '-' + li, className: 'gb-resource-card__link-row' },
                    el(TextControl, {
                      label: Drupal.t('Link'),
                      value: link.label || '',
                      onChange: function (v) {
                        updateCardLink(ci, li, { label: v });
                      },
                    }),
                    el(TextControl, {
                      label: Drupal.t('URL'),
                      value: link.url || '',
                      onChange: function (v) {
                        updateCardLink(ci, li, { url: v });
                      },
                    }),
                  );
                }),
                el(Button, {
                  isSmall: true,
                  isSecondary: true,
                  onClick: function () {
                    updateCard(ci, { links: (card.links || []).concat([emptyLink()]) });
                  },
                }, Drupal.t('Add link')),
              );
            }),
            el(Button, {
              isPrimary: true,
              onClick: function () {
                setAttributes({ cards: cards.concat([emptyCard()]) });
              },
            }, Drupal.t('Add service card')),
          ),
        ),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const navItems = a.navItems || [];
    const cards = a.cards || [];
    const cols = a.cardColumns || '2';
    const blockProps = useBlockProps.save({
      className: 'gb-dept-layout card-cols-' + cols,
    });

    return el(
      'div',
      blockProps,
      el(
        'aside',
        { className: 'gb-quick-nav' },
        el(
          'div',
          { className: 'gb-quick-nav__head' },
          a.navIcon ? el('span', { className: 'gb-quick-nav__icon', 'aria-hidden': 'true' }, a.navIcon) : null,
          a.navTitle
            ? el(RichText.Content, { tagName: 'h2', className: 'gb-quick-nav__title', value: a.navTitle })
            : null,
        ),
        el(
          'ul',
          { className: 'gb-quick-nav__list' },
          navItems
            .filter(function (item) {
              return item && item.label;
            })
            .map(function (item, i) {
              return el(
                'li',
                { key: 'n-' + i },
                item.url ? el('a', { href: item.url }, item.label) : el('span', null, item.label),
              );
            }),
        ),
      ),
      el(
        'div',
        { className: 'gb-resource-grid cols-' + cols + ' links-arrow' },
        el(
          'div',
          { className: 'gb-resource-grid__inner' },
          cards.map(function (card, ci) {
            if (!card || !card.title) {
              return null;
            }
            return el(
              'article',
              { className: 'gb-resource-card', key: 'c-' + ci },
              el('h3', { className: 'gb-resource-card__title' }, card.title),
              el(
                'ul',
                { className: 'gb-resource-card__links' },
                (card.links || [])
                  .filter(function (link) {
                    return link && link.label;
                  })
                  .map(function (link, li) {
                    return el(
                      'li',
                      { key: 'l-' + ci + '-' + li },
                      el('span', { className: 'gb-resource-card__marker', 'aria-hidden': 'true' }, '→'),
                      link.url ? el('a', { href: link.url }, link.label) : el('span', null, link.label),
                    );
                  }),
              ),
            );
          }),
        ),
      ),
    );
  }

  registerBlockType('hkcec/dept-layout', {
    apiVersion: 2,
    title: Drupal.t('Department layout'),
    description: Drupal.t('Quick Navigation sidebar + service cards (HR / Finance / MIS pages).'),
    category: 'design',
    icon: 'columns',
    keywords: ['department', 'hr', 'sidebar', 'intranet'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      navIcon: { type: 'string', default: '📖' },
      navTitle: { type: 'string', default: 'Quick Navigation' },
      navItems: { type: 'array', default: [] },
      cardColumns: { type: 'string', default: '2' },
      cards: { type: 'array', default: [] },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
