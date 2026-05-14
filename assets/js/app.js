(function () {
const dataApi = window.MirrorTrainerData || {};
const persistEventLog = dataApi.logEvent || (async () => ({ mode: 'noop' }));
const persistLead = dataApi.saveLead || (async () => ({ mode: 'noop' }));
const config = window.APP_CONFIG || {};
const memoryStore = window.__MIRROR_TRAINER_MEMORY__ || (window.__MIRROR_TRAINER_MEMORY__ = {});
const SESSION_KEY = 'mirror-trainer-session-id';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LANDING2_CONTENT_TARGETS = {
  'meta.title': { selector: 'title', target: 'text' },
  'meta.description': { selector: 'meta[name="description"]', target: 'attr', attr: 'content' },
  'nav.skill': { selector: '.site-nav a[href="#skill"]', target: 'text' },
  'nav.kit': { selector: '.site-nav a[href="#kit"]', target: 'text' },
  'nav.method': { selector: '.site-nav a[href="#method"]', target: 'text' },
  'nav.inside': { selector: '.site-nav a[href="#inside"]', target: 'text' },
  'nav.pricing': { selector: '.site-nav a[href="#pricing"]', target: 'text' },
  'nav.faq': { selector: '.site-nav a[href="#faq"]', target: 'text' },
  'header.cta': { selector: '.header-cta', target: 'text' },
  'hero.title': { selector: '.hero-title-desktop', target: 'text' },
  'hero.titleMobile': { selector: '.hero-title-mobile', target: 'text' },
  'hero.text': { selector: '.hero-text-desktop', target: 'text' },
  'hero.textMobile': { selector: '.hero-text-mobile', target: 'text' },
  'hero.ctaPrimary': { selector: '.hero-primary', target: 'text' },
  'hero.ctaSecondary': { selector: '.hero-secondary', target: 'text' },
  'hero.ctaTertiary': { selector: '.hero-link', target: 'text' },
  'hero.priceLabel': { selector: '.hero-price span', target: 'text' },
  'hero.priceAmount': { selector: '.hero-price strong', target: 'text' },
  'hero.priceNote': { selector: '.hero-price small', target: 'text' },
  'hero.chipTimeLabel': { selector: '.hero-chip-time span', target: 'text' },
  'hero.chipTimeValue': { selector: '.hero-chip-time strong', target: 'text' },
  'hero.chipKitLabel': { selector: '.hero-chip-kit span', target: 'text' },
  'hero.chipKitValue': { selector: '.hero-chip-kit strong', target: 'text' },
  'skill.title': { selector: '#skill .section-heading h2', target: 'text' },
  'skill.text': { selector: '#skill .section-heading p', target: 'text' },
  'skill.card1Title': { selector: '#skill .compact-card:nth-child(1) h3', target: 'text' },
  'skill.card1Text': { selector: '#skill .compact-card:nth-child(1) p', target: 'text' },
  'skill.card2Title': { selector: '#skill .compact-card:nth-child(2) h3', target: 'text' },
  'skill.card2Text': { selector: '#skill .compact-card:nth-child(2) p', target: 'text' },
  'skill.card3Title': { selector: '#skill .compact-card:nth-child(3) h3', target: 'text' },
  'skill.card3Text': { selector: '#skill .compact-card:nth-child(3) p', target: 'text' },
  'kit.title': { selector: '#kit .section-copy h2', target: 'text' },
  'kit.text': { selector: '#kit .section-copy > p', target: 'text' },
  'kit.item1Title': { selector: '#kit .kit-list article:nth-child(1) strong', target: 'text' },
  'kit.item1Text': { selector: '#kit .kit-list article:nth-child(1) span', target: 'text' },
  'kit.item2Title': { selector: '#kit .kit-list article:nth-child(2) strong', target: 'text' },
  'kit.item2Text': { selector: '#kit .kit-list article:nth-child(2) span', target: 'text' },
  'kit.item3Title': { selector: '#kit .kit-list article:nth-child(3) strong', target: 'text' },
  'kit.item3Text': { selector: '#kit .kit-list article:nth-child(3) span', target: 'text' },
  'kit.item4Title': { selector: '#kit .kit-list article:nth-child(4) strong', target: 'text' },
  'kit.item4Text': { selector: '#kit .kit-list article:nth-child(4) span', target: 'text' },
  'method.title': { selector: '#method .method-heading h2', target: 'text' },
  'method.text': { selector: '#method .method-heading p', target: 'text' },
  'method.step1Title': { selector: '#method .method-step:nth-child(1) h3', target: 'text' },
  'method.step1Text': { selector: '#method .method-step:nth-child(1) p', target: 'text' },
  'method.step2Title': { selector: '#method .method-step:nth-child(2) h3', target: 'text' },
  'method.step2Text': { selector: '#method .method-step:nth-child(2) p', target: 'text' },
  'method.step3Title': { selector: '#method .method-step:nth-child(3) h3', target: 'text' },
  'method.step3Text': { selector: '#method .method-step:nth-child(3) p', target: 'text' },
  'inside.title': { selector: '#inside .section-heading h2', target: 'text' },
  'inside.text': { selector: '#inside .section-heading p', target: 'text' },
  'inside.card1Title': { selector: '#inside figure:nth-child(1) figcaption strong', target: 'text' },
  'inside.card1Text': { selector: '#inside figure:nth-child(1) figcaption span', target: 'text' },
  'inside.card2Title': { selector: '#inside figure:nth-child(2) figcaption strong', target: 'text' },
  'inside.card2Text': { selector: '#inside figure:nth-child(2) figcaption span', target: 'text' },
  'inside.card3Title': { selector: '#inside figure:nth-child(3) figcaption strong', target: 'text' },
  'inside.card3Text': { selector: '#inside figure:nth-child(3) figcaption span', target: 'text' },
  'pricing.title': { selector: '#pricing .price-panel h2', target: 'text' },
  'pricing.text': { selector: '#pricing .price-panel > p', target: 'text' },
  'pricing.oldPrice': { selector: '#pricing .old-price', target: 'text' },
  'pricing.price': { selector: '#pricing .price-card strong', target: 'text' },
  'pricing.note': { selector: '#pricing .price-card small', target: 'text' },
  'pricing.list1': { selector: '#pricing .price-list li:nth-child(1)', target: 'text' },
  'pricing.list2': { selector: '#pricing .price-list li:nth-child(2)', target: 'text' },
  'pricing.list3': { selector: '#pricing .price-list li:nth-child(3)', target: 'text' },
  'pricing.list4': { selector: '#pricing .price-list li:nth-child(4)', target: 'text' },
  'form.title': { selector: '#lead-form .form-heading h3', target: 'text' },
  'form.text': { selector: '#lead-form .form-heading p', target: 'text' },
  'form.submit': { selector: '#lead-form button[type="submit"]', target: 'text' },
  'form.meta': { selector: '#lead-form .form-meta', target: 'text' },
  'faq.title': { selector: '#faq .faq-heading h2', target: 'text' },
  'faq.q1': { selector: '#faq .faq-item:nth-child(1) .faq-toggle span:first-child', target: 'text' },
  'faq.a1': { selector: '#faq .faq-item:nth-child(1) .faq-answer p', target: 'text' },
  'faq.q2': { selector: '#faq .faq-item:nth-child(2) .faq-toggle span:first-child', target: 'text' },
  'faq.a2': { selector: '#faq .faq-item:nth-child(2) .faq-answer p', target: 'text' },
  'faq.q3': { selector: '#faq .faq-item:nth-child(3) .faq-toggle span:first-child', target: 'text' },
  'faq.a3': { selector: '#faq .faq-item:nth-child(3) .faq-answer p', target: 'text' },
  'faq.q4': { selector: '#faq .faq-item:nth-child(4) .faq-toggle span:first-child', target: 'text' },
  'faq.a4': { selector: '#faq .faq-item:nth-child(4) .faq-answer p', target: 'text' },
  'faq.q5': { selector: '#faq .faq-item:nth-child(5) .faq-toggle span:first-child', target: 'text' },
  'faq.a5': { selector: '#faq .faq-item:nth-child(5) .faq-answer p', target: 'text' },
  'footer.text': { selector: '.footer-text', target: 'text' },
  'footer.telegramLabel': { selector: '[data-contact-label]', target: 'text' },
  'footer.telegramUrl': { selector: '[data-contact-link]', target: 'attr', attr: 'href' },
  'footer.phoneLabel': { selector: '[data-contact-phone-label]', target: 'text' },
  'footer.phoneUrl': { selector: '[data-contact-phone-link]', target: 'attr', attr: 'href' },
  'sticky.price': { selector: '.mobile-sticky-cta strong', target: 'text' },
  'sticky.label': { selector: '.mobile-sticky-cta span', target: 'text' },
  'sticky.cta': { selector: '.mobile-sticky-cta .button', target: 'text' },
  'photo.heroBackgroundPrompt': { selector: '[data-photo-slot="hero_background"]', target: 'attr', attr: 'data-photo-prompt' },
  'photo.heroProductDesktopPrompt': { selector: '[data-photo-slot="hero_product_desktop"]', target: 'attr', attr: 'data-photo-prompt' },
  'photo.heroProductMobilePrompt': { selector: '[data-photo-slot="hero_product_mobile"]', target: 'attr', attr: 'data-photo-prompt' },
  'photo.kitFlatlayPrompt': { selector: '[data-photo-slot="kit_flatlay"]', target: 'attr', attr: 'data-photo-prompt' },
  'photo.workbookSpreadPrompt': { selector: '[data-photo-slot="workbook_spread"]', target: 'attr', attr: 'data-photo-prompt' },
  'photo.trainingProcessPrompt': { selector: '[data-photo-slot="training_process"]', target: 'attr', attr: 'data-photo-prompt' },
  'photo.mirrorDetailPrompt': { selector: '[data-photo-slot="mirror_detail"]', target: 'attr', attr: 'data-photo-prompt' },
};

const LANDING3_CONTENT_TARGETS = {
  'meta.title': { selector: 'title', target: 'text' },
  'meta.description': { selector: 'meta[name="description"]', target: 'attr', attr: 'content' },
  'nav.skill': { selector: '.site-nav a[href="#skill"]', target: 'text' },
  'nav.kit': { selector: '.site-nav a[href="#kit"]', target: 'text' },
  'nav.method': { selector: '.site-nav a[href="#method"]', target: 'text' },
  'nav.pricing': { selector: '.site-nav a[href="#pricing"]', target: 'text' },
  'header.cta': { selector: '.header-cta', target: 'text' },
  'hero.title': { selector: '.hero-title', target: 'text' },
  'hero.text': { selector: '.hero-text', target: 'text' },
  'hero.ctaPrimary': { selector: '.hero-actions .button-gold', target: 'text' },
  'hero.ctaSecondary': { selector: '.hero-actions .button-dark', target: 'text' },
  'hero.priceLabel': { selector: '.hero-price span', target: 'text' },
  'hero.priceAmount': { selector: '.hero-price strong', target: 'text' },
  'hero.priceNote': { selector: '.hero-price small', target: 'text' },
  'skill.title': { selector: '#skill .section-copy h2', target: 'text' },
  'skill.text': { selector: '#skill .section-copy p', target: 'text' },
  'skill.card1Title': { selector: '#skill .glass-card:nth-child(1) h3', target: 'text' },
  'skill.card1Text': { selector: '#skill .glass-card:nth-child(1) p', target: 'text' },
  'skill.card2Title': { selector: '#skill .glass-card:nth-child(2) h3', target: 'text' },
  'skill.card2Text': { selector: '#skill .glass-card:nth-child(2) p', target: 'text' },
  'skill.card3Title': { selector: '#skill .glass-card:nth-child(3) h3', target: 'text' },
  'skill.card3Text': { selector: '#skill .glass-card:nth-child(3) p', target: 'text' },
  'kit.title': { selector: '#kit .section-copy h2', target: 'text' },
  'kit.item1Title': { selector: '#kit .kit-list article:nth-child(1) h3', target: 'text' },
  'kit.item1Text': { selector: '#kit .kit-list article:nth-child(1) p', target: 'text' },
  'kit.item2Title': { selector: '#kit .kit-list article:nth-child(2) h3', target: 'text' },
  'kit.item2Text': { selector: '#kit .kit-list article:nth-child(2) p', target: 'text' },
  'kit.item3Title': { selector: '#kit .kit-list article:nth-child(3) h3', target: 'text' },
  'kit.item3Text': { selector: '#kit .kit-list article:nth-child(3) p', target: 'text' },
  'method.title': { selector: '#method .section-copy h2', target: 'text' },
  'method.text': { selector: '#method .section-copy p', target: 'text' },
  'method.step1Title': { selector: '#method .method-step:nth-of-type(1) h3', target: 'text' },
  'method.step1Text': { selector: '#method .method-step:nth-of-type(1) p', target: 'text' },
  'method.step2Title': { selector: '#method .method-step:nth-of-type(2) h3', target: 'text' },
  'method.step2Text': { selector: '#method .method-step:nth-of-type(2) p', target: 'text' },
  'method.step3Title': { selector: '#method .method-step:nth-of-type(3) h3', target: 'text' },
  'method.step3Text': { selector: '#method .method-step:nth-of-type(3) p', target: 'text' },
  'visuals.card1Caption': { selector: '.section-visuals figure:nth-child(1) figcaption', target: 'text' },
  'visuals.card2Caption': { selector: '.section-visuals figure:nth-child(2) figcaption', target: 'text' },
  'visuals.card3Caption': { selector: '.section-visuals figure:nth-child(3) figcaption', target: 'text' },
  'pricing.title': { selector: '#pricing .pricing-copy h2', target: 'text' },
  'pricing.text': { selector: '#pricing .pricing-copy p', target: 'text' },
  'pricing.oldPrice': { selector: '#pricing .old-price', target: 'text' },
  'pricing.price': { selector: '#pricing .price-stack strong', target: 'text' },
  'pricing.list1': { selector: '#pricing .included-list li:nth-child(1)', target: 'text' },
  'pricing.list2': { selector: '#pricing .included-list li:nth-child(2)', target: 'text' },
  'pricing.list3': { selector: '#pricing .included-list li:nth-child(3)', target: 'text' },
  'form.title': { selector: '#lead-form .form-heading h2', target: 'text' },
  'form.text': { selector: '#lead-form .form-heading p', target: 'text' },
  'form.submit': { selector: '#lead-form button[type="submit"]', target: 'text' },
  'form.meta': { selector: '#lead-form .privacy-note', target: 'text' },
  'faq.title': { selector: '#faq .faq-title h2', target: 'text' },
  'faq.q1': { selector: '#faq .faq-item:nth-child(1) .faq-toggle span:first-child', target: 'text' },
  'faq.a1': { selector: '#faq .faq-item:nth-child(1) .faq-answer p', target: 'text' },
  'faq.q2': { selector: '#faq .faq-item:nth-child(2) .faq-toggle span:first-child', target: 'text' },
  'faq.a2': { selector: '#faq .faq-item:nth-child(2) .faq-answer p', target: 'text' },
  'faq.q3': { selector: '#faq .faq-item:nth-child(3) .faq-toggle span:first-child', target: 'text' },
  'faq.a3': { selector: '#faq .faq-item:nth-child(3) .faq-answer p', target: 'text' },
  'footer.brandNote': { selector: '.footer-brand small', target: 'text' },
  'footer.telegramTitle': { selector: '.footer-telegram strong', target: 'text' },
  'footer.telegramLabel': { selector: '[data-contact-telegram-label]', target: 'text' },
  'footer.telegramUrl': { selector: '[data-contact-telegram-link]', target: 'attr', attr: 'href' },
  'footer.phoneTitle': { selector: '.footer-phone strong', target: 'text' },
  'footer.phoneLabel': { selector: '[data-contact-phone-label]', target: 'text' },
  'footer.phoneUrl': { selector: '[data-contact-phone-link]', target: 'attr', attr: 'href' },
};

const LANDING_CONTENT_TARGETS = {
  landing2: LANDING2_CONTENT_TARGETS,
  landing3: LANDING3_CONTENT_TARGETS,
};

const state = {
  sessionId: getOrCreateSessionId(),
  sectionViews: new Set(),
  scrollDepths: new Set(),
  activeModal: null,
  lastFocus: null,
  faqItems: [],
};

const utm = {
  source: getSearchParam('utm_source'),
  medium: getSearchParam('utm_medium'),
  campaign: getSearchParam('utm_campaign'),
};

const pagePath = `${window.location.pathname}${window.location.search}`;
const referrer = document.referrer || '';

init();

function init() {
  try {
    applyContactInfo();
    initLandingContentOverrides();
    initHeader();
    initStickyCta();
    initRevealObserver();
    initHeroParallax();
    initImageFallbacks();
    initSectionTracking();
    initScrollDepthTracking();
    initModalSystem();
    initLightbox();
    initFaqAccordion();
    initLeadForms();
    bindScrollLinks();
    logPageView();
  } catch (error) {
    console.error('Landing init failed, switching to safe visual fallback.', error);
    document.documentElement.classList.remove('js-animations');
    document.querySelectorAll('.reveal').forEach((item) => item.classList.add('in-view'));
  }
}

function getOrCreateSessionId() {
  const existing = readStorageItem(SESSION_KEY);

  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  writeStorageItem(SESSION_KEY, generated);
  return generated;
}

function readStorageItem(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) {
      memoryStore[key] = value;
      return value;
    }
  } catch (error) {
    console.warn(`Failed to access localStorage key "${key}", using memory fallback.`, error);
  }

  const cookieValue = readCookie(key);
  if (cookieValue !== null) {
    memoryStore[key] = cookieValue;
    return cookieValue;
  }

  return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : '';
}

