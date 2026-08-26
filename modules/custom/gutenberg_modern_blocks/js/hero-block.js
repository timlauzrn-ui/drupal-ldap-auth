/**
 * @file
 * Full-bleed Hero block (award-site above-the-fold pattern).
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, MediaPlaceholder, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, TextControl, SelectControl, ToolbarGroup, ToolbarButton } = wp.components;

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({
      className: 'gb-hero gb-hero--editor is-align-' + (a.contentAlign || 'left') + ' is-overlay-' + (a.overlay || 'dark'),
    });

    return el(
      Fragment,
      null,
      el(
        InspectorControls,
        null,
        el(
          PanelBody,
          { title: Drupal.t('Hero settings'), initialOpen: true },
          el(SelectControl, {
            label: Drupal.t('Text align'),
            value: a.contentAlign || 'left',
            options: [
              { label: Drupal.t('Left'), value: 'left' },
              { label: Drupal.t('Center'), value: 'center' },
            ],
            onChange: function (v) { setAttributes({ contentAlign: v }); },
          }),
          el(SelectControl, {
            label: Drupal.t('Overlay'),
            value: a.overlay || 'dark',
            options: [
              { label: Drupal.t('Dark'), value: 'dark' },
              { label: Drupal.t('Light'), value: 'light' },
              { label: Drupal.t('None'), value: 'none' },
            ],
            onChange: function (v) { setAttributes({ overlay: v }); },
          }),
          el(TextControl, {
            label: Drupal.t('Primary button URL'),
            value: a.primaryUrl || '',
            onChange: function (v) { setAttributes({ primaryUrl: v }); },
          }),
          el(TextControl, {
            label: Drupal.t('Secondary button URL'),
            value: a.secondaryUrl || '',
            onChange: function (v) { setAttributes({ secondaryUrl: v }); },
          }),
        ),
      ),
      el(
        BlockControls,
        null,
        el(ToolbarGroup, null, el(ToolbarButton, {
          icon: 'no-alt',
          label: Drupal.t('Clear background'),
          onClick: function () { setAttributes({ imageUrl: '', imageUuid: '', imageAlt: '' }); },
        })),
      ),
      el(
        'div',
        blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Hero')),
        !a.imageUrl
          ? el(MediaPlaceholder, {
              onSelect: function (media) {
                setAttributes({
                  imageUrl: media.url || '',
                  imageUuid: (media.data && media.data.entity_uuid) || String(media.id || ''),
                  imageAlt: media.alt || '',
                });
              },
              allowedTypes: ['image'],
              multiple: false,
              labels: { title: Drupal.t('Hero background') },
            }, Drupal.t('Upload a full-bleed background image.'))
          : el('img', {
              className: 'gb-hero__media',
              src: a.imageUrl,
              alt: a.imageAlt || '',
              'data-entity-type': 'file',
              'data-entity-uuid': a.imageUuid || '',
            }),
        el('div', { className: 'gb-hero__content' },
          el(RichText, {
            tagName: 'p',
            className: 'gb-hero__eyebrow',
            placeholder: Drupal.t('Eyebrow / brand line'),
            value: a.eyebrow || '',
            onChange: function (v) { setAttributes({ eyebrow: v }); },
          }),
          el(RichText, {
            tagName: 'h1',
            className: 'gb-hero__title',
            placeholder: Drupal.t('Hero headline'),
            value: a.title || '',
            onChange: function (v) { setAttributes({ title: v }); },
          }),
          el(RichText, {
            tagName: 'p',
            className: 'gb-hero__text',
            placeholder: Drupal.t('One short supporting sentence'),
            value: a.text || '',
            onChange: function (v) { setAttributes({ text: v }); },
          }),
          el('div', { className: 'gb-hero__actions' },
            el(RichText, {
              tagName: 'span',
              className: 'gb-hero__btn gb-hero__btn--primary',
              placeholder: Drupal.t('Primary CTA'),
              value: a.primaryLabel || '',
              onChange: function (v) { setAttributes({ primaryLabel: v }); },
            }),
            el(RichText, {
              tagName: 'span',
              className: 'gb-hero__btn gb-hero__btn--secondary',
              placeholder: Drupal.t('Secondary CTA'),
              value: a.secondaryLabel || '',
              onChange: function (v) { setAttributes({ secondaryLabel: v }); },
            }),
          ),
        ),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const blockProps = useBlockProps.save({
      className: 'gb-hero is-align-' + (a.contentAlign || 'left') + ' is-overlay-' + (a.overlay || 'dark'),
    });
    const primary = a.primaryLabel && a.primaryUrl
      ? el('a', { className: 'gb-hero__btn gb-hero__btn--primary', href: a.primaryUrl }, el(RichText.Content, { value: a.primaryLabel }))
      : null;
    const secondary = a.secondaryLabel && a.secondaryUrl
      ? el('a', { className: 'gb-hero__btn gb-hero__btn--secondary', href: a.secondaryUrl }, el(RichText.Content, { value: a.secondaryLabel }))
      : null;

    return el(
      'section',
      blockProps,
      a.imageUrl
        ? el('img', {
            className: 'gb-hero__media',
            src: a.imageUrl,
            alt: a.imageAlt || '',
            'data-entity-type': 'file',
            'data-entity-uuid': a.imageUuid || '',
          })
        : el('div', { className: 'gb-hero__media gb-hero__media--fallback' }),
      el('div', { className: 'gb-hero__overlay', 'aria-hidden': 'true' }),
      el('div', { className: 'gb-hero__content' },
        a.eyebrow ? el(RichText.Content, { tagName: 'p', className: 'gb-hero__eyebrow', value: a.eyebrow }) : null,
        a.title ? el(RichText.Content, { tagName: 'h1', className: 'gb-hero__title', value: a.title }) : null,
        a.text ? el(RichText.Content, { tagName: 'p', className: 'gb-hero__text', value: a.text }) : null,
        el('div', { className: 'gb-hero__actions' }, primary, secondary),
      ),
    );
  }

  registerBlockType('modern-blocks/hero', {
    apiVersion: 2,
    title: Drupal.t('Hero'),
    description: Drupal.t('Award-style full-bleed hero with headline and dual CTAs.'),
    category: 'design',
    icon: 'cover-image',
    keywords: ['hero', 'banner', 'landing'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      imageUrl: { type: 'string', default: '' },
      imageUuid: { type: 'string', default: '' },
      imageAlt: { type: 'string', default: '' },
      eyebrow: { type: 'string', default: '' },
      title: { type: 'string', default: '' },
      text: { type: 'string', default: '' },
      primaryLabel: { type: 'string', default: '' },
      primaryUrl: { type: 'string', default: '' },
      secondaryLabel: { type: 'string', default: '' },
      secondaryUrl: { type: 'string', default: '' },
      contentAlign: { type: 'string', default: 'left' },
      overlay: { type: 'string', default: 'dark' },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
