/**
 * FathomAI v2.0 - Options Page Script
 * Handle license activation and usage stats
 */

const CONFIG = {
  CHECKOUT_URL: 'https://visionscraft.lemonsqueezy.com/checkout/buy/31d3b051-ca44-470b-813e-cad5fe94149d',
  MAX_FREE_USES: 3
};

// DOM Elements
const $ = (id) => document.getElementById(id);

const elements = {
  licenseBadge: $('licenseBadge'),
  licenseText: $('licenseText'),
  licenseKey: $('licenseKey'),
  activateBtn: $('activateBtn'),
  upgradeLink: $('upgradeLink'),
  statusMessage: $('statusMessage'),
  statToday: $('statToday'),
  statTotal: $('statTotal'),
  statRemaining: $('statRemaining')
};

// State
let isPro = false;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadState();
  updateUI();
  setupEventListeners();
}

async function loadState() {
  try {
    const result = await chrome.storage.local.get([
      'isPro', 'licenseKey', 'usageToday', 'usageTotal', 'usageDate'
    ]);
    
    isPro = result.isPro || false;
    
    if (result.licenseKey) {
      elements.licenseKey.value = result.licenseKey;
    }
    
    // Reset daily usage if new day
    const today = new Date().toDateString();
    if (result.usageDate !== today) {
      await chrome.storage.local.set({ usageToday: 0, usageDate: today });
      result.usageToday = 0;
    }
    
    updateStats(result.usageToday || 0, result.usageTotal || 0);
  } catch (e) {
    console.error('Error loading state:', e);
  }
}

function updateUI() {
  if (isPro) {
    elements.licenseBadge.textContent = 'Pro';
    elements.licenseBadge.classList.remove('free');
    elements.licenseBadge.classList.add('pro');
    elements.licenseText.textContent = 'Unlimited access';
    elements.statRemaining.textContent = '∞';
  } else {
    elements.licenseBadge.textContent = 'Free';
    elements.licenseBadge.classList.remove('pro');
    elements.licenseBadge.classList.add('free');
    elements.licenseText.textContent = '3 free uses per day';
  }
}

function updateStats(today, total) {
  elements.statToday.textContent = today;
  elements.statTotal.textContent = total;
  
  if (isPro) {
    elements.statRemaining.textContent = '∞';
  } else {
    elements.statRemaining.textContent = Math.max(0, CONFIG.MAX_FREE_USES - today);
  }
}

function setupEventListeners() {
  elements.activateBtn.addEventListener('click', activateLicense);
  
  // Only add if element exists
  if (elements.upgradeLink) {
    elements.upgradeLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: CONFIG.CHECKOUT_URL });
    });
  }
}

async function activateLicense() {
  const licenseKey = elements.licenseKey.value.trim();
  
  if (!licenseKey) {
    showStatus('Please enter a license key', 'error');
    return;
  }
  
  elements.activateBtn.disabled = true;
  elements.activateBtn.textContent = 'Validating...';
  
  try {
    // Validate with LemonSqueezy
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseKey
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.valid) {
        // License is valid!
        await chrome.storage.local.set({
          isPro: true,
          licenseKey: licenseKey
        });
        
        isPro = true;
        updateUI();
        showStatus('License activated! Enjoy FathomAI Pro.', 'success');
      } else {
        showStatus('Invalid or expired license key.', 'error');
      }
    } else {
      showStatus('Could not validate license. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Activation error:', error);
    showStatus('Connection error. Please check your internet.', 'error');
  } finally {
    elements.activateBtn.disabled = false;
    elements.activateBtn.textContent = 'Activate License';
  }
}

function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  
  setTimeout(() => {
    elements.statusMessage.className = 'status-message';
  }, 5000);
}