function writeStorageItem(key, value) {
  memoryStore[key] = String(value);

  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    console.warn(`Failed to persist localStorage key "${key}", using memory fallback.`, error);
  }

  writeCookie(key, String(value));
}

function readCookie(name) {
  const source = document.cookie || '';
  const prefix = `${encodeURIComponent(name)}=`;
  const entry = source.split('; ').find((item) => item.startsWith(prefix));

  if (!entry) {
    return null;
  }

  return decodeURIComponent(entry.slice(prefix.length));
}

function writeCookie(name, value) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function getSearchParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function getDeviceType() {
  const width = window.innerWidth;

  if (width < 720) {
    return 'mobile';
  }

  if (width < 1100) {
    return 'tablet';
  }

  return 'desktop';
}

function applyContactInfo() {
  const telegramLinks = document.querySelectorAll('[data-contact-link], [data-contact-telegram-link]');
  const telegramLabels = document.querySelectorAll('[data-contact-label], [data-contact-telegram-label]');
  const phoneLinks = document.querySelectorAll('[data-contact-phone-link]');
  const phoneLabels = document.querySelectorAll('[data-contact-phone-label]');

  if (config.contactTelegramUrl) {
    telegramLinks.forEach((link) => {
      link.href = config.contactTelegramUrl;
    });
  }

  if (config.contactTelegramLabel) {
    telegramLabels.forEach((label) => {
      label.textContent = config.contactTelegramLabel;
    });
  }

  if (config.contactPhoneUrl) {
    phoneLinks.forEach((link) => {
      link.href = config.contactPhoneUrl;
    });
  }

  if (config.contactPhoneLabel) {
    phoneLabels.forEach((label) => {
      label.textContent = config.contactPhoneLabel;
    });
  }
}

