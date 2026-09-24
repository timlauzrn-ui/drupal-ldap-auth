/**
 * @file
 * Extra Word-style controls on the Gutenberg text toolbar.
 *
 * Bold, Italic, and Link stay in their own slots. Every other core format
 * button is moved onto that same bar, and this file does not add a second
 * copy of Strikethrough, Subscript, Superscript, or Highlight.
 */
(function (Drupal) {
  'use strict';

  var SLOT = 'RichText.ToolbarControls.unknown';

  var FONTS = [
    { label: 'Arial', style: 'font-family:Arial,sans-serif' },
    { label: 'Georgia', style: 'font-family:Georgia,serif' },
    { label: 'Verdana', style: 'font-family:Verdana,sans-serif' },
    { label: 'Tahoma', style: 'font-family:Tahoma,sans-serif' },
    { label: 'Courier', style: 'font-family:Courier,monospace' },
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

  function iconLetter(letter, underline, script) {
    var el = window.wp.element.createElement;
    var nodes = [
      el(
        'text',
        {
          x: '10',
          y: '16',
          textAnchor: 'middle',
          fontSize: '14',
          fontFamily: 'Arial, sans-serif',
          fontWeight: '700',
          fill: 'currentColor',
        },
        letter
      ),
    ];
    if (underline) {
      nodes.push(el('rect', { x: '4', y: '18', width: '12', height: '2', fill: 'currentColor' }));
    }
    if (script === 'sub') {
      nodes.push(el('text', { x: '18', y: '20', fontSize: '9', fontFamily: 'Arial, sans-serif', fill: 'currentColor' }, '2'));
    }
    if (script === 'sup') {
      nodes.push(el('text', { x: '18', y: '10', fontSize: '9', fontFamily: 'Arial, sans-serif', fill: 'currentColor' }, '2'));
    }
    return svg(nodes);
  }

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

    function commit(next) {
      if (typeof onChange === 'function') {
        onChange(next);
      }
      if (typeof onFocus === 'function') {
        onFocus();
      }
    }

    function toggleCore(type, extra) {
      try {
        commit(wp.richText.toggleFormat(value, Object.assign({ type: type }, extra || {})));
      }
      catch (e) {
        // Leave the editor usable if a core format is missing.
      }
    }

    function applyStyle(type, style) {
      try {
        if (styleIs(value, type, style)) {
          commit(wp.richText.removeFormat(value, type));
          return;
        }
        commit(wp.richText.applyFormat(value, {
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
        commit(wp.richText.removeFormat(value, type));
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
        var next = value;
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
        var key = alignKey(block);
        if (!block || !key) {
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
        onClick: onClick,
      }));
    }

    function styleMenu(key, title, icon, type, choices) {
      var controls = choices.map(function (choice) {
        return {
          title: choice.label,
          icon: choice.icon,
          isActive: styleIs(value, type, choice.style),
          onClick: function () {
            applyStyle(type, choice.style);
          },
        };
      });
      controls.push({
        title: t('Default'),
        onClick: function () {
          removeStyle(type);
        },
      });
      return fill(key, el(ToolbarDropdownMenu, {
        className: 'hkcec-word-tool',
        label: title,
        icon: icon,
        popoverProps: { className: 'hkcec-word-popover', placement: 'bottom-start' },
        controls: controls,
      }));
    }

    var alignAttr = alignKey(selected);
    var currentAlign = (alignAttr && selected.attributes && selected.attributes[alignAttr]) || '';
    var alignDisabled = !alignAttr;

    var fontChoices = FONTS.map(function (font) {
      return {
        label: font.label,
        style: font.style,
        icon: iconLetter('A', false),
      };
    });
    var sizeChoices = SIZES.map(function (size) {
      var style = 'font-size:' + size + 'px';
      return {
        label: size + ' px',
        style: style,
        icon: iconLetter('A', false),
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

    return el(
      wp.element.Fragment,
      null,
      toolButton('underline', t('Underline'), iconLetter('U', true), activeFormat(value, 'core/underline'), function () {
        toggleCore('core/underline', {
          attributes: { style: 'text-decoration: underline;' },
          title: t('Underline'),
        });
      }),
      styleMenu('font', t('Font'), iconLetter('F', false), 'hkcec/font-family', fontChoices),
      styleMenu('size', t('Font size'), iconLetter('A', false), 'hkcec/font-size', sizeChoices),
      styleMenu('color', t('Text color'), swatch('#1d4ed8'), 'hkcec/font-color', colorChoices),
      styleMenu('highlight', t('Highlight'), swatch('#fef08a'), 'hkcec/font-highlight', highlightChoices),
      toolButton('align-left', t('Align left'), iconPath('M4 6h16v2H4V6zm0 4h10v2H4v-2zm0 4h16v2H4v-2zm0 4h10v2H4v-2z'), !alignDisabled && (currentAlign === 'left' || currentAlign === ''), function () {
        setAlign('left');
      }, alignDisabled),
      toolButton('align-center', t('Align center'), iconPath('M4 6h16v2H4V6zm3 4h10v2H7v-2zm-3 4h16v2H4v-2zm3 4h10v2H7v-2z'), currentAlign === 'center', function () {
        setAlign('center');
      }, alignDisabled),
      toolButton('align-right', t('Align right'), iconPath('M4 6h16v2H4V6zm6 4h10v2H10v-2zm-6 4h16v2H4v-2zm6 4h10v2H10v-2z'), currentAlign === 'right', function () {
        setAlign('right');
      }, alignDisabled),
      toolButton('clear', t('Clear formatting'), iconPath('M12 3a9 9 0 100 18 9 9 0 000-18zm-5 8h10v2H7v-2z'), false, clearFormatting, false)
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

  function mainToggle(formatName, title, icon) {
    return function (props) {
      var wp = window.wp;
      var el = wp.element.createElement;
      return el(wp.components.Fill, { name: SLOT }, el(wp.components.ToolbarButton, {
        className: 'hkcec-word-tool',
        title: title,
        label: title,
        icon: icon,
        isPressed: !!props.isActive,
        onClick: function () {
          try {
            props.onChange(wp.richText.toggleFormat(props.value, {
              type: formatName,
              title: title,
            }));
            if (typeof props.onFocus === 'function') {
              props.onFocus();
            }
          }
          catch (e) {
            // Keep the editor open if one format cannot toggle.
          }
        },
      }));
    };
  }

  function languageEdit(props) {
    var wp = window.wp;
    var el = wp.element.createElement;
    var languages = [
      { label: t('English'), lang: 'en' },
      { label: t('Traditional Chinese'), lang: 'zh-HK' },
      { label: t('Simplified Chinese'), lang: 'zh-CN' },
    ];
    var controls = languages.map(function (item) {
      return {
        title: item.label,
        onClick: function () {
          try {
            props.onChange(wp.richText.applyFormat(props.value, {
              type: 'core/language',
              attributes: { lang: item.lang, dir: 'ltr' },
            }));
          }
          catch (e) {
            // Ignore a failed language apply.
          }
        },
      };
    });
    controls.push({
      title: t('Remove language'),
      onClick: function () {
        try {
          props.onChange(wp.richText.removeFormat(props.value, 'core/language'));
        }
        catch (e) {
          // Ignore.
        }
      },
    });
    return el(wp.components.Fill, { name: SLOT }, el(wp.components.ToolbarDropdownMenu, {
      className: 'hkcec-word-tool',
      label: t('Language'),
      icon: iconLetter('L', false),
      popoverProps: { className: 'hkcec-word-popover', placement: 'bottom-start' },
      controls: controls,
    }));
  }

  function inlineImageEdit(props) {
    var wp = window.wp;
    var el = wp.element.createElement;
    var MediaUpload = wp.blockEditor && wp.blockEditor.MediaUpload;
    if (!MediaUpload || !wp.richText.insertObject) {
      return null;
    }
    return el(wp.components.Fill, { name: SLOT }, el(MediaUpload, {
      allowedTypes: ['image'],
      onSelect: function (media) {
        try {
          var width = media && media.width ? Math.min(media.width, 150) : 150;
          props.onChange(wp.richText.insertObject(props.value, {
            type: 'core/image',
            attributes: {
              className: 'wp-image-' + (media.id || ''),
              style: 'width: ' + width + 'px;',
              url: media.url,
              alt: media.alt || '',
            },
          }));
          if (typeof props.onFocus === 'function') {
            props.onFocus();
          }
        }
        catch (e) {
          // Ignore a failed inline image insert.
        }
      },
      render: function (handlers) {
        return el(wp.components.ToolbarButton, {
          className: 'hkcec-word-tool',
          title: t('Inline image'),
          label: t('Inline image'),
          icon: iconLetter('I', false),
          onClick: handlers.open,
        });
      },
    }));
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
    try {
      moveFormatToToolbar('core/code', mainToggle('core/code', t('Inline code'), iconLetter('</>', false)));
      moveFormatToToolbar('core/keyboard', mainToggle('core/keyboard', t('Keyboard input'), iconLetter('K', false)));
      moveFormatToToolbar('core/strikethrough', mainToggle('core/strikethrough', t('Strikethrough'), iconLetter('S', true)));
      moveFormatToToolbar('core/subscript', mainToggle('core/subscript', t('Subscript'), iconLetter('X', false, 'sub')));
      moveFormatToToolbar('core/superscript', mainToggle('core/superscript', t('Superscript'), iconLetter('X', false, 'sup')));
      moveFormatToToolbar('core/language', languageEdit, {
        attributes: { lang: 'lang', dir: 'dir' },
      });
      moveFormatToToolbar('core/image', inlineImageEdit);
      moveFormatToToolbar('core/text-color', function () {
        return null;
      });
      window.hkcecFormatsMoved = true;
      return true;
    }
    catch (e) {
      return false;
    }
  }

  function enableTopToolbar() {
    var wp = window.wp;
    if (!wp || !wp.data || typeof wp.data.dispatch !== 'function') {
      return false;
    }
    try {
      var prefs = wp.data.dispatch('core/preferences');
      if (!prefs || typeof prefs.set !== 'function') {
        return false;
      }
      prefs.set('core/edit-post', 'fixedToolbar', true);
      return true;
    }
    catch (e) {
      return false;
    }
  }

  function boot(attempt) {
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
      enableTopToolbar();
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
