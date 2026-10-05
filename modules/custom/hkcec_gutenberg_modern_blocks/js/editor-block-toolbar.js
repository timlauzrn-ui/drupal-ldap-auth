/**
 * @file
 * Top-toolbar controls that follow the selected Gutenberg block.
 *
 * Text formatting stays on the format bar. This file adds the controls that
 * belong to the block itself, in the same way Word changes the ribbon when
 * the selection changes. List markers are stored on the list block's type
 * attribute and written out as list-style-type when the post is saved.
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

  function iconLetter(letter) {
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
      el(
        'text',
        {
          x: '12',
          y: '16',
          textAnchor: 'middle',
          fontSize: '11',
          fontFamily: 'Arial, sans-serif',
          fontWeight: '700',
          fill: 'currentColor',
        },
        letter
      )
    );
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
      icon: iconLetter(label.charAt(0)),
      popoverProps: { className: 'hkcec-word-popover', placement: 'bottom-start' },
      controls: choices.map(function (choice) {
        return {
          title: choice.label,
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
      icon: iconLetter(label.charAt(0)),
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
      notify(t('The list line now opens the child page.'), 'success');
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
            type: 'text',
            value: title,
            onChange: function (event) {
              setTitle(event.target.value);
            },
          }),
          el('label', { key: 'layout-label', htmlFor: 'hkcec-child-layout' }, t('Layout')),
          el('select', {
            key: 'layout',
            id: 'hkcec-child-layout',
            value: bundle,
            onChange: function (event) {
              setBundle(event.target.value);
            },
          }, bundles.map(function (item) {
            return el('option', { key: item.id, value: item.id }, item.label);
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
              type: 'text',
              value: filter,
              onChange: function (event) {
                setFilter(event.target.value);
              },
            }),
            shown.length
              ? el('div', { key: 'pages', className: 'hkcec-child-pages' }, shown.map(function (page) {
                var note = page.underThis
                  ? t('Already under this page')
                  : (page.hasParent ? t('Move under this page') : t('Place under this page'));
                return el(wp.components.Button, {
                  key: String(page.nid),
                  className: 'hkcec-child-page',
                  variant: 'secondary',
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
                }, page.title + ' — ' + note);
              }))
              : el('p', { key: 'none' }, pages.length
                ? t('No page matches that name.')
                : t('No other department pages to choose yet.')),
          ];
        })();
      modal = el(wp.components.Modal, {
        title: open === 'create' ? t('Create page') : t('Choose existing page'),
        className: 'hkcec-child-modal',
        onRequestClose: function () {
          if (!busy) {
            setOpen('');
          }
        },
      }, el('div', { className: 'hkcec-child-dialog' }, body.concat([
        message ? el('p', { key: 'message' }, message) : null,
        open === 'create'
          ? el(wp.components.Button, {
            key: 'submit',
            variant: 'primary',
            disabled: busy || !title,
            onClick: function () {
              post(settings.createUrl, {
                parent: settings.parentNid,
                title: title,
                bundle: bundle,
              }).then(applyLink);
            },
          }, busy ? t('Creating…') : t('Create page'))
          : null,
      ])));
    }

    return el(wp.element.Fragment, null,
      el(wp.blockEditor.BlockControls, { group: 'block' },
        el(wp.components.ToolbarButton, {
          className: 'hkcec-block-tool hkcec-child-action',
          label: t('Create page'),
          showTooltip: true,
          onClick: openCreate,
        }, t('Create page')),
        el(wp.components.ToolbarButton, {
          className: 'hkcec-block-tool hkcec-child-action',
          label: t('Choose existing page'),
          showTooltip: true,
          onClick: openChoose,
        }, t('Choose existing page'))
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
      { label: t('Left'), value: 'left' },
      { label: t('Center'), value: 'center' },
      { label: t('Right'), value: 'right' },
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
