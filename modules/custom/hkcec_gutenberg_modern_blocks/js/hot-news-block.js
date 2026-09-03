/**
 * @file
 * Hot News image-card row (Figma landing page).
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, MediaPlaceholder, RichText, BlockControls } = wp.blockEditor;
  const { PanelBody, TextControl, Button, ToolbarGroup, ToolbarButton } = wp.components;

  function emptyItem() {
    return { imageUrl: '', imageUuid: '', imageAlt: '', title: '', url: '' };
  }

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const items = a.items && a.items.length ? a.items : [emptyItem(), emptyItem(), emptyItem()];
    const blockProps = useBlockProps({ className: 'gb-hot-news gb-hot-news--editor' });

    function updateItem(index, patch) {
      const next = items.map(function (item, i) {
        return i === index ? Object.assign({}, item, patch) : item;
      });
      setAttributes({ items: next });
    }

    return el(
      Fragment,
      null,
      el(
        InspectorControls,
        null,
        el(PanelBody, { title: Drupal.t('Hot News'), initialOpen: true },
          el('p', { className: 'gb-modern__hint' }, Drupal.t('Add image cards for featured intranet news.')),
        ),
      ),
      el(
        'section',
        blockProps,
        el('p', { className: 'gb-section-title' }, Drupal.t('Hot News')),
        window.hkcecEditor && window.hkcecEditor.helpBox
          ? window.hkcecEditor.helpBox(Drupal.t('News photos'), [
            Drupal.t('Click to add a photo, then type a short headline.'),
            Drupal.t('If the news should open a page, paste that link. If not, leave it empty.'),
          ])
          : null,
        el(RichText, {
          tagName: 'h2',
          className: 'gb-hot-news__heading',
          placeholder: Drupal.t('Type a heading, for example Hot News'),
          value: a.heading || '',
          onChange: function (v) {
            setAttributes({ heading: v });
          },
        }),
        el(
          'div',
          { className: 'gb-hot-news__grid' },
          items.map(function (item, i) {
            return el(
              'div',
              { className: 'gb-hot-news__card gb-hot-news__card--editor', key: 'hn-' + i },
              el('div', { className: 'gb-modern__row-tools' },
                el('strong', null, Drupal.t('News @n', { '@n': i + 1 })),
                el(Button, {
                  isDestructive: true,
                  isSmall: true,
                  onClick: function () {
                    setAttributes({
                      items: items.filter(function (_x, idx) {
                        return idx !== i;
                      }),
                    });
                  },
                }, Drupal.t('Delete this news')),
              ),
              !item.imageUrl
                ? el('div', { className: 'gb-simple-upload' }, el(MediaPlaceholder, {
                    onSelect: function (media) {
                      updateItem(i, {
                        imageUrl: media.url || '',
                        imageUuid: (media.data && media.data.entity_uuid) || String(media.id || ''),
                        imageAlt: media.alt || '',
                      });
                    },
                    allowedTypes: ['image'],
                    multiple: false,
                    labels: { title: Drupal.t('Click to add a photo') },
                  }, Drupal.t('Choose a photo from your computer.')))
                : el(
                    Fragment,
                    null,
                    el('img', {
                      src: item.imageUrl,
                      alt: item.imageAlt || '',
                      'data-entity-type': 'file',
                      'data-entity-uuid': item.imageUuid || '',
                    }),
                    el(Button, {
                      isSmall: true,
                      onClick: function () {
                        updateItem(i, { imageUrl: '', imageUuid: '', imageAlt: '' });
                      },
                    }, Drupal.t('Clear image')),
                  ),
              el(TextControl, {
                label: Drupal.t('Headline'),
                value: item.title || '',
                onChange: function (v) {
                  updateItem(i, { title: v });
                },
                placeholder: Drupal.t('Short news title'),
              }),
              el(TextControl, {
                label: Drupal.t('When clicked, go to (optional)'),
                value: item.url || '',
                onChange: function (v) {
                  updateItem(i, { url: v });
                },
                placeholder: Drupal.t('Paste a link, or leave empty'),
              }),
            );
          }),
        ),
        el(Button, {
          isPrimary: true,
          onClick: function () {
            setAttributes({ items: items.concat([emptyItem()]) });
          },
          }, Drupal.t('Add another news photo')),
      ),
    );
  }

  function Save(props) {
    const a = props.attributes;
    const items = a.items || [];
    const blockProps = useBlockProps.save({ className: 'gb-hot-news' });

    return el(
      'section',
      blockProps,
      a.heading
        ? el(RichText.Content, { tagName: 'h2', className: 'gb-hot-news__heading', value: a.heading })
        : null,
      el(
        'div',
        { className: 'gb-hot-news__grid' },
        items
          .filter(function (item) {
            return item && item.imageUrl;
          })
          .map(function (item, i) {
            const img = el('img', {
              src: item.imageUrl,
              alt: item.imageAlt || item.title || '',
              'data-entity-type': 'file',
              'data-entity-uuid': item.imageUuid || '',
              loading: 'lazy',
            });
            const body = el(
              Fragment,
              null,
              img,
              item.title ? el('h3', { className: 'gb-hot-news__title' }, item.title) : null,
            );
            return el(
              'article',
              { className: 'gb-hot-news__card', key: 'hn-' + i },
              item.url ? el('a', { className: 'gb-hot-news__link', href: item.url }, body) : body,
            );
          }),
      ),
    );
  }

  registerBlockType('hkcec/hot-news', {
    apiVersion: 2,
    title: Drupal.t('Hot News'),
    description: Drupal.t('Featured news image cards for the intranet landing page.'),
    category: 'design',
    icon: 'admin-site-alt3',
    keywords: ['news', 'intranet', 'hot', 'cards'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: {
      heading: { type: 'string', default: 'Hot News' },
      items: { type: 'array', default: [] },
    },
    getEditWrapperProps: function () {
      return { 'data-align': 'full' };
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
