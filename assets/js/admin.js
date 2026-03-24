(function () {
const dataApi = window.MirrorTrainerData || {};
const fetchDashboardSnapshot = dataApi.getDashboardSnapshot || (async () => ({ summary: {}, interestBreakdown: [], purchaseBreakdown: [], ctaBreakdown: [], scrollDepth: [], updatedAt: new Date().toISOString(), storageMode: 'local' }));
const fetchLeadRecords = dataApi.getLeadRecords || (async () => []);
const getAdminSession = dataApi.getAdminSession || (async () => ({ mode: 'local', session: null, user: null }));
const requestAdminMagicLink = dataApi.requestAdminMagicLink || (async () => ({ mode: 'local', sent: false }));
const performAdminSignOut = dataApi.signOutAdmin || (async () => ({ mode: 'local' }));
const subscribeToAuthChanges = dataApi.onAuthStateChange || (async () => (() => {}));
const refreshButton = document.querySelector('[data-refresh-dashboard]');
const updatedLabel = document.querySelector('[data-updated-label]');
const authPanel = document.querySelector('[data-admin-auth-panel]');
const authTitle = document.querySelector('[data-admin-auth-title]');
const authSubtitle = document.querySelector('[data-admin-auth-subtitle]');
const authFeedback = document.querySelector('[data-admin-auth-feedback]');
const authForm = document.querySelector('[data-admin-login-form]');
const sessionActions = document.querySelector('[data-admin-session-actions]');
const sessionEmail = document.querySelector('[data-admin-session-email]');
const logoutButton = document.querySelector('[data-admin-logout]');
const dashboard = document.querySelector('[data-admin-dashboard]');
const hasRemoteConfig = Boolean(dataApi.hasRemoteConfig);
let isLoading = false;
let authReady = false;
let currentUser = null;

init();

async function init() {
  bindAuthUi();
  await syncAuthState();

  if (!hasRemoteConfig) {
    loadDashboard();
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => loadDashboard());
  }

  window.addEventListener('storage', () => loadDashboard());
  window.addEventListener('mirror-trainer-storage-updated', () => loadDashboard());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadDashboard();
    }
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadDashboard();
    }
  }, 12000);

  subscribeToAuthChanges(handleAuthStateChange).catch((error) => {
    console.error('Failed to subscribe to auth state changes', error);
  });
}

function bindAuthUi() {
  if (authForm) {
    authForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(authForm);
      const email = String(formData.get('email') || '').trim().toLowerCase();

      if (!email) {
        setAuthFeedback('Введите email администратора.', 'error');
        return;
      }

      setAuthFeedback('Отправляем ссылку для входа...', 'warning');

      try {
        const result = await requestAdminMagicLink(email);

        if (result.sent) {
          setAuthFeedback(
            `Ссылка для входа отправлена на ${email}. Открой письмо на этом устройстве и вернитесь в админку.`,
            'success'
          );
          authForm.reset();
        } else {
          setAuthFeedback('Supabase ещё не подключён. Сейчас доступен только локальный режим.', 'warning');
        }
      } catch (error) {
        console.error(error);
        setAuthFeedback(explainAuthError(error), 'error');
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await performAdminSignOut();
        currentUser = null;
        syncAuthState();
      } catch (error) {
        console.error(error);
        setAuthFeedback('Не удалось завершить сессию.', 'error');
      }
    });
  }
}

async function syncAuthState() {
  if (!hasRemoteConfig) {
    authReady = true;
    currentUser = null;
    updateAuthView();
    return;
  }

  setAuthFeedback('Проверяем доступ к онлайн-данным...', 'warning');

  try {
    const { user } = await getAdminSession();
    authReady = true;
    currentUser = user || null;
    updateAuthView();

    if (currentUser) {
      loadDashboard();
    }
  } catch (error) {
    console.error(error);
    authReady = true;
    currentUser = null;
    updateAuthView();
    setAuthFeedback('Не удалось проверить сессию. Проверьте настройки Supabase.', 'error');
  }
}

function handleAuthStateChange({ user }) {
  currentUser = user || null;
  authReady = true;
  updateAuthView();

  if (currentUser) {
    loadDashboard();
  }
}

