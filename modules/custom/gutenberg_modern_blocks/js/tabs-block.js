/**
 * @file
 * Tabs content block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, Button, ToolbarGroup, ToolbarButton } = wp.components;

  function emptyTab() {
    return { label: '', content: '' };
  }

  function Edit(props) {
    const tabs = props.attributes.tabs || [];
    const active = typeof props.attributes.active === 'number' ? props.attributes.active : 0;
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({ className: 'gb-tabs gb-tabs--editor' });

    function update(index, patch) {
      setAttributes({
        tabs: tabs.map(function (tab, i) {
          return i === index ? Object.assign({}, tab, patch) : tab;
        }),
      });
    }

    function add() {
      setAttributes({ tabs: tabs.concat([emptyTab()]) });
    }

    return el(
      Fragment,
      null,
      el(InspectorControls, null,
        el(PanelBody, { title: Drupal.t('Tabs'), initialOpen: true },
          el(Button, { variant: 'secondary', onClick: add }, Drupal.t('Add tab')),
        ),
      ),
      el(BlockControls, null,
        el(ToolbarGroup, null, el(ToolbarButton, { icon: 'plus-alt', label: Drupal.t('Add tab'), onClick: add })),
      ),
      el('div', blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Tabs')),
        el('div', { className: 'gb-tabs__nav' },
          tabs.map(function (tab, index) {
            return el('button', {
              type: 'button',
              key: 'tn-' + index,
              className: 'gb-tabs__tab' + (index === active ? ' is-active' : ''),
              onClick: function () { setAttributes({ active: index }); },
            }, tab.label || Drupal.t('Tab @n', { '@n': index + 1 }));
          }),
        ),
        tabs.map(function (tab, index) {
          if (index !== active) {
            return null;
          }
          return el('div', { className: 'gb-tabs__panel-editor', key: 'tp-' + index },
            el(RichText, {
              tagName: 'div',
              className: 'gb-tabs__label-field',
              placeholder: Drupal.t('Tab label'),
              value: tab.label || '',
              onChange: function (v) { update(index, { label: v }); },
            }),
            el(RichText, {
              tagName: 'div',
              className: 'gb-tabs__content',
              placeholder: Drupal.t('Tab content'),
              value: tab.content || '',
              onChange: function (v) { update(index, { content: v }); },
            }),
            el(Button, {
              isSmall: true,
              isDestructive: true,
              onClick: function () {
                const next = tabs.filter(function (_t, i) { return i !== index; });
                setAttributes({ tabs: next, active: Math.max(0, active - 1) });
              },
            }, Drupal.t('Remove tab')),
          );
        }),
        el(Button, { variant: 'primary', onClick: add }, Drupal.t('Add tab')),
      ),
    );
  }

  function Save(props) {
    const tabs = props.attributes.tabs || [];
    const blockProps = useBlockProps.save({ className: 'gb-tabs' });
    return el('div', blockProps,
      el('div', { className: 'gb-tabs__nav', role: 'tablist' },
        tabs.map(function (tab, index) {
          return el('button', {
            type: 'button',
            role: 'tab',
            className: 'gb-tabs__tab' + (index === 0 ? ' is-active' : ''),
            'aria-selected': index === 0 ? 'true' : 'false',
            'data-index': String(index),
            key: 'tns-' + index,
          }, el(RichText.Content, { value: tab.label || ('Tab ' + (index + 1)) }));
        }),
      ),
      tabs.map(function (tab, index) {
        return el('div', {
          className: 'gb-tabs__panel' + (index === 0 ? ' is-active' : ''),
          role: 'tabpanel',
          hidden: index === 0 ? undefined : true,
          'data-index': String(index),
          key: 'tps-' + index,
        }, el(RichText.Content, { tagName: 'div', className: 'gb-tabs__content', value: tab.content || '' }));
      }),
    );
  }

  registerBlockType('modern-blocks/tabs', {
    apiVersion: 2,
    title: Drupal.t('Tabs'),
    description: Drupal.t('Switchable content panels for dense masterpiece layouts.'),
    category: 'design',
    icon: 'table-row-after',
    keywords: ['tabs', 'panels'],
    supports: { align: ['wide'], anchor: true, html: false },
    attributes: {
      tabs: {
        type: 'array',
        default: [
          { label: 'Overview', content: '' },
          { label: 'Details', content: '' },
        ],
      },
      active: { type: 'number', default: 0 },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
