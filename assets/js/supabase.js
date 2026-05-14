(function () {
const appConfig = window.APP_CONFIG || {};
const memoryStore = window.__MIRROR_TRAINER_MEMORY__ || (window.__MIRROR_TRAINER_MEMORY__ = {});

const STORAGE_KEYS = {
  leads: 'mirror-trainer-leads',
  eventLogs: 'mirror-trainer-event-logs',
  landingContent: 'mirror-trainer-landing-content',
};
const ADMIN_CREDENTIAL_KEY = 'mirror-trainer-admin-credentials';
const DASHBOARD_CHANNEL = 'mirror-trainer-dashboard-sync';
const LANDING_CONTENT_CHANNEL = 'mirror-trainer-landing-content-sync';

const hasRemoteConfig =
  window.location.protocol !== 'file:' &&
  Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
let clientPromise = null;
let dashboardChannel = null;
let landingContentChannel = null;
let adminCredentials = readAdminCredentials();

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

  notifyDashboardUpdated({ source: 'local_storage', key });
}

function readAdminCredentials() {
  try {
    const raw = sessionStorage.getItem(ADMIN_CREDENTIAL_KEY);
    const value = raw ? JSON.parse(raw) : null;

    if (value?.username && value?.password) {
      return {
        username: String(value.username),
        password: String(value.password),
      };
    }
  } catch (error) {
    console.warn('Failed to read admin credentials from sessionStorage.', error);
  }

  return null;
}

function setAdminCredentials(credentials) {
  const username = String(credentials?.username || '').trim();
  const password = String(credentials?.password || '').trim();

  if (!username || !password) {
    clearAdminCredentials();
    return null;
  }

  adminCredentials = { username, password };

  try {
    sessionStorage.setItem(ADMIN_CREDENTIAL_KEY, JSON.stringify(adminCredentials));
  } catch (error) {
    console.warn('Failed to persist admin credentials for this browser session.', error);
  }

  return adminCredentials;
}

function getAdminCredentials() {
  if (!adminCredentials) {
    adminCredentials = readAdminCredentials();
  }

  return adminCredentials;
}

function clearAdminCredentials() {
  adminCredentials = null;

  try {
    sessionStorage.removeItem(ADMIN_CREDENTIAL_KEY);
  } catch (error) {
    console.warn('Failed to clear admin credentials.', error);
  }
}

function notifyDashboardUpdated(detail = {}) {
  const payload = {
    ...detail,
    updatedAt: new Date().toISOString(),
  };

  window.dispatchEvent(
    new CustomEvent('mirror-trainer-dashboard-updated', {
      detail: payload,
    })
  );

  try {
    if ('BroadcastChannel' in window) {
      if (!dashboardChannel) {
        dashboardChannel = new BroadcastChannel(DASHBOARD_CHANNEL);
      }

      dashboardChannel.postMessage(payload);
    }
  } catch (error) {
    console.warn('Dashboard sync channel is unavailable.', error);
  }
}

function notifyLandingContentUpdated(detail = {}) {
  const payload = {
    ...detail,
    updatedAt: new Date().toISOString(),
  };

  window.dispatchEvent(
    new CustomEvent('mirror-trainer-landing-content-updated', {
      detail: payload,
    })
  );

  try {
    if ('BroadcastChannel' in window) {
      if (!landingContentChannel) {
        landingContentChannel = new BroadcastChannel(LANDING_CONTENT_CHANNEL);
      }

      landingContentChannel.postMessage(payload);
    }
  } catch (error) {
    console.warn('Landing content sync channel is unavailable.', error);
  }
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

function normalizePageSlug(pageSlug) {
  return String(pageSlug || 'landing2')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '') || 'landing2';
}

function normalizeContentItem(item) {
  const key = String(item?.key || item?.content_key || '').trim();

  if (!key) {
    return null;
  }

  return {
    key,
    value: String(item?.value ?? ''),
    type: String(item?.type || item?.content_type || 'text'),
    label: String(item?.label || ''),
    group: String(item?.group || ''),
    updatedAt: item?.updatedAt || item?.updated_at || new Date().toISOString(),
  };
}

function normalizeLandingContentState(pageSlug, value, mode = storageMode) {
  const normalizedSlug = normalizePageSlug(pageSlug);
  const sourceItems = Array.isArray(value)
    ? value
    : Array.isArray(value?.items)
      ? value.items
      : [];
  const items = sourceItems.map(normalizeContentItem).filter(Boolean);

  return {
    storageMode: mode,
    pageSlug: normalizedSlug,
    updatedAt: value?.updatedAt || value?.updated_at || new Date().toISOString(),
    items,
  };
}

function readLocalLandingContent(pageSlug = 'landing2') {
  const normalizedSlug = normalizePageSlug(pageSlug);
  const allContent = readLocal(STORAGE_KEYS.landingContent, {});
  return normalizeLandingContentState(
    normalizedSlug,
    allContent[normalizedSlug] || { pageSlug: normalizedSlug, items: [] },
    'local'
  );
}

function writeLocalLandingContent(pageSlug, items) {
  const normalizedSlug = normalizePageSlug(pageSlug);
  const allContent = readLocal(STORAGE_KEYS.landingContent, {});
  const updatedAt = new Date().toISOString();

  allContent[normalizedSlug] = {
    pageSlug: normalizedSlug,
    updatedAt,
    items: (Array.isArray(items) ? items : []).map(normalizeContentItem).filter(Boolean),
  };

  writeLocal(STORAGE_KEYS.landingContent, allContent);
  notifyLandingContentUpdated({
    source: 'local_storage',
    pageSlug: normalizedSlug,
    type: 'content_saved',
  });

  return normalizeLandingContentState(normalizedSlug, allContent[normalizedSlug], 'local');
}

function clearLocalLandingContent(pageSlug) {
  const normalizedSlug = normalizePageSlug(pageSlug);
  const allContent = readLocal(STORAGE_KEYS.landingContent, {});

  delete allContent[normalizedSlug];
  writeLocal(STORAGE_KEYS.landingContent, allContent);
  notifyLandingContentUpdated({
    source: 'local_storage',
    pageSlug: normalizedSlug,
    type: 'content_cleared',
  });

  return normalizeLandingContentState(normalizedSlug, { pageSlug: normalizedSlug, items: [] }, 'local');
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

async function runAdminRpc(functionName, payload = {}) {
  const credentials = getAdminCredentials();

  if (!credentials?.username || !credentials?.password) {
    return null;
  }

  return runRpc(functionName, {
    ...payload,
    admin_login: credentials.username,
    admin_password: credentials.password,
  });
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

  notifyDashboardUpdated({ source: 'remote', type: 'lead_saved' });

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

  if (['page_view', 'cta_click', 'form_submit', 'scroll_depth'].includes(row.event_name)) {
    notifyDashboardUpdated({
      source: 'remote',
      type: 'event_logged',
      eventName: row.event_name,
    });
  }

  return { mode: 'remote', id: data };
}

async function getDashboardSnapshot() {
  let data = null;

  try {
    data = await runAdminRpc('get_dashboard_snapshot_admin');
  } catch (error) {
    console.warn('Password-protected dashboard RPC failed, trying legacy admin session RPC.', error);
  }

  if (!data) {
    try {
      data = await runRpc('get_dashboard_snapshot', {});
    } catch (error) {
      console.warn('Falling back to local dashboard snapshot because remote snapshot failed.', error);
    }
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
    data = await runAdminRpc('get_recent_leads_admin', { limit_count: normalizedLimit });
  } catch (error) {
    console.warn('Password-protected leads RPC failed, trying legacy admin session RPC.', error);
  }

  if (!Array.isArray(data)) {
    try {
      data = await runRpc('get_recent_leads', { limit_count: normalizedLimit });
    } catch (error) {
      console.warn('Falling back to local lead list because remote leads query failed.', error);
    }
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

function getLandingContentSnapshotSync(pageSlug = 'landing2') {
  return readLocalLandingContent(pageSlug);
}

async function getLandingContent(pageSlug = 'landing2') {
  const normalizedSlug = normalizePageSlug(pageSlug);
  let data = null;

  try {
    data = await runRpc('get_landing_content', { page_slug: normalizedSlug });
  } catch (error) {
    console.warn('Falling back to local landing content because remote content query failed.', error);
  }

  if (Array.isArray(data)) {
    return normalizeLandingContentState(normalizedSlug, data, 'remote');
  }

  return readLocalLandingContent(normalizedSlug);
}

async function getLandingContentAdmin(pageSlug = 'landing2') {
  const normalizedSlug = normalizePageSlug(pageSlug);
  let data = null;

  try {
    data = await runAdminRpc('get_landing_content_admin', { page_slug: normalizedSlug });
  } catch (error) {
    console.warn('Password-protected landing content RPC failed, trying public content RPC.', error);
  }

  if (Array.isArray(data)) {
    return normalizeLandingContentState(normalizedSlug, data, 'remote');
  }

  return getLandingContent(normalizedSlug);
}

async function saveLandingContentAdmin(pageSlug = 'landing2', items = []) {
  const normalizedSlug = normalizePageSlug(pageSlug);
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map(normalizeContentItem)
    .filter(Boolean);
  let data = null;

  try {
    data = await runAdminRpc('save_landing_content_admin', {
      page_slug: normalizedSlug,
      content_items: normalizedItems,
    });
  } catch (error) {
    console.warn('Falling back to local landing content save because remote save failed.', error);
  }

  if (Array.isArray(data)) {
    notifyLandingContentUpdated({
      source: 'remote',
      pageSlug: normalizedSlug,
      type: 'content_saved',
    });
    return normalizeLandingContentState(normalizedSlug, data, 'remote');
  }

  return writeLocalLandingContent(normalizedSlug, normalizedItems);
}

async function clearLandingContentAdmin(pageSlug = 'landing2') {
  const normalizedSlug = normalizePageSlug(pageSlug);
  let data = null;

  try {
    data = await runAdminRpc('clear_landing_content_admin', { page_slug: normalizedSlug });
  } catch (error) {
    console.warn('Falling back to local landing content clear because remote clear failed.', error);
  }

  if (Array.isArray(data)) {
    notifyLandingContentUpdated({
      source: 'remote',
      pageSlug: normalizedSlug,
      type: 'content_cleared',
    });
    return normalizeLandingContentState(normalizedSlug, data, 'remote');
  }

  return clearLocalLandingContent(normalizedSlug);
}

function onLandingContentChange(callback) {
  if (typeof callback !== 'function') {
    return () => {};
  }

  const handleWindowEvent = (event) => callback(event.detail || {});
  window.addEventListener('mirror-trainer-landing-content-updated', handleWindowEvent);

  let channel = null;
  const handleChannelMessage = (event) => callback(event.data || {});

  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(LANDING_CONTENT_CHANNEL);
      channel.addEventListener('message', handleChannelMessage);
    }
  } catch (error) {
    console.warn('Landing content subscription channel is unavailable.', error);
  }

  return () => {
    window.removeEventListener('mirror-trainer-landing-content-updated', handleWindowEvent);
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
      channel.close();
    }
  };
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
  notifyDashboardUpdated({ source: 'local_storage', type: 'cleared' });

  return {
    mode: 'local',
    cleared: true,
  };
}

window.MirrorTrainerData = {
  storageMode,
  hasRemoteConfig,
  dashboardChannel: DASHBOARD_CHANNEL,
  saveLead,
  saveInterestVote,
  savePurchaseIntent,
  logEvent,
  getDashboardSnapshot,
  getLeadRecords,
  getLandingContentSnapshotSync,
  getLandingContent,
  getLandingContentAdmin,
  saveLandingContentAdmin,
  clearLandingContentAdmin,
  onLandingContentChange,
  setAdminCredentials,
  getAdminCredentials,
  clearAdminCredentials,
  getAdminSession,
  requestAdminMagicLink,
  signOutAdmin,
  onAuthStateChange,
  clearLocalData,
};
})();
