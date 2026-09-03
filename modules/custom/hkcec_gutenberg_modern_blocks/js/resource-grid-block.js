/**
 * @file
 * Intranet resource / service card grid (Figma landing + department pages).
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls } = wp.blockEditor;
  const { PanelBody, SelectControl, TextControl, Button } = wp.components;

  function emptyLink() {
    return { label: '', url: '' };
  }

  function emptyCard() {
    return window.hkcecEditor && window.hkcecEditor.emptyCard
      ? window.hkcecEditor.emptyCard(true)
      : {
          icon: '📄',
          title: '',
          links: [emptyLink(), emptyLink(), emptyLink(), emptyLink()],
        };
  }

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const cards = a.cards && a.cards.length ? a.cards : [emptyCard()];
    const columns = a.columns || '4';
    const linkStyle = a.linkStyle || 'bullet';
    const blockProps = useBlockProps({
      className: 'gb-resource-grid gb-resource-grid--editor cols-' + columns + ' links-' + linkStyle,
    });

    function updateCard(index, patch) {
      const next = cards.map(function (card, i) {
        return i === index ? Object.assign({}, card, patch) : card;
      });
      setAttributes({ cards: next });
    }

    function updateLink(cardIndex, linkIndex, patch) {
      const card = cards[cardIndex] || emptyCard();
      const links = (card.links || []).map(function (link, i) {
        return i === linkIndex ? Object.assign({}, link, patch) : link;
      });
      updateCard(cardIndex, { links: links });
    }

    function addCard() {
      setAttributes({ cards: cards.concat([emptyCard()]) });
    }

    function removeCard(index) {
      setAttributes({
        cards: cards.filter(function (_c, i) {
          return i !== index;
        }),
      });
    }

    function addLink(cardIndex) {
      const card = cards[cardIndex] || emptyCard();
      updateCard(cardIndex, { links: (card.links || []).concat([emptyLink()]) });
    }

    function removeLink(cardIndex, linkIndex) {
      const card = cards[cardIndex] || emptyCard();
      updateCard(cardIndex, {
        links: (card.links || []).filter(function (_l, i) {
          return i !== linkIndex;
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
          { title: Drupal.t('Optional: how many boxes in a row'), initialOpen: false },
          el(SelectControl, {
            label: Drupal.t('Boxes side by side'),
            value: columns,
            options: [
              { label: Drupal.t('4 boxes (home page)'), value: '4' },
              { label: Drupal.t('3 boxes'), value: '3' },
              { label: Drupal.t('2 boxes'), value: '2' },
              { label: Drupal.t('1 wide box'), value: '1' },
            ],
            onChange: function (v) {
              setAttributes({ columns: v });
            },
          }),
          el(SelectControl, {
            label: Drupal.t('List style (optional)'),
            value: linkStyle,
            options: [
              { label: Drupal.t('Dots'), value: 'bullet' },
              { label: Drupal.t('Arrows'), value: 'arrow' },
            ],
            onChange: function (v) {
              setAttributes({ linkStyle: v });
            },
          }),
        ),
      ),
      el(
        'div',
        blockProps,
        el('p', { className: 'gb-section-title' }, Drupal.t('Resource boxes')),
        window.hkcecEditor && window.hkcecEditor.helpBox
          ? window.hkcecEditor.helpBox(Drupal.t('Fill each box like Excel'), [
            Drupal.t('Type a heading for the box. Click the heading on the live page to open or close the box.'),
            Drupal.t('In the table, left column is the name people see. Right column is where the link goes.'),
            Drupal.t('Need sections inside a box? Click “Add a group heading” (for example Hardware / Software).'),
            Drupal.t('Need a second page for a topic? Open “Add a box on the topic page”. The shortcuts above the boxes will open that page.'),
          ])
          : null,
        cards.map(function (card, ci) {
          if (window.hkcecEditor && window.hkcecEditor.cardEditor) {
            return window.hkcecEditor.cardEditor(card, {
              key: 'card-' + ci,
              showIcon: true,
              indexLabel: Drupal.t('Box @n', { '@n': ci + 1 }),
              titlePlaceholder: Drupal.t('For example: Company Resources'),
              onChange: function (next) {
                updateCard(ci, next);
              },
              onRemove: function () {
                removeCard(ci);
              },
            });
          }
          return el(
            'div',
            { className: 'gb-resource-card gb-resource-card--editor', key: 'card-' + ci },
            el(TextControl, {
              label: Drupal.t('Box heading'),
              value: card.title || '',
              onChange: function (v) { updateCard(ci, { title: v }); },
            }),
          );
        }),
        el(Button, { isPrimary: true, onClick: addCard }, Drupal.t('Add another box')),
      ),
    );
  }

  function saveLegacy(props) {
    const a = props.attributes;
    const cards = a.cards || [];
    const columns = a.columns || '4';
    const linkStyle = a.linkStyle || 'bullet';
    const blockProps = useBlockProps.save({
      className: 'gb-resource-grid cols-' + columns + ' links-' + linkStyle,
    });

    return el(
      'div',
      blockProps,
      el(
        'div',
        { className: 'gb-resource-grid__inner' },
        cards.map(function (card, ci) {
          if (!card || (!card.title && !(card.links || []).length)) {
            return null;
          }
          return el(
            'article',
            { className: 'gb-resource-card', key: 'c-' + ci },
            el(
              'div',
              { className: 'gb-resource-card__head' },
              card.icon ? el('span', { className: 'gb-resource-card__icon', 'aria-hidden': 'true' }, card.icon) : null,
              card.title ? el('h3', { className: 'gb-resource-card__title' }, card.title) : null,
            ),
            el(
              'ul',
              { className: 'gb-resource-card__links' },
              (card.links || [])
                .filter(function (link) {
                  return link && link.label;
                })
                .map(function (link, li) {
                  const marker = linkStyle === 'arrow' ? '→' : '•';
                  const content = link.url
                    ? el('a', { href: link.url }, link.label)
                    : el('span', null, link.label);
                  return el(
                    'li',
                    { key: 'l-' + ci + '-' + li },
                    el('span', { className: 'gb-resource-card__marker', 'aria-hidden': 'true' }, marker),
                    content,
                  );
                }),
            ),
          );
        }),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const cards = a.cards || [];
    const columns = a.columns || '4';
    const linkStyle = a.linkStyle || 'bullet';
    const marker = linkStyle === 'arrow' ? '→' : '•';
    const helper = window.hkcecEditor || {};
    const blockProps = useBlockProps.save({
      className: 'gb-resource-grid cols-' + columns + ' links-' + linkStyle,
    });
    const shortcuts = helper.saveShortcutList ? helper.saveShortcutList(cards) : [];

    return el(
      'div',
      blockProps,
      shortcuts.length
        ? el('nav', { className: 'gb-card-shortcuts', 'aria-label': 'Topics' }, el('ul', null, shortcuts))
        : null,
      el(
        'div',
        { className: 'gb-resource-grid__inner' },
        helper.saveOneCard
          ? cards.map(function (card, ci) {
              return helper.saveOneCard(card, 'c-' + ci, marker, true);
            })
          : null,
      ),
    );
  }

  registerBlockType('hkcec/resource-grid', {
    apiVersion: 2,
    title: Drupal.t('Resource / service cards'),
    description: Drupal.t('Intranet card grid: icon, title, and link lists (landing or department).'),
    category: 'design',
    icon: 'screenoptions',
    keywords: ['intranet', 'resources', 'cards', 'links', 'hr'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      columns: { type: 'string', default: '4' },
      linkStyle: { type: 'string', default: 'bullet' },
      cards: {
        type: 'array',
        default: [],
      },
    },
    getEditWrapperProps: function () {
      return { 'data-align': 'full' };
    },
    edit: Edit,
    save: Save,
    deprecated: [
      {
        attributes: {
          columns: { type: 'string', default: '4' },
          linkStyle: { type: 'string', default: 'bullet' },
          cards: { type: 'array', default: [] },
        },
        supports: { align: ['wide', 'full'], anchor: true, html: false },
        save: saveLegacy,
      },
    ],
  });
})(window.wp, window.Drupal);
