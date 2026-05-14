(function () {
const dataApi = window.MirrorTrainerData || {};
const fetchDashboardSnapshot = dataApi.getDashboardSnapshot || (async () => ({ summary: {}, ctaBreakdown: [], scrollDepth: [], updatedAt: new Date().toISOString(), storageMode: 'local' }));
const fetchLeadRecords = dataApi.getLeadRecords || (async () => []);
const fetchLandingContent = dataApi.getLandingContentAdmin || dataApi.getLandingContent || (async () => ({ items: [], storageMode: 'local', updatedAt: new Date().toISOString() }));
const saveLandingContent = dataApi.saveLandingContentAdmin || (async (_pageSlug, items) => ({ items, storageMode: 'local', updatedAt: new Date().toISOString() }));
const clearLandingContent = dataApi.clearLandingContentAdmin || (async () => ({ items: [], storageMode: 'local', updatedAt: new Date().toISOString() }));
const setAdminCredentials = dataApi.setAdminCredentials || (() => {});
const clearAdminCredentials = dataApi.clearAdminCredentials || (() => {});
const hasRemoteConfig = Boolean(dataApi.hasRemoteConfig);
const dashboardChannelName = dataApi.dashboardChannel || 'mirror-trainer-dashboard-sync';
const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = '714513';
const ADMIN_SESSION_KEY = 'mirror-trainer-admin-session';
const LEAD_META_KEY = 'mirror-trainer-admin-lead-workspace';

const TAB_META = {
  overview: {
    label: 'Рабочий стол',
    title: 'Обзор проекта',
    subtitle: 'Заявки, лендинги и свежие метрики в одном месте.',
  },
  landing: {
    label: 'Лендинги',
    title: 'Редактирование сайтов',
    subtitle: 'Выберите лендинг и быстро исправьте тексты, контакты, цену или форму.',
  },
  leads: {
    label: 'Заявки',
    title: 'Заявки и контакты',
    subtitle: 'Поиск, статусы, заметки, быстрые контакты и выгрузка таблицы.',
  },
  analytics: {
    label: 'Аналитика',
    title: 'Клики и воронка',
    subtitle: 'Переходы по кнопкам, глубина просмотра и заявки.',
  },
};

const STATUS_META = {
  new: { label: 'Новая', short: 'Новые' },
  contacted: { label: 'Связались', short: 'Связались' },
  reserved: { label: 'В резерве', short: 'Резерв' },
  done: { label: 'Закрыто', short: 'Закрыто' },
  spam: { label: 'Спам', short: 'Спам' },
};

const PRIORITY_META = {
  normal: 'Обычная',
  high: 'Важная',
  low: 'Низкая',
};

const DEFAULT_LANDING_SLUG = 'landing3';
const LANDING_SCHEMAS = {
  landing3: {
    pageSlug: 'landing3',
    title: 'Лендинг 3',
    shortTitle: 'Новый сайт',
    url: './landing-3.html',
    groups: [
      {
        id: 'contacts',
        title: 'Контакты',
        items: [
          field('footer.telegramTitle', 'Название ссылки Телеграма', '.footer-telegram strong', 'text', 'short'),
          field('footer.telegramLabel', 'Имя в Телеграме', '[data-contact-telegram-label]', 'text', 'short'),
          field('footer.telegramUrl', 'Ссылка на Телеграм', '[data-contact-telegram-link]', 'attr', 'url', 'href'),
          field('footer.phoneTitle', 'Название телефона', '.footer-phone strong', 'text', 'short'),
          field('footer.phoneLabel', 'Номер телефона', '[data-contact-phone-label]', 'text', 'short'),
          field('footer.phoneUrl', 'Ссылка для звонка', '[data-contact-phone-link]', 'attr', 'url', 'href', 'Например: tel:+79991234567'),
          field('footer.brandNote', 'Описание внизу сайта', '.footer-brand small', 'text', 'long'),
        ],
      },
      {
        id: 'first',
        title: 'Первый экран',
        items: [
          field('meta.title', 'Название вкладки браузера', 'title', 'text', 'short'),
          field('meta.description', 'Описание для поиска', 'meta[name="description"]', 'attr', 'long', 'content'),
          field('header.cta', 'Кнопка в шапке', '.header-cta', 'text', 'short'),
          field('hero.title', 'Главный заголовок', '.hero-title', 'text', 'long'),
          field('hero.text', 'Текст под заголовком', '.hero-text', 'text', 'long'),
          field('hero.ctaPrimary', 'Главная кнопка', '.hero-actions .button-gold', 'text', 'short'),
          field('hero.ctaSecondary', 'Вторая кнопка', '.hero-actions .button-dark', 'text', 'short'),
          field('hero.priceLabel', 'Подпись цены', '.hero-price span', 'text', 'short'),
          field('hero.priceAmount', 'Цена на первом экране', '.hero-price strong', 'text', 'short'),
          field('hero.priceNote', 'Пояснение к цене', '.hero-price small', 'text', 'short'),
        ],
      },
      {
        id: 'sale',
        title: 'Цена и заявка',
        items: [
          field('pricing.title', 'Заголовок блока цены', '#pricing .pricing-copy h2', 'text', 'long'),
          field('pricing.text', 'Текст блока цены', '#pricing .pricing-copy p', 'text', 'long'),
          field('pricing.oldPrice', 'Старая цена', '#pricing .old-price', 'text', 'short'),
          field('pricing.price', 'Цена предзаказа', '#pricing .price-stack strong', 'text', 'short'),
          field('pricing.list1', 'Что входит: пункт 1', '#pricing .included-list li:nth-child(1)', 'text', 'short'),
          field('pricing.list2', 'Что входит: пункт 2', '#pricing .included-list li:nth-child(2)', 'text', 'short'),
          field('pricing.list3', 'Что входит: пункт 3', '#pricing .included-list li:nth-child(3)', 'text', 'short'),
          field('form.title', 'Заголовок формы', '#lead-form .form-heading h2', 'text', 'short'),
          field('form.text', 'Текст формы', '#lead-form .form-heading p', 'text', 'long'),
          field('form.submit', 'Кнопка формы', '#lead-form button[type="submit"]', 'text', 'short'),
          field('form.meta', 'Подпись под формой', '#lead-form .privacy-note', 'text', 'long'),
        ],
      },
      {
        id: 'blocks',
        title: 'Блоки сайта',
        items: [
          field('skill.title', 'Блок навыка: заголовок', '#skill .section-copy h2', 'text', 'long'),
          field('skill.text', 'Блок навыка: текст', '#skill .section-copy p', 'text', 'long'),
          field('skill.card1Title', 'Карточка 1: заголовок', '#skill .glass-card:nth-child(1) h3', 'text', 'short'),
          field('skill.card1Text', 'Карточка 1: текст', '#skill .glass-card:nth-child(1) p', 'text', 'long'),
          field('skill.card2Title', 'Карточка 2: заголовок', '#skill .glass-card:nth-child(2) h3', 'text', 'short'),
          field('skill.card2Text', 'Карточка 2: текст', '#skill .glass-card:nth-child(2) p', 'text', 'long'),
          field('skill.card3Title', 'Карточка 3: заголовок', '#skill .glass-card:nth-child(3) h3', 'text', 'short'),
          field('skill.card3Text', 'Карточка 3: текст', '#skill .glass-card:nth-child(3) p', 'text', 'long'),
          field('kit.title', 'Комплект: заголовок', '#kit .section-copy h2', 'text', 'long'),
          field('kit.item1Title', 'Комплект 1: заголовок', '#kit .kit-list article:nth-child(1) h3', 'text', 'short'),
          field('kit.item1Text', 'Комплект 1: текст', '#kit .kit-list article:nth-child(1) p', 'text', 'long'),
          field('kit.item2Title', 'Комплект 2: заголовок', '#kit .kit-list article:nth-child(2) h3', 'text', 'short'),
          field('kit.item2Text', 'Комплект 2: текст', '#kit .kit-list article:nth-child(2) p', 'text', 'long'),
          field('kit.item3Title', 'Комплект 3: заголовок', '#kit .kit-list article:nth-child(3) h3', 'text', 'short'),
          field('kit.item3Text', 'Комплект 3: текст', '#kit .kit-list article:nth-child(3) p', 'text', 'long'),
          field('method.title', 'Метод: заголовок', '#method .section-copy h2', 'text', 'long'),
          field('method.text', 'Метод: текст', '#method .section-copy p', 'text', 'long'),
          field('method.step1Title', 'Шаг 1: заголовок', '#method .method-step:nth-of-type(1) h3', 'text', 'short'),
          field('method.step1Text', 'Шаг 1: текст', '#method .method-step:nth-of-type(1) p', 'text', 'long'),
          field('method.step2Title', 'Шаг 2: заголовок', '#method .method-step:nth-of-type(2) h3', 'text', 'short'),
          field('method.step2Text', 'Шаг 2: текст', '#method .method-step:nth-of-type(2) p', 'text', 'long'),
          field('method.step3Title', 'Шаг 3: заголовок', '#method .method-step:nth-of-type(3) h3', 'text', 'short'),
          field('method.step3Text', 'Шаг 3: текст', '#method .method-step:nth-of-type(3) p', 'text', 'long'),
          field('visuals.card1Caption', 'Фото 1: подпись', '.section-visuals figure:nth-child(1) figcaption', 'text', 'short'),
          field('visuals.card2Caption', 'Фото 2: подпись', '.section-visuals figure:nth-child(2) figcaption', 'text', 'short'),
          field('visuals.card3Caption', 'Фото 3: подпись', '.section-visuals figure:nth-child(3) figcaption', 'text', 'short'),
        ],
      },
      {
        id: 'questions',
        title: 'Вопросы',
        items: [
          field('faq.title', 'Заголовок вопросов', '#faq .faq-title h2', 'text', 'short'),
          field('faq.q1', 'Вопрос 1', '#faq .faq-item:nth-child(1) .faq-toggle span:first-child', 'text', 'short'),
          field('faq.a1', 'Ответ 1', '#faq .faq-item:nth-child(1) .faq-answer p', 'text', 'long'),
          field('faq.q2', 'Вопрос 2', '#faq .faq-item:nth-child(2) .faq-toggle span:first-child', 'text', 'short'),
          field('faq.a2', 'Ответ 2', '#faq .faq-item:nth-child(2) .faq-answer p', 'text', 'long'),
          field('faq.q3', 'Вопрос 3', '#faq .faq-item:nth-child(3) .faq-toggle span:first-child', 'text', 'short'),
          field('faq.a3', 'Ответ 3', '#faq .faq-item:nth-child(3) .faq-answer p', 'text', 'long'),
        ],
      },
    ],
  },
  landing2: {
    pageSlug: 'landing2',
    title: 'Лендинг 2',
    shortTitle: 'Предыдущий сайт',
    url: './landing-2.html',
    groups: [
      {
        id: 'contacts',
        title: 'Контакты',
        items: [
          field('footer.text', 'Описание внизу сайта', '.footer-text', 'text', 'long'),
          field('footer.telegramLabel', 'Имя в Телеграме', '[data-contact-label]', 'text', 'short'),
          field('footer.telegramUrl', 'Ссылка на Телеграм', '[data-contact-link]', 'attr', 'url', 'href'),
          field('footer.phoneLabel', 'Номер телефона', '[data-contact-phone-label]', 'text', 'short'),
          field('footer.phoneUrl', 'Ссылка для звонка', '[data-contact-phone-link]', 'attr', 'url', 'href', 'Например: tel:+79991234567'),
        ],
      },
      {
        id: 'first',
        title: 'Первый экран',
        items: [
          field('meta.title', 'Название вкладки браузера', 'title', 'text', 'short'),
          field('meta.description', 'Описание для поиска', 'meta[name="description"]', 'attr', 'long', 'content'),
          field('header.cta', 'Кнопка в шапке', '.header-cta', 'text', 'short'),
          field('hero.title', 'Главный заголовок', '.hero-title-desktop', 'text', 'long'),
          field('hero.titleMobile', 'Короткий заголовок для телефона', '.hero-title-mobile', 'text', 'short'),
          field('hero.text', 'Текст под заголовком', '.hero-text-desktop', 'text', 'long'),
          field('hero.textMobile', 'Текст для телефона', '.hero-text-mobile', 'text', 'long'),
          field('hero.ctaPrimary', 'Главная кнопка', '.hero-primary', 'text', 'short'),
          field('hero.ctaSecondary', 'Вторая кнопка', '.hero-secondary', 'text', 'short'),
          field('hero.ctaTertiary', 'Текстовая ссылка', '.hero-link', 'text', 'short'),
          field('hero.priceLabel', 'Подпись цены', '.hero-price span', 'text', 'short'),
          field('hero.priceAmount', 'Цена на первом экране', '.hero-price strong', 'text', 'short'),
          field('hero.priceNote', 'Пояснение к цене', '.hero-price small', 'text', 'short'),
        ],
      },
      {
        id: 'sale',
        title: 'Цена и заявка',
        items: [
          field('pricing.title', 'Заголовок блока цены', '#pricing .price-panel h2', 'text', 'long'),
          field('pricing.text', 'Текст блока цены', '#pricing .price-panel > p', 'text', 'long'),
          field('pricing.oldPrice', 'Старая цена', '#pricing .old-price', 'text', 'short'),
          field('pricing.price', 'Цена предзаказа', '#pricing .price-card strong', 'text', 'short'),
          field('pricing.note', 'Пояснение к цене', '#pricing .price-card small', 'text', 'short'),
          field('pricing.list1', 'Что входит: пункт 1', '#pricing .price-list li:nth-child(1)', 'text', 'short'),
          field('pricing.list2', 'Что входит: пункт 2', '#pricing .price-list li:nth-child(2)', 'text', 'short'),
          field('pricing.list3', 'Что входит: пункт 3', '#pricing .price-list li:nth-child(3)', 'text', 'short'),
          field('pricing.list4', 'Что входит: пункт 4', '#pricing .price-list li:nth-child(4)', 'text', 'short'),
          field('form.title', 'Заголовок формы', '#lead-form .form-heading h3', 'text', 'short'),
          field('form.text', 'Текст формы', '#lead-form .form-heading p', 'text', 'long'),
          field('form.submit', 'Кнопка формы', '#lead-form button[type="submit"]', 'text', 'short'),
          field('form.meta', 'Подпись под формой', '#lead-form .form-meta', 'text', 'long'),
          field('sticky.price', 'Плавающая кнопка: цена', '.mobile-sticky-cta strong', 'text', 'short'),
          field('sticky.label', 'Плавающая кнопка: подпись', '.mobile-sticky-cta span', 'text', 'short'),
          field('sticky.cta', 'Плавающая кнопка: текст', '.mobile-sticky-cta .button', 'text', 'short'),
        ],
      },
      {
        id: 'blocks',
        title: 'Блоки сайта',
        items: [
          field('skill.title', 'Блок навыка: заголовок', '#skill .section-heading h2', 'text', 'long'),
          field('skill.text', 'Блок навыка: текст', '#skill .section-heading p', 'text', 'long'),
          field('skill.card1Title', 'Карточка 1: заголовок', '#skill .compact-card:nth-child(1) h3', 'text', 'short'),
          field('skill.card1Text', 'Карточка 1: текст', '#skill .compact-card:nth-child(1) p', 'text', 'long'),
          field('skill.card2Title', 'Карточка 2: заголовок', '#skill .compact-card:nth-child(2) h3', 'text', 'short'),
          field('skill.card2Text', 'Карточка 2: текст', '#skill .compact-card:nth-child(2) p', 'text', 'long'),
          field('skill.card3Title', 'Карточка 3: заголовок', '#skill .compact-card:nth-child(3) h3', 'text', 'short'),
          field('skill.card3Text', 'Карточка 3: текст', '#skill .compact-card:nth-child(3) p', 'text', 'long'),
          field('kit.title', 'Комплект: заголовок', '#kit .section-copy h2', 'text', 'long'),
          field('kit.text', 'Комплект: текст', '#kit .section-copy > p', 'text', 'long'),
          field('kit.item1Title', 'Комплект 1: заголовок', '#kit .kit-list article:nth-child(1) strong', 'text', 'short'),
          field('kit.item1Text', 'Комплект 1: текст', '#kit .kit-list article:nth-child(1) span', 'text', 'long'),
          field('kit.item2Title', 'Комплект 2: заголовок', '#kit .kit-list article:nth-child(2) strong', 'text', 'short'),
          field('kit.item2Text', 'Комплект 2: текст', '#kit .kit-list article:nth-child(2) span', 'text', 'long'),
          field('kit.item3Title', 'Комплект 3: заголовок', '#kit .kit-list article:nth-child(3) strong', 'text', 'short'),
          field('kit.item3Text', 'Комплект 3: текст', '#kit .kit-list article:nth-child(3) span', 'text', 'long'),
          field('kit.item4Title', 'Комплект 4: заголовок', '#kit .kit-list article:nth-child(4) strong', 'text', 'short'),
          field('kit.item4Text', 'Комплект 4: текст', '#kit .kit-list article:nth-child(4) span', 'text', 'long'),
          field('method.title', 'Метод: заголовок', '#method .method-heading h2', 'text', 'long'),
          field('method.text', 'Метод: текст', '#method .method-heading p', 'text', 'long'),
          field('method.step1Title', 'Шаг 1: заголовок', '#method .method-step:nth-child(1) h3', 'text', 'short'),
          field('method.step1Text', 'Шаг 1: текст', '#method .method-step:nth-child(1) p', 'text', 'long'),
          field('method.step2Title', 'Шаг 2: заголовок', '#method .method-step:nth-child(2) h3', 'text', 'short'),
          field('method.step2Text', 'Шаг 2: текст', '#method .method-step:nth-child(2) p', 'text', 'long'),
          field('method.step3Title', 'Шаг 3: заголовок', '#method .method-step:nth-child(3) h3', 'text', 'short'),
          field('method.step3Text', 'Шаг 3: текст', '#method .method-step:nth-child(3) p', 'text', 'long'),
          field('inside.title', 'Внутри: заголовок', '#inside .section-heading h2', 'text', 'long'),
          field('inside.text', 'Внутри: текст', '#inside .section-heading p', 'text', 'long'),
          field('inside.card1Title', 'Фото 1: заголовок', '#inside figure:nth-child(1) figcaption strong', 'text', 'short'),
          field('inside.card1Text', 'Фото 1: подпись', '#inside figure:nth-child(1) figcaption span', 'text', 'long'),
          field('inside.card2Title', 'Фото 2: заголовок', '#inside figure:nth-child(2) figcaption strong', 'text', 'short'),
          field('inside.card2Text', 'Фото 2: подпись', '#inside figure:nth-child(2) figcaption span', 'text', 'long'),
          field('inside.card3Title', 'Фото 3: заголовок', '#inside figure:nth-child(3) figcaption strong', 'text', 'short'),
          field('inside.card3Text', 'Фото 3: подпись', '#inside figure:nth-child(3) figcaption span', 'text', 'long'),
        ],
      },
      {
        id: 'questions',
        title: 'Вопросы',
        items: [
          field('faq.title', 'Заголовок вопросов', '#faq .faq-heading h2', 'text', 'short'),
          field('faq.q1', 'Вопрос 1', '#faq .faq-item:nth-child(1) .faq-toggle span:first-child', 'text', 'short'),
          field('faq.a1', 'Ответ 1', '#faq .faq-item:nth-child(1) .faq-answer p', 'text', 'long'),
          field('faq.q2', 'Вопрос 2', '#faq .faq-item:nth-child(2) .faq-toggle span:first-child', 'text', 'short'),
          field('faq.a2', 'Ответ 2', '#faq .faq-item:nth-child(2) .faq-answer p', 'text', 'long'),
          field('faq.q3', 'Вопрос 3', '#faq .faq-item:nth-child(3) .faq-toggle span:first-child', 'text', 'short'),
          field('faq.a3', 'Ответ 3', '#faq .faq-item:nth-child(3) .faq-answer p', 'text', 'long'),
          field('faq.q4', 'Вопрос 4', '#faq .faq-item:nth-child(4) .faq-toggle span:first-child', 'text', 'short'),
          field('faq.a4', 'Ответ 4', '#faq .faq-item:nth-child(4) .faq-answer p', 'text', 'long'),
          field('faq.q5', 'Вопрос 5', '#faq .faq-item:nth-child(5) .faq-toggle span:first-child', 'text', 'short'),
          field('faq.a5', 'Ответ 5', '#faq .faq-item:nth-child(5) .faq-answer p', 'text', 'long'),
        ],
      },
    ],
  },
};

const dom = {
  refreshButton: document.querySelector('[data-refresh-dashboard]'),
  saveContentButton: document.querySelector('[data-save-content]'),
  exportButton: document.querySelector('[data-export-xlsx]'),
  updatedLabel: document.querySelector('[data-updated-label]'),
  authPanel: document.querySelector('[data-admin-auth-panel]'),
  authTitle: document.querySelector('[data-admin-auth-title]'),
  authSubtitle: document.querySelector('[data-admin-auth-subtitle]'),
  authFeedback: document.querySelector('[data-admin-auth-feedback]'),
  authForm: document.querySelector('[data-admin-login-form]'),
  sessionActions: document.querySelector('[data-admin-session-actions]'),
  sessionEmail: document.querySelector('[data-admin-session-email]'),
  logoutButton: document.querySelector('[data-admin-logout]'),
  dashboard: document.querySelector('[data-admin-dashboard]'),
  storageModeLabels: document.querySelectorAll('[data-admin-storage-mode], [data-admin-storage-mode-main]'),
  lastSyncLabel: document.querySelector('[data-admin-last-sync]'),
  syncHealthLabel: document.querySelector('[data-admin-sync-health]'),
  contentSyncState: document.querySelector('[data-content-sync-state]'),
  settingsSupabase: document.querySelector('[data-settings-supabase]'),
  pageTitle: document.querySelector('[data-admin-page-title]'),
  pageSubtitle: document.querySelector('[data-admin-page-subtitle]'),
  contextLabel: document.querySelector('[data-admin-context-label]'),
  opsGrid: document.querySelector('[data-ops-grid]'),
  recentLeads: document.querySelector('[data-recent-leads]'),
  contentHealth: document.querySelector('[data-content-health-list]'),
  contentEditorSubtitle: document.querySelector('[data-content-editor-subtitle]'),
  contentGroupTabs: document.querySelector('[data-content-group-tabs]'),
  contentEditorList: document.querySelector('[data-content-editor-list]'),
  contentSearch: document.querySelector('[data-content-search]'),
  landingSelectButtons: document.querySelectorAll('[data-landing-select]'),
  openLandingLinks: document.querySelectorAll('[data-open-active-landing]'),
  previewFrame: document.querySelector('[data-landing-preview]'),
  previewDraftButton: document.querySelector('[data-preview-draft]'),
  resetContentButton: document.querySelector('[data-reset-content]'),
  leadSearch: document.querySelector('[data-lead-search]'),
  leadStatusFilter: document.querySelector('[data-lead-status-filter]'),
  leadSort: document.querySelector('[data-lead-sort]'),
  pipelineGrid: document.querySelector('[data-pipeline-grid]'),
  leadList: document.querySelector('[data-lead-list]'),
  leadDetail: document.querySelector('[data-lead-detail]'),
  leadDetailSubtitle: document.querySelector('[data-lead-detail-subtitle]'),
  exportContentButton: document.querySelector('[data-export-content-json]'),
  clearLocalDataButton: document.querySelector('[data-clear-local-data]'),
};

const state = {
  tab: 'overview',
  isLoading: false,
  authReady: false,
  currentUser: null,
  dashboardSnapshot: null,
  leads: [],
  leadMeta: readLeadMeta(),
  selectedLeadId: '',
  leadFilters: {
    search: '',
    status: 'all',
    sort: 'recent',
  },
  contentDefaults: [],
  contentDraft: new Map(),
  contentSaved: { items: [], storageMode: 'local', updatedAt: new Date().toISOString() },
  activeLandingSlug: DEFAULT_LANDING_SLUG,
  contentGroup: LANDING_SCHEMAS[DEFAULT_LANDING_SLUG].groups[0].id,
  contentSearch: '',
  contentDirty: false,
  refreshTimer: null,
  syncChannel: null,
  pendingRefresh: false,
};

init();

function field(key, label, selector, mode = 'text', type = 'short', attr = '', help = '') {
  return { key, label, selector, mode, type, attr, help };
}

async function init() {
  bindAuthUi();
  bindNavigation();
  bindDashboardSync();
  bindLeadUi();
  bindContentUi();
  bindExport();
  bindSettings();
  restoreAdminSession();
  updateAuthView();
  updateTopbar();
  updateLandingUi();

  if (state.currentUser) {
    await loadDashboard();
  }
}

function bindNavigation() {
  document.querySelectorAll('[data-admin-tab-button]').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveTab(button.dataset.adminTabButton || 'overview');
    });
  });

  document.querySelectorAll('[data-admin-tab-shortcut]').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveTab(button.dataset.adminTabShortcut || 'overview');
    });
  });
}

