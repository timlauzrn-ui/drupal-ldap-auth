/**
 * @file
 * Block controls that sit on the selected Gutenberg block.
 *
 * Text formatting stays on the format bar beside the selection. This file
 * adds the controls that belong to the block itself. List markers are stored
 * on the list block's type attribute and written out as list-style-type when
 * the post is saved.
 */
(function (Drupal) {
  'use strict';

  var MARKER_CSS = {
    disc: 'disc',
    circle: 'circle',
    square: 'square',
    dash: "'-  '",
    arrow: "'\u2192  '",
    check: "'\u2713  '",
    decimal: 'decimal',
    'lower-alpha': 'lower-alpha',
    'upper-alpha': 'upper-alpha',
    'lower-roman': 'lower-roman',
    'upper-roman': 'upper-roman',
  };

  function t(text) {
    if (Drupal && typeof Drupal.t === 'function') {
      return Drupal.t(text);
    }
    return text;
  }

  function markerCss(type) {
    if (!type || !Object.prototype.hasOwnProperty.call(MARKER_CSS, type)) {
      return '';
    }
    return MARKER_CSS[type];
  }

  function listElement(clientId) {
    var docs = [document];
    var frames = document.querySelectorAll('iframe');
    var i;
    for (i = 0; i < frames.length; i++) {
      try {
        if (frames[i].contentDocument) {
          docs.push(frames[i].contentDocument);
        }
      }
      catch (e) {
        // A cross-origin frame has no document we can style.
      }
    }
    for (i = 0; i < docs.length; i++) {
      var node = docs[i].querySelector('[data-block="' + clientId + '"]');
      if (!node) {
        continue;
      }
      if (node.matches && node.matches('ul, ol')) {
        return node;
      }
      if (node.querySelector) {
        var inner = node.querySelector('ul, ol');
        if (inner) {
          return inner;
        }
      }
    }
    return null;
  }

  function paintListMarker(clientId, attributes) {
    var list = listElement(clientId);
    if (!list) {
      return;
    }
    var css = markerCss(attributes && attributes.type);
    if (css) {
      list.style.listStyleType = css;
      list.style.listStylePosition = 'outside';
    }
    else if (list.style.listStyleType) {
      list.style.listStyleType = '';
      list.style.listStylePosition = '';
    }
  }

  function iconSvg(d) {
    var el = window.wp.element.createElement;
    return el(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
        'aria-hidden': 'true',
        focusable: 'false',
      },
      el('path', { d: d, fill: 'currentColor' })
    );
  }

  var TOOL_ICONS = {
    bullets: 'M7 6.5h12V8H7V6.5zM4 6.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM7 11.2h12v1.5H7v-1.5zM4 11a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM7 16h12v1.5H7V16zM4 15.7a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z',
    numbering: 'M5.5 5h1.2v3.2H8V9.4H4.8V8.2h.7V5zM4.6 12.2h2.6l-2.5 3.2v.8h3.4v-1.2H5.6l2.5-3.2v-.8H4.6v1.2zM7 17.2H5.2L7 15h1.2l-1.8 2.2H9V18.4H4.8v-1.2H7zM10 6.5h10V8H10V6.5zM10 11.2h10v1.5H10v-1.5zM10 16h10v1.5H10V16z',
    'line-spacing': 'M8 6h12v1.5H8V6zM8 11.2h12v1.5H8v-1.5zM8 16.5h12V18H8v-1.5zM5.2 4.2 3 6.8h1.4v3.2H3l2.2 2.6 2.2-2.6H6v-3.2h1.4L5.2 4.2z',
    'drop-cap': 'M4 4h7v2.2H7.8V20H5.2V6.2H4V4zm9 6h7v1.6h-2.4V20h-2.2v-8.4H13V10z',
    'image-size': 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm0 1.5v13h16v-13H4zm5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM4 16.5l4-3 2 2 3-4 7 5v1.5H4v-1.5z',
    spacer: 'M11.2 4h1.6v4.2H17L12 13 7 8.2h4.2V4zM7 15.5h10V17H7v-1.5zM7 18.5h10V20H7v-1.5z',
    columns: 'M4 5h6v14H4V5zm10 0h6v14h-6V5z',
    'details-open': 'M6.5 9.2 12 14.7l5.5-5.5 1.1 1.1L12 16.9 5.4 10.3l1.1-1.1z',
    separator: 'M4 11.2h16v1.6H4v-1.6z',
    'separator-weight': 'M4 8h16v1.2H4V8zm0 3.4h16V14H4v-2.6zm0 4.6h16v2H4v-2z',
    'button-width': 'M4 9h16v6H4V9zm1.5 1.5v3h13v-3h-13zM2 8v8h1.5V8H2zm18.5 0v8H22V8h-1.5z',
    'column-width': 'M3 6h4v12H3V6zm7 0h4v12h-4V6zm7 0h4v12h-4V6z',
    'columns-align': 'M4 4h16v3H4V4zm2 6h12v3H6v-3zm-2 7h16v3H4v-3z',
    stack: 'M6 5h12v4H6V5zm0 6h12v3H6v-3zm0 5h12v3H6v-3z',
    'table-fixed': 'M4 5h16v14H4V5zm1.5 1.5V9h5.5V6.5H5.5zm7 0V9H18.5V6.5h-6zm-7 4V17.5h5.5v-7H5.5zm7 0v7H18.5v-7h-6z',
    'media-side': 'M4 6h7v12H4V6zm9 0h7v12h-7V6z',
    'media-align': 'M4 5h16v2.5H4V5zm0 5.5h10V13H4v-2.5zM4 16h16v2.5H4V16z',
    download: 'M11.2 4h1.6v8.2H17L12 17.5 7 12.2h4.2V4zM5 19h14v1.5H5V19z',
    'cover-position': 'M12 3.5 14.2 8l4.8.4-3.7 3.1 1.1 4.7L12 13.8 7.6 16.2l1.1-4.7L5 8.4 9.8 8 12 3.5z',
    'video-autoplay': 'M8 6.5v11l9-5.5-9-5.5z',
    'video-loop': 'M12 5a7 7 0 1 0 6.3 4H16v1.5h5V5.5h-1.5V8A8.5 8.5 0 1 1 12 3.5V5z',
    'video-muted': 'M5 9h3.2L12 6.2v11.6L8.2 15H5V9zm9.2 1.2 1.6 1.6 1.6-1.6 1.1 1.1-1.6 1.6 1.6 1.6-1.1 1.1-1.6-1.6-1.6 1.6-1.1-1.1 1.6-1.6-1.6-1.6 1.1-1.1z',
    'audio-autoplay': 'M8 6.5v11l9-5.5-9-5.5z',
    'audio-loop': 'M12 5a7 7 0 1 0 6.3 4H16v1.5h5V5.5h-1.5V8A8.5 8.5 0 1 1 12 3.5V5z',
    'code-size': 'M8.5 4.5h-2L2 16h2l1-2.8h5L11 16h2L8.5 4.5zM6.2 11.2L7.5 7.2l1.3 4H6.2zM15 7h6v1.5h-2.25V16h-1.5V8.5H15V7z',
    'group-tag': 'M4 6h16v12H4V6zm1.5 1.5v9h13v-9h-13z',
    align: 'M13 5.5H4V4h9v1.5Zm7 7H4V11h16v1.5Zm-7 7H4V18h9v1.5Z',
    'align-left': 'M13 5.5H4V4h9v1.5Zm7 7H4V11h16v1.5Zm-7 7H4V18h9v1.5Z',
    'align-center': 'M7.5 5.5h9V4h-9v1.5Zm-3.5 7h16V11H4v1.5Zm3.5 7h9V18h-9v1.5Z',
    'align-right': 'M11.111 5.5H20V4h-8.889v1.5ZM4 12.5h16V11H4v1.5Zm7.111 7H20V18h-8.889v1.5Z',
  };

  function toolIcon(key) {
    return iconSvg(TOOL_ICONS[key] || TOOL_ICONS.separator);
  }

  function safe(fn) {
    return function () {
      try {
        fn();
      }
      catch (e) {
        // One control must not take down the editor.
      }
    };
  }

  function menu(key, label, choices, current, onPick) {
    var wp = window.wp;
    return wp.element.createElement(wp.components.ToolbarDropdownMenu, {
      key: key,
      className: 'hkcec-block-tool',
      label: label,
      icon: toolIcon(key),
      popoverProps: { className: 'hkcec-word-popover', placement: 'bottom-start' },
      controls: choices.map(function (choice) {
        return {
          title: choice.label,
          icon: choice.icon ? iconSvg(TOOL_ICONS[choice.icon] || choice.icon) : undefined,
          isActive: choice.value === current,
          onClick: safe(function () {
            onPick(choice.value);
          }),
        };
      }),
    });
  }

  function toggle(key, label, pressed, onClick) {
    var wp = window.wp;
    return wp.element.createElement(wp.components.ToolbarButton, {
      key: key,
      className: 'hkcec-block-tool',
      label: label,
      title: label,
      icon: toolIcon(key),
      isPressed: !!pressed,
      onClick: safe(onClick),
    });
  }

  function controls(children) {
    var wp = window.wp;
    if (!wp.blockEditor || !wp.blockEditor.BlockControls) {
      return null;
    }
    return wp.element.createElement.apply(
      null,
      [wp.blockEditor.BlockControls, { group: 'block' }].concat(children)
    );
  }

  function setStyleKey(props, group, key, value) {
    var style = Object.assign({}, (props.attributes && props.attributes.style) || {});
    var bucket = Object.assign({}, style[group] || {});
    if (value) {
      bucket[key] = value;
    }
    else {
      delete bucket[key];
    }
    if (Object.keys(bucket).length) {
      style[group] = bucket;
    }
    else {
      delete style[group];
    }
    props.setAttributes({
      style: Object.keys(style).length ? style : undefined,
    });
  }

  function styleValue(props, group, key) {
    var style = props.attributes && props.attributes.style;
    return (style && style[group] && style[group][key]) || '';
  }

  function setClassStyle(props, styleName) {
    var current = String((props.attributes && props.attributes.className) || '');
    var parts = current.split(/\s+/).filter(function (part) {
      return part && part.indexOf('is-style-') !== 0;
    });
    if (styleName) {
      parts.push('is-style-' + styleName);
    }
    props.setAttributes({
      className: parts.join(' ') || undefined,
    });
  }

  function classStyle(props) {
    var match = String((props.attributes && props.attributes.className) || '').match(/is-style-([a-z0-9-]+)/);
    return match ? match[1] : '';
  }

  function childSettings() {
    var settings = window.drupalSettings && window.drupalSettings.hkcecDepartmentChild;
    return settings && settings.createUrl ? settings : null;
  }

  function plainText(html) {
    var holder = document.createElement('div');
    holder.innerHTML = html || '';
    return (holder.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function linkHtml(url, title) {
    var holder = document.createElement('div');
    var anchor = document.createElement('a');
    anchor.setAttribute('href', url);
    anchor.textContent = title;
    holder.appendChild(anchor);
    return holder.innerHTML;
  }

  function escapeHtml(text) {
    var holder = document.createElement('div');
    holder.textContent = text || '';
    return holder.innerHTML;
  }

  function layoutKind(id) {
    var name = String(id || '');
    if (name.indexOf('_3col') !== -1) {
      return 'three';
    }
    if (name.indexOf('_2col') !== -1) {
      return 'two';
    }
    if (name.indexOf('_1col') !== -1) {
      return 'one';
    }
    return 'landing';
  }

  function headingOnlyHtml(title) {
    var safe = escapeHtml(title || '');
    return '<!-- wp:heading {"level":2} -->\n<h2 class="wp-block-heading">' + safe + '</h2>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p></p>\n<!-- /wp:paragraph -->';
  }

  function blockClassName(block) {
    return String((block && block.attributes && block.attributes.className) || '');
  }

  function firstHeadingText(block) {
    if (!block) {
      return '';
    }
    if (block.name === 'core/heading') {
      return plainText(block.attributes && block.attributes.content);
    }
    var children = block.innerBlocks || [];
    var index;
    for (index = 0; index < children.length; index += 1) {
      var found = firstHeadingText(children[index]);
      if (found) {
        return found;
      }
    }
    return '';
  }

  function findCardByTitle(blocks, title) {
    var wanted = String(title || '').toLowerCase();
    if (!wanted) {
      return null;
    }
    var index;
    for (index = 0; index < blocks.length; index += 1) {
      var block = blocks[index];
      var className = blockClassName(block);
      if (className.indexOf('hkcec-origin-card') !== -1 && firstHeadingText(block).toLowerCase() === wanted) {
        return block;
      }
      var nested = findCardByTitle(block.innerBlocks || [], title);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  function copyBlock(block) {
    var wp = window.wp;
    return wp.blocks.createBlock(
      block.name,
      Object.assign({}, block.attributes || {}),
      (block.innerBlocks || []).map(copyBlock)
    );
  }

  function columnCount(bundle) {
    var name = String(bundle || '');
    if (name.indexOf('_3col') !== -1) {
      return 3;
    }
    if (name.indexOf('_2col') !== -1) {
      return 2;
    }
    if (name.indexOf('_1col') !== -1) {
      return 1;
    }
    return 0;
  }

  function topicLayout(card, bundle) {
    var wp = window.wp;
    var count = columnCount(bundle);
    var topic = copyBlock(card);
    if (!count) {
      return [topic];
    }
    var width = count === 1 ? '100%' : (count === 2 ? '50%' : '33.33%');
    var columns = [];
    var index;
    for (index = 0; index < count; index += 1) {
      var inner = index === 0
        ? [topic]
        : [wp.blocks.createBlock('core/paragraph', { content: '' })];
      columns.push(wp.blocks.createBlock('core/column', { width: width }, inner));
    }
    return [wp.blocks.createBlock('core/columns', {
      className: 'hkcec-origin-cards-' + count,
    }, columns)];
  }

  function emptyLayout(bundle) {
    var wp = window.wp;
    var count = columnCount(bundle);
    if (!count) {
      return [wp.blocks.createBlock('core/paragraph', { content: '' })];
    }
    var width = count === 1 ? '100%' : (count === 2 ? '50%' : '33.33%');
    var columns = [];
    var index;
    for (index = 0; index < count; index += 1) {
      columns.push(wp.blocks.createBlock('core/column', { width: width }, [
        wp.blocks.createBlock('core/paragraph', { content: '' }),
      ]));
    }
    return [wp.blocks.createBlock('core/columns', {
      className: 'hkcec-origin-cards-' + count,
    }, columns)];
  }

  function shellWithMain(blocks, inner) {
    var wp = window.wp;
    var replaced = false;
    function walk(list) {
      return list.map(function (block) {
        var next = walk(block.innerBlocks || []);
        if (blockClassName(block).indexOf('hkcec-dept-main') !== -1) {
          next = inner;
          replaced = true;
        }
        return wp.blocks.createBlock(
          block.name,
          Object.assign({}, block.attributes || {}),
          next
        );
      });
    }
    var tree = walk(blocks || []);
    return replaced ? tree : null;
  }

  function sectionHtml(clientId, title, bundle) {
    var line = plainText(title);
    try {
      var wp = window.wp;
      var editor = wp.data.select('core/block-editor');
      var parents = editor.getBlockParents(clientId) || [];
      var insideNav = false;
      var insideCard = null;
      var index;
      for (index = 0; index < parents.length; index += 1) {
        var parent = editor.getBlock(parents[index]);
        var className = blockClassName(parent);
        if (className.indexOf('hkcec-dept-nav') !== -1) {
          insideNav = true;
        }
        if (className.indexOf('hkcec-origin-card') !== -1) {
          insideCard = parent;
        }
      }
      var card = null;
      if (insideNav) {
        card = findCardByTitle(editor.getBlocks(), line);
      }
      else if (insideCard && firstHeadingText(insideCard).toLowerCase() === line.toLowerCase()) {
        card = insideCard;
      }
      if (wp.blocks && typeof wp.blocks.serialize === 'function' && typeof wp.blocks.createBlock === 'function') {
        var inner = card ? topicLayout(card, bundle) : emptyLayout(bundle);
        var shell = shellWithMain(editor.getBlocks(), inner);
        var html = shell ? wp.blocks.serialize(shell) : '';
        if (html && html.indexOf('hkcec-dept-main') !== -1 && html.indexOf('<!-- wp:') !== -1) {
          return html;
        }
      }
    }
    catch (e) {
      // A page with no department shell still gets a single heading.
    }
    return headingOnlyHtml(line);
  }

  function editorNeedsSave() {
    try {
      var editor = window.wp.data.select('core/editor');
      if (editor && typeof editor.isEditedPostDirty === 'function') {
        return !!editor.isEditedPostDirty();
      }
    }
    catch (e) {
      // Treat an unreadable editor as already saved.
    }
    return false;
  }

  function notify(message, status) {
    try {
      var notices = window.wp.data.dispatch('core/notices');
      if (notices && notices.createNotice) {
        notices.createNotice(status || 'warning', message, { isDismissible: true, type: 'snackbar' });
        return;
      }
    }
    catch (e) {
      // Fall through to a page message.
    }
    if (window.Drupal && Drupal.message) {
      // Keep the editor open when notices are unavailable.
    }
  }

  function ChildPageTools(props) {
    var wp = window.wp;
    var el = wp.element.createElement;
    var openState = wp.element.useState('');
    var titleState = wp.element.useState('');
    var bundleState = wp.element.useState('');
    var busyState = wp.element.useState(false);
    var messageState = wp.element.useState('');
    var pagesState = wp.element.useState([]);
    var filterState = wp.element.useState('');
    var open = openState[0];
    var setOpen = openState[1];
    var title = titleState[0];
    var setTitle = titleState[1];
    var bundle = bundleState[0];
    var setBundle = bundleState[1];
    var busy = busyState[0];
    var setBusy = busyState[1];
    var message = messageState[0];
    var setMessage = messageState[1];
    var pages = pagesState[0];
    var setPages = pagesState[1];
    var filter = filterState[0];
    var setFilter = filterState[1];
    wp.element.useEffect(function () {
      if (open !== 'create') {
        return undefined;
      }
      var timer = window.setTimeout(function () {
        var field = document.getElementById('hkcec-child-title');
        if (field && typeof field.focus === 'function') {
          field.focus();
        }
      }, 40);
      return function () {
        window.clearTimeout(timer);
      };
    }, [open]);
    var settings = childSettings();
    if (!settings || !wp.blockEditor || !wp.blockEditor.BlockControls) {
      return null;
    }

    function post(url, payload) {
      setBusy(true);
      setMessage('');
      return fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': settings.token || '',
        },
        body: JSON.stringify(payload),
      }).then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok && data && data.ok, data: data || {} };
        });
      }).then(function (result) {
        setBusy(false);
        if (!result.ok) {
          setMessage((result.data && result.data.message) || t('The page could not be created.'));
          return null;
        }
        return result.data;
      }).catch(function () {
        setBusy(false);
        setMessage(t('The page could not be created.'));
        return null;
      });
    }

    function applyLink(data) {
      if (!data || !data.url) {
        return;
      }
      props.setAttributes({
        content: linkHtml(data.url, data.title || title || plainText(props.attributes && props.attributes.content)),
      });
      setOpen('');
      window.setTimeout(function () {
        if (editorNeedsSave()) {
          notify(t('Save this page or the link will not appear outside the editor. Leaving without saving drops this change.'), 'warning');
        }
      }, 50);
    }

    function openCreate() {
      if (!settings.parentNid) {
        notify(t('Save this department page before creating a child page.'), 'warning');
        return;
      }
      setTitle(plainText(props.attributes && props.attributes.content) || '');
      setBundle(settings.bundle || 'department_page_test');
      setMessage('');
      setOpen('create');
    }

    function openChoose() {
      if (!settings.parentNid || !settings.listUrl) {
        notify(t('Save this department page before choosing a child page.'), 'warning');
        return;
      }
      setMessage('');
      setPages([]);
      setFilter('');
      setOpen('choose');
      fetch(settings.listUrl, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      }).then(function (response) {
        return response.json();
      }).then(function (data) {
        setPages((data && data.pages) || []);
        if (!data || data.ok === false) {
          setMessage((data && data.message) || t('The child pages could not be loaded.'));
        }
      }).catch(function () {
        setMessage(t('The child pages could not be loaded.'));
      });
    }

    var bundles = settings.bundles || [];
    var modal = null;
    if (open && wp.components && wp.components.Modal) {
      var body = open === 'create'
        ? [
          el('label', { key: 'title-label', htmlFor: 'hkcec-child-title' }, t('Title')),
          el('input', {
            key: 'title',
            id: 'hkcec-child-title',
            className: 'hkcec-child-title',
            type: 'text',
            value: title,
            onChange: function (event) {
              setTitle(event.target.value);
            },
          }),
          el('p', { key: 'hint', className: 'hkcec-child-hint' }, t('This line becomes a link to the new page.')),
          el('p', { key: 'layout-label', className: 'hkcec-child-section', id: 'hkcec-child-layout-label' }, t('Layout')),
          el('div', {
            key: 'layouts',
            className: 'hkcec-child-layouts',
            role: 'group',
            'aria-labelledby': 'hkcec-child-layout-label',
          }, bundles.map(function (item) {
            var kind = layoutKind(item.id);
            var bars = kind === 'three' ? 3 : (kind === 'one' ? 1 : 2);
            var preview = [];
            var barIndex;
            for (barIndex = 0; barIndex < bars; barIndex += 1) {
              preview.push(el('span', { key: 'bar-' + barIndex }));
            }
            return el(wp.components.Button, {
              key: item.id,
              className: 'hkcec-child-layout',
              isPressed: bundle === item.id,
              'aria-pressed': bundle === item.id,
              onClick: function () {
                setBundle(item.id);
              },
            }, el('span', {
              className: 'hkcec-layout-preview hkcec-layout-preview--' + kind,
              'aria-hidden': 'true',
            }, preview), el('span', { className: 'hkcec-child-layout-name' }, item.label));
          })),
        ]
        : (function () {
          var query = filter.trim().toLowerCase();
          var shown = pages.filter(function (page) {
            return !query || String(page.title || '').toLowerCase().indexOf(query) !== -1;
          });
          return [
            el('label', { key: 'find-label', htmlFor: 'hkcec-child-find' }, t('Find a page')),
            el('input', {
              key: 'find',
              id: 'hkcec-child-find',
              className: 'hkcec-child-find',
              type: 'search',
              placeholder: t('Search pages'),
              value: filter,
              onChange: function (event) {
                setFilter(event.target.value);
              },
            }),
            message ? el('p', { key: 'message', className: 'hkcec-child-message' }, message) : null,
            shown.length
              ? el('div', { key: 'pages', className: 'hkcec-child-pages' }, shown.map(function (page) {
                var note = page.underThis
                  ? t('Already under this page')
                  : (page.hasParent ? t('Move under this page') : t('Place under this page'));
                return el(wp.components.Button, {
                  key: String(page.nid),
                  className: 'hkcec-child-page',
                  disabled: busy,
                  onClick: function () {
                    if (page.underThis || !settings.attachUrl) {
                      applyLink(page);
                      return;
                    }
                    post(settings.attachUrl, { child: page.nid }).then(function (data) {
                      applyLink(data || page);
                    });
                  },
                }, el('span', { className: 'hkcec-child-page-title' }, page.title), el('span', { className: 'hkcec-child-page-note' }, note));
              }))
              : el('p', { key: 'none', className: 'hkcec-child-empty' }, pages.length
                ? t('No page matches that name.')
                : t('No other department pages to choose yet.')),
          ];
        })();
      var footer = open === 'create'
        ? [
          message ? el('p', { key: 'message', className: 'hkcec-child-message' }, message) : null,
          el('div', { key: 'footer', className: 'hkcec-child-footer' }, [
            el(wp.components.Button, {
              key: 'cancel',
              variant: 'tertiary',
              disabled: busy,
              onClick: function () {
                if (!busy) {
                  setOpen('');
                }
              },
            }, t('Cancel')),
            el(wp.components.Button, {
              key: 'submit',
              variant: 'primary',
              disabled: busy || !String(title || '').trim(),
              onClick: function () {
                post(settings.createUrl, {
                  parent: settings.parentNid,
                  title: title,
                  bundle: bundle,
                  html: sectionHtml(props.clientId, title, bundle),
                }).then(applyLink);
              },
            }, busy ? t('Creating…') : t('Create page')),
          ]),
        ]
        : null;
      modal = el(wp.components.Modal, {
        title: open === 'create' ? t('Create page') : t('Choose existing page'),
        className: 'hkcec-child-modal' + (open === 'create' ? ' hkcec-child-modal--create' : ' hkcec-child-modal--choose'),
        onRequestClose: function () {
          if (!busy) {
            setOpen('');
          }
        },
      }, el('div', { className: 'hkcec-child-dialog' }, body.concat([footer])));
    }

    return el(wp.element.Fragment, null,
      el(wp.blockEditor.BlockControls, { group: 'block' },
        el(wp.components.ToolbarButton, {
          className: 'hkcec-block-tool hkcec-child-action',
          icon: iconSvg('M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z'),
          label: t('Create page'),
          showTooltip: true,
          onClick: openCreate,
        }),
        el(wp.components.ToolbarButton, {
          className: 'hkcec-block-tool hkcec-child-action',
          icon: iconSvg('M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'),
          label: t('Choose existing page'),
          showTooltip: true,
          onClick: openChoose,
        })
      ),
      modal
    );
  }

  function listTools(props) {
    var ordered = !!(props.attributes && props.attributes.ordered);
    var type = (props.attributes && props.attributes.type) || '';
    var bullet = !ordered ? (type || 'disc') : '';
    var number = ordered ? (type || 'decimal') : '';
    return [
      menu('bullets', t('Bullets'), [
        { label: t('Dot'), value: 'disc' },
        { label: t('Circle'), value: 'circle' },
        { label: t('Square'), value: 'square' },
        { label: t('Dash'), value: 'dash' },
        { label: t('Arrow'), value: 'arrow' },
        { label: t('Check'), value: 'check' },
      ], bullet, function (value) {
        props.setAttributes({ ordered: false, type: value });
      }),
      menu('numbering', t('Numbering'), [
        { label: t('1, 2, 3'), value: 'decimal' },
        { label: t('a, b, c'), value: 'lower-alpha' },
        { label: t('A, B, C'), value: 'upper-alpha' },
        { label: t('i, ii, iii'), value: 'lower-roman' },
        { label: t('I, II, III'), value: 'upper-roman' },
      ], number, function (value) {
        props.setAttributes({ ordered: true, type: value });
      }),
    ];
  }

  function lineSpacing(props) {
    return menu('line-spacing', t('Line spacing'), [
      { label: t('1.0'), value: '1' },
      { label: t('1.15'), value: '1.15' },
      { label: t('1.5'), value: '1.5' },
      { label: t('2.0'), value: '2' },
      { label: t('Default'), value: '' },
    ], styleValue(props, 'typography', 'lineHeight'), function (value) {
      setStyleKey(props, 'typography', 'lineHeight', value);
    });
  }

  function alignMenu(props, attribute) {
    return menu('align', t('Align'), [
      { label: t('Left'), value: 'left', icon: 'align-left' },
      { label: t('Center'), value: 'center', icon: 'align-center' },
      { label: t('Right'), value: 'right', icon: 'align-right' },
    ], (props.attributes && props.attributes[attribute]) || '', function (value) {
      var next = {};
      next[attribute] = (props.attributes && props.attributes[attribute]) === value ? undefined : value;
      props.setAttributes(next);
    });
  }

  function toolsFor(props) {
    var name = props.name;
    var attrs = props.attributes || {};
    if (name === 'core/list') {
      return listTools(props);
    }
    if (name === 'core/paragraph') {
      return [
        lineSpacing(props),
        toggle('drop-cap', t('Drop cap'), attrs.dropCap, function () {
          props.setAttributes({ dropCap: !attrs.dropCap });
        }),
      ];
    }
    if (name === 'core/heading' || name === 'core/preformatted') {
      return [lineSpacing(props)];
    }
    if (name === 'core/quote') {
      return [alignMenu(props, 'align'), lineSpacing(props)];
    }
    if (name === 'core/pullquote') {
      return [alignMenu(props, 'textAlign'), lineSpacing(props)];
    }
    if (name === 'core/image') {
      return [
        menu('image-size', t('Size'), [
          { label: t('Small'), value: '150px' },
          { label: t('Medium'), value: '300px' },
          { label: t('Large'), value: '600px' },
          { label: t('Full width'), value: '100%' },
          { label: t('Original'), value: '' },
        ], attrs.width || '', function (value) {
          props.setAttributes({ width: value || undefined });
        }),
      ];
    }
    if (name === 'core/spacer') {
      return [
        menu('spacer', t('Height'), [
          { label: t('Small'), value: '20px' },
          { label: t('Medium'), value: '40px' },
          { label: t('Large'), value: '80px' },
          { label: t('Extra large'), value: '120px' },
        ], attrs.height || '100px', function (value) {
          props.setAttributes({ height: value });
        }),
      ];
    }
    if (name === 'core/gallery') {
      return [
        menu('columns', t('Columns'), [
          { label: t('1 column'), value: 1 },
          { label: t('2 columns'), value: 2 },
          { label: t('3 columns'), value: 3 },
          { label: t('4 columns'), value: 4 },
        ], attrs.columns || '', function (value) {
          props.setAttributes({ columns: value });
        }),
      ];
    }
    if (name === 'core/details') {
      return [
        toggle('details-open', t('Open'), attrs.showContent, function () {
          props.setAttributes({ showContent: !attrs.showContent });
        }),
      ];
    }
    if (name === 'core/separator') {
      return [
        menu('separator', t('Line'), [
          { label: t('Short'), value: '' },
          { label: t('Wide'), value: 'wide' },
          { label: t('Dots'), value: 'dots' },
        ], classStyle(props), function (value) {
          setClassStyle(props, value);
        }),
        menu('separator-weight', t('Weight'), [
          { label: t('Faded'), value: 'alpha-channel' },
          { label: t('Solid'), value: 'css' },
        ], attrs.opacity || 'alpha-channel', function (value) {
          props.setAttributes({ opacity: value });
        }),
      ];
    }
    if (name === 'core/button') {
      return [
        menu('button-width', t('Width'), [
          { label: t('Auto'), value: 0 },
          { label: t('25%'), value: 25 },
          { label: t('50%'), value: 50 },
          { label: t('75%'), value: 75 },
          { label: t('100%'), value: 100 },
        ], attrs.width || 0, function (value) {
          props.setAttributes({ width: value || undefined });
        }),
      ];
    }
    if (name === 'core/column') {
      return [
        menu('column-width', t('Width'), [
          { label: t('Equal'), value: '' },
          { label: t('25%'), value: '25%' },
          { label: t('33%'), value: '33%' },
          { label: t('50%'), value: '50%' },
          { label: t('67%'), value: '67%' },
          { label: t('75%'), value: '75%' },
        ], attrs.width || '', function (value) {
          props.setAttributes({ width: value || undefined });
        }),
      ];
    }
    if (name === 'core/columns') {
      return [
        menu('columns-align', t('Align'), [
          { label: t('Top'), value: 'top' },
          { label: t('Middle'), value: 'center' },
          { label: t('Bottom'), value: 'bottom' },
        ], attrs.verticalAlignment || '', function (value) {
          props.setAttributes({
            verticalAlignment: attrs.verticalAlignment === value ? undefined : value,
          });
        }),
        toggle('stack', t('Stack on mobile'), attrs.isStackedOnMobile !== false, function () {
          props.setAttributes({ isStackedOnMobile: attrs.isStackedOnMobile === false });
        }),
      ];
    }
    if (name === 'core/table') {
      return [
        toggle('table-fixed', t('Fixed width'), attrs.hasFixedLayout, function () {
          props.setAttributes({ hasFixedLayout: !attrs.hasFixedLayout });
        }),
      ];
    }
    if (name === 'core/media-text') {
      return [
        menu('media-side', t('Media'), [
          { label: t('Left'), value: 'left' },
          { label: t('Right'), value: 'right' },
        ], attrs.mediaPosition || 'left', function (value) {
          props.setAttributes({ mediaPosition: value });
        }),
        menu('media-align', t('Align'), [
          { label: t('Top'), value: 'top' },
          { label: t('Middle'), value: 'center' },
          { label: t('Bottom'), value: 'bottom' },
        ], attrs.verticalAlignment || '', function (value) {
          props.setAttributes({
            verticalAlignment: attrs.verticalAlignment === value ? undefined : value,
          });
        }),
      ];
    }
    if (name === 'core/file') {
      return [
        toggle('download', t('Download button'), attrs.showDownloadButton !== false, function () {
          props.setAttributes({ showDownloadButton: attrs.showDownloadButton === false });
        }),
      ];
    }
    if (name === 'core/cover') {
      return [
        menu('cover-position', t('Position'), [
          { label: t('Top'), value: 'top center' },
          { label: t('Center'), value: 'center center' },
          { label: t('Bottom'), value: 'bottom center' },
          { label: t('Left'), value: 'center left' },
          { label: t('Right'), value: 'center right' },
        ], attrs.contentPosition || '', function (value) {
          props.setAttributes({ contentPosition: value });
        }),
      ];
    }
    if (name === 'core/video') {
      return [
        toggle('video-autoplay', t('Autoplay'), attrs.autoplay, function () {
          props.setAttributes({ autoplay: !attrs.autoplay });
        }),
        toggle('video-loop', t('Loop'), attrs.loop, function () {
          props.setAttributes({ loop: !attrs.loop });
        }),
        toggle('video-muted', t('Muted'), attrs.muted, function () {
          props.setAttributes({ muted: !attrs.muted });
        }),
      ];
    }
    if (name === 'core/audio') {
      return [
        toggle('audio-autoplay', t('Autoplay'), attrs.autoplay, function () {
          props.setAttributes({ autoplay: !attrs.autoplay });
        }),
        toggle('audio-loop', t('Loop'), attrs.loop, function () {
          props.setAttributes({ loop: !attrs.loop });
        }),
      ];
    }
    if (name === 'core/code') {
      return [
        menu('code-size', t('Font size'), [
          { label: t('12 px'), value: '12px' },
          { label: t('14 px'), value: '14px' },
          { label: t('16 px'), value: '16px' },
          { label: t('18 px'), value: '18px' },
          { label: t('Default'), value: '' },
        ], styleValue(props, 'typography', 'fontSize'), function (value) {
          setStyleKey(props, 'typography', 'fontSize', value);
        }),
      ];
    }
    if (name === 'core/group') {
      return [
        menu('group-tag', t('Container'), [
          { label: t('Division'), value: 'div' },
          { label: t('Section'), value: 'section' },
          { label: t('Aside'), value: 'aside' },
        ], attrs.tagName || 'div', function (value) {
          props.setAttributes({ tagName: value });
        }),
      ];
    }
    if (name === 'core/verse') {
      return [alignMenu(props, 'textAlign'), lineSpacing(props)];
    }
    return null;
  }

  function ListMarker(props) {
    window.wp.element.useEffect(function () {
      paintListMarker(props.clientId, props.attributes);
    });
    return null;
  }

  function BlockTools(props) {
    var wp = window.wp;
    var items = null;
    try {
      items = toolsFor(props);
    }
    catch (e) {
      items = null;
    }
    var childTools = null;
    if (props.name === 'core/list-item' && wp.element && wp.element.useState) {
      try {
        childTools = wp.element.createElement(ChildPageTools, props);
      }
      catch (e) {
        childTools = null;
      }
    }
    if (!items) {
      return childTools;
    }
    var extra = props.name === 'core/list'
      ? wp.element.createElement(ListMarker, props)
      : null;
    return wp.element.createElement(
      wp.element.Fragment,
      null,
      extra,
      childTools,
      controls(items)
    );
  }

  function withBlockToolbar(BlockEdit) {
    var wp = window.wp;
    function Wrapped(props) {
      return wp.element.createElement(
        wp.element.Fragment,
        null,
        wp.element.createElement(BlockTools, props),
        wp.element.createElement(BlockEdit, props)
      );
    }
    if (!wp.element.Component) {
      return Wrapped;
    }
    return class HkcecBlockToolbarBoundary extends wp.element.Component {
      constructor(nextProps) {
        super(nextProps);
        this.state = { failed: false };
      }

      componentDidCatch() {
        this.setState({ failed: true });
      }

      render() {
        if (this.state.failed) {
          return wp.element.createElement(BlockEdit, this.props);
        }
        return wp.element.createElement(Wrapped, this.props);
      }
    };
  }

  function listSaveProps(extraProps, blockType, attributes) {
    if (!blockType || blockType.name !== 'core/list') {
      return extraProps;
    }
    var css = markerCss(attributes && attributes.type);
    if (!css) {
      return extraProps;
    }
    var style = Object.assign({}, extraProps.style || {});
    style.listStyleType = css;
    style.listStylePosition = 'outside';
    return Object.assign({}, extraProps, { style: style });
  }

  function isDepartmentEditor() {
    var settings = window.drupalSettings && window.drupalSettings.hkcecDepartmentChild;
    return !!(settings && settings.createUrl);
  }

  function classTokens(className) {
    return String(className || '').split(/\s+/);
  }

  function blockHasClass(block, token) {
    if (!block || !block.attributes) {
      return false;
    }
    return classTokens(block.attributes.className).indexOf(token) !== -1;
  }

  function guidanceNotice(message) {
    try {
      var notices = window.wp.data.dispatch('core/notices');
      if (notices && notices.createNotice) {
        notices.createNotice('warning', message, { type: 'snackbar', isDismissible: true });
      }
    }
    catch (e) {
      // The editor stays usable when notices are unavailable.
    }
  }

  function topicCardBlocks() {
    var wp = window.wp;
    var markup = window.hkcecTopicCardMarkup && window.hkcecTopicCardMarkup();
    if (markup && wp.blocks.parse) {
      var parsed = wp.blocks.parse(markup);
      if (parsed && parsed.length) {
        return parsed[0];
      }
    }
    var item = wp.blocks.createBlock('core/list-item', { content: 'First line' });
    var list = wp.blocks.createBlock('core/list', {}, [item]);
    var heading = wp.blocks.createBlock('core/heading', { level: 3, content: 'New topic' });
    return wp.blocks.createBlock('core/group', { className: 'hkcec-origin-card' }, [heading, list]);
  }

  function selectedCardId() {
    var select = window.wp.data.select('core/block-editor');
    var current = select.getSelectedBlockClientId();
    while (current) {
      var block = select.getBlock(current);
      if (block && block.name === 'core/group' && blockHasClass(block, 'hkcec-origin-card')) {
        return current;
      }
      current = select.getBlockRootClientId(current);
    }
    return '';
  }

  function lastCardColumn() {
    var select = window.wp.data.select('core/block-editor');
    var found = null;
    var main = null;
    function walk(blocks) {
      (blocks || []).forEach(function (block) {
        var className = block.attributes && block.attributes.className;
        if (block.name === 'core/columns' && classTokens(className).some(function (token) {
          return token.indexOf('hkcec-origin-cards') === 0;
        })) {
          var columns = block.innerBlocks || [];
          if (columns.length) {
            found = columns[columns.length - 1];
          }
        }
        if (block.name === 'core/column' && blockHasClass(block, 'hkcec-dept-main')) {
          main = block;
        }
        walk(block.innerBlocks);
      });
    }
    walk(select.getBlocks());
    return found || main;
  }

  function addTopicCard() {
    var wp = window.wp;
    if (!wp || !wp.blocks || !wp.data) {
      guidanceNotice(t('The topic card could not be added.'));
      return;
    }
    try {
      var card = topicCardBlocks();
      if (!card) {
        guidanceNotice(t('The topic card could not be added.'));
        return;
      }
      var select = wp.data.select('core/block-editor');
      var dispatch = wp.data.dispatch('core/block-editor');
      var cardId = selectedCardId();
      if (cardId) {
        var parentId = select.getBlockRootClientId(cardId);
        var order = select.getBlockOrder(parentId);
        var index = order.indexOf(cardId);
        dispatch.insertBlock(card, index + 1, parentId || undefined);
      }
      else {
        var column = lastCardColumn();
        if (!column) {
          dispatch.insertBlock(card);
        }
        else {
          dispatch.insertBlock(card, (column.innerBlocks || []).length, column.clientId);
        }
      }
      if (card.clientId) {
        dispatch.selectBlock(card.clientId);
      }
    }
    catch (e) {
      guidanceNotice(t('The topic card could not be added.'));
    }
  }

  function setPhonePreview(enabled) {
    window.hkcecPhonePreview = !!enabled;
    applyPhonePreview();
  }

  function applyPhonePreview() {
    var enabled = !!window.hkcecPhonePreview;
    var wrappers = document.querySelectorAll('.editor-styles-wrapper');
    var i;
    for (i = 0; i < wrappers.length; i++) {
      wrappers[i].classList.toggle('hkcec-phone-preview', enabled);
    }
    var frames = document.querySelectorAll('iframe');
    for (i = 0; i < frames.length; i++) {
      try {
        var inner = frames[i].contentDocument && frames[i].contentDocument.querySelector('.editor-styles-wrapper');
        if (inner) {
          inner.classList.toggle('hkcec-phone-preview', enabled);
        }
      }
      catch (e) {
        // A cross-origin frame is left unchanged.
      }
    }
    var phone = document.querySelector('.hkcec-guidance-phone');
    var desktop = document.querySelector('.hkcec-guidance-desktop');
    if (phone) {
      phone.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    }
    if (desktop) {
      desktop.setAttribute('aria-pressed', enabled ? 'false' : 'true');
    }
  }

  function mountGuidance() {
    if (!isDepartmentEditor() || document.querySelector('.hkcec-guidance')) {
      return;
    }
    var editorRoot = document.querySelector('[id^="editor-edit-body"]');
    var host = document.getElementById('edit-body-wrapper')
      || (editorRoot && editorRoot.parentElement)
      || document.querySelector('.edit-post-header-toolbar__left')
      || document.querySelector('.editor-document-tools')
      || document.querySelector('.edit-post-header-toolbar')
      || document.querySelector('[aria-label="Editor top bar"]');
    if (!host) {
      return;
    }
    var bar = document.createElement('div');
    bar.className = 'hkcec-guidance';
    function button(className, label, pressed) {
      var node = document.createElement('button');
      node.type = 'button';
      node.className = 'components-button is-secondary hkcec-guidance-button ' + className;
      node.textContent = label;
      if (pressed !== undefined) {
        node.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      }
      return node;
    }
    var add = button('hkcec-guidance-add', t('Add a topic card'));
    var desktop = button('hkcec-guidance-desktop', t('Desktop'), true);
    var phone = button('hkcec-guidance-phone', t('Phone'), false);
    add.addEventListener('click', function () {
      addTopicCard();
    });
    desktop.addEventListener('click', function () {
      setPhonePreview(false);
    });
    phone.addEventListener('click', function () {
      setPhonePreview(true);
    });
    bar.appendChild(add);
    bar.appendChild(desktop);
    bar.appendChild(phone);
    if (editorRoot && host.contains(editorRoot)) {
      host.insertBefore(bar, editorRoot);
    }
    else {
      host.appendChild(bar);
    }
  }

  function outlineName(clientId) {
    var select = window.wp.data.select('core/block-editor');
    var block = select.getBlock(clientId);
    if (!block) {
      return '';
    }
    if (block.name === 'core/group' && blockHasClass(block, 'hkcec-origin-card')) {
      return t('Topic card');
    }
    if (block.name === 'core/list-item') {
      return t('List line');
    }
    if (block.name === 'core/list') {
      var parentId = select.getBlockRootClientId(clientId);
      var parent = parentId && select.getBlock(parentId);
      if (parent && parent.name === 'core/group' && blockHasClass(parent, 'hkcec-origin-card')) {
        return t('Card list');
      }
    }
    return '';
  }

  function paintOutline() {
    if (!isDepartmentEditor() || !window.wp || !window.wp.data) {
      return;
    }
    var rows = document.querySelectorAll('.block-editor-list-view-block[data-block], .block-editor-list-view-leaf[data-block]');
    var i;
    for (i = 0; i < rows.length; i++) {
      var id = rows[i].getAttribute('data-block');
      var label = id && outlineName(id);
      if (!label) {
        continue;
      }
      var title = rows[i].querySelector('.block-editor-list-view-block-select-button__title');
      if (title && title.textContent !== label) {
        title.textContent = label;
      }
      var selectLink = rows[i].querySelector('.block-editor-list-view-block-select-button');
      if (selectLink && selectLink.getAttribute('aria-label') !== label) {
        selectLink.setAttribute('aria-label', label);
      }
    }
  }

  function installOutlineLabels() {
    var wp = window.wp;
    if (!wp || !wp.blocks || !wp.blocks.getBlockType) {
      return;
    }
    function wrap(name, custom) {
      try {
        var type = wp.blocks.getBlockType(name);
        if (!type || type.hkcecLabelWrapped) {
          return;
        }
        var previous = type.__experimentalLabel;
        type.__experimentalLabel = function (attributes) {
          if (!isDepartmentEditor()) {
            return previous ? previous(attributes) : undefined;
          }
          var label = custom(attributes);
          if (label) {
            return label;
          }
          return previous ? previous(attributes) : undefined;
        };
        type.hkcecLabelWrapped = true;
      }
      catch (e) {
        // A frozen block type keeps the default outline name.
      }
    }
    wrap('core/group', function (attributes) {
      if (classTokens(attributes && attributes.className).indexOf('hkcec-origin-card') !== -1) {
        return t('Topic card');
      }
      return '';
    });
    wrap('core/list-item', function () {
      return t('List line');
    });
  }

  var outlineQueued = false;
  function watchOutline() {
    var wp = window.wp;
    if (!wp || !wp.data || typeof wp.data.subscribe !== 'function' || window.hkcecOutlineWatch) {
      return;
    }
    window.hkcecOutlineWatch = true;
    var editorRoot = document.getElementById('editor-edit-body-0-value') || document.body;
    if (!window.hkcecOutlineObserver && editorRoot) {
      window.hkcecOutlineObserver = new MutationObserver(function () {
        if (outlineQueued || !isDepartmentEditor()) {
          return;
        }
        outlineQueued = true;
        window.requestAnimationFrame(function () {
          outlineQueued = false;
          try {
            paintOutline();
            applyPhonePreview();
          }
          catch (e) {
            // Outline names and the phone preview are optional.
          }
        });
      });
      window.hkcecOutlineObserver.observe(editorRoot, { childList: true, subtree: true });
    }
    wp.data.subscribe(function () {
      if (outlineQueued || !isDepartmentEditor()) {
        return;
      }
      outlineQueued = true;
      window.requestAnimationFrame(function () {
        outlineQueued = false;
        try {
          paintOutline();
          applyPhonePreview();
        }
        catch (e) {
          // Outline names and the phone preview are optional.
        }
      });
    });
  }

  function boot() {
    var wp = window.wp;
    if (!wp || !wp.hooks || typeof wp.hooks.addFilter !== 'function' || !wp.element || !wp.components) {
      return false;
    }
    if (!wp.blockEditor || !wp.blockEditor.BlockControls || !wp.components.ToolbarButton || !wp.components.ToolbarDropdownMenu) {
      return false;
    }
    if (window.hkcecBlockToolbarRegistered) {
      return true;
    }
    try {
      wp.hooks.addFilter('editor.BlockEdit', 'hkcec/block-toolbar', withBlockToolbar);
      wp.hooks.addFilter('blocks.getSaveContent.extraProps', 'hkcec/list-marker', listSaveProps);
      installOutlineLabels();
      watchOutline();
      mountGuidance();
      window.hkcecBlockToolbarRegistered = true;
      return true;
    }
    catch (e) {
      return false;
    }
  }

  function schedule(attempt) {
    var ready = false;
    try {
      ready = boot();
    }
    catch (e) {
      ready = false;
    }
    if (ready && isDepartmentEditor() && !document.querySelector('.hkcec-guidance')) {
      try {
        mountGuidance();
      }
      catch (e) {
        // The header can appear after the editor script.
      }
    }
    if (attempt < 40 && (!ready || (isDepartmentEditor() && !document.querySelector('.hkcec-guidance')))) {
      window.setTimeout(function () {
        schedule(attempt + 1);
      }, 250);
    }
  }

  schedule(0);

  if (Drupal && Drupal.behaviors) {
    Drupal.behaviors.hkcecBlockToolbar = {
      attach: function () {
        schedule(0);
        try {
          mountGuidance();
        }
        catch (e) {
          // The rest of the editor stays usable.
        }
      },
    };
  }
})(window.Drupal);
