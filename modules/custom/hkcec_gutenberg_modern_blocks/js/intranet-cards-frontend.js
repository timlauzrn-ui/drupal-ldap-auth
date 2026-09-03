/**
 * Collapse resource cards and open a topic view from ?section=slug.
 */
(function (Drupal, once) {
  'use strict';

  function slugify(text) {
    const slug = String(text || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return slug || 'topic';
  }

  function currentSection() {
    try {
      return new URLSearchParams(window.location.search).get('section') || '';
    }
    catch (e) {
      return '';
    }
  }

  function topicCards(root) {
    return Array.prototype.filter.call(root.querySelectorAll('.gb-resource-card[data-topic], .gb-resource-card'), function (card) {
      return !card.closest('.gb-topic-page') && !card.classList.contains('gb-resource-card--editor');
    });
  }

  function cardSlug(card) {
    if (card.getAttribute('data-topic')) {
      return card.getAttribute('data-topic');
    }
    const title = card.querySelector('.gb-resource-card__title');
    return title ? slugify(title.textContent) : '';
  }

  function enhanceCollapse(card) {
    if (card.querySelector('.gb-resource-card__details')) {
      return;
    }
    const children = Array.prototype.slice.call(card.children);
    const head = card.querySelector(':scope > .gb-resource-card__head');
    const title = card.querySelector(':scope > .gb-resource-card__title');
    const summarySource = head || title;
    if (!summarySource) {
      return;
    }
    const details = document.createElement('details');
    details.className = 'gb-resource-card__details';
    details.open = true;
    const summary = document.createElement('summary');
    summary.className = 'gb-resource-card__summary';
    const body = document.createElement('div');
    body.className = 'gb-resource-card__body';
    children.forEach(function (child) {
      if (child.classList.contains('gb-topic-page')) {
        return;
      }
      if (child === summarySource) {
        summary.appendChild(child);
      }
      else {
        body.appendChild(child);
      }
    });
    details.appendChild(summary);
    details.appendChild(body);
    card.insertBefore(details, card.firstChild);
  }

  function ensureAutoNav(root) {
    const list = root.querySelector('.gb-quick-nav__list');
    const cards = topicCards(root);
    if (!list || !cards.length) {
      return;
    }
    const titleBySlug = {};
    cards.forEach(function (card) {
      const titleEl = card.querySelector('.gb-resource-card__title');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const slug = cardSlug(card);
      if (title && slug) {
        titleBySlug[slug] = title;
        titleBySlug[slugify(title)] = title;
      }
    });
    const existing = {};
    list.querySelectorAll('a').forEach(function (link) {
      const slug = slugify(link.textContent);
      existing[slug] = true;
      if (titleBySlug[slug]) {
        link.setAttribute('data-topic-link', slug);
        link.setAttribute('href', '?section=' + encodeURIComponent(slug));
      }
    });
    list.querySelectorAll('span').forEach(function (el) {
      existing[slugify(el.textContent)] = true;
    });
    Object.keys(titleBySlug).forEach(function (slug) {
      if (existing[slug]) {
        return;
      }
      const title = titleBySlug[slug];
      if (!title || slugify(title) !== slug) {
        return;
      }
      existing[slug] = true;
      const li = document.createElement('li');
      li.className = 'gb-quick-nav__auto';
      const a = document.createElement('a');
      a.href = '?section=' + encodeURIComponent(slug);
      a.setAttribute('data-topic-link', slug);
      a.textContent = title;
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function ensureLandingShortcuts(grid) {
    if (grid.closest('.gb-dept-layout') || grid.querySelector(':scope > .gb-card-shortcuts')) {
      return;
    }
    const cards = topicCards(grid);
    if (cards.length < 2) {
      return;
    }
    const nav = document.createElement('nav');
    nav.className = 'gb-card-shortcuts';
    nav.setAttribute('aria-label', 'Topics');
    const ul = document.createElement('ul');
    cards.forEach(function (card) {
      const titleEl = card.querySelector('.gb-resource-card__title');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const slug = cardSlug(card);
      if (!title || !slug) {
        return;
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '?section=' + encodeURIComponent(slug);
      a.setAttribute('data-topic-link', slug);
      a.textContent = title;
      li.appendChild(a);
      ul.appendChild(li);
    });
    if (ul.children.length) {
      nav.appendChild(ul);
      grid.insertBefore(nav, grid.firstChild);
    }
  }

  function applySection(root) {
    const slug = currentSection();
    const cards = topicCards(root);
    root.classList.toggle('is-section-view', !!slug);
    root.querySelectorAll('[data-topic-link]').forEach(function (link) {
      const active = slug && link.getAttribute('data-topic-link') === slug;
      link.classList.toggle('is-active', active);
      if (active) {
        link.setAttribute('aria-current', 'page');
      }
      else {
        link.removeAttribute('aria-current');
      }
    });
    cards.forEach(function (card) {
      const match = !slug || cardSlug(card) === slug;
      card.hidden = !match;
      const topicPage = card.querySelector(':scope > .gb-topic-page');
      const details = card.querySelector(':scope > details');
      if (topicPage) {
        const hasKids = topicPage.querySelector('.gb-resource-card');
        if (slug && match && hasKids) {
          topicPage.hidden = false;
          if (details) {
            details.hidden = true;
          }
        }
        else {
          topicPage.hidden = true;
          if (details) {
            details.hidden = false;
          }
        }
      }
      if (slug && match && details) {
        details.open = true;
      }
    });
  }

  Drupal.behaviors.hkcecIntranetCards = {
    attach: function (context) {
      once('gb-card-collapse', '.gb-resource-card:not(.gb-resource-card--editor)', context).forEach(enhanceCollapse);
      once('gb-dept-autonav', '.gb-dept-layout', context).forEach(function (layout) {
        ensureAutoNav(layout);
        applySection(layout);
      });
      once('gb-landing-shortcuts', '.gb-resource-grid:not(.gb-resource-grid--editor)', context).forEach(function (grid) {
        if (!grid.closest('.gb-dept-layout')) {
          ensureLandingShortcuts(grid);
        }
        applySection(grid);
      });
    },
  };
})(Drupal, once);
