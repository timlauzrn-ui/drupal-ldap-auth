/**
 * @file
 * Logo Cloud / trust bar block.
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, MediaPlaceholder, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, Button, ToolbarGroup, ToolbarButton } = wp.components;

  function emptyLogo() {
    return { imageUrl: '', imageUuid: '', imageAlt: '', label: '' };
  }

  function Edit(props) {
    const logos = props.attributes.logos || [];
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({ className: 'gb-logo-cloud gb-logo-cloud--editor' });

    function update(index, patch) {
      setAttributes({
        logos: logos.map(function (item, i) {
          return i === index ? Object.assign({}, item, patch) : item;
        }),
      });
    }

    function add() {
      setAttributes({ logos: logos.concat([emptyLogo()]) });
    }

    return el(
      Fragment,
      null,
      el(InspectorControls, null,
        el(PanelBody, { title: Drupal.t('Logo cloud'), initialOpen: true },
          el(Button, { variant: 'secondary', onClick: add }, Drupal.t('Add logo')),
        ),
      ),
      el(BlockControls, null,
        el(ToolbarGroup, null, el(ToolbarButton, { icon: 'plus-alt', label: Drupal.t('Add logo'), onClick: add })),
      ),
      el('div', blockProps,
        el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Logo Cloud')),
        el(RichText, {
          tagName: 'p',
          className: 'gb-logo-cloud__heading',
          placeholder: Drupal.t('Trusted by…'),
          value: props.attributes.heading || '',
          onChange: function (v) { setAttributes({ heading: v }); },
        }),
        el('div', { className: 'gb-logo-cloud__grid' },
          logos.map(function (logo, index) {
            return el('div', { className: 'gb-logo-cloud__item', key: 'lg-' + index },
              !logo.imageUrl
                ? el(MediaPlaceholder, {
                    onSelect: function (media) {
                      update(index, {
                        imageUrl: media.url || '',
                        imageUuid: (media.data && media.data.entity_uuid) || String(media.id || ''),
                        imageAlt: media.alt || media.title || '',
                      });
                    },
                    allowedTypes: ['image'],
                    multiple: false,
                    labels: { title: Drupal.t('Logo') },
                  })
                : el('img', {
                    src: logo.imageUrl,
                    alt: logo.imageAlt || '',
                    'data-entity-type': 'file',
                    'data-entity-uuid': logo.imageUuid || '',
                  }),
              el(Button, {
                isSmall: true,
                isDestructive: true,
                onClick: function () {
                  setAttributes({
                    logos: logos.filter(function (_l, i) { return i !== index; }),
                  });
                },
              }, Drupal.t('Remove')),
            );
          }),
        ),
        el(Button, { variant: 'primary', onClick: add }, Drupal.t('Add logo')),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const logos = a.logos || [];
    const blockProps = useBlockProps.save({ className: 'gb-logo-cloud' });
    return el('div', blockProps,
      a.heading ? el(RichText.Content, { tagName: 'p', className: 'gb-logo-cloud__heading', value: a.heading }) : null,
      el('div', { className: 'gb-logo-cloud__grid' },
        logos.map(function (logo, index) {
          return el('div', { className: 'gb-logo-cloud__item', key: 'lgs-' + index },
            logo.imageUrl
              ? el('img', {
                  src: logo.imageUrl,
                  alt: logo.imageAlt || '',
                  'data-entity-type': 'file',
                  'data-entity-uuid': logo.imageUuid || '',
                  loading: 'lazy',
                })
              : null,
          );
        }),
      ),
    );
  }

  registerBlockType('hkcec/logo-cloud', {
    apiVersion: 2,
    title: Drupal.t('Logo Cloud'),
    description: Drupal.t('Trust bar of partner / client logos under the hero.'),
    category: 'design',
    icon: 'images-alt',
    keywords: ['logos', 'partners', 'trust'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      heading: { type: 'string', default: '' },
      logos: { type: 'array', default: [] },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
