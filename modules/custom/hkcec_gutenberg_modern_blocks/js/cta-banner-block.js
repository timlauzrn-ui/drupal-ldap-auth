/**
 * @file
 * CTA Banner Gutenberg block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText } = wp.blockEditor;
  const { PanelBody, TextControl, SelectControl } = wp.components;

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({
      className: 'gb-cta-banner gb-cta-banner--editor is-tone-' + (a.tone || 'brand'),
    });

    return el(
      Fragment,
      null,
      el(
        InspectorControls,
        null,
        el(
          PanelBody,
          { title: Drupal.t('CTA settings'), initialOpen: true },
          el(SelectControl, {
            label: Drupal.t('Tone'),
            value: a.tone || 'brand',
            options: [
              { label: Drupal.t('Brand'), value: 'brand' },
              { label: Drupal.t('Dark'), value: 'dark' },
              { label: Drupal.t('Light'), value: 'light' },
            ],
            onChange: function (value) {
              setAttributes({ tone: value });
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
        ),
      ),
      el(
        'div',
        blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('CTA Banner')),
        el(RichText, {
          tagName: 'h2',
          className: 'gb-cta-banner__title',
          placeholder: Drupal.t('Call to action headline'),
          value: a.title || '',
          onChange: function (value) {
            setAttributes({ title: value });
          },
        }),
        el(RichText, {
          tagName: 'p',
          className: 'gb-cta-banner__text',
          placeholder: Drupal.t('Supporting sentence'),
          value: a.text || '',
          onChange: function (value) {
            setAttributes({ text: value });
          },
        }),
        el(RichText, {
          tagName: 'span',
          className: 'gb-cta-banner__button',
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
      className: 'gb-cta-banner is-tone-' + (a.tone || 'brand'),
    });
    const button =
      a.buttonLabel && a.buttonUrl
        ? el('a', { className: 'gb-cta-banner__button', href: a.buttonUrl }, el(RichText.Content, { value: a.buttonLabel }))
        : null;

    return el(
      'div',
      blockProps,
      el('div', { className: 'gb-cta-banner__inner' },
        a.title ? el(RichText.Content, { tagName: 'h2', className: 'gb-cta-banner__title', value: a.title }) : null,
        a.text ? el(RichText.Content, { tagName: 'p', className: 'gb-cta-banner__text', value: a.text }) : null,
        button,
      ),
    );
  }

  registerBlockType('hkcec/cta-banner', {
    apiVersion: 2,
    title: Drupal.t('CTA Banner'),
    description: Drupal.t('Full-width call-to-action with headline and button.'),
    category: 'design',
    icon: 'megaphone',
    keywords: ['cta', 'banner', 'call to action'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      title: { type: 'string', default: '' },
      text: { type: 'string', default: '' },
      buttonLabel: { type: 'string', default: '' },
      buttonUrl: { type: 'string', default: '' },
      tone: { type: 'string', default: 'brand' },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