function initLandingContentOverrides() {
  const pageSlug = getEditableLandingSlug();

  if (!pageSlug) {
    return;
  }

  const applyState = (contentState) => {
    applyLandingContentState(contentState, document);
  };

  try {
    applyState(dataApi.getLandingContentSnapshotSync?.(pageSlug));
  } catch (error) {
    console.warn('Failed to apply local landing content overrides.', error);
  }

  dataApi.getLandingContent?.(pageSlug)
    .then(applyState)
    .catch((error) => {
      console.warn('Failed to load landing content overrides.', error);
    });

  dataApi.onLandingContentChange?.((detail) => {
    if (detail.pageSlug && detail.pageSlug !== pageSlug) {
      return;
    }

    dataApi.getLandingContent?.(pageSlug)
      .then(applyState)
      .catch((error) => {
        console.warn('Failed to refresh landing content overrides.', error);
      });
  });
}

function getEditableLandingSlug() {
  const normalizedPath = window.location.pathname.toLowerCase();

  if (normalizedPath.endsWith('/landing-3.html') || normalizedPath.endsWith('landing-3.html')) {
    return 'landing3';
  }

  if (normalizedPath.endsWith('/landing-2.html') || normalizedPath.endsWith('landing-2.html')) {
    return 'landing2';
  }

  return '';
}

