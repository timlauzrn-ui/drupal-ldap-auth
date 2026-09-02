/**
 * @file
 * Bento grid block (asymmetric feature mosaic).
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, Button, SelectControl, ToolbarGroup, ToolbarButton } = wp.components;

  function emptyCell() {
    return { title: '', text: '', size: 'md' };
  }

  function Edit(props) {
    const cells = props.attributes.cells || [];
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({ className: 'gb-bento gb-bento--editor' });

    function update(index, patch) {
      setAttributes({
        cells: cells.map(function (cell, i) {
          return i === index ? Object.assign({}, cell, patch) : cell;
        }),
      });
    }

    function add() {
      setAttributes({ cells: cells.concat([emptyCell()]) });
    }

    return el(
      Fragment,
      null,
      el(InspectorControls, null,
        el(PanelBody, { title: Drupal.t('Bento grid'), initialOpen: true },
          el(Button, { variant: 'secondary', onClick: add }, Drupal.t('Add cell')),
        ),
      ),
      el(BlockControls, null,
        el(ToolbarGroup, null, el(ToolbarButton, { icon: 'plus-alt', label: Drupal.t('Add cell'), onClick: add })),
      ),
      el('div', blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Bento Grid')),
        el(RichText, {
          tagName: 'h2',
          className: 'gb-bento__heading',
          placeholder: Drupal.t('Explore more'),
          value: props.attributes.heading || '',
          onChange: function (v) { setAttributes({ heading: v }); },
        }),
        el('div', { className: 'gb-bento__grid' },
          cells.map(function (cell, index) {
            return el('div', {
              className: 'gb-bento__cell is-size-' + (cell.size || 'md'),
              key: 'b-' + index,
            },
              el(SelectControl, {
                label: Drupal.t('Size'),
                value: cell.size || 'md',
                options: [
                  { label: 'S', value: 'sm' },
                  { label: 'M', value: 'md' },
                  { label: 'L', value: 'lg' },
                ],
                onChange: function (v) { update(index, { size: v }); },
              }),
              el(RichText, {
                tagName: 'h3',
                className: 'gb-bento__title',
                placeholder: Drupal.t('Cell title'),
                value: cell.title || '',
                onChange: function (v) { update(index, { title: v }); },
              }),
              el(RichText, {
                tagName: 'p',
                className: 'gb-bento__text',
                placeholder: Drupal.t('Short blurb'),
                value: cell.text || '',
                onChange: function (v) { update(index, { text: v }); },
              }),
              el(Button, {
                isSmall: true,
                isDestructive: true,
                onClick: function () {
                  setAttributes({ cells: cells.filter(function (_c, i) { return i !== index; }) });
                },
              }, Drupal.t('Remove')),
            );
          }),
        ),
        el(Button, { variant: 'primary', onClick: add }, Drupal.t('Add cell')),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const cells = a.cells || [];
    const blockProps = useBlockProps.save({ className: 'gb-bento' });
    return el('div', blockProps,
      a.heading ? el(RichText.Content, { tagName: 'h2', className: 'gb-bento__heading', value: a.heading }) : null,
      el('div', { className: 'gb-bento__grid' },
        cells.map(function (cell, index) {
          return el('div', {
            className: 'gb-bento__cell is-size-' + (cell.size || 'md'),
            key: 'bs-' + index,
          },
            cell.title ? el(RichText.Content, { tagName: 'h3', className: 'gb-bento__title', value: cell.title }) : null,
            cell.text ? el(RichText.Content, { tagName: 'p', className: 'gb-bento__text', value: cell.text }) : null,
          );
        }),
      ),
    );
  }

  registerBlockType('hkcec/bento', {
    apiVersion: 2,
    title: Drupal.t('Bento Grid'),
    description: Drupal.t('Asymmetric mosaic of feature cells (Apple-style bento).'),
    category: 'design',
    icon: 'screenoptions',
    keywords: ['bento', 'grid', 'mosaic'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      heading: { type: 'string', default: '' },
      cells: {
        type: 'array',
        default: [
          { title: 'Spotlight', text: '', size: 'lg' },
          { title: 'Feature', text: '', size: 'md' },
          { title: 'Detail', text: '', size: 'sm' },
          { title: 'Extra', text: '', size: 'md' },
        ],
      },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
