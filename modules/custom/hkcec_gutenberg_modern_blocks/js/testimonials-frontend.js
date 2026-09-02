/**
 * @file
 * Frontend for testimonials carousel.
 */
(function (Drupal, once) {
  'use strict';

  function init(root) {
    const items = Array.prototype.slice.call(root.querySelectorAll('.gb-testimonials__item'));
    if (items.length < 2) {
      return;
    }
    let index = 0;
    const autoplay = root.getAttribute('data-autoplay') !== '0';
    const interval = Math.max(3, parseInt(root.getAttribute('data-interval') || '6', 10));
    let timer = null;

    function setActive(next) {
      index = (next + items.length) % items.length;
      items.forEach(function (item, i) {
        item.classList.toggle('is-active', i === index);
      });
      root.querySelectorAll('.gb-testimonials__dot').forEach(function (dot, i) {
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
      }, interval * 1000);
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    root.querySelectorAll('.gb-testimonials__dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        setActive(parseInt(dot.getAttribute('data-index') || '0', 10));
        start();
      });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    setActive(0);
    start();
  }

  Drupal.behaviors.gutenbergModernTestimonials = {
    attach: function (context) {
      once('gb-testimonials', '.gb-testimonials', context).forEach(init);
    },
  };
})(Drupal, once);