function setActiveTab(tab) {
  if (!TAB_META[tab]) {
    return;
  }

  state.tab = tab;

  document.querySelectorAll('[data-admin-tab-button]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminTabButton === tab);
  });

  document.querySelectorAll('[data-admin-tab]').forEach((section) => {
    section.classList.toggle('active', section.dataset.adminTab === tab);
  });

  updateTopbar();

  if (tab === 'landing') {
    updatePreviewDraft();
  }
}

function updateTopbar() {
  const meta = TAB_META[state.tab] || TAB_META.overview;
  setTextNode(dom.contextLabel, meta.label);
  setTextNode(dom.pageTitle, meta.title);
  setTextNode(dom.pageSubtitle, meta.subtitle);
}

function getCurrentSchema() {
  return LANDING_SCHEMAS[state.activeLandingSlug] || LANDING_SCHEMAS[DEFAULT_LANDING_SLUG];
}

function setActiveLanding(slug) {
  if (!LANDING_SCHEMAS[slug] || slug === state.activeLandingSlug) {
    return;
  }

  if (state.contentDirty && !window.confirm('Есть несохранённые изменения. Переключиться на другой лендинг без сохранения?')) {
    return;
  }

  const schema = LANDING_SCHEMAS[slug];
  state.activeLandingSlug = slug;
  state.contentGroup = schema.groups[0].id;
  state.contentSearch = '';
  state.contentDefaults = [];
  state.contentDraft = new Map();
  state.contentDirty = false;

  if (dom.contentSearch) {
    dom.contentSearch.value = '';
  }

  updateLandingUi();
  loadContentWorkspace();
}

