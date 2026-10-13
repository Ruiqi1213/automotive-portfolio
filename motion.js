// Small native adaptations inspired by React Bits: Blur Text, Pill Nav and Glare Hover.
// https://www.reactbits.dev/text-animations/blur-text
// https://www.reactbits.dev/components/pill-nav
// https://www.reactbits.dev/animations/glare-hover
// No scroll reveals, runtime dependencies, or hidden-content prerequisites.
(() => {
  'use strict';

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => !reducedMotion || reducedMotion.matches;
  const onMediaChange = (query, listener) => {
    if (query?.addEventListener) query.addEventListener('change', listener);
    else if (query?.addListener) query.addListener(listener);
  };
  const pillControllers = new WeakMap();
  const startedHeadings = new WeakSet();
  const startedCards = new WeakSet();

  function createPillNav(nav) {
    if (!nav) return null;
    if (pillControllers.has(nav)) return pillControllers.get(nav);
    const links = Array.from(nav.querySelectorAll('a'));
    if (!links.length) return null;
    const highlight = document.createElement('span');
    highlight.className = 'pill-highlight';
    highlight.setAttribute('aria-hidden', 'true');
    nav.appendChild(highlight);
    let previous = null;

    function update({ instant = false } = {}) {
      const active = links.find(link => link.classList.contains('active'));
      // offset geometry is relative to this positioned nav, including when sticky.
      // Checking every item catches a new row layout before ResizeObserver fires.
      const layout = links.map(link => [link.offsetLeft, link.offsetTop, link.offsetWidth, link.offsetHeight].join(',')).join(';');
      const next = active && { active, left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight, layout };
      if (!next || ![next.left, next.top, next.width, next.height].every(Number.isFinite) || next.width <= 0 || next.height <= 0) {
        nav.classList.remove('pill-motion-ready');
        highlight.classList.remove('is-sliding');
        previous = null;
        return;
      }
      if (!instant && previous && previous.active === next.active && previous.layout === layout && !prefersReducedMotion()) return;
      const slide = !instant && !prefersReducedMotion() && previous && previous.layout === layout && Math.abs(previous.top - next.top) < 1;
      // Resize, initial placement and cross-row changes snap into place. A pill
      // must never sweep diagonally across other labels in the mobile 3 × 2 grid.
      highlight.classList.toggle('is-sliding', Boolean(slide));
      highlight.style.width = `${next.width}px`;
      highlight.style.height = `${next.height}px`;
      highlight.style.transform = `translate(${next.left}px, ${next.top}px)`;
      highlight.style.borderRadius = window.getComputedStyle?.(active).borderRadius || '';
      nav.classList.add('pill-motion-ready');
      previous = next;
    }

    const controller = { update };
    pillControllers.set(nav, controller);
    const placeImmediately = () => update({ instant: true });
    window.addEventListener('resize', placeImmediately, { passive: true });
    window.addEventListener('pageshow', placeImmediately);
    if (window.ResizeObserver) {
      const observer = new window.ResizeObserver(placeImmediately);
      observer.observe(nav);
      links.forEach(link => observer.observe(link));
    }
    if (document.fonts?.ready) document.fonts.ready.then(placeImmediately).catch(() => {});
    onMediaChange(reducedMotion, placeImmediately);
    placeImmediately();
    return controller;
  }

  function startHero(heading) {
    if (!heading || startedHeadings.has(heading)) return;
    startedHeadings.add(heading);
    const phrases = Array.from(heading.querySelectorAll('.hero-phrase'));
    if (prefersReducedMotion() || !phrases.length || phrases.some(phrase => typeof phrase.animate !== 'function')) return;
    const animations = new Set();
    const stop = () => {
      animations.forEach(animation => animation.cancel());
      animations.clear();
    };
    onMediaChange(reducedMotion, () => { if (prefersReducedMotion()) stop(); });
    try {
      phrases.forEach((phrase, index) => {
        // The CSS base is always fully visible. WAAPI owns only this one load.
        const animation = phrase.animate([
          { filter: 'blur(6px)', opacity: 0.45, transform: 'translateY(4px)' },
          { filter: 'blur(0px)', opacity: 1, transform: 'translateY(0px)' }
        ], { duration: 550, delay: Math.min(index, 2) * 70, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        animations.add(animation);
        animation.onfinish = () => { animations.delete(animation); animation.cancel(); };
        animation.oncancel = () => animations.delete(animation);
      });
    } catch (_) {
      stop(); // A missing/failed animation API leaves ordinary readable text.
    }
  }

  function startGlare(card) {
    if (!card || startedCards.has(card)) return;
    startedCards.add(card);
    const desktopPointer = window.matchMedia?.('(hover: hover) and (pointer: fine) and (min-width: 851px)');
    if (!desktopPointer) return;
    let enabled = false;
    let frame = 0;
    let glareX = 0;
    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      card.classList.remove('glare-active');
      card.style.removeProperty('--glare-x');
    };
    const refresh = () => {
      enabled = desktopPointer.matches && !prefersReducedMotion();
      card.classList.toggle('glare-ready', enabled);
      if (!enabled) stop();
    };
    const move = event => {
      if (!enabled || event.pointerType === 'touch') { stop(); return; }
      const rect = card.getBoundingClientRect();
      if (!rect.width) return;
      glareX = (Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) - 0.5) * 50;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!enabled) return;
        card.style.setProperty('--glare-x', `${glareX}%`);
        card.classList.add('glare-active');
      });
    };
    card.addEventListener('pointerenter', move);
    card.addEventListener('pointermove', move, { passive: true });
    card.addEventListener('pointerleave', stop);
    card.addEventListener('pointercancel', stop);
    onMediaChange(desktopPointer, refresh);
    onMediaChange(reducedMotion, refresh);
    refresh();
  }

  window.PortfolioMotion = Object.freeze({ createPillNav, startHero, startGlare });
})();
