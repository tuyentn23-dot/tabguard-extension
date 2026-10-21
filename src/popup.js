// TabGuard popup controller

const listEl = document.getElementById('list');
const countEl = document.getElementById('count');
const btnSave = document.getElementById('btn-save');
const btnExportAll = document.getElementById('btn-export-all');
const toastEl = document.getElementById('toast');

function showToast(msg, isError) {
  toastEl.textContent = msg;
  toastEl.className = 'toast' + (isError ? ' error' : '');
  toastEl.style.display = 'block';
  setTimeout(() => { toastEl.style.display = 'none'; }, 2200);
}

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(resp || { ok: false, error: 'no_response' });
      }
    });
  });
}

function fmtDate(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString();
}

function statusBadge(s) {
  if (s.verified === true) return '<span class="verified">✓ verified</span>';
  if (s.verified === false) return '<span class="failed">✗ verify failed</span>';
  return '<span class="unverified">⋯ pending</span>';
}

function renderSession(s) {
  return (
    '<div class="session">' +
      '<div class="session-head">' +
        '<div class="session-label">' + escapeHtml(s.label) + '</div>' +
        '<div style="font-size:10px">' + statusBadge(s) + '</div>' +
      '</div>' +
      '<div class="session-meta">' +
        s.tabCount + ' tabs · ' + fmtDate(s.savedAt) +
        ' · <span title="' + s.checksum + '">SHA ' + s.checksum.slice(0, 8) + '</span>' +
      '</div>' +
      '<div class="session-actions">' +
        '<button class="mini" data-action="preview" data-id="' + s.id + '">Preview</button>' +
        '<button class="mini" data-action="restore" data-id="' + s.id + '">Restore</button>' +
        '<button class="mini" data-action="export" data-id="' + s.id + '">Export</button>' +
        '<button class="mini danger" data-action="delete" data-id="' + s.id + '">Delete</button>' +
      '</div>' +
    '</div>'
  );
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function refresh() {
  const resp = await sendMsg({ action: 'list' });
  if (!resp.ok) {
    listEl.innerHTML = '<div class="empty">Error: ' + escapeHtml(resp.error || 'unknown') + '</div>';
    return;
  }
  const sessions = (resp.sessions || []).sort((a, b) => b.savedAt - a.savedAt);
  countEl.textContent = sessions.length + ' session' + (sessions.length === 1 ? '' : 's');
  if (sessions.length === 0) {
    listEl.innerHTML = '<div class="empty">No saved sessions yet. Click "Save current tabs" to start.</div>';
    return;
  }
  listEl.innerHTML = sessions.map(renderSession).join('');
}

// Save button
btnSave.addEventListener('click', async () => {
  btnSave.disabled = true;
  btnSave.textContent = 'Saving...';
  const label = prompt('Session name (optional):') || '';
  const resp = await sendMsg({ action: 'save', label });
  btnSave.disabled = false;
  btnSave.textContent = 'Save current tabs';
  if (resp.ok) {
    showToast('Saved ' + resp.tabCount + ' tabs · verifying...');
    setTimeout(refresh, 900); // wait for verify
  } else {
    showToast('Save failed: ' + (resp.error || 'unknown'), true);
  }
});

// Export all
btnExportAll.addEventListener('click', async () => {
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

// Delegated buttons inside list
listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  btn.disabled = true;

  try {
    if (action === 'preview') {
      const r = await sendMsg({ action: 'preview', id });
      if (r.ok) {
        alert(
          'Preview:\n' +
          r.tabCount + ' tabs\n' +
          r.windowCount + ' windows (original)\n' +
          '~' + r.estimatedRamMB + ' MB RAM estimate\n\n' +
          'First URLs:\n' + r.firstUrls.join('\n')
        );
      } else {
        showToast('Preview failed', true);
      }
    } else if (action === 'restore') {
      const r = await sendMsg({ action: 'restore', id });
      if (r.ok) {
        showToast('Opened ' + r.opened + '/' + r.total + ' tabs');
        // DP5: auto-close popup after successful restore
        setTimeout(function(){ window.close(); }, 800);
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
        showToast('Delete failed: ' + (r.error || 'unknown'), true);
      }
    }
  } finally {
    btn.disabled = false;
  }
});

// Initial load
refresh();
// Auto-refresh every 3s to catch verify updates
setInterval(refresh, 3000);