function updateLandingUi() {
  const schema = getCurrentSchema();

  dom.landingSelectButtons.forEach((button) => {
    const active = button.dataset.landingSelect === schema.pageSlug;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  dom.openLandingLinks.forEach((link) => {
    link.href = schema.url;
  });

  if (dom.previewFrame && !dom.previewFrame.src.includes(schema.url.replace('./', ''))) {
    dom.previewFrame.src = `${schema.url}?adminPreview=${Date.now()}`;
  }
}

function bindDashboardSync() {
  if (dom.refreshButton) {
    dom.refreshButton.addEventListener('click', () => loadDashboard());
  }

  const scheduleRefresh = () => scheduleDashboardRefresh();
  window.addEventListener('storage', scheduleRefresh);
  window.addEventListener('mirror-trainer-storage-updated', scheduleRefresh);
  window.addEventListener('mirror-trainer-dashboard-updated', scheduleRefresh);
  window.addEventListener('mirror-trainer-landing-content-updated', () => {
    if (state.currentUser && !state.contentDirty) {
      loadContentWorkspace();
    }
  });

  try {
    if ('BroadcastChannel' in window) {
      state.syncChannel = new BroadcastChannel(dashboardChannelName);
      state.syncChannel.addEventListener('message', scheduleRefresh);
    }
  } catch (error) {
    console.warn('Dashboard sync channel is unavailable.', error);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      scheduleDashboardRefresh(80);
    }
  });

  window.setInterval(() => {
    if (document.visibilityState === 'visible' && state.currentUser) {
      scheduleDashboardRefresh(0);
    }
  }, 15000);
}

