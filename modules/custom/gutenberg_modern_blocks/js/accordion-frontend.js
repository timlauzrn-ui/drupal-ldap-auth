/**
 * @file
 * Frontend behavior for Accordion blocks.
 */
(function (Drupal, once) {
  'use strict';

  function initAccordion(root) {
    const allowMultiple = root.getAttribute('data-allow-multiple') === '1';
    const items = Array.prototype.slice.call(root.querySelectorAll('.gb-accordion__item'));

    items.forEach(function (item) {
      const trigger = item.querySelector('.gb-accordion__trigger');
      const panel = item.querySelector('.gb-accordion__panel');
      if (!trigger || !panel) {
        return;
      }

      trigger.addEventListener('click', function () {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        if (!allowMultiple) {
          items.forEach(function (other) {
            const otherTrigger = other.querySelector('.gb-accordion__trigger');
            const otherPanel = other.querySelector('.gb-accordion__panel');
            if (!otherTrigger || !otherPanel) {
              return;
            }
            otherTrigger.setAttribute('aria-expanded', 'false');
            otherPanel.classList.remove('is-open');
            otherPanel.hidden = true;
            const icon = otherTrigger.querySelector('.gb-accordion__icon');
            if (icon) {
              icon.textContent = '+';
            }
          });
        }

        if (isOpen && allowMultiple) {
          trigger.setAttribute('aria-expanded', 'false');
          panel.classList.remove('is-open');
          panel.hidden = true;
          const icon = trigger.querySelector('.gb-accordion__icon');
          if (icon) {
            icon.textContent = '+';
          }
          return;
        }

        if (!isOpen) {
          trigger.setAttribute('aria-expanded', 'true');
          panel.classList.add('is-open');
          panel.hidden = false;
          const icon = trigger.querySelector('.gb-accordion__icon');
          if (icon) {
            icon.textContent = '−';
          }
        }
      });
    });
  }

  Drupal.behaviors.gutenbergModernAccordion = {
    attach: function (context) {
      once('gb-accordion', '.gb-accordion', context).forEach(initAccordion);
    },
  };
})(Drupal, once);