function applyLandingContentState(contentState, root) {
  const items = Array.isArray(contentState?.items) ? contentState.items : [];
  const pageSlug = contentState?.pageSlug || getEditableLandingSlug() || 'landing2';
  const targetMap = LANDING_CONTENT_TARGETS[pageSlug] || LANDING_CONTENT_TARGETS.landing2;

  if (!items.length) {
    return;
  }

  items.forEach((item) => {
    const target = targetMap[item.key];
    const value = String(item.value ?? '');

    if (!target || !value.trim()) {
      return;
    }

    const node = root.querySelector(target.selector);

    if (!node) {
      return;
    }

    if (target.target === 'attr' && target.attr) {
      node.setAttribute(target.attr, value);
      return;
    }

    node.textContent = value;

    if (item.key === 'meta.title') {
      document.title = value;
    }
  });
}

function initHeader() {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-mobile-toggle]');
  const nav = document.querySelector('[data-mobile-nav]');

  if (!header || !toggle || !nav) {
    return;
  }

  const closeNav = () => {
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const updateHeaderState = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 10);

    if (window.innerWidth > 840) {
      closeNav();
    }
  };

  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', updateHeaderState, { passive: true });

  toggle.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      closeNav();
    });
  });

  document.addEventListener('click', (event) => {
    if (
      !document.body.classList.contains('nav-open') ||
      nav.contains(event.target) ||
      toggle.contains(event.target)
    ) {
      return;
    }

    closeNav();
  });
}