function scheduleDashboardRefresh(delay = 360) {
  if (document.visibilityState !== 'visible' || !state.currentUser) {
    return;
  }

  window.clearTimeout(state.refreshTimer);
  state.refreshTimer = window.setTimeout(() => {
    state.refreshTimer = null;
    loadDashboard();
  }, delay);
}

function bindAuthUi() {
  if (dom.authForm) {
    dom.authForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const formData = new FormData(dom.authForm);
      const login = normalizeAdminLogin(formData.get('login'));
      const password = String(formData.get('password') || '').trim();

      if (!login || !password) {
        setAuthFeedback('Введите логин и пароль.', 'error');
        return;
      }

      if (login !== ADMIN_LOGIN || password !== ADMIN_PASSWORD) {
        setAuthFeedback('Неверный логин или пароль.', 'error');
        return;
      }

      activateAdminSession(login, password);
      dom.authForm.reset();
      setAuthFeedback('Вход выполнен. Загружаем рабочую панель...', 'success');
      loadDashboard();
    });
  }

  if (dom.logoutButton) {
    dom.logoutButton.addEventListener('click', () => {
      clearStoredAdminSession();
      clearAdminCredentials();
      state.currentUser = null;
      state.leads = [];
      updateAuthView();
      setAuthFeedback('Вы вышли из админки.', 'warning');
    });
  }
}

function restoreAdminSession() {
  state.authReady = true;

  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;

    if (session?.login === ADMIN_LOGIN && session?.password === ADMIN_PASSWORD) {
      activateAdminSession(session.login, session.password, { persist: false });
      return;
    }
  } catch (error) {
    console.warn('Failed to restore admin session.', error);
  }

  clearStoredAdminSession();
  clearAdminCredentials();
  state.currentUser = null;
}

function activateAdminSession(login, password, options = {}) {
  const { persist = true } = options;
  state.currentUser = {
    login,
    authenticatedAt: new Date().toISOString(),
  };
  setAdminCredentials({ username: login, password });

  if (persist) {
    try {
      sessionStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({
          login,
          password,
          authenticatedAt: state.currentUser.authenticatedAt,
        })
      );
    } catch (error) {
      console.warn('Failed to persist admin session.', error);
    }
  }

  updateAuthView();
}

function clearStoredAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (error) {
    console.warn('Failed to clear admin session.', error);
  }
}

function updateAuthView() {
  if (!dom.authPanel) {
    return;
  }

  if (!state.authReady) {
    setAuthCopy('Проверка доступа', 'Подготавливаем режим админки');
    toggleNode(dom.authForm, false);
    toggleNode(dom.sessionActions, false);
    toggleNode(dom.dashboard, false);
    return;
  }

  if (state.currentUser) {
    setAuthCopy(
      'Доступ подтверждён',
      hasRemoteConfig
        ? 'Админка подключена к онлайн-базе'
        : 'Доступны данные этого браузера'
    );
    toggleNode(dom.authForm, false);
    toggleNode(dom.sessionActions, true);
    toggleNode(dom.dashboard, true);

    if (dom.sessionEmail) {
      dom.sessionEmail.textContent = 'Администратор';
    }

    setAuthFeedback(
      hasRemoteConfig
        ? 'Вход выполнен. Данные читаются из онлайн-базы.'
        : 'Вход выполнен. Сейчас показаны локальные данные этого браузера.',
      'success'
    );
    return;
  }

  setAuthCopy('Вход в админку', 'Введите логин и пароль администратора');
  toggleNode(dom.authForm, true);
  toggleNode(dom.sessionActions, false);
  toggleNode(dom.dashboard, false);
  setAuthFeedback('Логин: админ. Пароль вводится вручную.', 'warning');
}

function normalizeAdminLogin(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'админ' ? ADMIN_LOGIN : normalized;
}

function setAuthCopy(title, subtitle) {
  setTextNode(dom.authTitle, title);
  setTextNode(dom.authSubtitle, subtitle);
}

function setAuthFeedback(message, type) {
  if (!dom.authFeedback) {
    return;
  }

  dom.authFeedback.textContent = message;
  dom.authFeedback.classList.remove('is-success', 'is-error', 'is-warning');

  if (type) {
    dom.authFeedback.classList.add(`is-${type}`);
  }
}

async function loadDashboard() {
  if (hasRemoteConfig && !state.currentUser) {
    return;
  }

  if (state.isLoading) {
    state.pendingRefresh = true;
    return;
  }

  state.isLoading = true;
  setButtonLoading(dom.refreshButton, true, 'Обновляем...');

  try {
    const [snapshot, leads] = await Promise.all([
      fetchDashboardSnapshot(),
      fetchLeadRecords(5000),
    ]);

    state.dashboardSnapshot = snapshot;
    state.leads = Array.isArray(leads) ? leads : [];

    renderSummary(snapshot.summary || {});
    renderFunnel(snapshot.summary || {});
    renderBarList('[data-list="cta"]', normalizeCtaItems(snapshot.ctaBreakdown || []), true);
    renderBarList('[data-list="scroll"]', (snapshot.scrollDepth || []).map((item) => ({
      label: item.label || `${item.depth}%`,
      count: item.count || 0,
    })));
    renderSyncStatus(snapshot, state.leads);
    renderLeadsWorkspace();
    renderOverview();

    if (!state.contentDirty) {
      await loadContentWorkspace();
    } else {
      renderContentHealth();
      updateContentSyncState();
    }

    if (dom.updatedLabel) {
      const formatted = formatDate(snapshot.updatedAt);
      dom.updatedLabel.textContent =
        snapshot.storageMode === 'local'
          ? `Локальные данные: ${formatted}`
          : `Обновлено: ${formatted}`;
    }
  } catch (error) {
    console.error(error);
    renderSyncStatus(
      {
        storageMode: 'error',
        updatedAt: new Date().toISOString(),
      },
      state.leads,
      'Не удалось получить свежие данные'
    );
    setAuthFeedback('Не удалось обновить данные админки. Проверьте онлайн-базу и сеть.', 'error');
  } finally {
    state.isLoading = false;
    setButtonLoading(dom.refreshButton, false, 'Обновить');

    if (state.pendingRefresh) {
      state.pendingRefresh = false;
      scheduleDashboardRefresh(100);
    }
  }
}

