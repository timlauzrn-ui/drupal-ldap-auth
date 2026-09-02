/**
 * @file
 * Stats row Gutenberg block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, Button, ToolbarGroup, ToolbarButton } = wp.components;

  function emptyStat() {
    return { value: '', label: '' };
  }

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const items = a.items && a.items.length ? a.items : [emptyStat(), emptyStat(), emptyStat()];
    const blockProps = useBlockProps({ className: 'gb-stats gb-stats--editor' });

    function updateItem(index, patch) {
      setAttributes({
        items: items.map(function (item, i) {
          return i === index ? Object.assign({}, item, patch) : item;
        }),
      });
    }

    function addItem() {
      setAttributes({ items: items.concat([emptyStat()]) });
    }

    function removeItem(index) {
      if (items.length <= 1) {
        return;
      }
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
          { title: Drupal.t('Stats settings'), initialOpen: true },
          el(Button, { variant: 'secondary', onClick: addItem }, Drupal.t('Add stat')),
        ),
      ),
      el(
        BlockControls,
        null,
        el(ToolbarGroup, null, el(ToolbarButton, { icon: 'plus-alt', label: Drupal.t('Add stat'), onClick: addItem })),
      ),
      el(
        'div',
        blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Stats Row')),
        el(
          'div',
          { className: 'gb-stats__grid' },
          items.map(function (item, index) {
            return el(
              'div',
              { className: 'gb-stats__item', key: 'st-' + index },
              el(RichText, {
                tagName: 'div',
                className: 'gb-stats__value',
                placeholder: '120+',
                value: item.value || '',
                onChange: function (value) {
                  updateItem(index, { value: value });
                },
              }),
              el(RichText, {
                tagName: 'div',
                className: 'gb-stats__label',
                placeholder: Drupal.t('Label'),
                value: item.label || '',
                onChange: function (value) {
                  updateItem(index, { label: value });
                },
              }),
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
            );
          }),
        ),
      ),
    );
  }

  function Save(props) {
    const items = props.attributes.items || [];
    const blockProps = useBlockProps.save({ className: 'gb-stats' });
    return el(
      'div',
      blockProps,
      el(
        'div',
        { className: 'gb-stats__grid' },
        items.map(function (item, index) {
          return el(
            'div',
            { className: 'gb-stats__item', key: 'ss-' + index },
            el(RichText.Content, { tagName: 'div', className: 'gb-stats__value', value: item.value || '' }),
            el(RichText.Content, { tagName: 'div', className: 'gb-stats__label', value: item.label || '' }),
          );
        }),
      ),
    );
  }

  registerBlockType('hkcec/stats', {
    apiVersion: 2,
    title: Drupal.t('Stats Row'),
    description: Drupal.t('Highlight key numbers in a responsive row.'),
    category: 'design',
    icon: 'chart-bar',
    keywords: ['stats', 'metrics', 'numbers'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      items: {
        type: 'array',
        default: [
          { value: '120+', label: 'Events' },
          { value: '40k', label: 'Visitors' },
          { value: '98%', label: 'Satisfaction' },
        ],
      },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
