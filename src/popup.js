// TabGuard popup - v0.2.0 with ExtensionPay
// Placeholder: replace 'tabguard' with your ExtensionPay extension ID after signup

const listEl = document.getElementById('list');
const planBadge = document.getElementById('plan-badge');
const proBanner = document.getElementById('pro-banner');
const btnSave = document.getElementById('btn-save');
const btnExportAll = document.getElementById('btn-export-all');
const btnUpgrade = document.getElementById('btn-upgrade');
const toastEl = document.getElementById('toast');

const FREE_SESSION_LIMIT = 50;
let extpay = null;
let isPro = false;

function showToast(msg, isError) {
  toastEl.textContent = msg;
  toastEl.className = 'toast' + (isError ? ' error' : '');
  toastEl.style.display = 'block';
  setTimeout(function () { toastEl.style.display = 'none'; }, 2500);
}

function sendMsg(msg) {
  return new Promise(function (resolve) {
    chrome.runtime.sendMessage(msg, function (resp) {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(resp || { ok: false, error: 'no_response' });
      }
    });
  });
}

function fmtDate(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd ago';
  return new Date(ts).toLocaleDateString();
}

function statusBadge(s) {
  if (s.verified === true) return '<span class="verified">verified</span>';
  if (s.verified === false) return '<span class="failed">verify failed</span>';
  return '<span class="unverified">pending</span>';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function renderSession(s) {
  return (
    '<div class="session">' +
      '<div class="session-head">' +
        '<div class="session-label">' + escapeHtml(s.label) + '</div>' +
        '<div>' + statusBadge(s) + '</div>' +
      '</div>' +
      '<div class="session-meta">' + s.tabCount + ' tabs / ' + fmtDate(s.savedAt) +
        ' / SHA ' + s.checksum.slice(0, 8) + '</div>' +
      '<div class="session-actions">' +
        '<button class="mini" data-action="preview" data-id="' + s.id + '">Preview</button>' +
        '<button class="mini" data-action="restore" data-id="' + s.id + '">Restore</button>' +
        '<button class="mini" data-action="export" data-id="' + s.id + '">Export</button>' +
        '<button class="mini danger" data-action="delete" data-id="' + s.id + '">Delete</button>' +
      '</div>' +
    '</div>'
  );
}

async function refresh() {
  const resp = await sendMsg({ action: 'list' });
  if (!resp.ok) {
    listEl.innerHTML = '<div class="empty">Error: ' + escapeHtml(resp.error || 'unknown') + '</div>';
    return;
  }
  const sessions = (resp.sessions || []).sort(function (a, b) { return b.savedAt - a.savedAt; });

  if (sessions.length >= FREE_SESSION_LIMIT && !isPro) {
    planBadge.textContent = sessions.length + '/' + FREE_SESSION_LIMIT;
    planBadge.classList.remove('pro');
  } else {
    planBadge.textContent = isPro ? 'Pro' : sessions.length + ' sessions';
    planBadge.classList.toggle('pro', isPro);
  }

  if (sessions.length === 0) {
    listEl.innerHTML = '<div class="empty">No sessions yet. Click "Save current tabs" to start.</div>';
    return;
  }
  listEl.innerHTML = sessions.map(renderSession).join('');
}

async function initExtPay() {
  try {
    if (typeof ExtPay !== 'undefined') {
      extpay = ExtPay('tabguard'); // REPLACE with your ExtensionPay extension ID
      await extpay.startBackground();
      isPro = await extpay.getUser().then(function (u) { return u.paid; }).catch(function () { return false; });

      if (isPro) {
        proBanner.classList.add('hidden');
        planBadge.classList.add('pro');
        planBadge.textContent = 'Pro';
      }
    }
  } catch (e) {
    console.log('ExtPay init error:', e);
  }
}

btnSave.addEventListener('click', async function () {
  btnSave.disabled = true;
  btnSave.textContent = 'Saving...';

  const listResp = await sendMsg({ action: 'list' });
  const count = (listResp.sessions || []).length;
  if (count >= FREE_SESSION_LIMIT && !isPro) {
    btnSave.disabled = false;
    btnSave.textContent = 'Save current tabs';
    showToast('Free limit reached (' + FREE_SESSION_LIMIT + '). Upgrade for unlimited.', true);
    return;
  }

  const label = prompt('Session name (optional):') || '';
  const resp = await sendMsg({ action: 'save', label });
  btnSave.disabled = false;
  btnSave.textContent = 'Save current tabs';

  if (resp.ok) {
    showToast('Saved ' + resp.tabCount + ' tabs - verifying...');
    setTimeout(refresh, 900);
  } else {
    showToast('Save failed: ' + (resp.error || 'unknown'), true);
  }
});

btnUpgrade.addEventListener('click', function () {
  if (extpay) {
    extpay.openPaymentPage();
  } else {
    showToast('Payment not initialized. Check ExtPay config.', true);
  }
});

btnExportAll.addEventListener('click', async function () {
  const resp = await sendMsg({ action: 'list' });
  if (!resp.ok || !resp.sessions || resp.sessions.length === 0) {
    showToast('Nothing to export', true);
    return;
  }
  const blob = new Blob([JSON.stringify(resp.sessions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tabguard-all-' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported ' + resp.sessions.length + ' sessions');
});

listEl.addEventListener('click', async function (e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  btn.disabled = true;

  try {
    if (action === 'preview') {
      const r = await sendMsg({ action: 'preview', id });
      if (r.ok) {
        alert('Preview:\n' + r.tabCount + ' tabs\n' + r.windowCount + ' windows\n~' +
          r.estimatedRamMB + ' MB RAM\n\nFirst URLs:\n' + r.firstUrls.join('\n'));
      } else {
        showToast('Preview failed', true);
      }
    } else if (action === 'restore') {
      const r = await sendMsg({ action: 'restore', id });
      if (r.ok) {
        showToast('Opened ' + r.opened + '/' + r.total + ' tabs');
        setTimeout(function () { window.close(); }, 800);
      } else {
        showToast('Restore failed', true);
      }
    } else if (action === 'export') {
      const r = await sendMsg({ action: 'export', id });
      if (r.ok) {
        const blob = new Blob([r.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = r.filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported');
      } else {
        showToast('Export failed', true);
      }
    } else if (action === 'delete') {
      if (!confirm('Delete this session? Cannot undo.')) return;
      const r = await sendMsg({ action: 'delete', id });
      if (r.ok) {
        showToast('Deleted');
        refresh();
      } else {
        showToast('Delete failed', true);
      }
    }
  } finally {
    btn.disabled = false;
  }
});

initExtPay().then(refresh);
setInterval(refresh, 3000);
