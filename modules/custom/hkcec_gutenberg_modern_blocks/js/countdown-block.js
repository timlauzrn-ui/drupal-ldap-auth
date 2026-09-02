/**
 * @file
 * Countdown Gutenberg block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText } = wp.blockEditor;
  const { PanelBody, TextControl } = wp.components;

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({ className: 'gb-countdown gb-countdown--editor' });

    return el(
      Fragment,
      null,
      el(
        InspectorControls,
        null,
        el(
          PanelBody,
          { title: Drupal.t('Countdown settings'), initialOpen: true },
          el(TextControl, {
            label: Drupal.t('Target date/time'),
            help: Drupal.t('Use local format YYYY-MM-DDTHH:MM (example: 2026-12-31T18:00)'),
            value: a.target || '',
            onChange: function (value) {
              setAttributes({ target: value });
            },
            placeholder: '2026-12-31T18:00',
          }),
        ),
      ),
      el(
        'div',
        blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Countdown')),
        el(RichText, {
          tagName: 'h3',
          className: 'gb-countdown__heading',
          placeholder: Drupal.t('Countdown heading'),
          value: a.heading || '',
          onChange: function (value) {
            setAttributes({ heading: value });
          },
        }),
        el('div', { className: 'gb-countdown__grid' },
          el('div', { className: 'gb-countdown__unit' }, el('strong', null, '00'), el('span', null, Drupal.t('Days'))),
          el('div', { className: 'gb-countdown__unit' }, el('strong', null, '00'), el('span', null, Drupal.t('Hours'))),
          el('div', { className: 'gb-countdown__unit' }, el('strong', null, '00'), el('span', null, Drupal.t('Minutes'))),
          el('div', { className: 'gb-countdown__unit' }, el('strong', null, '00'), el('span', null, Drupal.t('Seconds'))),
        ),
        el('p', { className: 'gb-modern__hint' }, a.target ? Drupal.t('Ends: @t', { '@t': a.target }) : Drupal.t('Set a target date in the sidebar.')),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const blockProps = useBlockProps.save({
      className: 'gb-countdown',
      'data-target': a.target || '',
    });

    return el(
      'div',
      blockProps,
      a.heading ? el(RichText.Content, { tagName: 'h3', className: 'gb-countdown__heading', value: a.heading }) : null,
      el('div', { className: 'gb-countdown__grid', 'data-gb-countdown-grid': '1' },
        el('div', { className: 'gb-countdown__unit' }, el('strong', { 'data-unit': 'days' }, '00'), el('span', null, 'Days')),
        el('div', { className: 'gb-countdown__unit' }, el('strong', { 'data-unit': 'hours' }, '00'), el('span', null, 'Hours')),
        el('div', { className: 'gb-countdown__unit' }, el('strong', { 'data-unit': 'minutes' }, '00'), el('span', null, 'Minutes')),
        el('div', { className: 'gb-countdown__unit' }, el('strong', { 'data-unit': 'seconds' }, '00'), el('span', null, 'Seconds')),
      ),
    );
  }

  registerBlockType('hkcec/countdown', {
    apiVersion: 2,
    title: Drupal.t('Countdown'),
    description: Drupal.t('Live countdown to an event or campaign end date.'),
    category: 'design',
    icon: 'clock',
    keywords: ['countdown', 'timer', 'event'],
    supports: { align: ['wide'], anchor: true, html: false },
    attributes: {
      heading: { type: 'string', default: '' },
      target: { type: 'string', default: '' },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
