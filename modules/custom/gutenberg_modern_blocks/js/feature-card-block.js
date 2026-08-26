/**
 * @file
 * Feature Card Gutenberg block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, MediaPlaceholder, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, TextControl, SelectControl, Button, ToolbarGroup, ToolbarButton } = wp.components;

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({
      className: 'gb-feature-card gb-feature-card--editor is-style-' + (a.style || 'default'),
    });

    function clearImage() {
      setAttributes({ imageUrl: '', imageUuid: '', imageAlt: '' });
    }

    return el(
      Fragment,
      null,
      el(
        InspectorControls,
        null,
        el(
          PanelBody,
          { title: Drupal.t('Card settings'), initialOpen: true },
          el(SelectControl, {
            label: Drupal.t('Style'),
            value: a.style || 'default',
            options: [
              { label: Drupal.t('Default'), value: 'default' },
              { label: Drupal.t('Bordered'), value: 'bordered' },
              { label: Drupal.t('Soft shadow'), value: 'shadow' },
            ],
            onChange: function (value) {
              setAttributes({ style: value });
            },
          }),
          el(TextControl, {
            label: Drupal.t('Button URL'),
            value: a.buttonUrl || '',
            onChange: function (value) {
              setAttributes({ buttonUrl: value });
            },
            placeholder: 'https://',
          }),
          el(TextControl, {
            label: Drupal.t('Image alt text'),
            value: a.imageAlt || '',
            onChange: function (value) {
              setAttributes({ imageAlt: value });
            },
          }),
        ),
      ),
      el(
        BlockControls,
        null,
        el(ToolbarGroup, null, el(ToolbarButton, { icon: 'no-alt', label: Drupal.t('Clear image'), onClick: clearImage })),
      ),
      el(
        'div',
        blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Feature Card')),
        !a.imageUrl
          ? el(
              MediaPlaceholder,
              {
                onSelect: function (media) {
                  setAttributes({
                    imageUrl: media.url || '',
                    imageUuid: (media.data && media.data.entity_uuid) || String(media.id || ''),
                    imageAlt: media.alt || '',
                  });
                },
                allowedTypes: ['image'],
                multiple: false,
                labels: { title: Drupal.t('Card image') },
              },
              Drupal.t('Upload or select an image.'),
            )
          : el('img', {
              src: a.imageUrl,
              alt: a.imageAlt || '',
              'data-entity-type': 'file',
              'data-entity-uuid': a.imageUuid || '',
            }),
        el(RichText, {
          tagName: 'h3',
          className: 'gb-feature-card__title',
          placeholder: Drupal.t('Card title'),
          value: a.title || '',
          onChange: function (value) {
            setAttributes({ title: value });
          },
        }),
        el(RichText, {
          tagName: 'p',
          className: 'gb-feature-card__text',
          placeholder: Drupal.t('Short description'),
          value: a.text || '',
          onChange: function (value) {
            setAttributes({ text: value });
          },
        }),
        el(RichText, {
          tagName: 'span',
          className: 'gb-feature-card__button',
          placeholder: Drupal.t('Button label'),
          value: a.buttonLabel || '',
          onChange: function (value) {
            setAttributes({ buttonLabel: value });
          },
        }),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const blockProps = useBlockProps.save({
      className: 'gb-feature-card is-style-' + (a.style || 'default'),
    });
    const button =
      a.buttonLabel && a.buttonUrl
        ? el('a', { className: 'gb-feature-card__button', href: a.buttonUrl }, el(RichText.Content, { value: a.buttonLabel }))
        : a.buttonLabel
          ? el('span', { className: 'gb-feature-card__button' }, el(RichText.Content, { value: a.buttonLabel }))
          : null;

    return el(
      'div',
      blockProps,
      a.imageUrl
        ? el('img', {
            src: a.imageUrl,
            alt: a.imageAlt || '',
            'data-entity-type': 'file',
            'data-entity-uuid': a.imageUuid || '',
            loading: 'lazy',
          })
        : null,
      el('div', { className: 'gb-feature-card__body' },
        a.title ? el(RichText.Content, { tagName: 'h3', className: 'gb-feature-card__title', value: a.title }) : null,
        a.text ? el(RichText.Content, { tagName: 'p', className: 'gb-feature-card__text', value: a.text }) : null,
        button,
      ),
    );
  }

  registerBlockType('modern-blocks/feature-card', {
    apiVersion: 2,
    title: Drupal.t('Feature Card'),
    description: Drupal.t('Image, title, text, and optional button for features or promos.'),
    category: 'design',
    icon: 'index-card',
    keywords: ['card', 'feature', 'promo'],
    supports: { align: ['wide'], anchor: true, html: false },
    attributes: {
      imageUrl: { type: 'string', default: '' },
      imageUuid: { type: 'string', default: '' },
      imageAlt: { type: 'string', default: '' },
      title: { type: 'string', default: '' },
      text: { type: 'string', default: '' },
      buttonLabel: { type: 'string', default: '' },
      buttonUrl: { type: 'string', default: '' },
      style: { type: 'string', default: 'default' },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
