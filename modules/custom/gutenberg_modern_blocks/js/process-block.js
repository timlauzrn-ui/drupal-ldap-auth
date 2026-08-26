/**
 * @file
 * Process / timeline steps block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, Button, ToolbarGroup, ToolbarButton } = wp.components;

  function emptyStep() {
    return { title: '', text: '' };
  }

  function Edit(props) {
    const steps = props.attributes.steps || [];
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({ className: 'gb-process gb-process--editor' });

    function update(index, patch) {
      setAttributes({
        steps: steps.map(function (step, i) {
          return i === index ? Object.assign({}, step, patch) : step;
        }),
      });
    }

    function add() {
      setAttributes({ steps: steps.concat([emptyStep()]) });
    }

    return el(
      Fragment,
      null,
      el(InspectorControls, null,
        el(PanelBody, { title: Drupal.t('Process steps'), initialOpen: true },
          el(Button, { variant: 'secondary', onClick: add }, Drupal.t('Add step')),
        ),
      ),
      el(BlockControls, null,
        el(ToolbarGroup, null, el(ToolbarButton, { icon: 'plus-alt', label: Drupal.t('Add step'), onClick: add })),
      ),
      el('div', blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Process Steps')),
        el(RichText, {
          tagName: 'h2',
          className: 'gb-process__heading',
          placeholder: Drupal.t('How it works'),
          value: props.attributes.heading || '',
          onChange: function (v) { setAttributes({ heading: v }); },
        }),
        el('ol', { className: 'gb-process__list' },
          steps.map(function (step, index) {
            return el('li', { className: 'gb-process__item', key: 'p-' + index },
              el('div', { className: 'gb-process__num' }, String(index + 1).padStart(2, '0')),
              el(RichText, {
                tagName: 'h3',
                className: 'gb-process__title',
                placeholder: Drupal.t('Step title'),
                value: step.title || '',
                onChange: function (v) { update(index, { title: v }); },
              }),
              el(RichText, {
                tagName: 'p',
                className: 'gb-process__text',
                placeholder: Drupal.t('Short description'),
                value: step.text || '',
                onChange: function (v) { update(index, { text: v }); },
              }),
              el(Button, {
                isSmall: true,
                isDestructive: true,
                onClick: function () {
                  setAttributes({ steps: steps.filter(function (_s, i) { return i !== index; }) });
                },
              }, Drupal.t('Remove')),
            );
          }),
        ),
        el(Button, { variant: 'primary', onClick: add }, Drupal.t('Add step')),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const steps = a.steps || [];
    const blockProps = useBlockProps.save({ className: 'gb-process' });
    return el('div', blockProps,
      a.heading ? el(RichText.Content, { tagName: 'h2', className: 'gb-process__heading', value: a.heading }) : null,
      el('ol', { className: 'gb-process__list' },
        steps.map(function (step, index) {
          return el('li', { className: 'gb-process__item', key: 'ps-' + index },
            el('div', { className: 'gb-process__num' }, String(index + 1).padStart(2, '0')),
            step.title ? el(RichText.Content, { tagName: 'h3', className: 'gb-process__title', value: step.title }) : null,
            step.text ? el(RichText.Content, { tagName: 'p', className: 'gb-process__text', value: step.text }) : null,
          );
        }),
      ),
    );
  }

  registerBlockType('modern-blocks/process', {
    apiVersion: 2,
    title: Drupal.t('Process Steps'),
    description: Drupal.t('Numbered journey / how-it-works timeline.'),
    category: 'design',
    icon: 'editor-ol',
    keywords: ['process', 'steps', 'timeline'],
    supports: { align: ['wide'], anchor: true, html: false },
    attributes: {
      heading: { type: 'string', default: '' },
      steps: {
        type: 'array',
        default: [
          { title: 'Discover', text: '' },
          { title: 'Design', text: '' },
          { title: 'Deliver', text: '' },
        ],
      },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
