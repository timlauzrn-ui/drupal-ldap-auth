/**
 * @file
 * Registers the Ad Slider Gutenberg block (no build step).
 */
(function (wp, Drupal) {
  'use strict';

  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const {
    useBlockProps,
    InspectorControls,
    MediaPlaceholder,
    RichText,
    BlockControls,
  } = wp.blockEditor;
  const {
    PanelBody,
    RangeControl,
    ToggleControl,
    Button,
    TextControl,
    ToolbarGroup,
    ToolbarButton,
  } = wp.components;

  function emptySlide() {
    return {
      imageUrl: '',
      imageUuid: '',
      imageAlt: '',
      title: '',
      linkUrl: '',
    };
  }

  function Edit(props) {
    const attributes = props.attributes;
    const setAttributes = props.setAttributes;
    const slides = attributes.slides || [];
    const interval = typeof attributes.interval === 'number' ? attributes.interval : 5;
    const autoplay = attributes.autoplay !== false;
    const showDots = attributes.showDots !== false;
    const showArrows = attributes.showArrows !== false;
    const blockProps = useBlockProps({ className: 'gb-ad-slider gb-ad-slider--editor' });

    function updateSlide(index, patch) {
      const next = slides.map(function (slide, i) {
        return i === index ? Object.assign({}, slide, patch) : slide;
      });
      setAttributes({ slides: next });
    }

    function addSlide() {
      setAttributes({ slides: slides.concat([emptySlide()]) });
    }

    function removeSlide(index) {
      setAttributes({
        slides: slides.filter(function (_s, i) {
          return i !== index;
        }),
      });
    }

    function moveSlide(index, dir) {
      const target = index + dir;
      if (target < 0 || target >= slides.length) {
        return;
      }
      const next = slides.slice();
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      setAttributes({ slides: next });
    }

    return el(
      Fragment,
      null,
      el(
        InspectorControls,
        null,
        el(
          PanelBody,
          { title: Drupal.t('Slider settings'), initialOpen: true },
          el(ToggleControl, {
            label: Drupal.t('Autoplay'),
            checked: !!autoplay,
            onChange: function (value) {
              setAttributes({ autoplay: value });
            },
          }),
          el(RangeControl, {
            label: Drupal.t('Seconds per slide'),
            value: interval,
            onChange: function (value) {
              setAttributes({ interval: value || 5 });
            },
            min: 2,
            max: 30,
          }),
          el(ToggleControl, {
            label: Drupal.t('Show dots'),
            checked: !!showDots,
            onChange: function (value) {
              setAttributes({ showDots: value });
            },
          }),
          el(ToggleControl, {
            label: Drupal.t('Show arrows'),
            checked: !!showArrows,
            onChange: function (value) {
              setAttributes({ showArrows: value });
            },
          }),
        ),
      ),
      el(
        BlockControls,
        null,
        el(
          ToolbarGroup,
          null,
          el(ToolbarButton, {
            icon: 'plus-alt',
            label: Drupal.t('Add slide'),
            onClick: addSlide,
          }),
        ),
      ),
      el(
        'div',
        blockProps,
        el('div', { className: 'gb-ad-slider__editor-label' }, Drupal.t('Ad Slider')),
        slides.length === 0
          ? el(
              'p',
              { className: 'gb-ad-slider__empty' },
              Drupal.t('No slides yet. Click “Add slide” to upload ad images.'),
            )
          : null,
        slides.map(function (slide, index) {
          return el(
            'div',
            { className: 'gb-ad-slider__slide-editor', key: 'slide-' + index },
            el(
              'div',
              { className: 'gb-ad-slider__slide-tools' },
              el('strong', null, Drupal.t('Slide @n', { '@n': index + 1 })),
              el(
                Button,
                {
                  isSmall: true,
                  onClick: function () {
                    moveSlide(index, -1);
                  },
                  disabled: index === 0,
                },
                '↑',
              ),
              el(
                Button,
                {
                  isSmall: true,
                  onClick: function () {
                    moveSlide(index, 1);
                  },
                  disabled: index === slides.length - 1,
                },
                '↓',
              ),
              el(
                Button,
                {
                  isSmall: true,
                  isDestructive: true,
                  onClick: function () {
                    removeSlide(index);
                  },
                },
                Drupal.t('Remove'),
              ),
            ),
            !slide.imageUrl
              ? el(
                  MediaPlaceholder,
                  {
                    onSelect: function (media) {
                      updateSlide(index, {
                        imageUrl: media.url || '',
                        imageUuid: (media.data && media.data.entity_uuid) || String(media.id || ''),
                        imageAlt: media.alt || '',
                      });
                    },
                    allowedTypes: ['image'],
                    multiple: false,
                    labels: { title: Drupal.t('Ad image') },
                  },
                  Drupal.t('Upload or select an ad image.'),
                )
              : el('img', {
                  src: slide.imageUrl,
                  alt: slide.imageAlt || '',
                  'data-entity-type': 'file',
                  'data-entity-uuid': slide.imageUuid || '',
                }),
            el(RichText, {
              tagName: 'h3',
              className: 'gb-ad-slider__title',
              placeholder: Drupal.t('Ad title (optional)'),
              value: slide.title || '',
              onChange: function (value) {
                updateSlide(index, { title: value });
              },
            }),
            el(TextControl, {
              label: Drupal.t('Link URL (optional)'),
              value: slide.linkUrl || '',
              onChange: function (value) {
                updateSlide(index, { linkUrl: value });
              },
              placeholder: 'https://',
            }),
          );
        }),
        el(
          Button,
          { variant: 'primary', onClick: addSlide, className: 'gb-ad-slider__add' },
          Drupal.t('Add slide'),
        ),
      ),
    );
  }

  function Save(props) {
    const attributes = props.attributes;
    const slides = attributes.slides || [];
    const interval = typeof attributes.interval === 'number' ? attributes.interval : 5;
    const autoplay = attributes.autoplay !== false;
    const showDots = attributes.showDots !== false;
    const showArrows = attributes.showArrows !== false;

    const blockProps = useBlockProps.save({
      className: 'gb-ad-slider',
      'data-interval': String(interval),
      'data-autoplay': autoplay ? '1' : '0',
      'data-dots': showDots ? '1' : '0',
      'data-arrows': showArrows ? '1' : '0',
    });

    const slideNodes = slides.map(function (slide, index) {
      const img = el('img', {
        src: slide.imageUrl || '',
        alt: slide.imageAlt || '',
        'data-entity-type': 'file',
        'data-entity-uuid': slide.imageUuid || '',
        loading: index === 0 ? 'eager' : 'lazy',
      });
      const caption = slide.title
        ? el(RichText.Content, {
            tagName: 'div',
            className: 'gb-ad-slider__caption',
            value: slide.title,
          })
        : null;
      const inner = el('div', { className: 'gb-ad-slider__inner' }, img, caption);
      const body = slide.linkUrl
        ? el('a', { className: 'gb-ad-slider__link', href: slide.linkUrl }, inner)
        : inner;
      return el(
        'div',
        {
          className: 'gb-ad-slider__slide' + (index === 0 ? ' is-active' : ''),
          'data-index': String(index),
          key: 'save-' + index,
        },
        body,
      );
    });

    const arrows = showArrows
      ? el(
          Fragment,
          null,
          el(
            'button',
            {
              type: 'button',
              className: 'gb-ad-slider__arrow gb-ad-slider__arrow--prev',
              'aria-label': 'Previous',
            },
            '‹',
          ),
          el(
            'button',
            {
              type: 'button',
              className: 'gb-ad-slider__arrow gb-ad-slider__arrow--next',
              'aria-label': 'Next',
            },
            '›',
          ),
        )
      : null;

    const dots = showDots
      ? el(
          'div',
          { className: 'gb-ad-slider__dots', 'data-gb-slider-dots': '1' },
          slides.map(function (_s, index) {
            return el('button', {
              type: 'button',
              className: 'gb-ad-slider__dot' + (index === 0 ? ' is-active' : ''),
              'data-index': String(index),
              'aria-label': 'Go to slide ' + (index + 1),
              key: 'dot-' + index,
            });
          }),
        )
      : null;

    return el(
      'div',
      blockProps,
      el('div', { className: 'gb-ad-slider__track', 'data-gb-slider-track': '1' }, slideNodes),
      arrows,
      dots,
    );
  }

  registerBlockType('modern-blocks/ad-slider', {
    apiVersion: 2,
    title: Drupal.t('Ad Slider'),
    description: Drupal.t('Rotating banner/ad images with timed autoplay.'),
    category: 'design',
    icon: 'images-alt2',
    keywords: ['slider', 'carousel', 'banner', 'ad', 'promo'],
    supports: {
      align: ['wide', 'full'],
      anchor: true,
      html: false,
    },
    attributes: {
      slides: {
        type: 'array',
        default: [],
      },
      interval: {
        type: 'number',
        default: 5,
      },
      autoplay: {
        type: 'boolean',
        default: true,
      },
      showDots: {
        type: 'boolean',
        default: true,
      },
      showArrows: {
        type: 'boolean',
        default: true,
      },
    },
    edit: Edit,
    save: Save,
  });
})(window.wp, window.Drupal);
