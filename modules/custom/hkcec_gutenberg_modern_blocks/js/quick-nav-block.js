/**
 * @file
 * Department Quick Navigation sidebar block (Figma HR page).
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText } = wp.blockEditor;
  const { PanelBody, TextControl, Button } = wp.components;

  function emptyItem() {
    return { label: '', url: '' };
  }

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const items = a.items && a.items.length ? a.items : [emptyItem()];
    const blockProps = useBlockProps({ className: 'gb-quick-nav gb-quick-nav--editor' });

    function updateItem(index, patch) {
      const next = items.map(function (item, i) {
        return i === index ? Object.assign({}, item, patch) : item;
      });
      setAttributes({ items: next });
    }

    return el(
      Fragment,
      null,
      el(
        InspectorControls,
        null,
        el(
          PanelBody,
          { title: Drupal.t('Quick Navigation'), initialOpen: true },
          el(TextControl, {
            label: Drupal.t('Icon'),
            value: a.icon || '📖',
            onChange: function (v) {
              setAttributes({ icon: v });
            },
          }),
        ),
      ),
      el(
        'aside',
        blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Quick Navigation')),
        el(
          'div',
          { className: 'gb-quick-nav__head' },
          el('span', { className: 'gb-quick-nav__icon', 'aria-hidden': 'true' }, a.icon || '📖'),
          el(RichText, {
            tagName: 'h2',
            className: 'gb-quick-nav__title',
            placeholder: Drupal.t('Quick Navigation'),
            value: a.title || '',
            onChange: function (v) {
              setAttributes({ title: v });
            },
          }),
        ),
        items.map(function (item, i) {
          return el(
            'div',
            { className: 'gb-quick-nav__row', key: 'qi-' + i },
            el(TextControl, {
              label: Drupal.t('Label'),
              value: item.label || '',
              onChange: function (v) {
                updateItem(i, { label: v });
              },
            }),
            el(TextControl, {
              label: Drupal.t('URL'),
              value: item.url || '',
              onChange: function (v) {
                updateItem(i, { url: v });
              },
              placeholder: '#employee-services',
            }),
            el(Button, {
              isDestructive: true,
              isSmall: true,
              onClick: function () {
                setAttributes({
                  items: items.filter(function (_x, idx) {
                    return idx !== i;
                  }),
                });
              },
            }, Drupal.t('Remove')),
          );
        }),
        el(Button, {
          isPrimary: true,
          onClick: function () {
            setAttributes({ items: items.concat([emptyItem()]) });
          },
        }, Drupal.t('Add link')),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const items = a.items || [];
    const blockProps = useBlockProps.save({ className: 'gb-quick-nav' });

    return el(
      'aside',
      blockProps,
      el(
        'div',
        { className: 'gb-quick-nav__head' },
        a.icon ? el('span', { className: 'gb-quick-nav__icon', 'aria-hidden': 'true' }, a.icon) : null,
        a.title
          ? el(RichText.Content, { tagName: 'h2', className: 'gb-quick-nav__title', value: a.title })
          : null,
      ),
      el(
        'ul',
        { className: 'gb-quick-nav__list' },
        items
          .filter(function (item) {
            return item && item.label;
          })
          .map(function (item, i) {
            return el(
              'li',
              { key: 'q-' + i },
              item.url
                ? el('a', { href: item.url }, item.label)
                : el('span', null, item.label),
            );
          }),
      ),
    );
  }

  registerBlockType('hkcec/quick-nav', {
    apiVersion: 2,
    title: Drupal.t('Quick Navigation'),
    description: Drupal.t('Sidebar link list for department / content pages.'),
    category: 'design',
    icon: 'menu',
    keywords: ['nav', 'sidebar', 'intranet', 'hr'],
    supports: { anchor: true, html: false },
    attributes: {
      icon: { type: 'string', default: '📖' },
      title: { type: 'string', default: 'Quick Navigation' },
      items: { type: 'array', default: [] },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
