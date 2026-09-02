/**
 * @file
 * Accordion / FAQ Gutenberg block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText, BlockControls } = wp.blockEditor;
  const {
    PanelBody,
    ToggleControl,
    Button,
    ToolbarGroup,
    ToolbarButton,
  } = wp.components;

  function emptyItem() {
    return { title: '', content: '' };
  }

  function Edit(props) {
    const attrs = props.attributes;
    const setAttributes = props.setAttributes;
    const items = attrs.items || [];
    const allowMultiple = !!attrs.allowMultiple;
    const blockProps = useBlockProps({ className: 'gb-accordion gb-accordion--editor' });

    function updateItem(index, patch) {
      setAttributes({
        items: items.map(function (item, i) {
          return i === index ? Object.assign({}, item, patch) : item;
        }),
      });
    }

    function addItem() {
      setAttributes({ items: items.concat([emptyItem()]) });
    }

    function removeItem(index) {
      setAttributes({
        items: items.filter(function (_item, i) {
          return i !== index;
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
          { title: Drupal.t('Accordion settings'), initialOpen: true },
          el(ToggleControl, {
            label: Drupal.t('Allow multiple open'),
            checked: allowMultiple,
            onChange: function (value) {
              setAttributes({ allowMultiple: value });
            },
          }),
        ),
      ),
      el(
        BlockControls,
        null,
        el(ToolbarGroup, null, el(ToolbarButton, { icon: 'plus-alt', label: Drupal.t('Add item'), onClick: addItem })),
      ),
      el(
        'div',
        blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Accordion / FAQ')),
        items.length === 0
          ? el('p', { className: 'gb-modern__empty' }, Drupal.t('Add FAQ items with the button below.'))
          : null,
        items.map(function (item, index) {
          return el(
            'div',
            { className: 'gb-accordion__item-editor', key: 'acc-' + index },
            el(
              'div',
              { className: 'gb-modern__row-tools' },
              el('strong', null, Drupal.t('Item @n', { '@n': index + 1 })),
              el(
                Button,
                {
                  isSmall: true,
                  isDestructive: true,
                  onClick: function () {
                    removeItem(index);
                  },
                },
                Drupal.t('Remove'),
              ),
            ),
            el(RichText, {
              tagName: 'h3',
              className: 'gb-accordion__title',
              placeholder: Drupal.t('Question / heading'),
              value: item.title || '',
              onChange: function (value) {
                updateItem(index, { title: value });
              },
            }),
            el(RichText, {
              tagName: 'div',
              className: 'gb-accordion__content',
              placeholder: Drupal.t('Answer / details'),
              value: item.content || '',
              onChange: function (value) {
                updateItem(index, { content: value });
              },
            }),
          );
        }),
        el(Button, { variant: 'primary', onClick: addItem }, Drupal.t('Add item')),
      ),
    );
  }

  function Save(props) {
    const attrs = props.attributes;
    const items = attrs.items || [];
    const allowMultiple = !!attrs.allowMultiple;
    const blockProps = useBlockProps.save({
      className: 'gb-accordion',
      'data-allow-multiple': allowMultiple ? '1' : '0',
    });

    return el(
      'div',
      blockProps,
      items.map(function (item, index) {
        return el(
          'div',
          { className: 'gb-accordion__item', key: 's-' + index },
          el(
            'button',
            {
              type: 'button',
              className: 'gb-accordion__trigger',
              'aria-expanded': index === 0 ? 'true' : 'false',
            },
            el(RichText.Content, { tagName: 'span', className: 'gb-accordion__title', value: item.title || '' }),
            el('span', { className: 'gb-accordion__icon', 'aria-hidden': 'true' }, '+'),
          ),
          el(
            'div',
            {
              className: 'gb-accordion__panel' + (index === 0 ? ' is-open' : ''),
              hidden: index === 0 ? undefined : true,
            },
            el(RichText.Content, { tagName: 'div', className: 'gb-accordion__content', value: item.content || '' }),
          ),
        );
      }),
    );
  }

  registerBlockType('hkcec/accordion', {
    apiVersion: 2,
    title: Drupal.t('Accordion / FAQ'),
    description: Drupal.t('Expandable Q&A or stacked content panels.'),
    category: 'design',
    icon: 'editor-ul',
    keywords: ['faq', 'accordion', 'collapse'],
    supports: { align: ['wide'], anchor: true, html: false },
    attributes: {
      items: { type: 'array', default: [] },
      allowMultiple: { type: 'boolean', default: false },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