function initStickyCta() {
  const stickyCta = document.querySelector('[data-sticky-cta]');
  const hero = document.querySelector('.hero');
  const pricing = document.querySelector('#pricing');

  if (!stickyCta || !hero) {
    return;
  }

  const hide = () => {
    stickyCta.classList.remove('is-visible');
    stickyCta.setAttribute('aria-hidden', 'true');
  };

  const update = () => {
    if (window.innerWidth >= 760) {
      hide();
      return;
    }

    const heroRect = hero.getBoundingClientRect();
    const pricingRect = pricing ? pricing.getBoundingClientRect() : null;
    const pricingVisible =
      pricingRect &&
      pricingRect.top < window.innerHeight - 96 &&
      pricingRect.bottom > 96;
    const shouldShow = heroRect.bottom < 0 && !pricingVisible;

    stickyCta.classList.toggle('is-visible', shouldShow);
    stickyCta.setAttribute('aria-hidden', String(!shouldShow));
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
}

function initRevealObserver() {
  const items = document.querySelectorAll('.reveal');

  if (!prefersReducedMotion) {
    document.documentElement.classList.add('js-animations');
  }

  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    items.forEach((item) => item.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  items.forEach((item) => observer.observe(item));
}

function initHeroParallax() {
  if (prefersReducedMotion) {
    return;
  }

  const stage = document.querySelector('[data-parallax-stage]');

  if (!stage) {
    return;
  }

  const layers = Array.from(stage.querySelectorAll('[data-parallax-layer]'));

  const update = (event) => {
    const rect = stage.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;

    layers.forEach((layer) => {
      const depth = Number(layer.dataset.parallaxLayer || 0.1);
      const moveX = relativeX * 46 * depth;
      const moveY = relativeY * 38 * depth;
      layer.style.setProperty('--parallax-x', `${moveX}px`);
      layer.style.setProperty('--parallax-y', `${moveY}px`);
    });
  };

  const reset = () => {
    layers.forEach((layer) => {
      layer.style.removeProperty('--parallax-x');
      layer.style.removeProperty('--parallax-y');
    });
  };

  stage.addEventListener('pointermove', update);
  stage.addEventListener('pointerleave', reset);
}

function initSectionTracking() {
  const sections = document.querySelectorAll('[data-section]');

  if (!('IntersectionObserver' in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const sectionId = entry.target.id;
        if (!sectionId || state.sectionViews.has(sectionId)) {
          return;
        }

        state.sectionViews.add(sectionId);
        trackEvent('section_view', { sectionId, label: sectionId });
      });
    },
    {
      threshold: 0.4,
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function initScrollDepthTracking() {
  const thresholds = [25, 50, 75, 100];

  const trackDepth = () => {
    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const progress =
      documentHeight > 0 ? ((scrollTop + viewportHeight) / documentHeight) * 100 : 100;

    thresholds.forEach((depth) => {
      if (progress >= depth && !state.scrollDepths.has(depth)) {
        state.scrollDepths.add(depth);
        trackEvent('scroll_depth', {
          label: `${depth}%`,
          metadata: { depth },
        });
      }
    });
  };

  trackDepth();
  window.addEventListener('scroll', trackDepth, { passive: true });
}

function initModalSystem() {
  const closeButtons = document.querySelectorAll('[data-close-modal]');
  const modals = document.querySelectorAll('.modal-shell');

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => closeModal());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  });

  modals.forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  });
}