function renderSyncStatus(snapshot, leads, forcedHealth = '') {
  const formatted = formatDate(snapshot.updatedAt);
  const isRemote = snapshot.storageMode === 'remote';
  const isError = snapshot.storageMode === 'error';
  const leadCount = Array.isArray(leads) ? leads.length : 0;
  const label = isError
    ? 'Ошибка подключения'
    : isRemote
      ? 'Онлайн-база'
      : hasRemoteConfig
        ? 'Резервная копия'
        : 'Данные этого браузера';

  dom.storageModeLabels.forEach((node) => {
    node.textContent = label;
  });

  setTextNode(dom.lastSyncLabel, formatted);
  setTextNode(
    dom.syncHealthLabel,
    forcedHealth ||
      (isRemote
        ? `Данные синхронизированы, заявок в списке: ${number(leadCount)}`
        : hasRemoteConfig
          ? 'Показана резервная копия этого браузера. Проверьте подключение к онлайн-базе.'
          : 'Данные сохраняются только в этом браузере.')
  );
  setTextNode(dom.settingsSupabase, isRemote ? 'подключена и отвечает' : 'данные этого браузера');
}

function renderSummary(summary) {
  setText('[data-kpi="uniqueVisitors"]', number(summary.uniqueVisitors));
  setText('[data-kpi="totalLeads"]', number(summary.totalLeads));
  setText('[data-kpi="formConversion"]', `${formatPercent(summary.formConversion)}%`);
  setText('[data-kpi="ctaClicks"]', number(summary.ctaClicks));
}

function renderOverview() {
  const leads = state.leads;
  const newCount = leads.filter((lead) => getLeadStatus(getLeadId(lead)) === 'new').length;
  const contacted = leads.filter((lead) => getLeadStatus(getLeadId(lead)) === 'contacted').length;
  const reserved = leads.filter((lead) => getLeadStatus(getLeadId(lead)) === 'reserved').length;
  const changedContentCount = getChangedContentItems().length;
  const newestLead = leads[0];

  if (dom.opsGrid) {
    dom.opsGrid.innerHTML = [
      opsCard('Новые заявки', number(newCount), 'Нужно обработать первыми'),
      opsCard('В работе', number(contacted), 'Уже есть контакт'),
      opsCard('Резерв', number(reserved), 'Потенциальные предзаказы'),
      opsCard('Правки сайта', number(changedContentCount), 'Отличаются от текущей версии'),
    ].join('');
  }

  if (dom.recentLeads) {
    dom.recentLeads.innerHTML = leads.slice(0, 5).map((lead) => {
      const id = getLeadId(lead);
      return `
        <button class="mini-lead-card" type="button" data-open-lead="${escapeHtml(id)}">
          <span>${escapeHtml(formatDate(lead.created_at))}</span>
          <strong>${escapeHtml(lead.name || 'Без имени')}</strong>
          <span>${escapeHtml(lead.phone || lead.telegram || lead.email || lead.contact || 'контакт не указан')}</span>
        </button>
      `;
    }).join('') || '<div class="empty-state">Пока нет заявок.</div>';
  }

  if (!newestLead && dom.recentLeads) {
    dom.recentLeads.innerHTML = '<div class="empty-state">Пока нет заявок. После первой отправки формы они появятся здесь.</div>';
  }
}

function opsCard(label, value, note) {
  return `
    <article class="ops-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </article>
  `;
}

function bindContentUi() {
  dom.landingSelectButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveLanding(button.dataset.landingSelect || DEFAULT_LANDING_SLUG);
    });
  });

  if (dom.contentGroupTabs) {
    dom.contentGroupTabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-content-group]');
      if (!button) return;
      state.contentGroup = button.dataset.contentGroup || getCurrentSchema().groups[0].id;
      renderContentEditor();
    });
  }

  if (dom.contentEditorList) {
    dom.contentEditorList.addEventListener('input', (event) => {
      const input = event.target.closest('[data-content-input]');
      if (!input) return;
      updateDraftValue(input.dataset.contentKey, input.value);
    });

    dom.contentEditorList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-reset-field]');
      if (!button) return;
      resetDraftField(button.dataset.resetField);
    });
  }

  if (dom.contentSearch) {
    dom.contentSearch.addEventListener('input', () => {
      state.contentSearch = dom.contentSearch.value.trim().toLowerCase();
      renderContentEditor();
    });
  }

  if (dom.saveContentButton) {
    dom.saveContentButton.addEventListener('click', saveContentWorkspace);
  }

  if (dom.previewDraftButton) {
    dom.previewDraftButton.addEventListener('click', updatePreviewDraft);
  }

  if (dom.resetContentButton) {
    dom.resetContentButton.addEventListener('click', resetAllContentOverrides);
  }

  if (dom.previewFrame) {
    dom.previewFrame.addEventListener('load', () => {
      updatePreviewDraft();
    });
  }
}

async function loadContentWorkspace() {
  const schema = getCurrentSchema();

  try {
    setTextNode(dom.contentEditorSubtitle, `Загружаем ${schema.title}: текущие тексты и сохранённые правки`);
    const [defaults, saved] = await Promise.all([
      fetchLandingDefaults(),
      fetchLandingContent(schema.pageSlug),
    ]);

    state.contentDefaults = defaults;
    state.contentSaved = saved || { items: [], storageMode: 'local', updatedAt: new Date().toISOString() };
    state.contentDraft = buildContentDraft(defaults, state.contentSaved.items || []);
    state.contentDirty = false;

    renderContentEditor();
    renderContentHealth();
    updateContentSyncState();
    updatePreviewDraft();
  } catch (error) {
    console.error(error);
    setTextNode(dom.contentEditorSubtitle, `Не удалось прочитать ${schema.title}`);
    showToast('Не удалось загрузить редактор лендинга.', 'error');
  }
}

async function fetchLandingDefaults() {
  const schema = getCurrentSchema();
  const response = await fetch(`${schema.url}?adminRead=${Date.now()}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Landing HTML request failed: ${response.status}`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  return flattenSchemaItems().map((item) => ({
    ...item,
    defaultValue: readContentValue(doc, item),
  }));
}

function flattenSchemaItems() {
  return getCurrentSchema().groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupId: group.id,
      groupTitle: group.title,
    }))
  );
}

function readContentValue(root, item) {
  const node = root.querySelector(item.selector);

  if (!node) {
    return '';
  }

  if (item.mode === 'attr' && item.attr) {
    return node.getAttribute(item.attr) || '';
  }

  return normalizeVisibleText(node.textContent || '');
}

function buildContentDraft(defaultItems, savedItems) {
  const savedMap = new Map((savedItems || []).map((item) => [item.key, item]));
  const draft = new Map();

  defaultItems.forEach((item) => {
    const saved = savedMap.get(item.key);
    draft.set(item.key, {
      ...item,
      value: saved ? String(saved.value ?? '') : item.defaultValue,
      savedValue: saved ? String(saved.value ?? '') : '',
      savedAt: saved?.updatedAt || saved?.updated_at || '',
    });
  });

  return draft;
}

function renderContentEditor() {
  renderContentGroupTabs();

  if (!dom.contentEditorList) {
    return;
  }

  const items = getVisibleContentItems();

  if (!items.length) {
    dom.contentEditorList.innerHTML = '<div class="empty-state">По этому фильтру нет полей.</div>';
    return;
  }

  dom.contentEditorList.innerHTML = items.map(renderContentField).join('');
  updateContentSyncState();
}

