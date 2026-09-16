/**
 * Shared card model for landing resource boxes and department boxes:
 * groups (sub-headings), collapsible titles, and optional topic-page boxes.
 */
(function (wp, Drupal) {
  'use strict';

  const { createElement: el } = wp.element;
  const { TextControl, Button } = wp.components;
  const E = window.hkcecEditor || {};

  function emptyLink() {
    return { label: '', url: '' };
  }

  function emptyGroup() {
    return { heading: '', links: [emptyLink(), emptyLink()] };
  }

  function slugify(text) {
    const slug = String(text || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return slug || 'topic';
  }

  function groupsOf(card) {
    if (card && card.groups && card.groups.length) {
      return card.groups;
    }
    return [{ heading: '', links: (card && card.links) || [] }];
  }

  function flattenLinks(groups) {
    const out = [];
    (groups || []).forEach(function (group) {
      (group.links || []).forEach(function (link) {
        out.push(link);
      });
    });
    return out.length ? out : [emptyLink()];
  }

  function withGroups(card, groups) {
    return Object.assign({}, card, {
      groups: groups,
      links: flattenLinks(groups),
    });
  }

  function emptyCard(withIcon) {
    return {
      icon: withIcon ? '📄' : '',
      title: '',
      links: [emptyLink(), emptyLink(), emptyLink(), emptyLink()],
      groups: [],
      childCards: [],
      startClosed: false,
    };
  }

  function uniqueCards(cards) {
    return (cards || []).filter(function (card) {
      return card && card.title;
    });
  }

  function saveLinks(links, marker, keyPrefix) {
    const items = (links || []).filter(function (link) {
      return link && link.label;
    });
    if (!items.length) {
      return null;
    }
    return el(
      'ul',
      { className: 'gb-resource-card__links' },
      items.map(function (link, li) {
        const content = link.url
          ? el('a', { href: link.url }, link.label)
          : el('span', null, link.label);
        return el(
          'li',
          { key: keyPrefix + '-' + li },
          el('span', { className: 'gb-resource-card__marker', 'aria-hidden': 'true' }, marker),
          content,
        );
      }),
    );
  }

  function saveCardBody(card, marker, keyPrefix) {
    const groups = groupsOf(card);
    const named = groups.some(function (group) {
      return group && group.heading;
    });
    if (!named && groups.length <= 1) {
      return saveLinks(groups[0] ? groups[0].links : card.links, marker, keyPrefix);
    }
    return el(
      'div',
      { className: 'gb-resource-card__groups' },
      groups.map(function (group, gi) {
        if (!group) {
          return null;
        }
        const list = saveLinks(group.links, marker, keyPrefix + '-g' + gi);
        if (!group.heading && !list) {
          return null;
        }
        return el(
          'div',
          { className: 'gb-resource-card__group', key: keyPrefix + '-grp-' + gi },
          group.heading ? el('h4', { className: 'gb-resource-card__subhead' }, group.heading) : null,
          list,
        );
      }),
    );
  }

  function saveOneCard(card, key, marker, allowChildren) {
    if (!card || !card.title) {
      return null;
    }
    const slug = slugify(card.title);
    const children = allowChildren
      ? uniqueCards(card.childCards)
      : [];
    const detailsProps = { className: 'gb-resource-card__details' };
    if (!card.startClosed) {
      detailsProps.open = true;
    }
    const details = el(
      'details',
      detailsProps,
      el(
        'summary',
        { className: 'gb-resource-card__summary' },
        card.icon
          ? el('span', { className: 'gb-resource-card__icon', 'aria-hidden': 'true' }, card.icon)
          : null,
        el('h3', { className: 'gb-resource-card__title' }, card.title),
      ),
      el('div', { className: 'gb-resource-card__body' }, saveCardBody(card, marker, key)),
    );
    const topicPage = children.length
      ? el(
          'div',
          {
            className: 'gb-topic-page',
            'data-topic-page': slug,
            hidden: true,
          },
          el('p', { className: 'gb-topic-page__back' },
            el('a', {
              className: 'gb-topic-page__back-link',
              href: './',
              'data-parent-back': '1',
            }, '← Back to department'),
          ),
          el('h2', { className: 'gb-topic-page__title' }, card.title),
          el(
            'div',
            { className: 'gb-resource-grid cols-2 links-arrow' },
            el(
              'div',
              { className: 'gb-resource-grid__inner' },
              children.map(function (child, i) {
                return saveOneCard(child, key + '-ch-' + i, marker, false);
              }),
            ),
          ),
        )
      : null;
    return el(
      'article',
      {
        className: 'gb-resource-card',
        key: key,
        'data-topic': slug,
      },
      details,
      topicPage,
    );
  }

  function saveParentBackItem() {
    // Saved into markup but hidden on the parent overview by frontend JS.
    // Shown only on child topic views (?section=…).
    return el(
      'li',
      { key: 'parent-back', className: 'gb-quick-nav__back', hidden: true },
      el(
        'a',
        {
          className: 'gb-quick-nav__back-link',
          href: './',
          'data-parent-back': '1',
        },
        '← Back to department',
      ),
    );
  }

  function saveShortcutList(cards, options) {
    const opts = options || {};
    const items = uniqueCards(cards);
    const shortcuts = items.map(function (card, i) {
      const slug = slugify(card.title);
      return el(
        'li',
        { key: 'auto-' + slug + '-' + i, className: 'gb-quick-nav__auto' },
        el('a', { href: '?section=' + slug, 'data-topic-link': slug }, card.title),
      );
    });
    // Parent-back belongs on department sidebars only. Putting it in landing
    // resource-card markup makes Gutenberg mark existing cards as invalid.
    if (opts.includeParentBack) {
      return [saveParentBackItem()].concat(shortcuts);
    }
    return shortcuts;
  }

  function cardEditor(card, opts) {
    const options = opts || {};
    const onChange = options.onChange;
    const onRemove = options.onRemove;
    const indexLabel = options.indexLabel || Drupal.t('Box');
    const nest = options.nestLevel || 0;
    const showIcon = !!options.showIcon;
    const groups = groupsOf(card);
    const safeCard = card || emptyCard(showIcon);

    function patch(partial) {
      onChange(Object.assign({}, safeCard, partial));
    }

    function setGroups(next) {
      onChange(withGroups(safeCard, next));
    }

    function updateGroup(gi, partial) {
      setGroups(groups.map(function (group, i) {
        return i === gi ? Object.assign({}, group, partial) : group;
      }));
    }

    function updateGroupLink(gi, li, partial) {
      const group = groups[gi] || emptyGroup();
      updateGroup(gi, {
        links: (group.links || []).map(function (link, i) {
          return i === li ? Object.assign({}, link, partial) : link;
        }),
      });
    }

    const groupBlocks = groups.map(function (group, gi) {
      return el(
        'div',
        { className: 'gb-card-group', key: 'grp-' + gi },
        groups.length > 1 || (group && group.heading)
          ? el(TextControl, {
              label: Drupal.t('Group heading (optional)'),
              value: (group && group.heading) || '',
              onChange: function (v) {
                updateGroup(gi, { heading: v });
              },
              placeholder: Drupal.t('For example: Hardware'),
            })
          : el('p', { className: 'gb-help__mini' }, Drupal.t('Links in this box. Add a group heading if you want sections inside the box.')),
        E.excelHead ? E.excelHead() : null,
        ((group && group.links) || []).map(function (link, li) {
          return el(
            'div',
            { className: 'gb-excel__row', key: 'gl-' + gi + '-' + li },
            el(TextControl, {
              label: Drupal.t('Name people see'),
              value: link.label || '',
              onChange: function (v) {
                updateGroupLink(gi, li, { label: v });
              },
              placeholder: Drupal.t('Payroll Information'),
            }),
            el(TextControl, {
              label: Drupal.t('Where it goes'),
              value: link.url || '',
              onChange: function (v) {
                updateGroupLink(gi, li, { url: v });
              },
              placeholder: Drupal.t('Paste a link, or #'),
            }),
            el(Button, {
              isSmall: true,
              isDestructive: true,
              onClick: function () {
                const groupLinks = (groups[gi].links || []).filter(function (_x, idx) {
                  return idx !== li;
                });
                updateGroup(gi, { links: groupLinks.length ? groupLinks : [emptyLink()] });
              },
            }, Drupal.t('Delete')),
          );
        }),
        el(Button, {
          isSmall: true,
          isSecondary: true,
          onClick: function () {
            updateGroup(gi, { links: (group.links || []).concat([emptyLink()]) });
          },
        }, Drupal.t('Add another line')),
        groups.length > 1
          ? el(Button, {
              isSmall: true,
              isDestructive: true,
              onClick: function () {
                const next = groups.filter(function (_x, idx) {
                  return idx !== gi;
                });
                setGroups(next.length ? next : [emptyGroup()]);
              },
            }, Drupal.t('Delete this group'))
          : null,
      );
    });

    const childEditors = nest === 0
      ? el(
          'div',
          { className: 'gb-card-subpage' },
          el('p', { className: 'gb-help__mini' }, Drupal.t('Optional: give this topic its own page. Add boxes that belong only to this topic (for example Hardware and Software). The menu will get a shortcut.')),
          (safeCard.childCards || []).map(function (child, chi) {
            return cardEditor(child, {
              nestLevel: 1,
              showIcon: showIcon,
              indexLabel: Drupal.t('Topic box'),
              onChange: function (nextChild) {
                const nextKids = (safeCard.childCards || []).map(function (item, i) {
                  return i === chi ? nextChild : item;
                });
                patch({ childCards: nextKids });
              },
              onRemove: function () {
                patch({
                  childCards: (safeCard.childCards || []).filter(function (_x, i) {
                    return i !== chi;
                  }),
                });
              },
            });
          }),
          el(Button, {
            isSecondary: true,
            onClick: function () {
              patch({
                childCards: (safeCard.childCards || []).concat([emptyCard(showIcon)]),
              });
            },
          }, Drupal.t('Add a box on the topic page')),
        )
      : null;

    return el(
      'div',
      { className: 'gb-resource-card gb-resource-card--editor', key: options.key },
      el(
        'div',
        { className: 'gb-modern__row-tools' },
        el('strong', null, indexLabel),
        onRemove
          ? el(Button, { isSmall: true, isDestructive: true, onClick: onRemove }, Drupal.t('Delete this box'))
          : null,
      ),
      el(TextControl, {
        label: Drupal.t('Box heading'),
        value: safeCard.title || '',
        onChange: function (v) {
          patch({ title: v });
        },
        placeholder: options.titlePlaceholder || Drupal.t('For example: General Information'),
      }),
      showIcon
        ? el(TextControl, {
            label: Drupal.t('Small emoji (optional)'),
            value: safeCard.icon || '',
            onChange: function (v) {
              patch({ icon: v });
            },
          })
        : null,
      el(
        'label',
        { className: 'gb-card-toggle' },
        el('input', {
          type: 'checkbox',
          checked: !!safeCard.startClosed,
          onChange: function (event) {
            patch({ startClosed: !!event.target.checked });
          },
        }),
        ' ',
        Drupal.t('Start with only the title showing (people click the title to open)'),
      ),
      groupBlocks,
      el(Button, {
        isSecondary: true,
        onClick: function () {
          setGroups(groups.concat([emptyGroup()]));
        },
      }, Drupal.t('Add a group heading')),
      childEditors,
    );
  }

  window.hkcecEditor = Object.assign(window.hkcecEditor || E, {
    emptyLink: emptyLink,
    emptyGroup: emptyGroup,
    emptyCard: emptyCard,
    slugify: slugify,
    groupsOf: groupsOf,
    uniqueCards: uniqueCards,
    saveOneCard: saveOneCard,
    saveParentBackItem: saveParentBackItem,
    saveShortcutList: saveShortcutList,
    cardEditor: cardEditor,
  });
})(window.wp, window.Drupal);
