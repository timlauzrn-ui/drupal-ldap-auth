/**
 * @file
 * Marquee / ticker text block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText } = wp.blockEditor;
  const { PanelBody, RangeControl, ToggleControl } = wp.components;

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({ className: 'gb-marquee gb-marquee--editor' });

    return el(
      Fragment,
      null,
      el(InspectorControls, null,
        el(PanelBody, { title: Drupal.t('Marquee'), initialOpen: true },
          el(RangeControl, {
            label: Drupal.t('Speed (seconds for one loop)'),
            value: a.speed || 20,
            min: 8,
            max: 60,
            onChange: function (v) { setAttributes({ speed: v || 20 }); },
          }),
          el(ToggleControl, {
            label: Drupal.t('Pause on hover'),
            checked: a.pauseOnHover !== false,
            onChange: function (v) { setAttributes({ pauseOnHover: v }); },
          }),
        ),
      ),
      el('div', blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Marquee / Ticker')),
        el(RichText, {
          tagName: 'div',
          className: 'gb-marquee__text',
          placeholder: Drupal.t('Scrolling announcement · award · event · news'),
          value: a.text || '',
          onChange: function (v) { setAttributes({ text: v }); },
        }),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const blockProps = useBlockProps.save({
      className: 'gb-marquee' + (a.pauseOnHover === false ? '' : ' is-pause-hover'),
      style: { '--gb-marquee-duration': String(a.speed || 20) + 's' },
    });
    const content = a.text || '';
    return el('div', blockProps,
      el('div', { className: 'gb-marquee__track', 'aria-hidden': 'true' },
        el(RichText.Content, { tagName: 'div', className: 'gb-marquee__text', value: content }),
        el(RichText.Content, { tagName: 'div', className: 'gb-marquee__text', value: content }),
      ),
      el('div', { className: 'gb-marquee__accessible screen-reader-text' },
        el(RichText.Content, { value: content }),
      ),
    );
  }

  registerBlockType('modern-blocks/marquee', {
    apiVersion: 2,
    title: Drupal.t('Marquee / Ticker'),
    description: Drupal.t('Continuous scrolling announcement strip.'),
    category: 'design',
    icon: 'leftright',
    keywords: ['marquee', 'ticker', 'scroll'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      text: { type: 'string', default: '' },
      speed: { type: 'number', default: 20 },
      pauseOnHover: { type: 'boolean', default: true },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