function renderContentGroupTabs() {
  if (!dom.contentGroupTabs) {
    return;
  }

  const schema = getCurrentSchema();
  const changedByGroup = getChangedContentItems().reduce((acc, item) => {
    acc[item.groupId] = (acc[item.groupId] || 0) + 1;
    return acc;
  }, {});

  dom.contentGroupTabs.innerHTML = schema.groups.map((group) => {
    const count = changedByGroup[group.id] || 0;
    return `
      <button class="content-group-tab ${group.id === state.contentGroup ? 'active' : ''}" type="button" data-content-group="${escapeHtml(group.id)}">
        ${escapeHtml(group.title)}${count ? ` · ${number(count)}` : ''}
      </button>
    `;
  }).join('');
}

function getVisibleContentItems() {
  const search = state.contentSearch;

  return Array.from(state.contentDraft.values()).filter((item) => {
    const inGroup = item.groupId === state.contentGroup;
    const searchText = `${item.key} ${item.label} ${item.defaultValue} ${item.value}`.toLowerCase();
    return inGroup && (!search || searchText.includes(search));
  });
}

function renderContentField(item) {
  const changed = isContentItemChanged(item);
  const missing = !item.defaultValue;
  const hint = getFieldHint(item);
  return `
    <article class="content-field" data-content-field="${escapeHtml(item.key)}" data-field-type="${escapeHtml(item.type)}">
      <div class="content-field-head">
        <div class="content-field-title">
          <strong>${escapeHtml(item.label)}</strong>
          <small>${escapeHtml(hint)}</small>
        </div>
        <span class="field-badge ${changed ? 'is-changed' : ''}" data-field-badge>
          ${changed ? 'изменено' : missing ? 'не найдено' : 'как на сайте'}
        </span>
      </div>
      <textarea data-content-input data-content-key="${escapeHtml(item.key)}" spellcheck="true" placeholder="Введите новый текст">${escapeHtml(item.value)}</textarea>
      <div class="field-actions">
        <small>Сейчас на сайте: ${escapeHtml(item.defaultValue || 'поле не найдено')}</small>
        <button class="admin-link admin-link-compact" type="button" data-reset-field="${escapeHtml(item.key)}">Вернуть</button>
      </div>
    </article>
  `;
}

function getFieldHint(item) {
  if (item.help) {
    return item.help;
  }

  if (item.type === 'url') {
    return item.key.includes('phone') ? 'Ссылка для кнопки звонка' : 'Адрес ссылки';
  }

  if (item.mode === 'attr') {
    return 'Служебный текст страницы';
  }

  return 'Можно менять прямо здесь';
}

function updateDraftValue(key, value) {
  const item = state.contentDraft.get(key);
  if (!item) return;

  item.value = value;
  state.contentDirty = true;
  const fieldNode = dom.contentEditorList?.querySelector(`[data-content-field="${cssEscape(key)}"]`);
  const badge = fieldNode?.querySelector('[data-field-badge]');

  if (badge) {
    const changed = isContentItemChanged(item);
    badge.textContent = changed ? 'изменено' : 'как на сайте';
    badge.classList.toggle('is-changed', changed);
  }

  renderContentHealth();
  updateContentSyncState();
  schedulePreviewUpdate();
}

function resetDraftField(key) {
  const item = state.contentDraft.get(key);
  if (!item) return;

  item.value = item.defaultValue;
  state.contentDirty = true;
  renderContentEditor();
  renderContentHealth();
  updateContentSyncState();
  updatePreviewDraft();
}

async function saveContentWorkspace() {
  if (!state.currentUser) {
    setAuthFeedback('Сначала войдите в админку.', 'warning');
    return;
  }

  const schema = getCurrentSchema();
  const changedItems = getChangedContentItems().map((item) => ({
    key: item.key,
    value: item.value,
    type: item.type,
    label: item.label,
    group: item.groupId,
  }));

  setButtonLoading(dom.saveContentButton, true, 'Сохраняем...');

  try {
    const saved = await saveLandingContent(schema.pageSlug, changedItems);
    state.contentSaved = saved;
    state.contentDraft = buildContentDraft(state.contentDefaults, saved.items || changedItems);
    state.contentDirty = false;
    renderContentEditor();
    renderContentHealth();
    updateContentSyncState();
    updatePreviewDraft(true);
    showToast(changedItems.length ? `${schema.title}: правки сохранены.` : `${schema.title}: все поля снова берутся с сайта.`, 'success');
  } catch (error) {
    console.error(error);
    showToast('Не удалось сохранить контент лендинга.', 'error');
  } finally {
    setButtonLoading(dom.saveContentButton, false, 'Сохранить сайт');
  }
}

async function resetAllContentOverrides() {
  const schema = getCurrentSchema();

  if (!window.confirm(`Сбросить все сохранённые правки для "${schema.title}" и вернуть текст как на сайте?`)) {
    return;
  }

  try {
    const cleared = await clearLandingContent(schema.pageSlug);
    state.contentSaved = cleared;
    state.contentDraft = buildContentDraft(state.contentDefaults, []);
    state.contentDirty = false;
    renderContentEditor();
    renderContentHealth();
    updateContentSyncState();
    updatePreviewDraft(true);
    showToast(`${schema.title}: правки сброшены.`, 'success');
  } catch (error) {
    console.error(error);
    showToast('Не удалось сбросить правки лендинга.', 'error');
  }
}

function getChangedContentItems() {
  return Array.from(state.contentDraft.values()).filter(isContentItemChanged);
}

function isContentItemChanged(item) {
  return normalizeContentCompare(item.value) !== normalizeContentCompare(item.defaultValue);
}

function renderContentHealth() {
  const changed = getChangedContentItems();
  const schema = getCurrentSchema();

  if (dom.contentHealth) {
    if (!state.contentDraft.size) {
      dom.contentHealth.innerHTML = '<div class="empty-state">Редактор ещё загружается.</div>';
    } else if (!changed.length) {
      dom.contentHealth.innerHTML = `<div class="content-health-item"><span>${escapeHtml(schema.title)}</span><strong>Правок нет, показан текущий сайт</strong></div>`;
    } else {
      dom.contentHealth.innerHTML = changed.slice(0, 6).map((item) => `
        <div class="content-health-item">
          <span>${escapeHtml(item.groupTitle)}</span>
          <strong>${escapeHtml(item.label)}</strong>
        </div>
      `).join('');
    }
  }

  if (dom.contentEditorSubtitle) {
    dom.contentEditorSubtitle.textContent = changed.length
      ? `${schema.title}: ${number(changed.length)} правок ждут сохранения или уже сохранены`
      : `${schema.title}: сейчас всё совпадает с сайтом`;
  }
}

function updateContentSyncState() {
  const changed = getChangedContentItems().length;
  const mode = state.contentSaved?.storageMode === 'remote' ? 'онлайн' : 'в этом браузере';
  const dirtySuffix = state.contentDirty ? ', есть несохранённый черновик' : '';
  setTextNode(dom.contentSyncState, `${number(changed)} правок · ${mode}${dirtySuffix}`);
}

let previewTimer = null;

function schedulePreviewUpdate() {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => updatePreviewDraft(), 220);
}

function updatePreviewDraft(forceReload = false) {
  if (!dom.previewFrame) {
    return;
  }

  if (forceReload) {
    dom.previewFrame.src = `${getCurrentSchema().url}?adminPreview=${Date.now()}`;
    return;
  }

  try {
    const doc = dom.previewFrame.contentDocument;
    if (!doc || !doc.body) {
      return;
    }

    Array.from(state.contentDraft.values()).forEach((item) => {
      applyContentValue(doc, item, item.value);
    });
  } catch (error) {
    console.warn('Preview iframe is not ready for draft injection.', error);
  }
}

function applyContentValue(root, item, value) {
  const node = root.querySelector(item.selector);

  if (!node) {
    return;
  }

  if (item.mode === 'attr' && item.attr) {
    node.setAttribute(item.attr, value);
    return;
  }

  node.textContent = value;

  if (item.key === 'meta.title') {
    root.title = value;
  }
}

