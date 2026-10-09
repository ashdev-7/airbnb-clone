/*
 * measure.js — exports exact measurements of the page you are looking at.
 *
 * Easiest use: the one-click bookmark described in docs/CAPTURE_GUIDE.md
 * (built from this file into tools/measure.bookmarklet.txt).
 * Alternative: open DevTools → Console, paste this whole file, press Enter.
 * Either way: type the capture ID when asked (for example B1), then you have
 * five seconds to put the page in the state you want. A JSON file downloads.
 * Put it in the project's reference/ folder next to the screenshot.
 *
 * It only reads what the browser has already rendered: positions, computed
 * styles, short text labels and link targets. It downloads nothing from the site
 * and sends nothing anywhere.
 */
(() => {
  const STYLE_KEYS = [
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform',
    'textDecorationLine', 'color', 'backgroundColor', 'backgroundImage', 'opacity',
    'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderBottomWidth', 'borderBottomColor',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
    'boxShadow', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'display', 'position', 'top', 'zIndex', 'gap', 'rowGap', 'columnGap',
    'gridTemplateColumns', 'flexDirection', 'justifyContent', 'alignItems',
    'objectFit', 'aspectRatio', 'overflowX', 'overflowY', 'cursor',
    'transitionProperty', 'transitionDuration', 'transitionTimingFunction',
  ];
  const DEFAULTS = {
    letterSpacing: 'normal', textTransform: 'none', textDecorationLine: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', opacity: '1',
    borderTopWidth: '0px', borderBottomWidth: '0px', borderTopStyle: 'none',
    borderTopLeftRadius: '0px', borderTopRightRadius: '0px',
    borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px',
    boxShadow: 'none', paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px',
    marginTop: '0px', marginRight: '0px', marginBottom: '0px', marginLeft: '0px',
    position: 'static', top: 'auto', zIndex: 'auto', gap: 'normal', rowGap: 'normal', columnGap: 'normal',
    gridTemplateColumns: 'none', flexDirection: 'row', justifyContent: 'normal', alignItems: 'normal',
    objectFit: 'fill', aspectRatio: 'auto', overflowX: 'visible', overflowY: 'visible', cursor: 'auto',
    transitionProperty: 'all', transitionDuration: '0s', transitionTimingFunction: 'ease',
  };
  const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'HEAD', 'TITLE', 'BR', 'TEMPLATE']);
  const STRUCTURAL = /^(A|BUTTON|IMG|PICTURE|VIDEO|INPUT|SELECT|TEXTAREA|LABEL|H[1-6]|HEADER|FOOTER|NAV|MAIN|SECTION|ARTICLE|ASIDE|UL|OL|LI|DIALOG|FORM|TABLE|svg)$/i;
  const MAX_ELEMENTS = 6000;
  const round = (n) => Math.round(n * 10) / 10;

  const describeLink = (el) => {
    try {
      const url = new URL(el.href, location.href);
      return {
        sameSite: url.host === location.host,
        path: url.pathname.replace(/\d{4,}/g, '{id}'),
        params: [...new Set([...url.searchParams.keys()])],
        target: el.getAttribute('target') || '',
        rel: el.getAttribute('rel') || '',
      };
    } catch {
      return { target: el.getAttribute('target') || '' };
    }
  };

  const collectRootVariables = () => {
    const vars = {};
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; } // cross-origin sheet: not readable
      for (const rule of rules) {
        if (!rule.selectorText || !rule.style) continue;
        if (!/(^|,)\s*(:root|html|body)\s*(,|$)/.test(rule.selectorText)) continue;
        for (const name of rule.style) {
          if (name.startsWith('--')) vars[name] = rule.style.getPropertyValue(name).trim();
        }
      }
    }
    return vars;
  };

  const collect = (captureId) => {
    const elements = [];
    let truncated = false;
    for (const el of document.querySelectorAll('body *')) {
      if (SKIP.has(el.tagName)) continue;
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue; // one entry per icon
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;

      const ownText = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join(' ')
        .trim();
      const worthKeeping =
        ownText ||
        STRUCTURAL.test(el.tagName) ||
        el.hasAttribute('role') ||
        el.hasAttribute('aria-label') ||
        cs.position === 'fixed' || cs.position === 'sticky' ||
        cs.boxShadow !== 'none' ||
        parseFloat(cs.borderTopWidth) > 0 ||
        parseFloat(cs.borderTopLeftRadius) > 0 ||
        cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        cs.display.includes('grid');
      if (!worthKeeping) continue;
      if (elements.length >= MAX_ELEMENTS) { truncated = true; break; }

      const style = {};
      for (const key of STYLE_KEYS) {
        const value = cs[key];
        if (value === undefined || value === '' || value === DEFAULTS[key]) continue;
        style[key] = value;
      }

      const entry = {
        tag: el.tagName.toLowerCase(),
        x: round(rect.left + window.scrollX),
        y: round(rect.top + window.scrollY),
        w: round(rect.width),
        h: round(rect.height),
        inViewport: rect.bottom > 0 && rect.top < window.innerHeight,
        style,
      };
      if (ownText) entry.text = ownText.slice(0, 80);
      const role = el.getAttribute('role');
      if (role) entry.role = role;
      const label = el.getAttribute('aria-label');
      if (label) entry.ariaLabel = label.slice(0, 80);
      const testId = el.getAttribute('data-testid');
      if (testId) entry.testId = testId;
      if (el.tagName === 'A') entry.link = describeLink(el);
      if (el.tagName === 'IMG') {
        entry.image = { naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, alt: (el.alt || '').slice(0, 80) };
      }
      if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
        entry.control = {
          type: el.getAttribute('type') || '',
          placeholder: el.getAttribute('placeholder') || '',
          disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
        };
      }
      elements.push(entry);
    }

    return {
      captureId,
      takenAt: new Date().toISOString(),
      page: { host: location.host, path: location.pathname, params: [...new URLSearchParams(location.search).keys()], title: document.title },
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
      document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, scrollY: round(window.scrollY) },
      language: document.documentElement.lang,
      fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => ({ family: f.family, weight: f.weight, style: f.style })),
      rootVariables: collectRootVariables(),
      truncated,
      elementCount: elements.length,
      elements,
    };
  };

  const save = (captureId) => {
    const data = collect(captureId);
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.captureId}-${data.viewport.width}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    console.log(`measure.js: ${data.elementCount} elements saved as ${link.download}`);
    return data;
  };

  // Exposed for scripted use: window.__measure('B1') returns the data without downloading.
  window.__measure = collect;

  const answer = typeof prompt === 'function' ? prompt('Capture ID (for example B1):', '') : '';
  if (answer === null) return 'cancelled';
  const id = answer.trim() || 'capture';

  // Wait a few seconds before measuring, so a menu, panel or hover state that
  // closed when you clicked away can be opened again. The tab title counts down.
  const WAIT_SECONDS = 5;
  const originalTitle = document.title;
  let secondsLeft = WAIT_SECONDS;
  const tick = () => {
    if (secondsLeft <= 0) {
      document.title = originalTitle;
      save(id);
      return;
    }
    document.title = `Measuring in ${secondsLeft}…`;
    secondsLeft -= 1;
    setTimeout(tick, 1000);
  };
  tick();
  return `Measuring "${id}" in ${WAIT_SECONDS} seconds`;
})();
