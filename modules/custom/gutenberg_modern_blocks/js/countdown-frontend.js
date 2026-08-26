/**
 * @file
 * Frontend behavior for Countdown blocks.
 */
(function (Drupal, once) {
  'use strict';

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function initCountdown(root) {
    const targetRaw = root.getAttribute('data-target') || '';
    if (!targetRaw) {
      return;
    }
    const target = new Date(targetRaw).getTime();
    if (Number.isNaN(target)) {
      return;
    }

    const daysEl = root.querySelector('[data-unit="days"]');
    const hoursEl = root.querySelector('[data-unit="hours"]');
    const minutesEl = root.querySelector('[data-unit="minutes"]');
    const secondsEl = root.querySelector('[data-unit="seconds"]');

    function tick() {
      const diff = Math.max(0, target - Date.now());
      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      if (daysEl) {
        daysEl.textContent = pad(days);
      }
      if (hoursEl) {
        hoursEl.textContent = pad(hours);
      }
      if (minutesEl) {
        minutesEl.textContent = pad(minutes);
      }
      if (secondsEl) {
        secondsEl.textContent = pad(seconds);
      }
      if (diff <= 0) {
        window.clearInterval(timer);
        root.classList.add('is-finished');
      }
    }

    tick();
    const timer = window.setInterval(tick, 1000);
  }

  Drupal.behaviors.gutenbergModernCountdown = {
    attach: function (context) {
      once('gb-countdown', '.gb-countdown', context).forEach(initCountdown);
    },
  };
})(Drupal, once);
