/**
 * FathomAI v2.0 - Background Service Worker
 * Minimal - most logic moved to popup.js and backend
 */

// On install, open options page
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open welcome/onboarding
    chrome.tabs.create({ url: 'options/options.html' });
  }
});

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptReady') {
    console.log('Content script ready:', sender.tab?.id);
    sendResponse({ success: true });
  }
  
  return true;
});

console.log('FathomAI background worker loaded');