function initLightbox() {
  const lightboxModal = document.querySelector('[data-modal="lightbox"]');
  const lightboxImage = document.querySelector('[data-lightbox-image]');
  const lightboxCaption = document.querySelector('[data-lightbox-caption]');
  const openers = document.querySelectorAll('[data-open-lightbox]');

  openers.forEach((opener) => {
    opener.addEventListener('click', () => {
      if (!lightboxModal || !lightboxImage || !lightboxCaption) {
        return;
      }

      lightboxImage.src = opener.dataset.imageSrc || '';
      lightboxImage.alt = opener.dataset.imageAlt || '';
      lightboxCaption.textContent = opener.dataset.imageCaption || '';
      openModal('lightbox');
      trackEvent('image_open', {
        label: opener.dataset.imageAlt || opener.dataset.imageSrc || 'image',
      });
    });
  });
}

function initImageFallbacks() {
  document.querySelectorAll('[data-image-fallback]').forEach((img) => {
    const surface = img.closest('.media-surface');

    const applyFallback = () => {
      if (!surface) {
        return;
      }

      surface.classList.add('is-fallback');
      img.hidden = true;
    };

    if (img.complete && img.naturalWidth === 0) {
      applyFallback();
    }

    img.addEventListener('error', applyFallback, { once: true });
    img.addEventListener('load', () => {
      if (surface) {
        surface.classList.remove('is-fallback');
      }
      img.hidden = false;
    });
  });
}

function initFaqAccordion() {
  const items = Array.from(document.querySelectorAll('.faq-item'));

  if (!items.length) {
    return;
  }

  state.faqItems = items;

  items.forEach((item) => {
    const button = item.querySelector('.faq-toggle');
    const answer = item.querySelector('.faq-answer');

    if (!button || !answer) {
      return;
    }

    item.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    answer.hidden = true;
    answer.style.height = '0px';

    button.addEventListener('click', () => {
      if (item.dataset.animating === 'true') {
        return;
      }

      if (item.classList.contains('is-open')) {
        closeFaqItem(item);
        return;
      }

      items.forEach((otherItem) => {
        if (otherItem !== item && otherItem.classList.contains('is-open')) {
          closeFaqItem(otherItem);
        }
      });

      openFaqItem(item);
    });
  });

  window.addEventListener('resize', () => {
    state.faqItems.forEach((item) => {
      if (!item.classList.contains('is-open')) {
        return;
      }

      const answer = item.querySelector('.faq-answer');
      if (answer) {
        answer.style.height = `${answer.scrollHeight}px`;
      }
    });
  }, { passive: true });
}

function openFaqItem(item) {
  const button = item.querySelector('.faq-toggle');
  const answer = item.querySelector('.faq-answer');

  if (!button || !answer) {
    return;
  }

  item.dataset.animating = 'true';
  answer.hidden = false;
  item.classList.add('is-open');
  button.setAttribute('aria-expanded', 'true');
  answer.style.height = '0px';

  requestAnimationFrame(() => {
    answer.style.height = `${answer.scrollHeight}px`;
  });

  const handleTransitionEnd = (event) => {
    if (event.target !== answer || event.propertyName !== 'height') {
      return;
    }

    window.clearTimeout(fallbackTimer);
    answer.style.height = 'auto';
    item.dataset.animating = 'false';
    answer.removeEventListener('transitionend', handleTransitionEnd);
  };

  const fallbackTimer = window.setTimeout(() => {
    answer.style.height = 'auto';
    item.dataset.animating = 'false';
    answer.removeEventListener('transitionend', handleTransitionEnd);
  }, 520);

  answer.addEventListener('transitionend', handleTransitionEnd);
}

function closeFaqItem(item, options = {}) {
  const button = item.querySelector('.faq-toggle');
  const answer = item.querySelector('.faq-answer');

  if (!button || !answer) {
    return;
  }

  if (options.immediate) {
    item.classList.remove('is-open');
    item.dataset.animating = 'false';
    button.setAttribute('aria-expanded', 'false');
    answer.hidden = true;
    answer.style.height = '0px';
    return;
  }

  item.dataset.animating = 'true';
  answer.style.height = `${answer.scrollHeight}px`;

  requestAnimationFrame(() => {
    item.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    answer.style.height = '0px';
  });

  const handleTransitionEnd = (event) => {
    if (event.target !== answer || event.propertyName !== 'height') {
      return;
    }

    window.clearTimeout(fallbackTimer);
    item.dataset.animating = 'false';
    answer.hidden = true;
    answer.removeEventListener('transitionend', handleTransitionEnd);
  };

  const fallbackTimer = window.setTimeout(() => {
    item.dataset.animating = 'false';
    answer.hidden = true;
    answer.removeEventListener('transitionend', handleTransitionEnd);
  }, 520);

  answer.addEventListener('transitionend', handleTransitionEnd);
}

