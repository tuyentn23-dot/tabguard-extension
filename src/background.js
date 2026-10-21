// TabGuard background service worker (MV3)
// Principles: DP1 verify-before-save, DP2 export-by-default, DP4 MV3-first

const DB_NAME = 'tabguard_db';
const STORE_NAME = 'sessions';
const BACKUP_INTERVAL_MIN = 30;
const VERIFY_DELAY_MS = 800;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function captureTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs
    .filter((t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'))
    .map((t) => ({
      title: t.title || '',
      url: t.url,
      pinned: !!t.pinned,
      windowId: t.windowId,
      index: t.index,
    }));
}

async function verifySave(sessionId) {
  const tabs = await chrome.tabs.query({});
  const realCount = tabs.filter((t) => t.url && !t.url.startsWith('chrome://')).length;
  const all = await dbGetAll();
  const saved = all.find((s) => s.id === sessionId);
  if (!saved) return { verified: false, reason: 'session_not_found' };
  const match = realCount === saved.tabs.length;
  return {
    verified: match,
    expected: saved.tabs.length,
    actual: realCount,
    checkedAt: Date.now(),
  };
}

async function saveSession(label) {
  const tabs = await captureTabs();
  if (tabs.length === 0) return { ok: false, error: 'no_tabs' };

  const id = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const payload = JSON.stringify(tabs.map((t) => t.url));
  const checksum = await sha256(payload);

  const record = {
    id,
    label: label || ('Session ' + new Date().toLocaleString()),
    tabs,
    tabCount: tabs.length,
    checksum,
    savedAt: Date.now(),
    verified: null,
  };

  await dbPut(record);

  setTimeout(async () => {
    const v = await verifySave(id);
    const all = await dbGetAll();
    const r = all.find((s) => s.id === id);
    if (r) {
      r.verified = v.verified;
      r.verifiedAt = v.checkedAt;
      await dbPut(r);
    }
  }, VERIFY_DELAY_MS);

  return { ok: true, id, tabCount: tabs.length, checksum };
}

async function deleteSession(sessionId) {
  const all = await dbGetAll();
  if (!all.find((s) => s.id === sessionId)) {
    return { ok: false, error: 'not_found' };
  }
  await dbDelete(sessionId);
  return { ok: true, deleted: sessionId };
}

async function previewRestore(sessionId) {
  const all = await dbGetAll();
  const s = all.find((x) => x.id === sessionId);
  if (!s) return { ok: false, error: 'not_found' };
  const windows = new Set(s.tabs.map((t) => t.windowId)).size;
  return {
    ok: true,
    tabCount: s.tabs.length,
    windowCount: windows,
    estimatedRamMB: Math.round(s.tabs.length * 35),
    firstUrls: s.tabs.slice(0, 3).map((t) => t.url),
  };
}

async function restoreSession(sessionId) {
  const all = await dbGetAll();
  const s = all.find((x) => x.id === sessionId);
  if (!s) return { ok: false, error: 'not_found' };

  const win = await chrome.windows.getCurrent();
  const opened = [];
  for (const t of s.tabs) {
    try {
      const tab = await chrome.tabs.create({
        url: t.url,
        windowId: win.id,
        pinned: t.pinned,
        active: false,
      });
      opened.push(tab.id);
    } catch (e) {
      // skip failed, continue
    }
  }
  return { ok: true, opened: opened.length, total: s.tabs.length };
}

async function exportSession(sessionId) {
  const all = await dbGetAll();
  const s = all.find((x) => x.id === sessionId);
  if (!s) return { ok: false, error: 'not_found' };
  return {
    ok: true,
    data: JSON.stringify(s, null, 2),
    filename: 'tabguard-' + s.id + '.json',
  };
}

async function autoBackup() {
  const r = await saveSession('Auto-backup ' + new Date().toLocaleString());
  return r;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('tabguard_autobackup', { periodInMinutes: BACKUP_INTERVAL_MIN });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'tabguard_autobackup') {
    await autoBackup();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.action) {
        case 'save':
          sendResponse(await saveSession(msg.label));
          break;
        case 'list':
          sendResponse({ ok: true, sessions: await dbGetAll() });
          break;
        case 'preview':
          sendResponse(await previewRestore(msg.id));
          break;
        case 'restore':
          sendResponse(await restoreSession(msg.id));
          break;
        case 'export':
          sendResponse(await exportSession(msg.id));
          break;
        case 'verify':
          sendResponse(await verifySave(msg.id));
          break;
        case 'delete':
          sendResponse(await deleteSession(msg.id));
          break;
        default:
          sendResponse({ ok: false, error: 'unknown_action' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true;
});
