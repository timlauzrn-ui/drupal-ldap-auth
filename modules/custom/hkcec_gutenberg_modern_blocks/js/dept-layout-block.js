/**
 * @file
 * Department content layout: Quick Nav sidebar + service cards (Figma HR).
 * Single block avoids nested columns (safer on Drupal Gutenberg 3.0.6).
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls, RichText, MediaPlaceholder } = wp.blockEditor;
  const { PanelBody, TextControl, Button, SelectControl } = wp.components;

  function emptyLink() {
    return { label: '', url: '' };
  }

  function emptyCard() {
    return window.hkcecEditor && window.hkcecEditor.emptyCard
      ? window.hkcecEditor.emptyCard(false)
      : { title: '', links: [emptyLink(), emptyLink(), emptyLink(), emptyLink()] };
  }

  function emptyRow(columns) {
    return { columns: columns || '2', cards: [emptyCard()] };
  }

  function flattenRowCards(rows) {
    const out = [];
    (rows || []).forEach(function (row) {
      (row.cards || []).forEach(function (card) {
        out.push(card);
      });
    });
    return out;
  }

  function usesCardRows(a) {
    return !!(a && a.cardRows && a.cardRows.length);
  }

  function getWorkingRows(a) {
    if (usesCardRows(a)) {
      return a.cardRows.map(function (row) {
        return {
          columns: String((row && row.columns) || '2'),
          cards: row && row.cards && row.cards.length ? row.cards : [emptyCard()],
        };
      });
    }
    return [{
      columns: a.cardColumns || '2',
      cards: a.cards && a.cards.length ? a.cards : [emptyCard()],
    }];
  }

  var COLUMN_OPTIONS = [
    { label: Drupal.t('1 column'), value: '1' },
    { label: Drupal.t('2 columns'), value: '2' },
    { label: Drupal.t('3 columns'), value: '3' },
  ];


  function emptyNavImage() {
    return { imageUrl: '', imageUuid: '', imageAlt: '', url: '' };
  }

  function mediaFromSelect(media) {
    return {
      imageUrl: media.url || '',
      imageUuid: (media.data && media.data.entity_uuid) || String(media.id || ''),
      imageAlt: media.alt || '',
    };
  }

  function Edit(props) {
    const a = props.attributes;
    const setAttributes = props.setAttributes;
    const navItems = a.navItems && a.navItems.length ? a.navItems : [emptyLink()];
    const navImages = a.navImages && a.navImages.length ? a.navImages : [];
    const rows = getWorkingRows(a);
    const blockProps = useBlockProps({ className: 'gb-dept-layout gb-dept-layout--editor' });

    function commitRows(nextRows) {
      const safe = nextRows && nextRows.length ? nextRows : [emptyRow(a.cardColumns || '2')];
      if (safe.length === 1) {
        setAttributes({
          cardRows: [],
          cardColumns: safe[0].columns || '2',
          cards: safe[0].cards || [],
        });
        return;
      }
      setAttributes({
        cardRows: safe,
        cardColumns: safe[0].columns || '2',
        cards: flattenRowCards(safe),
      });
    }

    function updateRow(ri, patch) {
      commitRows(rows.map(function (row, i) {
        return i === ri ? Object.assign({}, row, patch) : row;
      }));
    }

    function updateCard(ri, ci, patch) {
      const row = rows[ri] || emptyRow();
      updateRow(ri, {
        cards: (row.cards || []).map(function (card, i) {
          return i === ci ? Object.assign({}, card, patch) : card;
        }),
      });
    }

    function updateCardLink(ri, ci, li, patch) {
      const card = ((rows[ri] || emptyRow()).cards || [])[ci] || emptyCard();
      updateCard(ri, ci, {
        links: (card.links || []).map(function (link, i) {
          return i === li ? Object.assign({}, link, patch) : link;
        }),
      });
    }

    function updateNav(index, patch) {
      setAttributes({
        navItems: navItems.map(function (item, i) {
          return i === index ? Object.assign({}, item, patch) : item;
        }),
      });
    }

    function updateNavImage(index, patch) {
      setAttributes({
        navImages: navImages.map(function (item, i) {
          return i === index ? Object.assign({}, item, patch) : item;
        }),
      });
    }

    const iconPreview = a.navIconImageUrl
      ? el('img', {
          className: 'gb-quick-nav__icon-img',
          src: a.navIconImageUrl,
          alt: a.navIconImageAlt || '',
        })
      : el('span', { className: 'gb-quick-nav__icon', 'aria-hidden': 'true' }, a.navIcon || '📖');

    return el(
      Fragment,
      null,
      el(
        InspectorControls,
        null,
        el(
          PanelBody,
          { title: Drupal.t('Optional extra settings'), initialOpen: false },
          el('p', { className: 'gb-modern__hint' }, Drupal.t('You can usually ignore this. Use the buttons on the page to choose 1, 2, or 3 boxes in a row.')),
        ),
        el(
          PanelBody,
          { title: Drupal.t('Optional: small menu icon'), initialOpen: false },
          el('p', { className: 'gb-modern__hint' }, Drupal.t('A tiny picture or emoji next to the menu title. Leave the book if you are unsure.')),
          el(TextControl, {
            label: Drupal.t('Icon emoji or text'),
            value: a.navIcon || '',
            onChange: function (v) {
              setAttributes({ navIcon: v });
            },
          }),
        ),
      ),
      el(
        'div',
        blockProps,
        el('p', { className: 'gb-section-title' }, Drupal.t('Department page layout')),
        window.hkcecEditor && window.hkcecEditor.helpBox
          ? window.hkcecEditor.helpBox(Drupal.t('Left menu + right boxes'), [
            Drupal.t('Left: menu like Excel — Name people see | Where it goes.'),
            Drupal.t('Right: each box is a topic. Click a title on the live page to open or close the box.'),
            Drupal.t('Need groups inside a box? Click “Add a group heading”.'),
            Drupal.t('Need a second page (for example Applications → Hardware and Software)? Use “Add a box on the topic page”. The grey menu gets a shortcut automatically.'),
            Drupal.t('Extra menu lines on the left are optional. Shortcuts from box headings are added when the page is viewed.'),
          ])
          : null,
        el(
          'div',
          { className: 'gb-dept-layout__editor-grid' },
          el(
            'div',
            { className: 'gb-dept-layout__editor-nav' },
            el('h3', { className: 'gb-quick-nav__images-heading' }, Drupal.t('Picture at the top of the menu (optional)')),
            navImages.map(function (item, i) {
              return el(
                'div',
                { key: 'img-' + i, className: 'gb-quick-nav__image-editor' },
                el('div', { className: 'gb-modern__row-tools' },
                  el('strong', null, Drupal.t('Picture @n', { '@n': i + 1 })),
                  el(Button, {
                    isSmall: true,
                    isDestructive: true,
                    onClick: function () {
                      setAttributes({
                        navImages: navImages.filter(function (_x, idx) {
                          return idx !== i;
                        }),
                      });
                    },
                  }, Drupal.t('Delete picture')),
                ),
                item.imageUrl
                  ? el('img', {
                      className: 'gb-quick-nav__image-preview',
                      src: item.imageUrl,
                      alt: item.imageAlt || '',
                    })
                  : null,
                el('div', { className: 'gb-simple-upload' }, el(MediaPlaceholder, {
                  onSelect: function (media) {
                    updateNavImage(i, mediaFromSelect(media));
                  },
                  allowedTypes: ['image'],
                  multiple: false,
                  labels: { title: Drupal.t('Click to add a photo') },
                }, Drupal.t('Choose a photo from your computer.'))),
                el(TextControl, {
                  label: Drupal.t('Or paste a picture address'),
                  value: item.imageUrl || '',
                  onChange: function (v) {
                    updateNavImage(i, { imageUrl: v, imageUuid: '' });
                  },
                  placeholder: Drupal.t('https://… or /path/to/photo.jpg'),
                }),
                el(TextControl, {
                  label: Drupal.t('When clicked, go to (optional)'),
                  value: item.url || '',
                  onChange: function (v) {
                    updateNavImage(i, { url: v });
                  },
                  placeholder: Drupal.t('Paste a link, or leave empty'),
                }),
              );
            }),
            el(Button, {
              isSecondary: true,
              onClick: function () {
                setAttributes({ navImages: navImages.concat([emptyNavImage()]) });
              },
            }, Drupal.t('Add a picture')),
            el(
              'div',
              { className: 'gb-quick-nav__head gb-quick-nav__head--editor' },
              iconPreview,
              el(RichText, {
                tagName: 'h2',
                className: 'gb-quick-nav__title',
                placeholder: Drupal.t('Menu title, for example Quick Navigation'),
                value: a.navTitle || '',
                onChange: function (v) {
                  setAttributes({ navTitle: v });
                },
              }),
            ),
            el(TextControl, {
              label: Drupal.t('Tiny icon next to the title (optional)'),
              value: a.navIcon || '',
              onChange: function (v) {
                setAttributes({ navIcon: v });
              },
              placeholder: Drupal.t('📖'),
            }),
            el('p', { className: 'gb-help__mini' }, Drupal.t('Optional extra menu lines (other websites, or pages that are not a box). Box headings become shortcuts automatically.')),
            window.hkcecEditor && window.hkcecEditor.excelHead ? window.hkcecEditor.excelHead() : null,
            navItems.map(function (item, i) {
              return el(
                'div',
                { key: 'n-' + i, className: 'gb-excel__row' },
                el(TextControl, {
                  label: Drupal.t('Name people see'),
                  value: item.label || '',
                  onChange: function (v) {
                    updateNav(i, { label: v });
                  },
                  placeholder: Drupal.t('Employee Services'),
                }),
                el(TextControl, {
                  label: Drupal.t('Where it goes'),
                  value: item.url || '',
                  onChange: function (v) {
                    updateNav(i, { url: v });
                  },
                  placeholder: Drupal.t('Paste a link, or #'),
                }),
                el(Button, {
                  isSmall: true,
                  isDestructive: true,
                  onClick: function () {
                    setAttributes({
                      navItems: navItems.filter(function (_x, idx) {
                        return idx !== i;
                      }),
                    });
                  },
                }, Drupal.t('Delete')),
              );
            }),
            el(Button, {
              isSecondary: true,
              onClick: function () {
                setAttributes({ navItems: navItems.concat([emptyLink()]) });
              },
            }, Drupal.t('Add another menu line')),
          ),
          el(
            'div',
            { className: 'gb-dept-layout__editor-cards' },
            rows.map(function (row, ri) {
              return el(
                'div',
                { key: 'row-' + ri, className: 'gb-dept-layout__editor-row' },
                el(
                  'div',
                  { className: 'gb-dept-layout__editor-row-head' },
                  el('strong', null, Drupal.t('Row of boxes @n', { '@n': ri + 1 })),
                  rows.length > 1
                    ? el(Button, {
                        isSmall: true,
                        isDestructive: true,
                        onClick: function () {
                          commitRows(rows.filter(function (_x, idx) {
                            return idx !== ri;
                          }));
                        },
                      }, Drupal.t('Delete this row'))
                    : null,
                ),
                el('p', { className: 'gb-help__mini' }, Drupal.t('How many boxes in this row?')),
                el(
                  'div',
                  { className: 'gb-layout-picks' },
                  el(Button, {
                    isPrimary: (row.columns || '2') === '1',
                    isSecondary: (row.columns || '2') !== '1',
                    onClick: function () { updateRow(ri, { columns: '1' }); },
                  }, Drupal.t('1 wide box')),
                  el(Button, {
                    isPrimary: (row.columns || '2') === '2',
                    isSecondary: (row.columns || '2') !== '2',
                    onClick: function () { updateRow(ri, { columns: '2' }); },
                  }, Drupal.t('2 boxes')),
                  el(Button, {
                    isPrimary: (row.columns || '2') === '3',
                    isSecondary: (row.columns || '2') !== '3',
                    onClick: function () { updateRow(ri, { columns: '3' }); },
                  }, Drupal.t('3 boxes')),
                ),
                (row.cards || []).map(function (card, ci) {
                  if (window.hkcecEditor && window.hkcecEditor.cardEditor) {
                    return window.hkcecEditor.cardEditor(card, {
                      key: 'c-' + ri + '-' + ci,
                      showIcon: false,
                      indexLabel: Drupal.t('Box @n', { '@n': ci + 1 }),
                      titlePlaceholder: Drupal.t('For example: Employee Services'),
                      onChange: function (next) {
                        updateCard(ri, ci, next);
                      },
                      onRemove: function () {
                        var nextCards = (row.cards || []).filter(function (_x, idx) {
                          return idx !== ci;
                        });
                        updateRow(ri, { cards: nextCards.length ? nextCards : [emptyCard()] });
                      },
                    });
                  }
                  return el('div', { key: 'c-' + ri + '-' + ci }, card.title || '');
                }),
                el(Button, {
                  isSecondary: true,
                  onClick: function () {
                    updateRow(ri, { cards: (row.cards || []).concat([emptyCard()]) });
                  },
                }, Drupal.t('Add another box')),
              );
            }),
            el(Button, {
              isPrimary: true,
              onClick: function () {
                commitRows(rows.concat([emptyRow(a.cardColumns || '2')]));
              },
            }, Drupal.t('Add another row of boxes')),
          ),
        ),
      ),
    );
  }

  function saveLegacy(props) {
    const a = props.attributes;
    const navItems = a.navItems || [];
    const cards = a.cards || [];
    const navImages = a.navImages || [];
    const cols = a.cardColumns || '2';
    const blockProps = useBlockProps.save({
      className: 'gb-dept-layout card-cols-' + cols,
    });

    const iconEl = a.navIconImageUrl
      ? el('img', {
          className: 'gb-quick-nav__icon-img',
          src: a.navIconImageUrl,
          alt: a.navIconImageAlt || '',
          'data-entity-type': 'file',
          'data-entity-uuid': a.navIconImageUuid || '',
        })
      : (a.navIcon ? el('span', { className: 'gb-quick-nav__icon', 'aria-hidden': 'true' }, a.navIcon) : null);

    const imageEls = navImages
      .filter(function (item) {
        return item && item.imageUrl;
      })
      .map(function (item, i) {
        const imgAttrs = {
          src: item.imageUrl,
          alt: item.imageAlt || '',
          loading: 'lazy',
        };
        if (item.imageUuid) {
          imgAttrs['data-entity-type'] = 'file';
          imgAttrs['data-entity-uuid'] = item.imageUuid;
        }
        const img = el('img', imgAttrs);
        return el(
          'figure',
          { className: 'gb-quick-nav__figure', key: 'si-' + i },
          item.url ? el('a', { href: item.url }, img) : img,
        );
      });

    const cardsEl = usesCardRows(a)
      ? el(
          'div',
          { className: 'gb-dept-layout__cards' },
          a.cardRows.map(function (row, ri) {
            const rowCols = String((row && row.columns) || '2');
            const rowCards = (row && row.cards) || [];
            return el(
              'div',
              { className: 'gb-resource-grid cols-' + rowCols + ' links-arrow', key: 'rg-' + ri },
              el(
                'div',
                { className: 'gb-resource-grid__inner' },
                rowCards.map(function (card, ci) {
                  if (!card || !card.title) {
                    return null;
                  }
                  return el(
                    'article',
                    { className: 'gb-resource-card', key: 'c-' + ri + '-' + ci },
                    el('h3', { className: 'gb-resource-card__title' }, card.title),
                    el(
                      'ul',
                      { className: 'gb-resource-card__links' },
                      (card.links || [])
                        .filter(function (link) {
                          return link && link.label;
                        })
                        .map(function (link, li) {
                          return el(
                            'li',
                            { key: 'l-' + ri + '-' + ci + '-' + li },
                            el('span', { className: 'gb-resource-card__marker', 'aria-hidden': 'true' }, '→'),
                            link.url ? el('a', { href: link.url }, link.label) : el('span', null, link.label),
                          );
                        }),
                    ),
                  );
                }),
              ),
            );
          }),
        )
      : el(
          'div',
          { className: 'gb-resource-grid cols-' + cols + ' links-arrow' },
          el(
            'div',
            { className: 'gb-resource-grid__inner' },
            cards.map(function (card, ci) {
              if (!card || !card.title) {
                return null;
              }
              return el(
                'article',
                { className: 'gb-resource-card', key: 'c-' + ci },
                el('h3', { className: 'gb-resource-card__title' }, card.title),
                el(
                  'ul',
                  { className: 'gb-resource-card__links' },
                  (card.links || [])
                    .filter(function (link) {
                      return link && link.label;
                    })
                    .map(function (link, li) {
                      return el(
                        'li',
                        { key: 'l-' + ci + '-' + li },
                        el('span', { className: 'gb-resource-card__marker', 'aria-hidden': 'true' }, '→'),
                        link.url ? el('a', { href: link.url }, link.label) : el('span', null, link.label),
                      );
                    }),
                ),
              );
            }),
          ),
        );

    return el(
      'div',
      blockProps,
      el(
        'aside',
        { className: 'gb-quick-nav' },
        imageEls.length
          ? el('div', { className: 'gb-quick-nav__images' }, imageEls)
          : null,
        el(
          'div',
          { className: 'gb-quick-nav__head' },
          iconEl,
          a.navTitle
            ? el(RichText.Content, { tagName: 'h2', className: 'gb-quick-nav__title', value: a.navTitle })
            : null,
        ),
        el(
          'ul',
          { className: 'gb-quick-nav__list' },
          navItems
            .filter(function (item) {
              return item && item.label;
            })
            .map(function (item, i) {
              return el(
                'li',
                { key: 'n-' + i },
                item.url ? el('a', { href: item.url }, item.label) : el('span', null, item.label),
              );
            }),
        ),
      ),
      cardsEl,
    );
  }

  function allLayoutCards(a) {
    if (usesCardRows(a)) {
      const out = [];
      (a.cardRows || []).forEach(function (row) {
        (row.cards || []).forEach(function (card) {
          out.push(card);
        });
      });
      return out;
    }
    return a.cards || [];
  }

  function Save(props) {
    const a = props.attributes;
    const helper = window.hkcecEditor || {};
    const navItems = a.navItems || [];
    const navImages = a.navImages || [];
    const cols = a.cardColumns || '2';
    const blockProps = useBlockProps.save({
      className: 'gb-dept-layout card-cols-' + cols,
    });
    const marker = '→';

    const iconEl = a.navIconImageUrl
      ? el('img', {
          className: 'gb-quick-nav__icon-img',
          src: a.navIconImageUrl,
          alt: a.navIconImageAlt || '',
          'data-entity-type': 'file',
          'data-entity-uuid': a.navIconImageUuid || '',
        })
      : (a.navIcon ? el('span', { className: 'gb-quick-nav__icon', 'aria-hidden': 'true' }, a.navIcon) : null);

    const imageEls = navImages
      .filter(function (item) {
        return item && item.imageUrl;
      })
      .map(function (item, i) {
        const imgAttrs = {
          src: item.imageUrl,
          alt: item.imageAlt || '',
          loading: 'lazy',
        };
        if (item.imageUuid) {
          imgAttrs['data-entity-type'] = 'file';
          imgAttrs['data-entity-uuid'] = item.imageUuid;
        }
        const img = el('img', imgAttrs);
        return el(
          'figure',
          { className: 'gb-quick-nav__figure', key: 'si-' + i },
          item.url ? el('a', { href: item.url }, img) : img,
        );
      });

    function renderCard(card, key) {
      return helper.saveOneCard ? helper.saveOneCard(card, key, marker, true) : null;
    }

    const cardsEl = usesCardRows(a)
      ? el(
          'div',
          { className: 'gb-dept-layout__cards' },
          a.cardRows.map(function (row, ri) {
            const rowCols = String((row && row.columns) || '2');
            const rowCards = (row && row.cards) || [];
            return el(
              'div',
              { className: 'gb-resource-grid cols-' + rowCols + ' links-arrow', key: 'rg-' + ri },
              el(
                'div',
                { className: 'gb-resource-grid__inner' },
                rowCards.map(function (card, ci) {
                  return renderCard(card, 'c-' + ri + '-' + ci);
                }),
              ),
            );
          }),
        )
      : el(
          'div',
          { className: 'gb-resource-grid cols-' + cols + ' links-arrow' },
          el(
            'div',
            { className: 'gb-resource-grid__inner' },
            (a.cards || []).map(function (card, ci) {
              return renderCard(card, 'c-' + ci);
            }),
          ),
        );

    const autoTitles = {};
    allLayoutCards(a).forEach(function (card) {
      if (card && card.title) {
        autoTitles[card.title] = true;
      }
    });
    const autoItems = helper.saveShortcutList ? helper.saveShortcutList(allLayoutCards(a)) : [];
    const extraItems = navItems
      .filter(function (item) {
        return item && item.label && !autoTitles[item.label];
      })
      .map(function (item, i) {
        return el(
          'li',
          { key: 'n-' + i },
          item.url ? el('a', { href: item.url }, item.label) : el('span', null, item.label),
        );
      });

    return el(
      'div',
      blockProps,
      el(
        'aside',
        { className: 'gb-quick-nav' },
        imageEls.length
          ? el('div', { className: 'gb-quick-nav__images' }, imageEls)
          : null,
        el(
          'div',
          { className: 'gb-quick-nav__head' },
          iconEl,
          a.navTitle
            ? el(RichText.Content, { tagName: 'h2', className: 'gb-quick-nav__title', value: a.navTitle })
            : null,
        ),
        el('ul', { className: 'gb-quick-nav__list' }, autoItems.concat(extraItems)),
      ),
      cardsEl,
    );
  }

  const deptAttributes = {
    navIcon: { type: 'string', default: '📖' },
    navIconImageUrl: { type: 'string', default: '' },
    navIconImageUuid: { type: 'string', default: '' },
    navIconImageAlt: { type: 'string', default: '' },
    navTitle: { type: 'string', default: 'Quick Navigation' },
    navItems: { type: 'array', default: [] },
    navImages: { type: 'array', default: [] },
    cardColumns: { type: 'string', default: '2' },
    cards: { type: 'array', default: [] },
    cardRows: { type: 'array', default: [] },
  };

  registerBlockType('hkcec/dept-layout', {
    apiVersion: 2,
    title: Drupal.t('Department layout'),
    description: Drupal.t('Quick Navigation sidebar + service cards (HR / Finance / MIS pages).'),
    category: 'design',
    icon: 'columns',
    keywords: ['department', 'hr', 'sidebar', 'intranet'],
    supports: { align: ['wide', 'full'], anchor: true, html: false },
    attributes: deptAttributes,
    edit: Edit,
    save: Save,
    deprecated: [
      {
        attributes: deptAttributes,
        supports: { align: ['wide', 'full'], anchor: true, html: false },
        save: saveLegacy,
      },
    ],
  });
})(window.wp, window.Drupal);