function bindLeadUi() {
  if (dom.leadSearch) {
    dom.leadSearch.addEventListener('input', () => {
      state.leadFilters.search = dom.leadSearch.value.trim().toLowerCase();
      renderLeadsWorkspace();
    });
  }

  if (dom.leadStatusFilter) {
    dom.leadStatusFilter.addEventListener('change', () => {
      state.leadFilters.status = dom.leadStatusFilter.value;
      renderLeadsWorkspace();
    });
  }

  if (dom.leadSort) {
    dom.leadSort.addEventListener('change', () => {
      state.leadFilters.sort = dom.leadSort.value;
      renderLeadsWorkspace();
    });
  }

  if (dom.leadList) {
    dom.leadList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-lead-id]');
      if (!button) return;
      state.selectedLeadId = button.dataset.leadId;
      renderLeadsWorkspace();
    });
  }

  if (dom.recentLeads) {
    dom.recentLeads.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-lead]');
      if (!button) return;
      state.selectedLeadId = button.dataset.openLead;
      setActiveTab('leads');
      renderLeadsWorkspace();
    });
  }

  if (dom.leadDetail) {
    dom.leadDetail.addEventListener('change', (event) => {
      const control = event.target.closest('[data-lead-meta-field]');
      if (!control || !state.selectedLeadId) return;
      updateLeadMeta(state.selectedLeadId, control.dataset.leadMetaField, control.value);
    });

    dom.leadDetail.addEventListener('input', (event) => {
      const control = event.target.closest('[data-lead-meta-field="note"]');
      if (!control || !state.selectedLeadId) return;
      updateLeadMeta(state.selectedLeadId, 'note', control.value, false);
    });
  }
}

function renderLeadsWorkspace() {
  renderPipeline();
  renderLeadList();
  renderLeadDetail();
  renderOverview();
}

function renderPipeline() {
  if (!dom.pipelineGrid) {
    return;
  }

  const counts = Object.keys(STATUS_META).reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  state.leads.forEach((lead) => {
    counts[getLeadStatus(getLeadId(lead))] += 1;
  });

  dom.pipelineGrid.innerHTML = Object.entries(STATUS_META).map(([status, meta]) => `
    <article class="pipeline-card">
      <span>${escapeHtml(meta.short)}</span>
      <strong>${number(counts[status] || 0)}</strong>
    </article>
  `).join('');
}

