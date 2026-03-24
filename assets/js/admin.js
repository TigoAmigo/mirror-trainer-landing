(function () {
const dataApi = window.MirrorTrainerData || {};
const fetchDashboardSnapshot = dataApi.getDashboardSnapshot || (async () => ({ summary: {}, interestBreakdown: [], purchaseBreakdown: [], ctaBreakdown: [], scrollDepth: [], updatedAt: new Date().toISOString(), demo: true }));
const fetchLeadRecords = dataApi.getLeadRecords || (async () => []);
const refreshButton = document.querySelector('[data-refresh-dashboard]');
const updatedLabel = document.querySelector('[data-updated-label]');
let isLoading = false;

init();

function init() {
  loadDashboard();

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
}

async function loadDashboard() {
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
      updatedLabel.textContent = snapshot.demo
        ? `Локальные данные: ${formatted}`
        : `Обновлено: ${formatted}`;
    }
  } catch (error) {
    console.error(error);
    if (updatedLabel) {
      updatedLabel.textContent = 'Не удалось загрузить данные';
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
    final_cta: 'Финальный CTA',
  };

  return map[label] || label;
}
})();
