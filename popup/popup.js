const form = document.getElementById('settingsForm');
const statusBanner = document.getElementById('statusBanner');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('model');
const replyCountInput = document.getElementById('replyCount');
const temperatureInput = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensInput = document.getElementById('maxTokens');
const sideInstructionsInput = document.getElementById('sideInstructions');

// Update temperature thingy
temperatureInput.addEventListener('input', (e) => {
  temperatureValue.textContent = e.target.value;
});

// Load saved settings on popup open
async function loadSettings() {
  try {
    const settings = await browser.storage.local.get([
      'apiKey',
      'model',
      'replyCount',
      'temperature',
      'maxTokens',
      'sideInstructions'
    ]);

    if (settings.apiKey) {
      apiKeyInput.value = settings.apiKey;
    }
    if (settings.model) {
      modelSelect.value = settings.model;
    }
    if (settings.replyCount) {
      replyCountInput.value = settings.replyCount;
    }
    if (settings.temperature !== undefined) {
      temperatureInput.value = settings.temperature;
      temperatureValue.textContent = settings.temperature;
    }
    if (settings.maxTokens) {
      maxTokensInput.value = settings.maxTokens;
    }
    if (settings.sideInstructions) {
      sideInstructionsInput.value = settings.sideInstructions;
    }
  } catch (error) {
    showStatus('Error loading settings', 'error');
  }
}

async function saveSettings(e) {
  e.preventDefault();

  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showStatus('api key is required', 'error');
    return;
  }

  if (!apiKey.startsWith('sk-ant-')) {
    showStatus('invalid api key format. should start with "sk-ant-"', 'error');
    return;
  }

  const settings = {
    apiKey: apiKey,
    model: modelSelect.value,
    replyCount: parseInt(replyCountInput.value, 10),
    temperature: parseFloat(temperatureInput.value),
    maxTokens: parseInt(maxTokensInput.value, 10),
    sideInstructions: sideInstructionsInput.value.trim()
  };

  try {
    await browser.storage.local.set(settings);
    showStatus('settings saved successfully', 'success');

    // Close popup after 1 second or something
    setTimeout(() => {
      window.close();
    }, 1000);
  } catch (error) {
    showStatus('error saving settings', 'error');
  }
}

function showStatus(message, type) {
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${type}`;
  statusBanner.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      statusBanner.style.display = 'none';
    }, 3000);
  }
}

// History
const toggleHistoryBtn = document.getElementById('toggleHistory');
const historyContent = document.getElementById('historyContent');

let historyVisible = false;

toggleHistoryBtn.addEventListener('click', () => {
  historyVisible = !historyVisible;
  if (historyVisible) {
    historyContent.style.display = 'block';
    toggleHistoryBtn.textContent = 'hide history';
    loadHistory();
  } else {
    historyContent.style.display = 'none';
    toggleHistoryBtn.textContent = 'show history';
  }
});

async function loadHistory() {
  try {
    const { postHistory } = await browser.storage.local.get('postHistory');
    const history = postHistory || [];

    if (history.length === 0) {
      historyContent.innerHTML = '<p class="empty-history">no posts generated yet</p>';
      return;
    }

    let html = '';
    history.forEach((item, index) => {
      const date = new Date(item.timestamp);
      const timeStr = formatTime(date);
      const topicPreview = item.topic ? item.topic.substring(0, 50) + (item.topic.length > 50 ? '...' : '') : 'untitled';
      const contentPreview = item.mainPost ? item.mainPost.substring(0, 100) + (item.mainPost.length > 100 ? '...' : '') : '';

      html += `
        <div class="history-item">
          <div class="history-item-header">
            <span class="history-topic" title="${escapeHtml(item.topic || 'untitled')}">${escapeHtml(topicPreview)}</span>
            <span class="history-time">${timeStr}</span>
          </div>
          <div class="history-content">${escapeHtml(contentPreview)}</div>
          <div class="history-actions">
            <button data-index="${index}" class="copy-post-btn">copy main post</button>
            ${item.replies && item.replies.length > 0 ? `<button data-index="${index}" class="copy-all-btn">copy all</button>` : ''}
            <button data-index="${index}" class="delete-btn">delete</button>
          </div>
        </div>
      `;
    });

    // Add clear all button
    html += '<button id="clearHistoryBtn" class="btn btn-secondary" style="width: 100%; margin-top: 8px;">clear all history</button>';

    historyContent.innerHTML = html;

    document.querySelectorAll('.copy-post-btn').forEach(btn => {
      btn.addEventListener('click', (e) => copyHistoryPost(e, history));
    });

    document.querySelectorAll('.copy-all-btn').forEach(btn => {
      btn.addEventListener('click', (e) => copyHistoryAll(e, history));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => deleteHistoryItem(e));
    });

    document.getElementById('clearHistoryBtn')?.addEventListener('click', clearHistory);
  } catch (error) {
    historyContent.innerHTML = '<p class="empty-history">error loading history</p>';
  }
}

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function copyHistoryPost(e, history) {
  const index = parseInt(e.target.dataset.index);
  const item = history[index];

  try {
    await navigator.clipboard.writeText(item.mainPost);
    e.target.textContent = '✓ copied';
    setTimeout(() => {
      e.target.textContent = 'copy main post';
    }, 2000);
  } catch (error) {
    // Silent fail
  }
}

async function copyHistoryAll(e, history) {
  const index = parseInt(e.target.dataset.index);
  const item = history[index];

  let allText = `MAIN POST:\n${item.mainPost}\n\n`;
  if (item.replies && item.replies.length > 0) {
    item.replies.forEach((reply, idx) => {
      allText += `REPLY ${idx + 1}${reply.replyTo ? ` (to ${reply.replyTo})` : ''}:\n${reply.content}\n\n`;
    });
  }

  try {
    await navigator.clipboard.writeText(allText);
    e.target.textContent = '✓ copied';
    setTimeout(() => {
      e.target.textContent = 'copy all';
    }, 2000);
  } catch (error) {
    // Silent fail
  }
}

async function deleteHistoryItem(e) {
  const index = parseInt(e.target.dataset.index);

  try {
    const { postHistory } = await browser.storage.local.get('postHistory');
    const history = postHistory || [];
    history.splice(index, 1);
    await browser.storage.local.set({ postHistory: history });
    loadHistory();
  } catch (error) {
    // Silent fail
  }
}

async function clearHistory() {
  if (confirm('are you sure you want to clear all history? this cannot be undone.')) {
    try {
      await browser.storage.local.set({ postHistory: [] });
      loadHistory();
    } catch (error) {
      // Silent fail
    }
  }
}

// Event listeners
form.addEventListener('submit', saveSettings);

// Load settings when popup opens
loadSettings();
