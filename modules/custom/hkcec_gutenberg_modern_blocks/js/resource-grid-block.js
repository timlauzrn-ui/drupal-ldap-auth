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
    return {
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
          { title: Drupal.t('Grid settings'), initialOpen: true },
          el(SelectControl, {
            label: Drupal.t('Columns'),
            value: columns,
            options: [
              { label: '4 (landing)', value: '4' },
              { label: '3', value: '3' },
              { label: '2 (department)', value: '2' },
              { label: '1', value: '1' },
            ],
            onChange: function (v) {
              setAttributes({ columns: v });
            },
          }),
          el(SelectControl, {
            label: Drupal.t('Link style'),
            value: linkStyle,
            options: [
              { label: Drupal.t('Bullet (landing)'), value: 'bullet' },
              { label: Drupal.t('Arrow (department)'), value: 'arrow' },
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
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Resource / service cards')),
        cards.map(function (card, ci) {
          return el(
            'div',
            { className: 'gb-resource-card gb-resource-card--editor', key: 'card-' + ci },
            el('div', { className: 'gb-modern__row-tools' },
              el('strong', null, Drupal.t('Card @n', { '@n': ci + 1 })),
              el(Button, { isDestructive: true, isSmall: true, onClick: function () { removeCard(ci); } }, Drupal.t('Remove')),
            ),
            el(TextControl, {
              label: Drupal.t('Icon (emoji or short text)'),
              value: card.icon || '',
              onChange: function (v) { updateCard(ci, { icon: v }); },
            }),
            el(TextControl, {
              label: Drupal.t('Title'),
              value: card.title || '',
              onChange: function (v) { updateCard(ci, { title: v }); },
            }),
            (card.links || []).map(function (link, li) {
              return el(
                'div',
                { className: 'gb-resource-card__link-row', key: 'link-' + ci + '-' + li },
                el(TextControl, {
                  label: Drupal.t('Link label'),
                  value: link.label || '',
                  onChange: function (v) { updateLink(ci, li, { label: v }); },
                }),
                el(TextControl, {
                  label: Drupal.t('URL'),
                  value: link.url || '',
                  onChange: function (v) { updateLink(ci, li, { url: v }); },
                  placeholder: '/path-or-https://',
                }),
                el(Button, { isSmall: true, isDestructive: true, onClick: function () { removeLink(ci, li); } }, Drupal.t('Remove link')),
              );
            }),
            el(Button, { isSecondary: true, isSmall: true, onClick: function () { addLink(ci); } }, Drupal.t('Add link')),
          );
        }),
        el(Button, { isPrimary: true, onClick: addCard }, Drupal.t('Add card')),
      ),
    );
  }

  function Save(props) {
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
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
