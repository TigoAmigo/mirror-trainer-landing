(function () {
const dataApi = window.MirrorTrainerData || {};
const persistEventLog = dataApi.logEvent || (async () => ({ mode: 'noop' }));
const persistLead = dataApi.saveLead || (async () => ({ mode: 'noop' }));
const config = window.APP_CONFIG || {};
const memoryStore = window.__MIRROR_TRAINER_MEMORY__ || (window.__MIRROR_TRAINER_MEMORY__ = {});
const SESSION_KEY = 'mirror-trainer-session-id';

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
    initHeader();
    initRevealObserver();
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
  const link = document.querySelector('[data-contact-link]');
  const label = document.querySelector('[data-contact-label]');

  if (link && config.contactTelegramUrl) {
    link.href = config.contactTelegramUrl;
  }

  if (label && config.contactTelegramLabel) {
    label.textContent = config.contactTelegramLabel;
  }
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

function initRevealObserver() {
  const items = document.querySelectorAll('.reveal');
  document.documentElement.classList.add('js-animations');

  if (!('IntersectionObserver' in window)) {
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
    const summary = item.querySelector('summary');

    if (!summary) {
      return;
    }

    item.open = false;
    item.classList.remove('is-open');
    summary.setAttribute('aria-expanded', 'false');
    syncFaqItemHeight(item);

    summary.addEventListener('click', (event) => {
      event.preventDefault();

      if (item.dataset.animating === 'true') {
        return;
      }

      if (item.open) {
        closeFaqItem(item);
      } else {
        openFaqItem(item);
      }
    });
  });

  window.addEventListener('resize', syncFaqHeights, { passive: true });
}

function syncFaqHeights() {
  state.faqItems.forEach((item) => syncFaqItemHeight(item));
}

function syncFaqItemHeight(item) {
  const summary = item.querySelector('summary');

  if (!summary) {
    return;
  }

  if (item.open) {
    item.style.maxHeight = 'none';
    return;
  }

  item.style.maxHeight = `${summary.offsetHeight}px`;
}

function openFaqItem(item) {
  const summary = item.querySelector('summary');

  if (!summary) {
    return;
  }

  item.dataset.animating = 'true';
  item.open = true;
  item.classList.add('is-open');
  summary.setAttribute('aria-expanded', 'true');
  item.style.maxHeight = `${summary.offsetHeight}px`;

  requestAnimationFrame(() => {
    item.style.maxHeight = `${item.scrollHeight}px`;
  });

  const handleTransitionEnd = (event) => {
    if (event.target !== item || event.propertyName !== 'max-height') {
      return;
    }

    item.style.maxHeight = 'none';
    item.dataset.animating = 'false';
    item.removeEventListener('transitionend', handleTransitionEnd);
  };

  item.addEventListener('transitionend', handleTransitionEnd);
}

function closeFaqItem(item) {
  const summary = item.querySelector('summary');

  if (!summary) {
    return;
  }

  item.dataset.animating = 'true';
  item.style.maxHeight = `${item.scrollHeight}px`;

  requestAnimationFrame(() => {
    item.classList.remove('is-open');
    item.style.maxHeight = `${summary.offsetHeight}px`;
  });

  const handleTransitionEnd = (event) => {
    if (event.target !== item || event.propertyName !== 'max-height') {
      return;
    }

    item.open = false;
    item.dataset.animating = 'false';
    summary.setAttribute('aria-expanded', 'false');
    item.removeEventListener('transitionend', handleTransitionEnd);
  };

  item.addEventListener('transitionend', handleTransitionEnd);
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
      const sourceContext = form.dataset.formSource || 'inline';

      const payload = buildLeadPayload(formData, sourceContext);
      const validationMessage = validateLeadPayload(payload);

      if (validationMessage) {
        setFormFeedback(feedbackNode, validationMessage, 'error');
        return;
      }

      if (submitButton) {
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
          'Не удалось отправить форму. Проверьте подключение к Supabase.',
          'error'
        );
        showToast('Не удалось отправить форму.', 'error');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Хочу предзаказ';
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

  if (!isValidPhone(payload.phone)) {
    return 'Укажите корректный российский номер телефона.';
  }

  if (!isValidTelegram(payload.telegram)) {
    return 'Укажите корректный Telegram через username.';
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
    behavior: 'smooth',
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