function updateAuthView() {
  if (!authPanel) {
    return;
  }

  if (!authReady) {
    setAuthCopy('Проверка доступа', 'Подготавливаем режим админки');
    toggleNode(authForm, false);
    toggleNode(sessionActions, false);
    toggleNode(dashboard, false);
    return;
  }

  if (!hasRemoteConfig) {
    setAuthCopy('Локальный режим', 'Supabase не подключён, доступны только локальные данные этого браузера');
    toggleNode(authForm, false);
    toggleNode(sessionActions, false);
    toggleNode(dashboard, true);
    setAuthFeedback('Для боевого режима подключите Supabase и вход по email для админки.', 'warning');
    return;
  }

  if (currentUser) {
    setAuthCopy('Доступ подтверждён', 'Админка подключена к Supabase и показывает общие онлайн-данные');
    toggleNode(authForm, false);
    toggleNode(sessionActions, true);
    toggleNode(dashboard, true);

    if (sessionEmail) {
      sessionEmail.textContent = currentUser.email || 'Администратор';
    }

    setAuthFeedback('Вход выполнен. Данные читаются из Supabase.', 'success');
    return;
  }

  setAuthCopy('Вход в админку', 'Для просмотра реальных заявок и аналитики войдите по email администратора');
  toggleNode(authForm, true);
  toggleNode(sessionActions, false);
  toggleNode(dashboard, false);
  setAuthFeedback('После входа откроется общая онлайн-сводка по клиентам.', 'warning');
}

function setAuthCopy(title, subtitle) {
  if (authTitle) {
    authTitle.textContent = title;
  }

  if (authSubtitle) {
    authSubtitle.textContent = subtitle;
  }
}

function setAuthFeedback(message, type) {
  if (!authFeedback) {
    return;
  }

  authFeedback.textContent = message;
  authFeedback.classList.remove('is-success', 'is-error', 'is-warning');

  if (type) {
    authFeedback.classList.add(`is-${type}`);
  }
}

function explainAuthError(error) {
  const message = String(error?.message || '').trim();
  const normalized = message.toLowerCase();

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many') ||
    normalized.includes('otp')
  ) {
    return 'Ссылка временно не отправляется из-за лимита писем Supabase. Подождите немного и попробуйте снова. Для боевого режима лучше подключить свой SMTP.';
  }

  if (normalized.includes('not authorized')) {
    return 'Этот email не разрешён для отправки через текущую почтовую настройку Supabase. Проверьте SMTP или список разрешённых адресов.';
  }

  if (message) {
    return `Не удалось отправить ссылку: ${message}`;
  }

  return 'Не удалось отправить ссылку. Проверьте настройки Supabase Auth.';
}

function toggleNode(node, shouldShow) {
  if (!node) {
    return;
  }

  node.hidden = !shouldShow;
}

async function loadDashboard() {
  if (hasRemoteConfig && !currentUser) {
    return;
  }

  if (isLoading) {
    return;
  }

  isLoading = true;

  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = 'Обновляем...';
  }

  try {
    const snapshot = await fetchDashboardSnapshot();
    const leads = await fetchLeadRecords(24);
    const interestBreakdown = snapshot.interestBreakdown || [];
    const purchaseBreakdown = snapshot.purchaseBreakdown || [];
    const ctaBreakdown = snapshot.ctaBreakdown || [];
    const scrollDepth = (snapshot.scrollDepth || []).map((item) => ({
      label: item.label || `${item.depth}%`,
      count: item.count || 0,
    }));

    renderSummary(snapshot.summary || {}, interestBreakdown, purchaseBreakdown);
    renderFunnel(snapshot.summary || {}, interestBreakdown, purchaseBreakdown);
    renderBarList('[data-list="interest"]', interestBreakdown);
    renderBarList('[data-list="purchase"]', purchaseBreakdown);
    renderBarList('[data-list="cta"]', ctaBreakdown);
    renderBarList(
      '[data-list="scroll"]',
      scrollDepth
    );
    renderLeads(leads);

    if (updatedLabel) {
      const formatted = formatDate(snapshot.updatedAt);
      updatedLabel.textContent =
        snapshot.storageMode === 'local'
          ? `Локальные данные: ${formatted}`
          : `Обновлено: ${formatted}`;
    }
  } catch (error) {
    console.error(error);
    if (updatedLabel) {
      updatedLabel.textContent = 'Не удалось загрузить данные';
    }

    if (hasRemoteConfig) {
      setAuthFeedback('Не удалось получить онлайн-данные. Проверьте, что ваш email добавлен в список администраторов.', 'error');
    }
  } finally {
    isLoading = false;
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = 'Обновить данные';
    }
  }
}

