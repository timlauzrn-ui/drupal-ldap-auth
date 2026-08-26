/**
 * @file
 * Testimonials carousel block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, Button, TextControl, ToggleControl, ToolbarGroup, ToolbarButton } = wp.components;

  function emptyItem() {
    return { quote: '', name: '', role: '' };
  }

  function Edit(props) {
    const items = props.attributes.items || [];
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({ className: 'gb-testimonials gb-testimonials--editor' });

    function update(index, patch) {
      setAttributes({
        items: items.map(function (item, i) {
          return i === index ? Object.assign({}, item, patch) : item;
        }),
      });
    }

    function add() {
      setAttributes({ items: items.concat([emptyItem()]) });
    }

    return el(
      Fragment,
      null,
      el(InspectorControls, null,
        el(PanelBody, { title: Drupal.t('Testimonials'), initialOpen: true },
          el(ToggleControl, {
            label: Drupal.t('Autoplay'),
            checked: props.attributes.autoplay !== false,
            onChange: function (v) { setAttributes({ autoplay: v }); },
          }),
          el(TextControl, {
            label: Drupal.t('Seconds per quote'),
            type: 'number',
            value: String(props.attributes.interval || 6),
            onChange: function (v) { setAttributes({ interval: parseInt(v, 10) || 6 }); },
          }),
        ),
      ),
      el(BlockControls, null,
        el(ToolbarGroup, null, el(ToolbarButton, { icon: 'plus-alt', label: Drupal.t('Add quote'), onClick: add })),
      ),
      el('div', blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Testimonials')),
        el(RichText, {
          tagName: 'h2',
          className: 'gb-testimonials__heading',
          placeholder: Drupal.t('What people say'),
          value: props.attributes.heading || '',
          onChange: function (v) { setAttributes({ heading: v }); },
        }),
        items.map(function (item, index) {
          return el('div', { className: 'gb-testimonials__item-editor', key: 't-' + index },
            el('div', { className: 'gb-modern__row-tools' },
              el('strong', null, Drupal.t('Quote @n', { '@n': index + 1 })),
              el(Button, {
                isSmall: true,
                isDestructive: true,
                onClick: function () {
                  setAttributes({ items: items.filter(function (_i, i) { return i !== index; }) });
                },
              }, Drupal.t('Remove')),
            ),
            el(RichText, {
              tagName: 'blockquote',
              className: 'gb-testimonials__quote',
              placeholder: Drupal.t('Testimonial quote'),
              value: item.quote || '',
              onChange: function (v) { update(index, { quote: v }); },
            }),
            el(RichText, {
              tagName: 'div',
              className: 'gb-testimonials__name',
              placeholder: Drupal.t('Name'),
              value: item.name || '',
              onChange: function (v) { update(index, { name: v }); },
            }),
            el(RichText, {
              tagName: 'div',
              className: 'gb-testimonials__role',
              placeholder: Drupal.t('Role / company'),
              value: item.role || '',
              onChange: function (v) { update(index, { role: v }); },
            }),
          );
        }),
        el(Button, { variant: 'primary', onClick: add }, Drupal.t('Add quote')),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const items = a.items || [];
    const blockProps = useBlockProps.save({
      className: 'gb-testimonials',
      'data-autoplay': a.autoplay === false ? '0' : '1',
      'data-interval': String(a.interval || 6),
    });

    return el('div', blockProps,
      a.heading ? el(RichText.Content, { tagName: 'h2', className: 'gb-testimonials__heading', value: a.heading }) : null,
      el('div', { className: 'gb-testimonials__track', 'data-gb-testimonials-track': '1' },
        items.map(function (item, index) {
          return el('figure', {
            className: 'gb-testimonials__item' + (index === 0 ? ' is-active' : ''),
            'data-index': String(index),
            key: 'ts-' + index,
          },
            el(RichText.Content, { tagName: 'blockquote', className: 'gb-testimonials__quote', value: item.quote || '' }),
            el('figcaption', null,
              item.name ? el(RichText.Content, { tagName: 'div', className: 'gb-testimonials__name', value: item.name }) : null,
              item.role ? el(RichText.Content, { tagName: 'div', className: 'gb-testimonials__role', value: item.role }) : null,
            ),
          );
        }),
      ),
      items.length > 1
        ? el('div', { className: 'gb-testimonials__dots' },
            items.map(function (_item, index) {
              return el('button', {
                type: 'button',
                className: 'gb-testimonials__dot' + (index === 0 ? ' is-active' : ''),
                'data-index': String(index),
                'aria-label': 'Quote ' + (index + 1),
                key: 'td-' + index,
              });
            }),
          )
        : null,
    );
  }

  registerBlockType('modern-blocks/testimonials', {
    apiVersion: 2,
    title: Drupal.t('Testimonials'),
    description: Drupal.t('Rotating social proof quotes with name and role.'),
    category: 'design',
    icon: 'format-quote',
    keywords: ['testimonial', 'quote', 'review'],
    supports: { align: ['wide'], anchor: true, html: false },
    attributes: {
      heading: { type: 'string', default: '' },
      items: { type: 'array', default: [] },
      autoplay: { type: 'boolean', default: true },
      interval: { type: 'number', default: 6 },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
