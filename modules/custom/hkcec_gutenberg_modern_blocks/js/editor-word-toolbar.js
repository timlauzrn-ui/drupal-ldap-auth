/**
 * @file
 * Extra Word-style controls on the Gutenberg text toolbar.
 *
 * The bar stays beside the selected text, the same way a document toolbar
 * sits on the passage being edited. It is not pinned to the top of the page.
 *
 * Bold, Italic, Underline, and Link stay on the row. Align is one menu.
 * Font, color, and the other formats open from More formatting, so this
 * file does not add a second copy of those buttons.
 */
(function (Drupal) {
  'use strict';

  var SLOT = 'RichText.ToolbarControls.unknown';

  var FONTS = [
    { label: 'Arial', family: 'Arial, sans-serif', style: 'font-family:Arial,sans-serif' },
    { label: 'Georgia', family: 'Georgia, serif', style: 'font-family:Georgia,serif' },
    { label: 'Verdana', family: 'Verdana, sans-serif', style: 'font-family:Verdana,sans-serif' },
    { label: 'Tahoma', family: 'Tahoma, sans-serif', style: 'font-family:Tahoma,sans-serif' },
    { label: 'Courier', family: 'Courier, monospace', style: 'font-family:Courier,monospace' },
  ];

  var SIZES = [12, 14, 16, 18, 20, 24, 32];

  var COLORS = [
    { label: 'Black', value: '#1a1a1a' },
    { label: 'Red', value: '#b91c1c' },
    { label: 'Blue', value: '#1d4ed8' },
    { label: 'Green', value: '#15803d' },
    { label: 'Orange', value: '#c2410c' },
    { label: 'Purple', value: '#6d28d9' },
  ];

  var HIGHLIGHTS = [
    { label: 'Yellow', value: '#fef08a' },
    { label: 'Green', value: '#bbf7d0' },
    { label: 'Blue', value: '#bfdbfe' },
    { label: 'Pink', value: '#fecdd3' },
    { label: 'Orange', value: '#fed7aa' },
  ];

  function t(text) {
    if (Drupal && typeof Drupal.t === 'function') {
      return Drupal.t(text);
    }
    return text;
  }

  function svg(children) {
    var wp = window.wp;
    return wp.element.createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
        'aria-hidden': 'true',
        focusable: 'false',
      },
      children
    );
  }

  function iconPath(d) {
    return svg(window.wp.element.createElement('path', { d: d, fill: 'currentColor' }));
  }

  var ICONS = {
    underline: 'M7 18v1h10v-1H7zm5-2c1.5 0 2.6-.4 3.4-1.2.8-.8 1.1-2 1.1-3.5V5H15v5.8c0 1.2-.2 2.1-.6 2.8-.4.7-1.2 1-2.4 1s-2-.3-2.4-1c-.4-.7-.6-1.6-.6-2.8V5H7.5v6.2c0 1.5.4 2.7 1.1 3.5.8.9 1.9 1.3 3.4 1.3z',
    alignLeft: 'M13 5.5H4V4h9v1.5Zm7 7H4V11h16v1.5Zm-7 7H4V18h9v1.5Z',
    alignCenter: 'M7.5 5.5h9V4h-9v1.5Zm-3.5 7h16V11H4v1.5Zm3.5 7h9V18h-9v1.5Z',
    alignRight: 'M11.111 5.5H20V4h-8.889v1.5ZM4 12.5h16V11H4v1.5Zm7.111 7H20V18h-8.889v1.5Z',
    strikethrough: 'M9.1 9v-.5c0-.6.2-1.1.7-1.4.5-.3 1.2-.5 2-.5.7 0 1.4.1 2.1.3.7.2 1.4.5 2.1.9l.2-1.9c-.6-.3-1.2-.5-1.9-.7-.8-.1-1.6-.2-2.4-.2-1.5 0-2.7.3-3.6 1-.8.7-1.2 1.5-1.2 2.6V9h2zM20 12H4v1h8.3c.3.1.6.2.8.3.5.2.9.5 1.1.8.3.3.4.7.4 1.2 0 .7-.2 1.1-.8 1.5-.5.3-1.2.5-2.1.5-.8 0-1.6-.1-2.4-.3-.8-.2-1.5-.5-2.2-.8L7 18.1c.5.2 1.2.4 2 .6.8.2 1.6.3 2.4.3 1.7 0 3-.3 3.9-1 .9-.7 1.3-1.6 1.3-2.8 0-.9-.2-1.7-.7-2.2H20v-1z',
    subscript: 'M16.9 18.3l.8-1.2c.4-.6.7-1.2.9-1.6.2-.4.3-.8.3-1.2 0-.3-.1-.7-.2-1-.1-.3-.4-.5-.6-.7-.3-.2-.6-.3-1-.3s-.8.1-1.1.2c-.3.1-.7.3-1 .6l.2 1.3c.3-.3.5-.5.8-.6s.6-.2.9-.2c.3 0 .5.1.7.2.2.2.2.4.2.7 0 .3-.1.5-.2.8-.1.3-.4.7-.8 1.3L15 19.4h4.3v-1.2h-2.4zM14.1 7.2h-2L9.5 11 6.9 7.2h-2l3.6 5.3L4.7 18h2l2.7-4 2.7 4h2l-3.8-5.5 3.8-5.3z',
    superscript: 'M16.9 10.3l.8-1.3c.4-.6.7-1.2.9-1.6.2-.4.3-.8.3-1.2 0-.3-.1-.7-.2-1-.2-.2-.4-.4-.7-.6-.3-.2-.6-.3-1-.3s-.8.1-1.1.2c-.3.1-.7.3-1 .6l.1 1.3c.3-.3.5-.5.8-.6s.6-.2.9-.2c.3 0 .5.1.7.2.2.2.2.4.2.7 0 .3-.1.5-.2.8-.1.3-.4.7-.8 1.3l-1.8 2.8h4.3v-1.2h-2.2zm-2.8-3.1h-2L9.5 11 6.9 7.2h-2l3.6 5.3L4.7 18h2l2.7-4 2.7 4h2l-3.8-5.5 3.8-5.3z',
    code: 'M20.8 10.7l-4.3-4.3-1.1 1.1 4.3 4.3c.1.1.1.3 0 .4l-4.3 4.3 1.1 1.1 4.3-4.3c.7-.8.7-1.9 0-2.6zM4.2 11.8l4.3-4.3-1-1-4.3 4.3c-.7.7-.7 1.8 0 2.5l4.3 4.3 1.1-1.1-4.3-4.3c-.2-.1-.2-.3-.1-.4z',
    keyboard: 'M8 12.5h8V11H8v1.5ZM19 6.5H5a2 2 0 0 0-2 2V15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2ZM5 8h14a.5.5 0 0 1 .5.5V15a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V8.5A.5.5 0 0 1 5 8Z',
    language: 'M17.5 10h-1.7l-3.7 10.5h1.7l.9-2.6h3.9l.9 2.6h1.7L17.5 10zm-2.2 6.3 1.4-4 1.4 4h-2.8zm-4.8-3.8c1.6-1.8 2.9-3.6 3.7-5.7H16V5.2h-5.8V3H8.8v2.2H3v1.5h9.6c-.7 1.6-1.8 3.1-3.1 4.6C8.6 10.2 7.8 9 7.2 8H5.6c.6 1.4 1.7 2.9 2.9 4.4l-2.4 2.4c-.3.4-.7.8-1.1 1.2l1 1 1.2-1.2c.8-.8 1.6-1.5 2.3-2.3.8.9 1.7 1.7 2.5 2.5l.6-1.5c-.7-.6-1.4-1.3-2.1-2z',
    textColor: 'M12.9 6h-2l-4 11h1.9l1.1-3h4.2l1.1 3h1.9L12.9 6zm-2.5 6.5l1.5-4.9 1.7 4.9h-3.2z',
    fontSize: 'M8.5 4.5h-2L2 16h2l1-2.8h5L11 16h2L8.5 4.5zM6.2 11.2L7.5 7.2l1.3 4H6.2zM15 7h6v1.5h-2.25V16h-1.5V8.5H15V7z',
    image: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm0 1.5v13h16v-13H4zm5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM4 16.5l4-3 2 2 3-4 7 5v1.5H4v-1.5z',
    clear: 'M15.5 4.5l4 4-8.5 8.5H7v-4L15.5 4.5zM8.5 12.4L15.1 5.8l2.1 2.1-6.6 6.6H8.5v-2.1zM4 19h16v1.5H4V19z',
    reset: 'M12 5a7 7 0 1 0 6.3 4H16v1.5h5V5.5h-1.5V8A8.5 8.5 0 1 1 12 3.5V5z',
  };

  function swatch(color) {
    return svg(
      window.wp.element.createElement('circle', {
        cx: '12',
        cy: '12',
        r: '7',
        fill: color,
        stroke: 'currentColor',
        strokeWidth: '1',
      })
    );
  }

  function norm(style) {
    return String(style || '').replace(/\s+/g, '').toLowerCase();
  }

  function activeFormat(value, type) {
    try {
      return window.wp.richText.getActiveFormat(value, type);
    }
    catch (e) {
      return null;
    }
  }

  function styleIs(value, type, style) {
    var format = activeFormat(value, type);
    if (!format || !format.attributes) {
      return false;
    }
    return norm(format.attributes.style).indexOf(norm(style)) !== -1;
  }

  function alignKey(block) {
    var wp = window.wp;
    if (!block || !wp.blocks || typeof wp.blocks.getBlockType !== 'function') {
      return null;
    }
    var type = wp.blocks.getBlockType(block.name);
    if (!type || !type.attributes) {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(type.attributes, 'textAlign')) {
      return 'textAlign';
    }
    if (Object.prototype.hasOwnProperty.call(type.attributes, 'align')) {
      var support = type.supports && type.supports.align;
      if (Array.isArray(support) && support.indexOf('left') === -1 && support.indexOf('center') === -1) {
        return null;
      }
      return 'align';
    }
    return null;
  }

  function registerSilent(name, title, className) {
    var wp = window.wp;
    if (wp.data.select('core/rich-text').getFormatType(name)) {
      return;
    }
    wp.richText.registerFormatType(name, {
      title: title,
      tagName: 'span',
      className: className,
      attributes: { style: 'style' },
      edit: function () {
        return null;
      },
    });
  }

  function WordToolsEdit(props) {
    var wp = window.wp;
    var el = wp.element.createElement;
    var value = props.value;
    var onChange = props.onChange;
    var onFocus = props.onFocus;
    var Fill = wp.components.Fill;
    var ToolbarButton = wp.components.ToolbarButton;
    var ToolbarDropdownMenu = wp.components.ToolbarDropdownMenu;

    var selected = wp.data.useSelect(function (select) {
      try {
        var editor = select('core/block-editor');
        if (!editor || typeof editor.getSelectedBlock !== 'function') {
          return null;
        }
        return editor.getSelectedBlock();
      }
      catch (e) {
        return null;
      }
    }, []);

    var selectionRef = wp.element.useRef ? wp.element.useRef(null) : { current: null };
    if (value && value.start !== value.end) {
      selectionRef.current = value;
    }
    var source = (selectionRef.current && selectionRef.current.start !== selectionRef.current.end)
      ? selectionRef.current
      : value;

    function keepSelection(event) {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }

    function commit(next) {
      selectionRef.current = next;
      if (typeof onChange === 'function') {
        onChange(next);
      }
      if (typeof onFocus === 'function') {
        onFocus();
      }
    }

    function toggleCore(type, extra) {
      try {
        commit(wp.richText.toggleFormat(source, Object.assign({ type: type }, extra || {})));
      }
      catch (e) {
        // Leave the editor usable if a core format is missing.
      }
    }

    function applyStyle(type, style) {
      try {
        if (styleIs(source, type, style)) {
          commit(wp.richText.removeFormat(source, type));
          return;
        }
        commit(wp.richText.applyFormat(source, {
          type: type,
          attributes: { style: style },
        }));
      }
      catch (e) {
        // Ignore a single failed format apply.
      }
    }

    function removeStyle(type) {
      try {
        commit(wp.richText.removeFormat(source, type));
      }
      catch (e) {
        // Ignore.
      }
    }

    function clearFormatting() {
      try {
        var names = [];
        var store = wp.data.select('core/rich-text');
        if (store && typeof store.getFormatTypes === 'function') {
          store.getFormatTypes().forEach(function (type) {
            if (type && type.name && type.name !== 'hkcec/word-tools') {
              names.push(type.name);
            }
          });
        }
        var next = source;
        names.forEach(function (name) {
          next = wp.richText.removeFormat(next, name);
        });
        commit(next);
      }
      catch (e) {
        // Ignore.
      }
    }

    function setAlign(next) {
      try {
        var block = selected || wp.data.select('core/block-editor').getSelectedBlock();
        if (!block) {
          return;
        }
        if (block.name === 'core/list-item') {
          var listAlign = (block.attributes && block.attributes.hkcecTextAlign) || '';
          wp.data.dispatch('core/block-editor').updateBlockAttributes(block.clientId, {
            hkcecTextAlign: listAlign === next ? undefined : next,
          });
          return;
        }
        var key = alignKey(block);
        if (!key) {
          return;
        }
        var current = (block.attributes && block.attributes[key]) || '';
        var update = {};
        update[key] = current === next ? undefined : next;
        wp.data.dispatch('core/block-editor').updateBlockAttributes(block.clientId, update);
      }
      catch (e) {
        // Locked templates ignore alignment changes.
      }
    }

    function fill(key, child) {
      return el(Fill, { name: SLOT, key: key }, child);
    }

    function toolButton(key, title, icon, pressed, onClick, disabled) {
      return fill(key, el(ToolbarButton, {
        className: 'hkcec-word-tool',
        title: title,
        label: title,
        icon: icon,
        isPressed: !!pressed,
        disabled: !!disabled,
        onMouseDown: keepSelection,
        onClick: onClick,
      }));
    }

    var listAlign = selected && selected.name === 'core/list-item';
    var alignAttr = listAlign ? 'hkcecTextAlign' : alignKey(selected);
    var currentAlign = (alignAttr && selected.attributes && selected.attributes[alignAttr]) || '';
    var alignDisabled = !alignAttr;
    var alignIcon = currentAlign === 'center'
      ? ICONS.alignCenter
      : (currentAlign === 'right' ? ICONS.alignRight : ICONS.alignLeft);

    var fontChoices = FONTS.map(function (font) {
      return {
        label: el('span', { style: { fontFamily: font.family } }, font.label),
        style: font.style,
      };
    });
    var sizeChoices = SIZES.map(function (size) {
      var style = 'font-size:' + size + 'px';
      return {
        label: size + ' px',
        style: style,
        icon: iconPath(ICONS.fontSize),
      };
    });
    var colorChoices = COLORS.map(function (color) {
      return {
        label: t(color.label),
        style: 'color:' + color.value,
        icon: swatch(color.value),
      };
    });
    var highlightChoices = HIGHLIGHTS.map(function (color) {
      return {
        label: t(color.label),
        style: 'background-color:' + color.value,
        icon: swatch(color.value),
      };
    });

    function labeledChoices(type, choices, resetTitle) {
      var controls = choices.map(function (choice) {
        return {
          title: choice.label,
          icon: choice.icon,
          isActive: styleIs(source, type, choice.style),
          onClick: function () {
            applyStyle(type, choice.style);
          },
        };
      });
      controls.push({
        title: resetTitle,
        icon: iconPath(ICONS.reset),
        onClick: function () {
          removeStyle(type);
        },
      });
      return controls;
    }

    function formatToggle(title, type, icon) {
      return {
        title: title,
        icon: iconPath(icon),
        isActive: !!activeFormat(source, type),
        onClick: function () {
          toggleCore(type);
        },
      };
    }

    function applyLanguage(lang) {
      try {
        if (!lang) {
          commit(wp.richText.removeFormat(source, 'core/language'));
          return;
        }
        commit(wp.richText.applyFormat(source, {
          type: 'core/language',
          attributes: { lang: lang, dir: 'ltr' },
        }));
      }
      catch (e) {
        // Ignore a failed language apply.
      }
    }

    function insertInlineImage(media) {
      try {
        if (!media || !wp.richText.insertObject) {
          return;
        }
        var width = media.width ? Math.min(media.width, 150) : 150;
        commit(wp.richText.insertObject(source, {
          type: 'core/image',
          attributes: {
            className: 'wp-image-' + (media.id || ''),
            style: 'width: ' + width + 'px;',
            url: media.url,
            alt: media.alt || '',
          },
        }));
      }
      catch (e) {
        // Ignore a failed inline image insert.
      }
    }

    function moreControls(openImage) {
      var controls = []
        .concat(labeledChoices('hkcec/font-family', fontChoices, t('Default font')))
        .concat(labeledChoices('hkcec/font-size', sizeChoices, t('Default size')))
        .concat(labeledChoices('hkcec/font-color', colorChoices, t('Default color')))
        .concat(labeledChoices('hkcec/font-highlight', highlightChoices, t('Default highlight')))
        .concat([
          formatToggle(t('Strikethrough'), 'core/strikethrough', ICONS.strikethrough),
          formatToggle(t('Subscript'), 'core/subscript', ICONS.subscript),
          formatToggle(t('Superscript'), 'core/superscript', ICONS.superscript),
          formatToggle(t('Inline code'), 'core/code', ICONS.code),
          formatToggle(t('Keyboard input'), 'core/keyboard', ICONS.keyboard),
          {
            title: t('English'),
            icon: iconPath(ICONS.language),
            onClick: function () {
              applyLanguage('en');
            },
          },
          {
            title: t('Traditional Chinese'),
            icon: iconPath(ICONS.language),
            onClick: function () {
              applyLanguage('zh-HK');
            },
          },
          {
            title: t('Simplified Chinese'),
            icon: iconPath(ICONS.language),
            onClick: function () {
              applyLanguage('zh-CN');
            },
          },
          {
            title: t('Remove language'),
            icon: iconPath(ICONS.language),
            onClick: function () {
              applyLanguage('');
            },
          },
        ]);
      if (openImage) {
        controls.push({
          title: t('Inline image'),
          icon: iconPath(ICONS.image),
          onClick: openImage,
        });
      }
      controls.push({
        title: t('Clear formatting'),
        icon: iconPath(ICONS.clear),
        onClick: clearFormatting,
      });
      return controls;
    }

    function moreMenu(openImage) {
      return el(ToolbarDropdownMenu, {
        className: 'hkcec-word-tool',
        label: t('More formatting'),
        icon: iconPath('M5 10h2v2H5v-2zm6 0h2v2h-2v-2zm6 0h2v2h-2v-2z'),
        toggleProps: { onMouseDown: keepSelection },
        popoverProps: { className: 'hkcec-word-popover hkcec-more-popover', placement: 'bottom-start' },
        controls: moreControls(openImage),
      });
    }

    var MediaUpload = wp.blockEditor && wp.blockEditor.MediaUpload;
    var more = (MediaUpload && wp.richText.insertObject)
      ? el(MediaUpload, {
        allowedTypes: ['image'],
        onSelect: insertInlineImage,
        render: function (handlers) {
          return moreMenu(handlers.open);
        },
      })
      : moreMenu(null);

    return el(
      wp.element.Fragment,
      null,
      toolButton('underline', t('Underline'), iconPath(ICONS.underline), activeFormat(source, 'core/underline'), function () {
        toggleCore('core/underline', {
          attributes: { style: 'text-decoration: underline;' },
          title: t('Underline'),
        });
      }),
      fill('align', el(ToolbarDropdownMenu, {
        className: 'hkcec-word-tool',
        label: t('Align'),
        icon: iconPath(alignIcon),
        toggleProps: { onMouseDown: keepSelection },
        popoverProps: { className: 'hkcec-word-popover', placement: 'bottom-start' },
        controls: [
          {
            title: t('Align left'),
            icon: iconPath(ICONS.alignLeft),
            isActive: !alignDisabled && (currentAlign === 'left' || currentAlign === ''),
            onClick: function () {
              if (!alignDisabled) {
                setAlign('left');
              }
            },
          },
          {
            title: t('Align center'),
            icon: iconPath(ICONS.alignCenter),
            isActive: currentAlign === 'center',
            onClick: function () {
              if (!alignDisabled) {
                setAlign('center');
              }
            },
          },
          {
            title: t('Align right'),
            icon: iconPath(ICONS.alignRight),
            isActive: currentAlign === 'right',
            onClick: function () {
              if (!alignDisabled) {
                setAlign('right');
              }
            },
          },
        ],
      })),
      fill('more', more)
    );
  }

  function wordToolsEditComponent(wp) {
    if (window.hkcecWordToolsBoundary) {
      return window.hkcecWordToolsBoundary;
    }
    if (!wp.element.Component) {
      window.hkcecWordToolsBoundary = function (props) {
        return wp.element.createElement(WordToolsEdit, props);
      };
      return window.hkcecWordToolsBoundary;
    }
    window.hkcecWordToolsBoundary = class WordToolsBoundary extends wp.element.Component {
      constructor(props) {
        super(props);
        this.state = { failed: false };
      }

      componentDidCatch() {
        this.setState({ failed: true });
      }

      render() {
        if (this.state.failed) {
          return null;
        }
        return wp.element.createElement(WordToolsEdit, this.props);
      }
    };
    return window.hkcecWordToolsBoundary;
  }

  function registerFormats() {
    var wp = window.wp;
    if (!wp || !wp.richText || typeof wp.richText.registerFormatType !== 'function') {
      return false;
    }
    if (!wp.element || !wp.components || !wp.components.Fill || !wp.components.ToolbarButton || !wp.components.ToolbarDropdownMenu) {
      return false;
    }
    if (!wp.data || typeof wp.data.select !== 'function' || typeof wp.data.useSelect !== 'function') {
      return false;
    }
    var store;
    try {
      store = wp.data.select('core/rich-text');
    }
    catch (e) {
      return false;
    }
    if (!store || typeof store.getFormatType !== 'function') {
      return false;
    }
    if (window.hkcecWordToolbarRegistered) {
      return true;
    }

    try {
      registerSilent('hkcec/font-family', t('Font'), 'hkcec-ff');
      registerSilent('hkcec/font-size', t('Font size'), 'hkcec-fs');
      registerSilent('hkcec/font-color', t('Text color'), 'hkcec-fc');
      registerSilent('hkcec/font-highlight', t('Highlight'), 'hkcec-fh');
      if (!store.getFormatType('hkcec/word-tools')) {
        wp.richText.registerFormatType('hkcec/word-tools', {
          title: t('Word tools'),
          tagName: 'span',
          className: 'hkcec-word-tools',
          edit: wordToolsEditComponent(wp),
        });
      }
      window.hkcecWordToolbarRegistered = true;
      return true;
    }
    catch (e) {
      return false;
    }
  }

  function moveFormatToToolbar(name, edit, extra) {
    var wp = window.wp;
    var current = wp.data.select('core/rich-text').getFormatType(name);
    if (!current || current.hkcecMoved) {
      return;
    }
    var settings = Object.assign({}, current, extra || {}, {
      edit: edit,
      hkcecMoved: true,
    });
    wp.richText.unregisterFormatType(name);
    try {
      wp.richText.registerFormatType(name, settings);
    }
    catch (e) {
      try {
        wp.richText.registerFormatType(name, current);
      }
      catch (restoreError) {
        // The original format could not be restored.
      }
      throw e;
    }
  }

  function promoteCoreFormats() {
    var wp = window.wp;
    if (window.hkcecFormatsMoved) {
      return true;
    }
    if (!wp || !wp.richText || typeof wp.richText.unregisterFormatType !== 'function' || !wp.data) {
      return false;
    }
    var store;
    try {
      store = wp.data.select('core/rich-text');
    }
    catch (e) {
      return false;
    }
    if (!store || typeof store.getFormatType !== 'function' || !store.getFormatType('core/bold')) {
      return false;
    }
    function hiddenEdit() {
      return null;
    }
    try {
      moveFormatToToolbar('core/code', hiddenEdit);
      moveFormatToToolbar('core/keyboard', hiddenEdit);
      moveFormatToToolbar('core/strikethrough', hiddenEdit);
      moveFormatToToolbar('core/subscript', hiddenEdit);
      moveFormatToToolbar('core/superscript', hiddenEdit);
      moveFormatToToolbar('core/language', hiddenEdit, {
        attributes: { lang: 'lang', dir: 'dir' },
      });
      moveFormatToToolbar('core/image', hiddenEdit);
      moveFormatToToolbar('core/text-color', hiddenEdit);
      window.hkcecFormatsMoved = true;
      return true;
    }
    catch (e) {
      return false;
    }
  }

  function clearFixedToolbar() {
    var wp = window.wp;
    try {
      var prefSelect = wp.data.select('core/preferences');
      var prefs = wp.data.dispatch('core/preferences');
      if (prefSelect && prefs && typeof prefSelect.get === 'function' && typeof prefs.set === 'function' && prefSelect.get('core/edit-post', 'fixedToolbar')) {
        prefs.set('core/edit-post', 'fixedToolbar', false);
      }
    }
    catch (e) {
      // Preferences can still be loading.
    }
    try {
      var editPost = wp.data.select('core/edit-post');
      var editDispatch = wp.data.dispatch('core/edit-post');
      if (editPost && editDispatch && typeof editPost.isFeatureActive === 'function' && editPost.isFeatureActive('fixedToolbar') && typeof editDispatch.toggleFeature === 'function') {
        editDispatch.toggleFeature('fixedToolbar');
      }
    }
    catch (e) {
      // The older feature flag is optional.
    }
  }

  function placeToolbarBesideSelection() {
    var wp = window.wp;
    if (!wp || !wp.data || typeof wp.data.dispatch !== 'function' || typeof wp.data.select !== 'function') {
      return false;
    }
    clearFixedToolbar();
    if (window.hkcecToolbarPlacementWatch || typeof wp.data.subscribe !== 'function') {
      return true;
    }
    window.hkcecToolbarPlacementWatch = true;
    var until = Date.now() + 8000;
    var unsubscribe = wp.data.subscribe(function () {
      if (Date.now() > until) {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
        return;
      }
      if (window.hkcecToolbarPlacementLock) {
        return;
      }
      window.hkcecToolbarPlacementLock = true;
      try {
        clearFixedToolbar();
      }
      catch (e) {
        // One preference write must not stop the editor.
      }
      window.hkcecToolbarPlacementLock = false;
    });
    return true;
  }

  function registerListItemAlign() {
    var wp = window.wp;
    if (!wp || !wp.hooks || typeof wp.hooks.addFilter !== 'function' || !wp.blocks || !wp.element) {
      return false;
    }
    try {
      var type = wp.blocks.getBlockType('core/list-item');
      if (type && type.attributes && !type.attributes.hkcecTextAlign) {
        type.attributes.hkcecTextAlign = { type: 'string' };
      }
    }
    catch (e) {
      // The list block can still be registering.
    }
    if (window.hkcecListAlignRegistered) {
      return true;
    }
    window.hkcecListAlignRegistered = true;
    wp.hooks.addFilter('blocks.registerBlockType', 'hkcec/list-item-align', function (settings, name) {
      if (name !== 'core/list-item') {
        return settings;
      }
      settings.attributes = Object.assign({}, settings.attributes, {
        hkcecTextAlign: { type: 'string' },
      });
      return settings;
    });
    wp.hooks.addFilter('editor.BlockListBlock', 'hkcec/list-item-align', function (BlockListBlock) {
      return function (props) {
        var align = props && props.name === 'core/list-item' && props.attributes
          ? props.attributes.hkcecTextAlign
          : '';
        if (align === 'left' || align === 'center' || align === 'right') {
          props = Object.assign({}, props, {
            className: ((props.className || '') + ' hkcec-list-align-' + align).trim(),
          });
        }
        return wp.element.createElement(BlockListBlock, props);
      };
    });
    wp.hooks.addFilter('blocks.getSaveContent.extraProps', 'hkcec/list-item-align', function (extraProps, blockType, attributes) {
      if (!blockType || blockType.name !== 'core/list-item') {
        return extraProps;
      }
      var align = attributes && attributes.hkcecTextAlign;
      if (align !== 'left' && align !== 'center' && align !== 'right') {
        return extraProps;
      }
      return Object.assign({}, extraProps, {
        style: Object.assign({}, extraProps && extraProps.style, { textAlign: align }),
      });
    });
    return true;
  }

  function boot(attempt) {
    try {
      registerListItemAlign();
    }
    catch (e) {
      // Alignment support must not stop the editor.
    }
    try {
      promoteCoreFormats();
    }
    catch (e) {
      // A failed promotion must not stop the rest of the editor.
    }
    if (attempt === 0 && window.hkcecWordToolbarBootStarted) {
      try {
        registerFormats();
      }
      catch (e) {
        // Ignore.
      }
      return;
    }
    if (attempt === 0) {
      window.hkcecWordToolbarBootStarted = true;
    }
    var ready = false;
    try {
      ready = registerFormats();
    }
    catch (e) {
      ready = false;
    }
    if (ready) {
      placeToolbarBesideSelection();
    }
    if (!ready && attempt < 40) {
      window.setTimeout(function () {
        boot(attempt + 1);
      }, 250);
      return;
    }
    if (ready && attempt < 10) {
      window.setTimeout(function () {
        boot(attempt + 1);
      }, 400);
    }
  }

  boot(0);

  if (Drupal && Drupal.behaviors) {
    Drupal.behaviors.hkcecWordToolbar = {
      attach: function () {
        boot(0);
      },
    };
  }
})(window.Drupal);
