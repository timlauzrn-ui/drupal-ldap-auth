/**
 * @file
 * Frontend for tabs block.
 */
(function (Drupal, once) {
  'use strict';

  function init(root) {
    const tabs = Array.prototype.slice.call(root.querySelectorAll('.gb-tabs__tab'));
    const panels = Array.prototype.slice.call(root.querySelectorAll('.gb-tabs__panel'));

    function activate(index) {
      tabs.forEach(function (tab, i) {
        const on = i === index;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(function (panel, i) {
        const on = i === index;
        panel.classList.toggle('is-active', on);
        panel.hidden = !on;
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activate(parseInt(tab.getAttribute('data-index') || '0', 10));
      });
    });
  }

  Drupal.behaviors.gutenbergModernTabs = {
    attach: function (context) {
      once('gb-tabs', '.gb-tabs', context).forEach(init);
    },
  };
})(Drupal, once);
