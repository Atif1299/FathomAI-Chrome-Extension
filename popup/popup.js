/**
 * FathomAI v2.0 - Popup Script
 * Uses backend API on GCP Cloud Run
 */

// ===== Configuration =====
const CONFIG = {
  // Your Cloud Run API
  API_URL: 'https://fathom-ai-api-823333525467.europe-west1.run.app',
  MAX_FREE_USES: 3,
  CHECKOUT_URL: 'https://visionscraft.lemonsqueezy.com/checkout/buy/31d3b051-ca44-470b-813e-cad5fe94149d'
};

// ===== State =====
const state = {
  isPro: false,
  licenseKey: null,
  usageToday: 0,
  pageContent: null,
  pageTitle: ''
};

// ===== DOM Elements =====
const $ = (id) => document.getElementById(id);

const elements = {
  // Status
  statusBadge: $('statusBadge'),
  statusText: $('statusText'),
  proBadge: $('proBadge'),
  
  // Page info
  pageTitle: $('pageTitle'),
  pageMeta: $('pageMeta'),
  
  // Tabs
  navTabs: document.querySelectorAll('.nav-tab'),
  panels: document.querySelectorAll('.panel'),
  
  // Summarize
  summarizeBtn: $('summarizeBtn'),
  summarizeResult: $('summarizeResult'),
  summarizeText: $('summarizeText'),
  summarizeEmpty: $('summarizeEmpty'),
  
  // Key Points
  keypointsBtn: $('keypointsBtn'),
  keypointsResult: $('keypointsResult'),
  keypointsText: $('keypointsText'),
  keypointsEmpty: $('keypointsEmpty'),
  
  // Ask
  proLock: $('proLock'),
  chatContainer: $('chatContainer'),
  chatMessages: $('chatMessages'),
  chatInput: $('chatInput'),
  sendBtn: $('sendBtn'),
  upgradeBtn: $('upgradeBtn'),
  
  // Usage
  usageFooter: $('usageFooter'),
  usageCount: $('usageCount'),
  usageFill: $('usageFill'),
  upgradeLink: $('upgradeLink'),
  
  // Other
  loadingOverlay: $('loadingOverlay'),
  loadingText: $('loadingText'),
  settingsBtn: $('settingsBtn'),
  toast: $('toast')
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadState();
  updateUI();
  await getPageContent();
  setupEventListeners();
}

// ===== State Management =====
async function loadState() {
  try {
    const result = await chrome.storage.local.get([
      'isPro', 'licenseKey', 'usageToday', 'usageDate'
    ]);
    
    const today = new Date().toDateString();
    if (result.usageDate !== today) {
      state.usageToday = 0;
      await chrome.storage.local.set({ usageToday: 0, usageDate: today });
    } else {
      state.usageToday = result.usageToday || 0;
    }
    
    state.isPro = result.isPro || false;
    state.licenseKey = result.licenseKey || null;
  } catch (e) {
    console.error('Error loading state:', e);
  }
}

async function incrementUsage() {
  state.usageToday++;
  await chrome.storage.local.set({ 
    usageToday: state.usageToday,
    usageDate: new Date().toDateString()
  });
  updateUsageUI();
}

// ===== UI Updates =====
function updateUI() {
  updateStatusUI();
  updateUsageUI();
  updateProFeaturesUI();
}

function updateStatusUI() {
  if (state.isPro) {
    elements.statusBadge.classList.add('pro');
    elements.statusText.textContent = 'Pro';
  } else {
    elements.statusBadge.classList.remove('pro');
    elements.statusText.textContent = 'Free';
  }
}

function updateUsageUI() {
  if (state.isPro) {
    elements.usageFooter.classList.add('hidden');
    return;
  }
  
  elements.usageFooter.classList.remove('hidden');
  elements.usageCount.textContent = state.usageToday;
  
  const pct = (state.usageToday / CONFIG.MAX_FREE_USES) * 100;
  elements.usageFill.style.width = `${Math.min(pct, 100)}%`;
  
  elements.usageFill.classList.remove('warning', 'full');
  if (pct >= 100) {
    elements.usageFill.classList.add('full');
  } else if (pct >= 66) {
    elements.usageFill.classList.add('warning');
  }
}

function updateProFeaturesUI() {
  if (state.isPro) {
    elements.proBadge.style.display = 'none';
    elements.proLock.style.display = 'none';
    elements.chatContainer.style.display = 'flex';
  }
}

function showLoading(text = 'Analyzing...') {
  elements.loadingText.textContent = text;
  elements.loadingOverlay.classList.add('active');
}

