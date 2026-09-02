/**
 * @file
 * Pricing table block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, Button, TextControl, ToggleControl, ToolbarGroup, ToolbarButton } = wp.components;

  function emptyTier() {
    return [
      { name: 'Starter', price: '$29', period: '/mo', features: 'Feature one\nFeature two', buttonLabel: 'Get started', buttonUrl: '', featured: false },
      { name: 'Pro', price: '$79', period: '/mo', features: 'Everything in Starter\nPriority support', buttonLabel: 'Choose Pro', buttonUrl: '', featured: true },
      { name: 'Enterprise', price: 'Custom', period: '', features: 'Dedicated success\nSLA', buttonLabel: 'Talk to us', buttonUrl: '', featured: false },
    ];
  }

  function Edit(props) {
    const tiers = props.attributes.tiers && props.attributes.tiers.length ? props.attributes.tiers : emptyTier();
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({ className: 'gb-pricing gb-pricing--editor' });

    function update(index, patch) {
      setAttributes({
        tiers: tiers.map(function (tier, i) {
          return i === index ? Object.assign({}, tier, patch) : tier;
        }),
      });
    }

    function add() {
      setAttributes({
        tiers: tiers.concat([{
          name: 'New plan',
          price: '$0',
          period: '/mo',
          features: '',
          buttonLabel: 'Select',
          buttonUrl: '',
          featured: false,
        }]),
      });
    }

    return el(
      Fragment,
      null,
      el(InspectorControls, null,
        el(PanelBody, { title: Drupal.t('Pricing'), initialOpen: true },
          el(Button, { variant: 'secondary', onClick: add }, Drupal.t('Add tier')),
        ),
      ),
      el(BlockControls, null,
        el(ToolbarGroup, null, el(ToolbarButton, { icon: 'plus-alt', label: Drupal.t('Add tier'), onClick: add })),
      ),
      el('div', blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Pricing Table')),
        el(RichText, {
          tagName: 'h2',
          className: 'gb-pricing__heading',
          placeholder: Drupal.t('Simple pricing'),
          value: props.attributes.heading || '',
          onChange: function (v) { setAttributes({ heading: v }); },
        }),
        el('div', { className: 'gb-pricing__grid' },
          tiers.map(function (tier, index) {
            return el('div', {
              className: 'gb-pricing__tier' + (tier.featured ? ' is-featured' : ''),
              key: 'pr-' + index,
            },
              el(ToggleControl, {
                label: Drupal.t('Highlight'),
                checked: !!tier.featured,
                onChange: function (v) { update(index, { featured: v }); },
              }),
              el(RichText, {
                tagName: 'h3',
                className: 'gb-pricing__name',
                placeholder: Drupal.t('Plan name'),
                value: tier.name || '',
                onChange: function (v) { update(index, { name: v }); },
              }),
              el('div', { className: 'gb-pricing__price-row' },
                el(RichText, {
                  tagName: 'span',
                  className: 'gb-pricing__price',
                  placeholder: '$99',
                  value: tier.price || '',
                  onChange: function (v) { update(index, { price: v }); },
                }),
                el(RichText, {
                  tagName: 'span',
                  className: 'gb-pricing__period',
                  placeholder: '/mo',
                  value: tier.period || '',
                  onChange: function (v) { update(index, { period: v }); },
                }),
              ),
              el(RichText, {
                tagName: 'div',
                className: 'gb-pricing__features',
                placeholder: Drupal.t('One feature per line'),
                value: tier.features || '',
                onChange: function (v) { update(index, { features: v }); },
                multiline: 'li',
              }),
              el(RichText, {
                tagName: 'span',
                className: 'gb-pricing__button',
                placeholder: Drupal.t('Button label'),
                value: tier.buttonLabel || '',
                onChange: function (v) { update(index, { buttonLabel: v }); },
              }),
              el(TextControl, {
                label: Drupal.t('Button URL'),
                value: tier.buttonUrl || '',
                onChange: function (v) { update(index, { buttonUrl: v }); },
              }),
              el(Button, {
                isSmall: true,
                isDestructive: true,
                onClick: function () {
                  setAttributes({ tiers: tiers.filter(function (_t, i) { return i !== index; }) });
                },
              }, Drupal.t('Remove tier')),
            );
          }),
        ),
      ),
    );
  }

  function featureList(features) {
    const lines = String(features || '')
      .replace(/<\/?li[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .split(/\n+/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
    if (!lines.length) {
      return null;
    }
    return el('ul', { className: 'gb-pricing__feature-list' },
      lines.map(function (line, i) {
        return el('li', { key: 'f-' + i }, line);
      }),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const tiers = a.tiers || [];
    const blockProps = useBlockProps.save({ className: 'gb-pricing' });
    return el('div', blockProps,
      a.heading ? el(RichText.Content, { tagName: 'h2', className: 'gb-pricing__heading', value: a.heading }) : null,
      el('div', { className: 'gb-pricing__grid' },
        tiers.map(function (tier, index) {
          const btn = tier.buttonLabel && tier.buttonUrl
            ? el('a', { className: 'gb-pricing__button', href: tier.buttonUrl }, el(RichText.Content, { value: tier.buttonLabel }))
            : null;
          return el('div', {
            className: 'gb-pricing__tier' + (tier.featured ? ' is-featured' : ''),
            key: 'prs-' + index,
          },
            tier.featured ? el('div', { className: 'gb-pricing__badge' }, 'Most popular') : null,
            tier.name ? el(RichText.Content, { tagName: 'h3', className: 'gb-pricing__name', value: tier.name }) : null,
            el('div', { className: 'gb-pricing__price-row' },
              tier.price ? el(RichText.Content, { tagName: 'span', className: 'gb-pricing__price', value: tier.price }) : null,
              tier.period ? el(RichText.Content, { tagName: 'span', className: 'gb-pricing__period', value: tier.period }) : null,
            ),
            featureList(tier.features),
            btn,
          );
        }),
      ),
    );
  }

  registerBlockType('hkcec/pricing', {
    apiVersion: 2,
    title: Drupal.t('Pricing Table'),
    description: Drupal.t('Transparent pricing tiers with highlight support.'),
    category: 'design',
    icon: 'money-alt',
    keywords: ['pricing', 'plans', 'tiers'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      heading: { type: 'string', default: '' },
      tiers: { type: 'array', default: [] },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