function renderLeadList() {
  if (!dom.leadList) {
    return;
  }

  const items = getFilteredLeads();

  if (!items.length) {
    dom.leadList.innerHTML = '<div class="empty-state">По текущему фильтру заявок нет.</div>';
    return;
  }

  dom.leadList.innerHTML = items.map((lead) => {
    const id = getLeadId(lead);
    const status = getLeadStatus(id);
    const meta = getLeadMeta(id);
    const tags = [
      lead.source_context ? `Источник: ${lead.source_context}` : '',
      lead.page_path ? `Страница: ${lead.page_path}` : '',
      lead.utm_source ? `Метка: ${lead.utm_source}` : '',
      meta.priority === 'high' ? 'важная' : '',
    ].filter(Boolean);

    return `
      <button class="lead-card ${id === state.selectedLeadId ? 'active' : ''}" type="button" data-lead-id="${escapeHtml(id)}">
        <span>
          <h3>${escapeHtml(lead.name || 'Без имени')}</h3>
          <div class="lead-meta">
            ${escapeHtml([lead.phone || lead.contact || '', lead.telegram || '', lead.email || ''].filter(Boolean).join(' · ') || 'контакт не указан')}
          </div>
          ${tags.length ? `<div class="lead-tags">${tags.map((tag) => `<span class="lead-tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        </span>
        <span>
          <span class="status-pill status-${escapeHtml(status)}">${escapeHtml(STATUS_META[status].label)}</span>
          <span class="lead-meta">${escapeHtml(formatDate(lead.created_at))}</span>
        </span>
      </button>
    `;
  }).join('');
}

function renderLeadDetail() {
  if (!dom.leadDetail) {
    return;
  }

  const lead = state.leads.find((item) => getLeadId(item) === state.selectedLeadId);

  if (!lead) {
    dom.leadDetail.innerHTML = '<div class="lead-detail-empty">Выберите заявку слева, чтобы поставить статус, добавить заметку и быстро открыть контакт.</div>';
    setTextNode(dom.leadDetailSubtitle, 'Выберите заявку из списка');
    return;
  }

  const id = getLeadId(lead);
  const meta = getLeadMeta(id);
  const phoneHref = lead.phone ? `tel:${normalizePhoneHref(lead.phone)}` : '';
  const telegramHref = lead.telegram ? `https://t.me/${lead.telegram.replace(/^@/, '')}` : '';
  const emailHref = lead.email ? `mailto:${lead.email}` : '';

  setTextNode(dom.leadDetailSubtitle, `Создана ${formatDate(lead.created_at)}`);

  dom.leadDetail.innerHTML = `
    <div class="lead-detail">
      <div>
        <h3>${escapeHtml(lead.name || 'Без имени')}</h3>
        <div class="lead-meta">${escapeHtml(lead.phone || lead.contact || 'телефон не указан')}</div>
        ${lead.telegram ? `<div class="lead-meta">${escapeHtml(lead.telegram)}</div>` : ''}
        ${lead.email ? `<div class="lead-meta">${escapeHtml(lead.email)}</div>` : ''}
      </div>

      <div class="lead-detail-actions">
        ${phoneHref ? `<a class="admin-link admin-link-compact" href="${escapeHtml(phoneHref)}">Позвонить</a>` : ''}
        ${telegramHref ? `<a class="admin-link admin-link-compact" href="${escapeHtml(telegramHref)}" target="_blank" rel="noreferrer">Телеграм</a>` : ''}
        ${emailHref ? `<a class="admin-link admin-link-compact" href="${escapeHtml(emailHref)}">Почта</a>` : ''}
      </div>

      <label class="admin-label">
        <span>Статус</span>
        <select class="admin-input" data-lead-meta-field="status">
          ${Object.entries(STATUS_META).map(([value, item]) => `<option value="${value}" ${meta.status === value ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
        </select>
      </label>

      <label class="admin-label">
        <span>Приоритет</span>
        <select class="admin-input" data-lead-meta-field="priority">
          ${Object.entries(PRIORITY_META).map(([value, label]) => `<option value="${value}" ${meta.priority === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
        </select>
      </label>

      <label class="admin-label lead-note">
        <span>Заметка администратора</span>
        <textarea class="admin-input" data-lead-meta-field="note" placeholder="Например: написал в Телеграм, ждёт доставку в июне">${escapeHtml(meta.note || '')}</textarea>
      </label>

      <div class="lead-comment">
        ${lead.comment ? `<strong>Комментарий клиента:</strong><br>${escapeHtml(lead.comment)}` : 'Комментария от клиента нет.'}
      </div>
    </div>
  `;
}

function getFilteredLeads() {
  const search = state.leadFilters.search;
  const statusFilter = state.leadFilters.status;
  const sort = state.leadFilters.sort;

  return state.leads
    .filter((lead) => {
      const id = getLeadId(lead);
      const status = getLeadStatus(id);
      const haystack = [
        lead.name,
        lead.phone,
        lead.telegram,
        lead.email,
        lead.contact,
        lead.comment,
        lead.source_context,
        lead.page_path,
      ].join(' ').toLowerCase();

      return (statusFilter === 'all' || status === statusFilter) && (!search || haystack.includes(search));
    })
    .sort((a, b) => {
      if (sort === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      if (sort === 'priority') {
        const priorityScore = { high: 0, normal: 1, low: 2 };
        const scoreA = priorityScore[getLeadMeta(getLeadId(a)).priority] ?? 1;
        const scoreB = priorityScore[getLeadMeta(getLeadId(b)).priority] ?? 1;
        return scoreA - scoreB || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

function getLeadId(lead) {
  return String(lead.id || `${lead.created_at}-${lead.phone || lead.telegram || lead.email || lead.contact || lead.name}`);
}

function getLeadMeta(id) {
  if (!state.leadMeta[id]) {
    state.leadMeta[id] = {
      status: 'new',
      priority: 'normal',
      note: '',
      updatedAt: new Date().toISOString(),
    };
  }

  return state.leadMeta[id];
}

function getLeadStatus(id) {
  return getLeadMeta(id).status || 'new';
}

function updateLeadMeta(id, fieldName, value, notify = true) {
  const meta = getLeadMeta(id);
  meta[fieldName] = value;
  meta.updatedAt = new Date().toISOString();
  writeLeadMeta();
  renderPipeline();
  renderLeadList();
  renderOverview();

  if (notify && fieldName !== 'note') {
    showToast('Карточка заявки обновлена.', 'success');
  }
}

function readLeadMeta() {
  try {
    return JSON.parse(localStorage.getItem(LEAD_META_KEY) || '{}');
  } catch (error) {
    console.warn('Failed to read lead workspace metadata.', error);
    return {};
  }
}

function writeLeadMeta() {
  try {
    localStorage.setItem(LEAD_META_KEY, JSON.stringify(state.leadMeta));
  } catch (error) {
    console.warn('Failed to persist lead workspace metadata.', error);
  }
}

function bindExport() {
  if (!dom.exportButton) {
    return;
  }

  dom.exportButton.addEventListener('click', async () => {
    if (hasRemoteConfig && !state.currentUser) {
      setAuthFeedback('Сначала войдите в админку, чтобы скачать онлайн-заявки.', 'warning');
      return;
    }

    setButtonLoading(dom.exportButton, true, 'Готовим таблицу...');

    try {
      const leads = state.leads.length ? state.leads : await fetchLeadRecords(5000);
      await downloadExcel(leads);
    } catch (error) {
      console.error(error);
      showToast('Не удалось сформировать таблицу.', 'error');
    } finally {
      setButtonLoading(dom.exportButton, false, 'Скачать таблицу');
    }
  });
}

async function downloadExcel(items) {
  if (!window.ExcelJS) {
    throw new Error('ExcelJS is unavailable');
  }

  const workbook = new window.ExcelJS.Workbook();
  workbook.creator = 'Mirror Trainer';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Предзаказы', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Дата', key: 'created_at', width: 22 },
    { header: 'Статус', key: 'status', width: 16 },
    { header: 'Приоритет', key: 'priority', width: 16 },
    { header: 'Имя', key: 'name', width: 24 },
    { header: 'Телефон', key: 'phone', width: 22 },
    { header: 'Телеграм', key: 'telegram', width: 22 },
    { header: 'Почта', key: 'email', width: 28 },
    { header: 'Комментарий', key: 'comment', width: 42 },
    { header: 'Заметка админа', key: 'admin_note', width: 42 },
    { header: 'Источник', key: 'source_context', width: 18 },
    { header: 'Страница', key: 'page_path', width: 28 },
    { header: 'Метка источника', key: 'utm_source', width: 18 },
    { header: 'Метка канала', key: 'utm_medium', width: 18 },
    { header: 'Метка кампании', key: 'utm_campaign', width: 20 },
  ];

  const rows = items.map((item) => {
    const id = getLeadId(item);
    const meta = getLeadMeta(id);
    return {
      created_at: item.created_at ? new Date(item.created_at) : '',
      status: STATUS_META[meta.status]?.label || meta.status || 'Новая',
      priority: PRIORITY_META[meta.priority] || meta.priority || 'Обычная',
      name: item.name || '',
      phone: item.phone || item.contact || '',
      telegram: item.telegram || '',
      email: item.email || '',
      comment: item.comment || '',
      admin_note: meta.note || '',
      source_context: item.source_context || '',
      page_path: item.page_path || '',
      utm_source: item.utm_source || '',
      utm_medium: item.utm_medium || '',
      utm_campaign: item.utm_campaign || '',
    };
  });

  sheet.addRows(rows);
  sheet.autoFilter = 'A1:N1';

  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: 'FFF4F7F8' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF12171D' },
  };
  headerRow.border = {
    bottom: { style: 'thin', color: { argb: 'FF2B363F' } },
  };

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: 'top', wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE6EAF0' } },
      };
    });

    if (rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF7FAF9' },
      };
    }
  });

  sheet.getColumn(1).numFmt = 'dd.mm.yyyy hh:mm';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `mirror-trainer-preorders-${formatFileDate(new Date())}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindSettings() {
  if (dom.exportContentButton) {
    dom.exportContentButton.addEventListener('click', () => {
      const schema = getCurrentSchema();
      const payload = {
        pageSlug: schema.pageSlug,
        exportedAt: new Date().toISOString(),
        items: getChangedContentItems().map((item) => ({
          key: item.key,
          label: item.label,
          value: item.value,
          defaultValue: item.defaultValue,
        })),
      };
      downloadJson(payload, `mirror-trainer-${schema.pageSlug}-content-${formatFileDate(new Date())}.json`);
    });
  }

  if (dom.clearLocalDataButton) {
    dom.clearLocalDataButton.addEventListener('click', () => {
      if (!window.confirm('Очистить локальные заявки, аналитику и правки сайта в этом браузере?')) {
        return;
      }

      dataApi.clearLocalData?.();
      state.leadMeta = {};
      writeLeadMeta();
      showToast('Локальные данные очищены.', 'success');
      loadDashboard();
    });
  }
}

function renderFunnel(summary) {
  const container = document.querySelector('[data-funnel-grid]');
  if (!container) return;

  const visitors = Number(summary.uniqueVisitors) || 0;
  const ctaClicks = Number(summary.ctaClicks) || 0;
  const leads = Number(summary.totalLeads) || 0;
  const stages = [
    { label: 'Посетили страницу', value: visitors },
    { label: 'Нажали кнопку', value: ctaClicks },
    { label: 'Оставили заявку', value: leads },
  ];
  const base = Math.max(stages[0].value, 1);

  container.innerHTML = stages.map((stage) => {
    const ratio = Math.min((stage.value / base) * 100, 100);
    return `
      <article class="funnel-card">
        <span>${escapeHtml(stage.label)}</span>
        <strong>${number(stage.value)}</strong>
        <small>${formatPercent((stage.value / base) * 100)}% от посетителей</small>
        <div class="funnel-track">
          <div class="funnel-fill" style="width: ${ratio}%"></div>
        </div>
      </article>
    `;
  }).join('');
}

function renderBarList(selector, items, humanize = false) {
  const container = document.querySelector(selector);
  if (!container) return;

  const normalizedItems = humanize
    ? items.map((item) => ({ ...item, label: humanizeCtaLabel(item.label) }))
    : items;

  if (!normalizedItems.length) {
    container.innerHTML = '<div class="bar-item">Пока нет данных.</div>';
    return;
  }

  const max = Math.max(...normalizedItems.map((item) => item.count), 1);
  container.innerHTML = normalizedItems.map((item) => {
    const width = Math.max((item.count / max) * 100, item.count > 0 ? 8 : 0);
    return `
      <div class="bar-item">
        <div class="bar-label">
          <span>${escapeHtml(item.label)}</span>
          <strong>${number(item.count)}</strong>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function normalizeCtaItems(items) {
  return items
    .map((item) => ({
      label: item.label || '',
      count: Number(item.count) || 0,
    }))
    .filter((item) => item.label);
}

function humanizeCtaLabel(label) {
  const map = {
    hero_primary: 'Первый лендинг: главная кнопка',
    hero_secondary: 'Первый лендинг: вторая кнопка',
    hero_quick_product: 'Первый лендинг: цена',
    hero_quick_training: 'Первый лендинг: тренировка',
    header_preorder: 'Первый лендинг: шапка',
    landing2_header_reserve: 'Лендинг 2: шапка',
    landing2_hero_reserve: 'Лендинг 2: бронь',
    landing2_hero_inside: 'Лендинг 2: упражнения',
    landing2_hero_method: 'Лендинг 2: как работает',
    landing2_sticky_reserve: 'Лендинг 2: плавающая кнопка',
    landing3_nav_skill: 'Лендинг 3: навык',
    landing3_nav_kit: 'Лендинг 3: комплект',
    landing3_nav_method: 'Лендинг 3: метод',
    landing3_nav_pricing: 'Лендинг 3: предзаказ',
    landing3_header_apply: 'Лендинг 3: кнопка в шапке',
    landing3_hero_reserve: 'Лендинг 3: бронь',
    landing3_hero_method: 'Лендинг 3: метод',
  };

  return map[label] || label;
}

function normalizeVisibleText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeContentCompare(value) {
  return normalizeVisibleText(value).replace(/\s+([,.!?;:])/g, '$1');
}

function normalizePhoneHref(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

function toggleNode(node, shouldShow) {
  if (!node) return;
  node.hidden = !shouldShow;
  node.style.display = shouldShow ? '' : 'none';
}

function setButtonLoading(button, isLoading, label) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = label;
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  setTextNode(node, value);
}

function setTextNode(node, value) {
  if (node) {
    node.textContent = value;
  }
}

function number(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function formatPercent(value) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) {
    return 'нет данных';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'нет данных';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatFileDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}${minutes}`;
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return window.CSS.escape(value);
  }

  return String(value).replace(/["\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message, type = 'success') {
  const stack = document.querySelector('[data-admin-toast-stack]');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = `toast is-${type}`;
  toast.textContent = message;
  stack.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3600);
}
})();