function hideLoading() {
  elements.loadingOverlay.classList.remove('active');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

// ===== Event Listeners =====
function setupEventListeners() {
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      elements.navTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
      elements.panels.forEach(p => p.classList.toggle('active', p.id === `${tabName}Panel`));
    });
  });
  
  elements.summarizeBtn.addEventListener('click', handleSummarize);
  elements.keypointsBtn.addEventListener('click', handleKeyPoints);
  
  elements.sendBtn.addEventListener('click', handleAsk);
  elements.chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleAsk();
  });
  
  elements.upgradeBtn.addEventListener('click', openCheckout);
  elements.upgradeLink.addEventListener('click', e => {
    e.preventDefault();
    openCheckout();
  });
  
  elements.settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// ===== Page Content =====
async function getPageContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    
    state.pageTitle = tab.title || 'Unknown';
    elements.pageTitle.textContent = state.pageTitle;
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getContent' });
    
    if (response?.content) {
      state.pageContent = response.content;
      const words = response.content.split(/\s+/).length;
      const mins = Math.ceil(words / 200);
      elements.pageMeta.textContent = `${mins} min read · ${words.toLocaleString()} words`;
    } else {
      elements.pageMeta.textContent = 'Could not read page';
    }
  } catch (e) {
    console.error('Error:', e);
    elements.pageMeta.textContent = 'Refresh page to analyze';
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
    } catch (err) {}
  }
}

// ===== API Calls =====
async function callAPI(endpoint, data) {
  const response = await fetch(`${CONFIG.API_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, licenseKey: state.licenseKey })
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Request failed');
  }
  
  return response.json();
}

// ===== Handlers =====
async function handleSummarize() {
  if (!state.isPro && state.usageToday >= CONFIG.MAX_FREE_USES) {
    showToast('Daily limit reached. Upgrade to Pro!');
    return;
  }
  
  if (!state.pageContent || state.pageContent.length < 100) {
    showToast('Not enough content on this page');
    return;
  }
  
  showLoading('Generating summary...');
  
  try {
    const result = await callAPI('api/summarize', {
      content: state.pageContent.substring(0, 15000)
    });
    
    hideLoading();
    elements.summarizeEmpty.style.display = 'none';
    elements.summarizeResult.style.display = 'block';
    elements.summarizeText.innerHTML = `<p>${result.summary}</p>`;
    
    if (!state.isPro) incrementUsage();
  } catch (err) {
    hideLoading();
    showToast(err.message);
  }
}

async function handleKeyPoints() {
  if (!state.isPro && state.usageToday >= CONFIG.MAX_FREE_USES) {
    showToast('Daily limit reached. Upgrade to Pro!');
    return;
  }
  
  if (!state.pageContent || state.pageContent.length < 100) {
    showToast('Not enough content on this page');
    return;
  }
  
  showLoading('Extracting key points...');
  
  try {
    const result = await callAPI('api/keypoints', {
      content: state.pageContent.substring(0, 15000)
    });
    
    hideLoading();
    elements.keypointsEmpty.style.display = 'none';
    elements.keypointsResult.style.display = 'block';
    elements.keypointsText.innerHTML = result.keypoints
      .map(p => `<li>${p}</li>`).join('');
    
    if (!state.isPro) incrementUsage();
  } catch (err) {
    hideLoading();
    showToast(err.message);
  }
}

async function handleAsk() {
  if (!state.isPro) return;
  
  const question = elements.chatInput.value.trim();
  if (!question) return;
  
  addMessage(question, 'user');
  elements.chatInput.value = '';
  
  const typingId = addTyping();
  
  try {
    const result = await callAPI('api/ask', {
      question,
      content: state.pageContent?.substring(0, 12000)
    });
    
    removeTyping(typingId);
    addMessage(result.answer, 'assistant');
  } catch (err) {
    removeTyping(typingId);
    addMessage('Sorry, something went wrong.', 'assistant');
  }
}

// ===== Chat Helpers =====
function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `chat-message ${type}`;
  div.textContent = text;
  elements.chatMessages.appendChild(div);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function addTyping() {
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'chat-message assistant';
  div.textContent = 'Thinking...';
  elements.chatMessages.appendChild(div);
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function openCheckout() {
  chrome.tabs.create({ url: CONFIG.CHECKOUT_URL });
}

// Global copy function
window.copyResult = function(type) {
  const text = type === 'summarize' 
    ? elements.summarizeText.innerText 
    : elements.keypointsText.innerText;
  
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
};
