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
      window.hkcecEditor && window.hkcecEditor.helpBox
        ? window.hkcecEditor.helpBox(Drupal.t('Department heading'), [
          Drupal.t('Click the big title and type the department name (for example Human Resources).'),
          Drupal.t('Click the line underneath and type one short sentence about this page.'),
        ])
        : null,
      el(RichText, {
        tagName: 'h1',
        className: 'gb-page-intro__title',
        placeholder: Drupal.t('Type the department name here'),
        value: a.title || '',
        onChange: function (v) {
          setAttributes({ title: v });
        },
      }),
      el(RichText, {
        tagName: 'p',
        className: 'gb-page-intro__subtitle',
        placeholder: Drupal.t('Type one short sentence here'),
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
