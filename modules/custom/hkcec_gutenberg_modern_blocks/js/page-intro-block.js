/**
 * @file
 * Department page intro: title + subtitle (Figma HR header).
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el } = wp.element;
  const { useBlockProps, RichText } = wp.blockEditor;

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const blockProps = useBlockProps({ className: 'gb-page-intro gb-page-intro--editor' });

    return el(
      'header',
      blockProps,
      el('div', { className: 'gb-modern__editor-label' }, Drupal.t('Page intro')),
      el(RichText, {
        tagName: 'h1',
        className: 'gb-page-intro__title',
        placeholder: Drupal.t('Department title'),
        value: a.title || '',
        onChange: function (v) {
          setAttributes({ title: v });
        },
      }),
      el(RichText, {
        tagName: 'p',
        className: 'gb-page-intro__subtitle',
        placeholder: Drupal.t('Short supporting sentence'),
        value: a.subtitle || '',
        onChange: function (v) {
          setAttributes({ subtitle: v });
        },
      }),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const blockProps = useBlockProps.save({ className: 'gb-page-intro' });
    return el(
      'header',
      blockProps,
      a.title
        ? el(RichText.Content, { tagName: 'h1', className: 'gb-page-intro__title', value: a.title })
        : null,
      a.subtitle
        ? el(RichText.Content, { tagName: 'p', className: 'gb-page-intro__subtitle', value: a.subtitle })
        : null,
    );
  }

  registerBlockType('hkcec/page-intro', {
    apiVersion: 2,
    title: Drupal.t('Page intro'),
    description: Drupal.t('Department title and subtitle under the intranet nav.'),
    category: 'design',
    icon: 'heading',
    keywords: ['intro', 'title', 'department', 'hr'],
    supports: { anchor: true, html: false },
    attributes: {
      title: { type: 'string', default: '' },
      subtitle: { type: 'string', default: '' },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
