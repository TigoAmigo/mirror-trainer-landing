(function () {
const dataApi = window.MirrorTrainerData || {};
const persistEventLog = dataApi.logEvent || (async () => ({ mode: 'noop' }));
const persistInterestVote = dataApi.saveInterestVote || (async () => ({ mode: 'noop' }));
const persistLead = dataApi.saveLead || (async () => ({ mode: 'noop' }));
const persistPurchaseIntent = dataApi.savePurchaseIntent || (async () => ({ mode: 'noop' }));
const config = window.APP_CONFIG || {};
const memoryStore = window.__MIRROR_TRAINER_MEMORY__ || (window.__MIRROR_TRAINER_MEMORY__ = {});
const SESSION_KEY = 'mirror-trainer-session-id';
const INTEREST_KEY = 'mirror-trainer-interest-choice';
const PURCHASE_KEY = 'mirror-trainer-purchase-choice';

const state = {
  sessionId: getOrCreateSessionId(),
  interestChoice: readStorageItem(INTEREST_KEY),
  purchaseChoice: readStorageItem(PURCHASE_KEY),
  sectionViews: new Set(),
  scrollDepths: new Set(),
  activeModal: null,
  lastFocus: null,
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
    initSurveyGroup('interest');
    initSurveyGroup('purchase');
    initForms();
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
  const modalOpeners = document.querySelectorAll('[data-open-lead-modal]');
  const leadModal = document.querySelector('[data-modal="lead"]');
  const closeButtons = document.querySelectorAll('[data-close-modal]');

  modalOpeners.forEach((opener) => {
    opener.addEventListener('click', (event) => {
      event.preventDefault();
      openModal('lead');
      trackEvent('cta_click', { label: opener.dataset.eventLabel || 'lead_modal' });
      trackEvent('modal_open', { label: 'lead' });
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => closeModal());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  });

  if (leadModal) {
    leadModal.addEventListener('click', (event) => {
      if (event.target === leadModal) {
        closeModal();
      }
    });
  }
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

function initSurveyGroup(groupName) {
  const group = document.querySelector(`[data-survey-group="${groupName}"]`);
  const status = document.querySelector(`[data-survey-status="${groupName}"]`);

  if (!group || !status) {
    return;
  }

  const selectedValue = groupName === 'interest' ? state.interestChoice : state.purchaseChoice;
  if (selectedValue) {
    setActiveOption(group, selectedValue);
    status.textContent = 'Ответ уже сохранён. При желании его можно изменить.';
    status.classList.add('is-muted');
  }

  group.querySelectorAll('[data-option-value]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.optionValue || '';
      const buttons = group.querySelectorAll('[data-option-value]');
      setActiveOption(group, value);
      status.textContent = 'Сохраняем ответ...';
      status.classList.remove('is-success', 'is-muted');
      status.classList.add('is-pending');
      group.classList.add('is-busy');
      button.classList.add('is-pending');
      buttons.forEach((item) => {
        item.disabled = true;
      });

      try {
        if (groupName === 'interest') {
          state.interestChoice = value;
          writeStorageItem(INTEREST_KEY, value);
          await persistInterestVote(buildVotePayload(value));
          trackEvent('feedback_vote_select', { label: value });
          status.textContent = 'Спасибо, ответ сохранён.';
        } else {
          state.purchaseChoice = value;
          writeStorageItem(PURCHASE_KEY, value);
          await persistPurchaseIntent(buildVotePayload(value));
          trackEvent('purchase_intent_select', { label: value });
          status.textContent = 'Спасибо, ответ сохранён.';
        }

        status.classList.add('is-success');
      } catch (error) {
        console.error(error);
        status.textContent = 'Не удалось сохранить ответ. Попробуйте ещё раз.';
      } finally {
        status.classList.remove('is-pending');
        group.classList.remove('is-busy');
        button.classList.remove('is-pending');
        buttons.forEach((item) => {
          item.disabled = false;
        });
      }
    });
  });
}

function setActiveOption(group, value) {
  group.querySelectorAll('[data-option-value]').forEach((button) => {
    const isActive = button.dataset.optionValue === value;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function buildVotePayload(value) {
  return {
    value,
    sessionId: state.sessionId,
    pagePath,
    utmSource: utm.source,
    utmMedium: utm.medium,
    utmCampaign: utm.campaign,
    deviceType: getDeviceType(),
    referrer,
  };
}

function initForms() {
  const forms = document.querySelectorAll('[data-lead-form]');

  forms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const feedbackNode = form.querySelector('[data-form-feedback]');
      const submitButton = form.querySelector('button[type="submit"]');
      const sourceContext = form.dataset.formSource || 'inline';

      const payload = {
        name: String(formData.get('name') || '').trim(),
        contact: String(formData.get('contact') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        comment: String(formData.get('comment') || '').trim(),
        sourceContext,
        pagePath,
        sessionId: state.sessionId,
        purchaseIntentChoice: state.purchaseChoice,
        interestChoice: state.interestChoice,
        utmSource: utm.source,
        utmMedium: utm.medium,
        utmCampaign: utm.campaign,
        deviceType: getDeviceType(),
        referrer,
      };

      if (!payload.name || !payload.contact) {
        setFormFeedback(feedbackNode, 'Заполните имя и Telegram или телефон.', 'error');
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
          submitButton.textContent = sourceContext === 'modal' ? 'Оставить заявку' : 'Хочу предзаказ';
        }
      }
    });
  });
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
    link.addEventListener('click', () => {
      trackEvent('cta_click', { label: link.dataset.eventLabel || 'scroll_link' });
    });
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
