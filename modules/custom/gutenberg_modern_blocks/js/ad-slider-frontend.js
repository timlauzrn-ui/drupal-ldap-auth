/**
 * @file
 * Frontend autoplay for Ad Slider blocks.
 */
(function (Drupal, once) {
  'use strict';

  function initSlider(root) {
    const slides = Array.prototype.slice.call(root.querySelectorAll('.gb-ad-slider__slide'));
    if (slides.length < 2) {
      return;
    }

    let index = 0;
    const autoplay = root.getAttribute('data-autoplay') !== '0';
    const intervalSec = Math.max(2, parseInt(root.getAttribute('data-interval') || '5', 10));
    let timer = null;

    function setActive(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === index);
      });
      root.querySelectorAll('.gb-ad-slider__dot').forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === index);
      });
    }

    function start() {
      stop();
      if (!autoplay) {
        return;
      }
      timer = window.setInterval(function () {
        setActive(index + 1);
      }, intervalSec * 1000);
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    const prev = root.querySelector('.gb-ad-slider__arrow--prev');
    const next = root.querySelector('.gb-ad-slider__arrow--next');
    if (prev) {
      prev.addEventListener('click', function () {
        setActive(index - 1);
        start();
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        setActive(index + 1);
        start();
      });
    }

    root.querySelectorAll('.gb-ad-slider__dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        const i = parseInt(dot.getAttribute('data-index') || '0', 10);
        setActive(i);
        start();
      });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    setActive(0);
    start();
  }

  Drupal.behaviors.gutenbergModernAdSlider = {
    attach: function (context) {
      once('gb-ad-slider', '.gb-ad-slider', context).forEach(initSlider);
    },
  };
})(Drupal, once);