function renderSummary(summary, interestBreakdown, purchaseBreakdown) {
  const interestResponses = sumCounts(interestBreakdown);
  const purchaseResponses = sumCounts(purchaseBreakdown);
  const positiveInterest = sumSelectedCounts(interestBreakdown, [
    'Очень интересно',
    'Скорее интересно',
  ]);
  const potentialDemand = sumSelectedCounts(purchaseBreakdown, [
    'Да, купил(а) бы',
    'Возможно, если будут отзывы / подробности',
    'Возможно, если будет ниже цена',
  ]);
  const surveyCoverage = summary.uniqueVisitors
    ? (interestResponses / Number(summary.uniqueVisitors)) * 100
    : 0;

  setText('[data-kpi="uniqueVisitors"]', number(summary.uniqueVisitors));
  setText('[data-kpi="totalLeads"]', number(summary.totalLeads));
  setText('[data-kpi="interestResponses"]', number(interestResponses));
  setText('[data-kpi="purchaseResponses"]', number(purchaseResponses));
  setText('[data-kpi="veryInterested"]', number(summary.veryInterested));
  setText('[data-kpi="positiveInterest"]', number(positiveInterest));
  setText('[data-kpi="buyYes"]', number(summary.buyYes));
  setText('[data-kpi="potentialDemand"]', number(potentialDemand));
  setText('[data-kpi="buyLowerPrice"]', number(summary.buyLowerPrice));
  setText('[data-kpi="formConversion"]', `${formatPercent(summary.formConversion)}%`);
  setText('[data-kpi="surveyCoverage"]', `${formatPercent(surveyCoverage)}%`);
  setText('[data-kpi="ctaClicks"]', number(summary.ctaClicks));
}

function renderFunnel(summary, interestBreakdown, purchaseBreakdown) {
  const container = document.querySelector('[data-funnel-grid]');

  if (!container) {
    return;
  }

  const visitors = Number(summary.uniqueVisitors) || 0;
  const interestResponses = sumCounts(interestBreakdown);
  const purchaseResponses = sumCounts(purchaseBreakdown);
  const leads = Number(summary.totalLeads) || 0;

  const stages = [
    {
      label: 'Посетили страницу',
      value: visitors,
    },
    {
      label: 'Ответили по интересу',
      value: interestResponses,
    },
    {
      label: 'Ответили по покупке',
      value: purchaseResponses,
    },
    {
      label: 'Оставили заявку',
      value: leads,
    },
  ];

  const base = Math.max(stages[0].value, 1);

  container.innerHTML = stages
    .map((stage) => {
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
    })
    .join('');
}

function renderBarList(selector, items) {
  const container = document.querySelector(selector);
  const normalizedItems =
    selector === '[data-list="cta"]' ? items.map((item) => ({ ...item, label: humanizeCtaLabel(item.label) })) : items;

  if (!container) {
    return;
  }

  if (!normalizedItems.length) {
    container.innerHTML = '<div class="bar-item">Пока нет данных.</div>';
    return;
  }

  const max = Math.max(...normalizedItems.map((item) => item.count), 1);

  container.innerHTML = normalizedItems
    .map((item) => {
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
    })
    .join('');
}

function renderLeads(items) {
  const container = document.querySelector('[data-lead-list]');

  if (!container) {
    return;
  }

  if (!items.length) {
    container.innerHTML = '<div class="bar-item">Пока нет заявок.</div>';
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const createdAt = formatDate(item.created_at);
      const tags = [
        item.source_context ? `Источник: ${item.source_context}` : '',
        item.interest_choice ? `Интерес: ${item.interest_choice}` : '',
        item.purchase_intent_choice ? `Покупка: ${item.purchase_intent_choice}` : '',
      ].filter(Boolean);

      return `
        <article class="lead-card">
          <div class="lead-card-header">
            <div>
              <h3>${escapeHtml(item.name || 'Без имени')}</h3>
              <div class="lead-meta">
                ${escapeHtml(item.contact || 'Контакт не указан')}
                ${item.email ? `<br>${escapeHtml(item.email)}` : ''}
              </div>
            </div>
            <span>${escapeHtml(createdAt)}</span>
          </div>
          <div class="lead-tags">
            ${tags.map((tag) => `<span class="lead-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
          ${
            item.comment
              ? `<div class="lead-comment">${escapeHtml(item.comment)}</div>`
              : ''
          }
        </article>
      `;
    })
    .join('');
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function number(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function sumCounts(items) {
  return items.reduce((total, item) => total + (Number(item.count) || 0), 0);
}

function sumSelectedCounts(items, labels) {
  return items.reduce(
    (total, item) =>
      total + (labels.includes(item.label) ? Number(item.count) || 0 : 0),
    0
  );
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

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function humanizeCtaLabel(label) {
  const map = {
    hero_primary: 'Hero: цена и опрос',
    hero_secondary: 'Hero: предзаказ',
    hero_quick_product: 'Hero: состав комплекта',
    hero_quick_training: 'Hero: тренировка',
    header_preorder: 'Header: предзаказ',
    mobile_dock: 'Mobile dock: заявка',
    final_cta: 'Финальный CTA',
  };

  return map[label] || label;
}
})();
