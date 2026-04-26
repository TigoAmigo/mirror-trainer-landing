(function () {
const appConfig = window.APP_CONFIG || {};
const memoryStore = window.__MIRROR_TRAINER_MEMORY__ || (window.__MIRROR_TRAINER_MEMORY__ = {});

const STORAGE_KEYS = {
  leads: 'mirror-trainer-leads',
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
    formConversion: 0,
    ctaClicks: 0,
  },
  ctaBreakdown: [
    { label: 'hero_primary', count: 0 },
    { label: 'hero_secondary', count: 0 },
    { label: 'hero_quick_product', count: 0 },
    { label: 'hero_quick_training', count: 0 },
    { label: 'header_preorder', count: 0 },
  ],
  scrollDepth: [
    { label: '25%', depth: 25, count: 0 },
    { label: '50%', depth: 50, count: 0 },
    { label: '75%', depth: 75, count: 0 },
    { label: '100%', depth: 100, count: 0 },
  ],
};

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

  if (!order.length) {
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  return order.map((label) => ({
    label,
    count: map.get(label) || 0,
  }));
}

function buildLocalDashboardSnapshot() {
  const leads = readLocal(STORAGE_KEYS.leads, []);
  const eventLogs = readLocal(STORAGE_KEYS.eventLogs, []);

  if (!leads.length && !eventLogs.length) {
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

  const ctaBreakdown = countByLabel(ctaClicks, 'label', [
    'hero_primary',
    'hero_secondary',
    'hero_quick_product',
    'hero_quick_training',
    'header_preorder',
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
      formConversion,
      ctaClicks: ctaClicks.length,
    },
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
    phone: payload.phone.trim(),
    telegram: payload.telegram.trim(),
    contact: payload.contact.trim(),
    email: normalizeNullable(payload.email),
    comment: normalizeNullable(payload.comment),
    page_path: payload.pagePath,
    source_context: payload.sourceContext,
    session_id: payload.sessionId,
    utm_source: normalizeNullable(payload.utmSource),
    utm_medium: normalizeNullable(payload.utmMedium),
    utm_campaign: normalizeNullable(payload.utmCampaign),
    device_type: normalizeNullable(payload.deviceType),
    referrer: normalizeNullable(payload.referrer),
  };

  let data = null;

  try {
    data = await runRpc('create_lead', { payload: row });
  } catch (error) {
    console.warn('Falling back to local lead storage because remote create_lead failed.', error);
  }

  if (!data) {
    const collection = readLocal(STORAGE_KEYS.leads, []);
    collection.push(row);
    writeLocal(STORAGE_KEYS.leads, collection);
    return { mode: 'local', id: row.id };
  }

  return { mode: 'remote', id: data };
}

async function saveInterestVote() {
  return { mode: storageMode, skipped: true };
}

async function savePurchaseIntent() {
  return { mode: storageMode, skipped: true };
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

  let data = null;

  try {
    data = await runRpc('log_event', { payload: row });
  } catch (error) {
    console.warn('Falling back to local event storage because remote log_event failed.', error);
  }

  if (!data) {
    const collection = readLocal(STORAGE_KEYS.eventLogs, []);
    collection.push(row);
    writeLocal(STORAGE_KEYS.eventLogs, collection);
    return { mode: 'local', id: row.id };
  }

  return { mode: 'remote', id: data };
}

async function getDashboardSnapshot() {
  let data = null;

  try {
    data = await runRpc('get_dashboard_snapshot', {});
  } catch (error) {
    console.warn('Falling back to local dashboard snapshot because remote snapshot failed.', error);
  }

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
  let data = null;

  try {
    data = await runRpc('get_recent_leads', { limit_count: normalizedLimit });
  } catch (error) {
    console.warn('Falling back to local lead list because remote leads query failed.', error);
  }

  if (Array.isArray(data)) {
    return data;
  }

  const leads = readLocal(STORAGE_KEYS.leads, []);

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