function initLeadForms() {
  const forms = document.querySelectorAll('[data-lead-form]');

  forms.forEach((form) => {
    const nameInput = form.querySelector('[data-name-input]');
    const phoneInput = form.querySelector('[data-phone-input]');
    const telegramInput = form.querySelector('[data-telegram-input]');

    if (nameInput) {
      bindNameInput(nameInput);
    }

    if (phoneInput) {
      bindPhoneInput(phoneInput);
    }

    if (telegramInput) {
      bindTelegramInput(telegramInput);
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const feedbackNode = form.querySelector('[data-form-feedback]');
      const submitButton = form.querySelector('button[type="submit"]');
      const originalSubmitText = submitButton
        ? submitButton.dataset.submitLabel || submitButton.textContent.trim()
        : '';
      const sourceContext = form.dataset.formSource || 'inline';

      const payload = buildLeadPayload(formData, sourceContext);
      const validationMessage = validateLeadPayload(payload);

      if (validationMessage) {
        setFormFeedback(feedbackNode, validationMessage, 'error');
        return;
      }

      if (submitButton) {
        submitButton.dataset.submitLabel = originalSubmitText;
        submitButton.disabled = true;
        submitButton.textContent = 'Отправляем...';
      }

      setFormFeedback(feedbackNode, '', '');

      try {
        await persistLead(payload);
        trackEvent('form_submit', { label: sourceContext });
        setFormFeedback(
          feedbackNode,
          'Спасибо. Заявка сохранена, мы свяжемся с вами ближе к запуску.',
          'success'
        );
        showToast('Заявка отправлена.', 'success');
        form.reset();
        resetLeadFormInputs(form);
        showSuccessModal();
      } catch (error) {
        console.error(error);
        setFormFeedback(
          feedbackNode,
          'Не удалось отправить форму. Проверьте подключение к онлайн-базе.',
          'error'
        );
        showToast('Не удалось отправить форму.', 'error');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalSubmitText || 'Забронировать за 1490 ₽';
        }
      }
    });
  });
}

function buildLeadPayload(formData, sourceContext) {
  const normalizedName = normalizeName(formData.get('name'));
  const formattedPhone = formatPhoneInputValue(String(formData.get('phone') || ''));
  const telegramHandle = sanitizeTelegramValue(String(formData.get('telegram') || ''));
  const telegram = telegramHandle ? `@${telegramHandle}` : '';

  return {
    name: normalizedName,
    phone: formattedPhone,
    telegram,
    contact: [formattedPhone, telegram].filter(Boolean).join(' / '),
    email: String(formData.get('email') || '').trim(),
    comment: String(formData.get('comment') || '').trim(),
    sourceContext,
    pagePath,
    sessionId: state.sessionId,
    utmSource: utm.source,
    utmMedium: utm.medium,
    utmCampaign: utm.campaign,
    deviceType: getDeviceType(),
    referrer,
  };
}

function validateLeadPayload(payload) {
  if (!isValidName(payload.name)) {
    return 'Укажите имя без цифр и лишних символов.';
  }

  const hasPhone = Boolean(payload.phone);
  const hasTelegram = Boolean(payload.telegram);

  if (!hasPhone && !hasTelegram) {
    return 'Укажите телефон или Телеграм для связи.';
  }

  if (hasPhone && !isValidPhone(payload.phone)) {
    return 'Укажите корректный российский номер телефона.';
  }

  if (hasTelegram && !isValidTelegram(payload.telegram)) {
    return 'Укажите корректное имя в Телеграме.';
  }

  return '';
}

function bindNameInput(input) {
  input.addEventListener('input', () => {
    const sanitized = sanitizeNameValue(input.value);
    if (input.value !== sanitized) {
      input.value = sanitized;
    }
  });

  input.addEventListener('blur', () => {
    input.value = normalizeName(input.value);
  });
}

function bindPhoneInput(input) {
  input.addEventListener('focus', () => {
    if (!input.value.trim()) {
      input.value = '+7';
    }
  });

  input.addEventListener('input', () => {
    input.value = formatPhoneInputValue(input.value);
  });

  input.addEventListener('blur', () => {
    const digits = normalizePhoneDigits(input.value);
    input.value = digits.length > 1 ? formatPhoneInputValue(input.value) : '';
  });

  input.addEventListener('paste', (event) => {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    input.value = formatPhoneInputValue(paste);
  });
}

function bindTelegramInput(input) {
  input.addEventListener('input', () => {
    const sanitized = sanitizeTelegramValue(input.value);
    if (input.value !== sanitized) {
      input.value = sanitized;
    }
  });

  input.addEventListener('paste', (event) => {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    input.value = sanitizeTelegramValue(paste);
  });
}

function sanitizeNameValue(value) {
  return String(value || '')
    .replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '')
    .replace(/\s{2,}/g, ' ');
}

function normalizeName(value) {
  return sanitizeNameValue(value)
    .replace(/\s*-\s*/g, '-')
    .trim();
}

