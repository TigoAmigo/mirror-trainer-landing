(function () {
const appConfig = window.APP_CONFIG || {};
const memoryStore = window.__MIRROR_TRAINER_MEMORY__ || (window.__MIRROR_TRAINER_MEMORY__ = {});

const STORAGE_KEYS = {
  leads: 'mirror-trainer-leads',
  feedbackVotes: 'mirror-trainer-feedback-votes',
  purchaseIntent: 'mirror-trainer-purchase-intent',
  eventLogs: 'mirror-trainer-event-logs',
};

const hasRemoteConfig =
  window.location.protocol !== 'file:' &&
  Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
let clientPromise = null;

const storageMode = hasRemoteConfig ? 'remote' : 'local';

const EMPTY_DASHBOARD_SNAPSHOT = {
  storageMode: 'local',
  updatedAt: new Date().toISOString(),
  summary: {
    totalLeads: 0,
    uniqueVisitors: 0,
    veryInterested: 0,
    buyYes: 0,
    buyLowerPrice: 0,
    formConversion: 0,
    ctaClicks: 0,
  },
  interestBreakdown: [
    { label: 'Очень интересно', count: 0 },
    { label: 'Скорее интересно', count: 0 },
    { label: 'Нейтрально', count: 0 },
    { label: 'Неинтересно', count: 0 },
  ],
  purchaseBreakdown: [
    { label: 'Да, купил(а) бы', count: 0 },
    { label: 'Возможно, если будут отзывы / подробности', count: 0 },
    { label: 'Возможно, если будет ниже цена', count: 0 },
    { label: 'Нет', count: 0 },
  ],
  ctaBreakdown: [
    { label: 'hero_primary', count: 0 },
    { label: 'hero_secondary', count: 0 },
    { label: 'hero_quick_product', count: 0 },
    { label: 'hero_quick_training', count: 0 },
    { label: 'header_preorder', count: 0 },
    { label: 'final_cta', count: 0 },
  ],
  scrollDepth: [
    { label: '25%', depth: 25, count: 0 },
    { label: '50%', depth: 50, count: 0 },
    { label: '75%', depth: 75, count: 0 },
    { label: '100%', depth: 100, count: 0 },
  ],
};

const EMPTY_LEAD_RECORDS = [];

async function getSupabaseClient() {
  if (!hasRemoteConfig) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(({ createClient }) =>
        createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      )
      .catch((error) => {
        console.warn('Supabase client is unavailable, falling back to local mode.', error);
        return null;
      });
  }

  return clientPromise;
}

function readLocal(key, fallback) {
  try {
    const value = readStorageValue(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Failed to read local storage key "${key}"`, error);
    return fallback;
  }
}

function writeLocal(key, value) {
  writeStorageValue(key, JSON.stringify(value));
}

function readStorageValue(key) {
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

  return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
}

function writeStorageValue(key, value) {
  memoryStore[key] = value;

  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to persist localStorage key "${key}", using memory fallback.`, error);
  }

  writeCookie(key, value);

  window.dispatchEvent(
    new CustomEvent('mirror-trainer-storage-updated', {
      detail: { key },
    })
  );
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

function upsertLocal(collectionKey, row, matcher) {
  const collection = readLocal(collectionKey, []);
  const index = collection.findIndex(matcher);

  if (index >= 0) {
    collection[index] = { ...collection[index], ...row, updated_at: new Date().toISOString() };
  } else {
    collection.push(row);
  }

  writeLocal(collectionKey, collection);
}

function createLocalId(prefix) {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

function normalizeNullable(value) {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function countByLabel(rows, labelKey, order = []) {
  const map = new Map();

  rows.forEach((row) => {
    const label = row[labelKey];
    if (!label) {
      return;
    }

    map.set(label, (map.get(label) || 0) + 1);
  });

  const entries = Array.from(map.entries()).map(([label, count]) => ({ label, count }));

  if (!order.length) {
    return entries.sort((a, b) => b.count - a.count);
  }

  return order
    .map((label) => ({
      label,
      count: map.get(label) || 0,
    }))
    .filter((item) => item.count > 0 || order.includes(item.label));
}

function buildLocalDashboardSnapshot() {
  const leads = readLocal(STORAGE_KEYS.leads, []);
  const feedbackVotes = readLocal(STORAGE_KEYS.feedbackVotes, []);
  const purchaseIntent = readLocal(STORAGE_KEYS.purchaseIntent, []);
  const eventLogs = readLocal(STORAGE_KEYS.eventLogs, []);

  if (!leads.length && !feedbackVotes.length && !purchaseIntent.length && !eventLogs.length) {
    return EMPTY_DASHBOARD_SNAPSHOT;
  }

  const pageViewSessions = new Set(
    eventLogs.filter((item) => item.event_name === 'page_view').map((item) => item.session_id)
  );

  const ctaClicks = eventLogs.filter((item) => item.event_name === 'cta_click');
  const scrollDepth = eventLogs.filter((item) => item.event_name === 'scroll_depth');

  const uniqueVisitors = pageViewSessions.size;
  const totalLeads = leads.length;
  const formConversion = uniqueVisitors ? (totalLeads / uniqueVisitors) * 100 : 0;

  const interestBreakdown = countByLabel(feedbackVotes, 'interest_level', [
    'Очень интересно',
    'Скорее интересно',
    'Нейтрально',
    'Неинтересно',
  ]);

  const purchaseBreakdown = countByLabel(purchaseIntent, 'purchase_choice', [
    'Да, купил(а) бы',
    'Возможно, если будут отзывы / подробности',
    'Возможно, если будет ниже цена',
    'Нет',
  ]);

  const ctaBreakdown = countByLabel(ctaClicks, 'label', [
    'hero_primary',
    'hero_secondary',
    'hero_quick_product',
    'hero_quick_training',
    'header_preorder',
    'final_cta',
  ]);

  const scrollOrder = [25, 50, 75, 100];
  const scrollBreakdown = scrollOrder.map((depth) => ({
    label: `${depth}%`,
    depth,
    count: scrollDepth.filter((item) => Number(item.metadata?.depth) === depth).length,
  }));

  return {
    storageMode: 'local',
    updatedAt: new Date().toISOString(),
    summary: {
      totalLeads,
      uniqueVisitors,
      veryInterested:
        feedbackVotes.filter((item) => item.interest_level === 'Очень интересно').length,
      buyYes:
        purchaseIntent.filter((item) => item.purchase_choice === 'Да, купил(а) бы').length,
      buyLowerPrice:
        purchaseIntent.filter(
          (item) => item.purchase_choice === 'Возможно, если будет ниже цена'
        ).length,
      formConversion,
      ctaClicks: ctaClicks.length,
    },
    interestBreakdown,
    purchaseBreakdown,
    ctaBreakdown,
    scrollDepth: scrollBreakdown,
  };
}

async function runRpc(functionName, payload) {
  const client = await getSupabaseClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.rpc(functionName, payload);

  if (error) {
    throw error;
  }

  return data;
}

async function getAdminSession() {
  const client = await getSupabaseClient();

  if (!client) {
    return {
      mode: 'local',
      session: null,
      user: null,
    };
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return {
    mode: 'remote',
    session: data.session,
    user: data.session?.user ?? null,
  };
}

async function requestAdminMagicLink(email) {
  const client = await getSupabaseClient();

  if (!client) {
    return {
      mode: 'local',
      sent: false,
    };
  }

  const isLocalHost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocalHost ? window.location.href : appConfig.siteUrl || window.location.href;
  const redirectTo = new URL('admin.html', baseUrl).toString();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return {
    mode: 'remote',
    sent: true,
    redirectTo,
  };
}

async function signOutAdmin() {
  const client = await getSupabaseClient();

  if (!client) {
    return {
      mode: 'local',
    };
  }

  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }

  return {
    mode: 'remote',
  };
}

async function onAuthStateChange(callback) {
  const client = await getSupabaseClient();

  if (!client || typeof callback !== 'function') {
    return () => {};
  }

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    callback({
      session,
      user: session?.user ?? null,
    });
  });

  return () => subscription.unsubscribe();
}

async function saveLead(payload) {
  const row = {
    id: createLocalId('lead'),
    created_at: new Date().toISOString(),
    name: payload.name.trim(),
    contact: payload.contact.trim(),
    email: normalizeNullable(payload.email),
    comment: normalizeNullable(payload.comment),
    page_path: payload.pagePath,
    source_context: payload.sourceContext,
    session_id: payload.sessionId,
    purchase_intent_choice: normalizeNullable(payload.purchaseIntentChoice),
    interest_choice: normalizeNullable(payload.interestChoice),
    utm_source: normalizeNullable(payload.utmSource),
    utm_medium: normalizeNullable(payload.utmMedium),
    utm_campaign: normalizeNullable(payload.utmCampaign),
    device_type: normalizeNullable(payload.deviceType),
    referrer: normalizeNullable(payload.referrer),
  };

  const data = await runRpc('create_lead', { payload: row });

  if (!data) {
    const collection = readLocal(STORAGE_KEYS.leads, []);
    collection.push(row);
    writeLocal(STORAGE_KEYS.leads, collection);
    return { mode: 'local', id: row.id };
  }
  return { mode: 'remote', id: data };
}

async function saveInterestVote(payload) {
  const row = {
    id: createLocalId('interest'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    session_id: payload.sessionId,
    interest_level: payload.value,
    page_path: payload.pagePath,
    utm_source: normalizeNullable(payload.utmSource),
    utm_medium: normalizeNullable(payload.utmMedium),
    utm_campaign: normalizeNullable(payload.utmCampaign),
    device_type: normalizeNullable(payload.deviceType),
    referrer: normalizeNullable(payload.referrer),
  };

  const data = await runRpc('upsert_feedback_vote', { payload: row });

  if (!data) {
    upsertLocal(
      STORAGE_KEYS.feedbackVotes,
      row,
      (item) => item.session_id === payload.sessionId
    );
    return { mode: 'local', id: row.id };
  }
  return { mode: 'remote', id: data };
}

async function savePurchaseIntent(payload) {
  const row = {
    id: createLocalId('purchase'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    session_id: payload.sessionId,
    purchase_choice: payload.value,
    page_path: payload.pagePath,
    utm_source: normalizeNullable(payload.utmSource),
    utm_medium: normalizeNullable(payload.utmMedium),
    utm_campaign: normalizeNullable(payload.utmCampaign),
    device_type: normalizeNullable(payload.deviceType),
    referrer: normalizeNullable(payload.referrer),
  };

  const data = await runRpc('upsert_purchase_intent', { payload: row });

  if (!data) {
    upsertLocal(
      STORAGE_KEYS.purchaseIntent,
      row,
      (item) => item.session_id === payload.sessionId
    );
    return { mode: 'local', id: row.id };
  }
  return { mode: 'remote', id: data };
}

async function logEvent(payload) {
  const row = {
    id: createLocalId('event'),
    created_at: new Date().toISOString(),
    session_id: payload.sessionId,
    event_name: payload.eventName,
    page_path: payload.pagePath,
    section_id: normalizeNullable(payload.sectionId),
    label: normalizeNullable(payload.label),
    utm_source: normalizeNullable(payload.utmSource),
    utm_medium: normalizeNullable(payload.utmMedium),
    utm_campaign: normalizeNullable(payload.utmCampaign),
    device_type: normalizeNullable(payload.deviceType),
    referrer: normalizeNullable(payload.referrer),
    metadata: payload.metadata || {},
  };

  const data = await runRpc('log_event', { payload: row });

  if (!data) {
    const collection = readLocal(STORAGE_KEYS.eventLogs, []);
    collection.push(row);
    writeLocal(STORAGE_KEYS.eventLogs, collection);
    return { mode: 'local', id: row.id };
  }
  return { mode: 'remote', id: data };
}

async function getDashboardSnapshot() {
  const data = await runRpc('get_dashboard_snapshot', {});

  if (!data) {
    return buildLocalDashboardSnapshot();
  }
  return {
    ...data,
    demo: false,
    storageMode: 'remote',
  };
}

async function getLeadRecords(limit = 50) {
  const normalizedLimit = Math.max(1, Number(limit) || 50);
  const data = await runRpc('get_recent_leads', { limit_count: normalizedLimit });

  if (Array.isArray(data)) {
    return data;
  }

  const leads = readLocal(STORAGE_KEYS.leads, []);

  if (!leads.length) {
    return EMPTY_LEAD_RECORDS.slice(0, normalizedLimit);
  }

  return leads
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, normalizedLimit);
}

function clearLocalData() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to clear localStorage key "${key}"`, error);
    }

    delete memoryStore[key];
    document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0; SameSite=Lax`;
  });

  window.dispatchEvent(
    new CustomEvent('mirror-trainer-storage-updated', {
      detail: { cleared: true },
    })
  );

  return {
    mode: 'local',
    cleared: true,
  };
}

window.MirrorTrainerData = {
  storageMode,
  hasRemoteConfig,
  saveLead,
  saveInterestVote,
  savePurchaseIntent,
  logEvent,
  getDashboardSnapshot,
  getLeadRecords,
  getAdminSession,
  requestAdminMagicLink,
  signOutAdmin,
  onAuthStateChange,
  clearLocalData,
};
})();
