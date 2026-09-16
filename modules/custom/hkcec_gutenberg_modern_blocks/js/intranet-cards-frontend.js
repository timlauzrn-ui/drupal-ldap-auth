/**
 * Collapse resource cards and open a topic view from ?section=slug.
 * Adds sidebar "Back to parent department" for second-layer topic pages.
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

  function departmentTitle() {
    const intro = document.querySelector('.gb-page-intro__title');
    if (intro && intro.textContent.trim()) {
      return intro.textContent.trim();
    }
    const crumb = document.querySelector('.breadcrumb li:last-child, .easy-breadcrumb__list li:last-child, nav[aria-label="Breadcrumb"] li:last-child');
    if (crumb && crumb.textContent.trim()) {
      return crumb.textContent.trim();
    }
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent.trim()) {
      return h1.textContent.trim();
    }
    return 'department';
  }

  function parentOverviewUrl() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('section');
      // Prefer clean path without empty ?
      return url.pathname + (url.hash || '');
    }
    catch (e) {
      return './';
    }
  }

  function parentBackLabel() {
    return '← Back to ' + departmentTitle();
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

  function ensureParentBackLink(root) {
    const list = root.querySelector('.gb-quick-nav__list');
    if (!list) {
      return;
    }
    let backLi = list.querySelector(':scope > .gb-quick-nav__back');
    const inSection = !!currentSection();

    // Parent department overview: never show a back link in the sidebar.
    if (!inSection) {
      if (backLi) {
        backLi.hidden = true;
        backLi.setAttribute('hidden', 'hidden');
      }
      return;
    }

    if (!backLi) {
      backLi = document.createElement('li');
      backLi.className = 'gb-quick-nav__back';
      const a = document.createElement('a');
      a.className = 'gb-quick-nav__back-link';
      a.setAttribute('data-parent-back', '1');
      backLi.appendChild(a);
      list.insertBefore(backLi, list.firstChild);
    }
    backLi.hidden = false;
    backLi.removeAttribute('hidden');
    const link = backLi.querySelector('a') || backLi;
    if (link && link.tagName === 'A') {
      link.setAttribute('href', parentOverviewUrl());
      link.setAttribute('data-parent-back', '1');
      link.textContent = parentBackLabel();
    }
  }

  function refreshParentBackLabels(root) {
    const label = parentBackLabel();
    const href = parentOverviewUrl();
    const inSection = !!currentSection();
    (root || document).querySelectorAll('.gb-topic-page [data-parent-back], .gb-quick-nav__back [data-parent-back], .gb-quick-nav__back > a').forEach(function (link) {
      link.setAttribute('href', href);
      link.textContent = label;
    });
    // Topic-page content back button: only relevant while that topic page is visible.
    (root || document).querySelectorAll('.gb-topic-page__back').forEach(function (el) {
      const page = el.closest('.gb-topic-page');
      el.hidden = !(inSection && page && !page.hidden);
    });
  }

  function ensureAutoNav(root) {
    const list = root.querySelector('.gb-quick-nav__list');
    const cards = topicCards(root);
    if (!list) {
      return;
    }
    ensureParentBackLink(root);
    if (!cards.length) {
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
      if (link.getAttribute('data-parent-back')) {
        return;
      }
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
    ensureParentBackLink(root);
    refreshParentBackLabels(root);
    const backLi = root.querySelector('.gb-quick-nav__back');
    if (backLi) {
      backLi.classList.toggle('is-section-active', !!slug);
      // Only show sidebar back on child/topic views, never on parent overview.
      if (slug) {
        backLi.hidden = false;
        backLi.removeAttribute('hidden');
      }
      else {
        backLi.hidden = true;
        backLi.setAttribute('hidden', 'hidden');
      }
    }
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
    refreshParentBackLabels(root);
  }

  function bindHistory(root) {
    if (root.getAttribute('data-hkcec-history') === '1') {
      return;
    }
    root.setAttribute('data-hkcec-history', '1');
    window.addEventListener('popstate', function () {
      applySection(root);
    });
    root.addEventListener('click', function (event) {
      const link = event.target.closest('a[data-topic-link], a[data-parent-back]');
      if (!link || !root.contains(link)) {
        return;
      }
      // Keep same-page section navigation without full reload when possible.
      if (link.getAttribute('data-parent-back')) {
        event.preventDefault();
        const url = parentOverviewUrl();
        window.history.pushState({}, '', url);
        applySection(root);
        return;
      }
      const section = link.getAttribute('data-topic-link');
      if (!section) {
        return;
      }
      event.preventDefault();
      const next = new URL(window.location.href);
      next.searchParams.set('section', section);
      window.history.pushState({}, '', next.pathname + '?' + next.searchParams.toString() + next.hash);
      applySection(root);
    });
  }

  Drupal.behaviors.hkcecIntranetCards = {
    attach: function (context) {
      once('gb-card-collapse', '.gb-resource-card:not(.gb-resource-card--editor)', context).forEach(enhanceCollapse);
      once('gb-dept-autonav', '.gb-dept-layout', context).forEach(function (layout) {
        ensureAutoNav(layout);
        applySection(layout);
        bindHistory(layout);
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