function isValidName(value) {
  return /^[A-Za-zА-Яа-яЁё]+(?:[ -][A-Za-zА-Яа-яЁё]+)*$/.test(String(value || ''));
}

function normalizePhoneDigits(value) {
  let digits = String(value || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits[0] === '8') {
    digits = `7${digits.slice(1)}`;
  } else if (digits[0] === '9') {
    digits = `7${digits}`;
  } else if (digits[0] !== '7') {
    digits = `7${digits}`;
  }

  return digits.slice(0, 11);
}

function formatPhoneInputValue(value) {
  const digits = normalizePhoneDigits(value);

  if (!digits) {
    return '';
  }

  const local = digits.slice(1);
  let result = '+7';

  if (local.length) {
    result += ` (${local.slice(0, 3)}`;
  }

  if (local.length >= 3) {
    result += ')';
  }

  if (local.length > 3) {
    result += ` ${local.slice(3, 6)}`;
  }

  if (local.length > 6) {
    result += `-${local.slice(6, 8)}`;
  }

  if (local.length > 8) {
    result += `-${local.slice(8, 10)}`;
  }

  return result;
}

function isValidPhone(value) {
  const digits = normalizePhoneDigits(value);
  return digits.length === 11 && digits.startsWith('7');
}

function sanitizeTelegramValue(value) {
  return String(value || '')
    .replace(/^@+/, '')
    .replace(/[^A-Za-z0-9_]/g, '')
    .slice(0, 32);
}

function isValidTelegram(value) {
  return /^@[A-Za-z0-9_]+$/.test(String(value || ''));
}

function resetLeadFormInputs(form) {
  const phoneInput = form.querySelector('[data-phone-input]');
  const telegramInput = form.querySelector('[data-telegram-input]');
  const nameInput = form.querySelector('[data-name-input]');

  if (phoneInput) {
    phoneInput.value = '';
  }

  if (telegramInput) {
    telegramInput.value = '';
  }

  if (nameInput) {
    nameInput.value = '';
  }
}

function setFormFeedback(node, message, type) {
  if (!node) {
    return;
  }

  node.textContent = message;
  node.classList.remove('is-success', 'is-error');

  if (type === 'success') {
    node.classList.add('is-success');
  }

  if (type === 'error') {
    node.classList.add('is-error');
  }
}

function bindScrollLinks() {
  document.querySelectorAll('[data-scroll-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href') || '';

      if (href.startsWith('#')) {
        const target = document.querySelector(href);

        if (target) {
          event.preventDefault();
          scrollToTarget(target);
        }
      }

      trackEvent('cta_click', { label: link.dataset.eventLabel || 'scroll_link' });
    });
  });
}

function scrollToTarget(target) {
  const header = document.querySelector('[data-header]');
  const offset = (header ? header.offsetHeight : 0) + 18;
  const top = window.scrollY + target.getBoundingClientRect().top - offset;

  window.scrollTo({
    top: Math.max(top, 0),
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}

function openModal(name) {
  const modal = document.querySelector(`[data-modal="${name}"]`);

  if (!modal) {
    return;
  }

  document.body.classList.remove('nav-open');
  const toggle = document.querySelector('[data-mobile-toggle]');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
  }

  state.lastFocus = document.activeElement;
  state.activeModal = modal;
  document.body.classList.add('modal-open');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');

  const focusable = modal.querySelector('input, button, textarea');
  if (focusable) {
    window.setTimeout(() => focusable.focus(), 20);
  }
}

function closeModal() {
  if (!state.activeModal) {
    return;
  }

  state.activeModal.classList.remove('is-open');
  state.activeModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  if (state.lastFocus instanceof HTMLElement) {
    state.lastFocus.focus();
  }

  const lightboxImage = document.querySelector('[data-lightbox-image]');
  if (lightboxImage && state.activeModal.dataset.modal === 'lightbox') {
    lightboxImage.removeAttribute('src');
    lightboxImage.removeAttribute('alt');
  }

  state.activeModal = null;
}

function showSuccessModal() {
  closeModal();
  openModal('success');
  trackEvent('modal_open', { label: 'success' });
}

function logPageView() {
  trackEvent('page_view', {
    label: 'landing_view',
    metadata: {
      title: document.title,
      storageMode: config.supabaseUrl && config.supabaseAnonKey ? 'configured' : 'local',
    },
  });
}

function trackEvent(eventName, options = {}) {
  const payload = {
    sessionId: state.sessionId,
    eventName,
    pagePath,
    sectionId: options.sectionId || '',
    label: options.label || '',
    utmSource: utm.source,
    utmMedium: utm.medium,
    utmCampaign: utm.campaign,
    deviceType: getDeviceType(),
    referrer,
    metadata: options.metadata || {},
  };

  persistEventLog(payload).catch((error) => {
    console.error(`Failed to log event "${eventName}"`, error);
  });
}

function showToast(message, type = 'success') {
  const stack = document.querySelector('[data-toast-stack]');
  if (!stack) {
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast is-${type}`;
  toast.textContent = message;
  stack.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3600);
}
})();
