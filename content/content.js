/**
 * FathomAI - Content Script
 * Extracts and processes page content for AI analysis
 */

// ===== Main Content Extractor =====
class ContentExtractor {
  constructor() {
    this.excludedTags = [
      'script', 'style', 'noscript', 'iframe', 'svg', 'img', 'video', 
      'audio', 'canvas', 'map', 'object', 'embed', 'nav', 'footer',
      'header', 'aside', 'form', 'button', 'input', 'select', 'textarea'
    ];
    
    this.contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '.post',
      '#content',
      '#main-content',
      '.main-content'
    ];
  }
  
  /**
   * Extract the main content from the page
   */
  extract() {
    // Try to find main content container
    let mainContent = this.findMainContent();
    
    if (!mainContent) {
      // Fallback to body
      mainContent = document.body;
    }
    
    // Clone to avoid modifying the actual page
    const clone = mainContent.cloneNode(true);
    
    // Remove unwanted elements
    this.removeUnwantedElements(clone);
    
    // Clean up the text
    let text = this.cleanText(clone.innerText || clone.textContent);
    
    // Limit content length to avoid API issues (max ~10000 words)
    const maxLength = 60000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return text;
  }
  
  /**
   * Find the main content container
   */
  findMainContent() {
    // Try each content selector
    for (const selector of this.contentSelectors) {
      const element = document.querySelector(selector);
      if (element && this.hasSubstantialContent(element)) {
        return element;
      }
    }
    
    // Use readability heuristics
    return this.findByReadability();
  }
  
  /**
   * Check if element has substantial content
   */
  hasSubstantialContent(element) {
    const text = element.innerText || element.textContent || '';
    return text.trim().length > 200; // At least 200 characters
  }
  
  /**
   * Find content using readability heuristics
   */
  findByReadability() {
    const candidates = [];
    
    // Get all paragraph containers
    const paragraphs = document.querySelectorAll('p');
    
    if (paragraphs.length === 0) {
      return null;
    }
    
    // Find common parent with most paragraphs
    const parentMap = new Map();
    
    paragraphs.forEach(p => {
      let parent = p.parentElement;
      let depth = 0;
      
      while (parent && parent !== document.body && depth < 5) {
        const count = parentMap.get(parent) || 0;
        parentMap.set(parent, count + 1);
        parent = parent.parentElement;
        depth++;
      }
    });
    
    // Find best candidate
    let bestParent = null;
    let bestScore = 0;
    
    parentMap.forEach((count, element) => {
      const textLength = (element.innerText || '').length;
      const score = count * Math.log(textLength + 1);
      
      if (score > bestScore) {
        bestScore = score;
        bestParent = element;
      }
    });
    
    return bestParent;
  }
  
  /**
   * Remove unwanted elements from content
   */
  removeUnwantedElements(element) {
    // Remove excluded tags
    this.excludedTags.forEach(tag => {
      const elements = element.querySelectorAll(tag);
      elements.forEach(el => el.remove());
    });
    
    // Remove elements with common ad/promo classes
    const adSelectors = [
      '.advertisement', '.ad', '.ads', '.promo', '.promotion',
      '.sidebar', '.related', '.recommended', '.share', '.social',
      '[class*="ad-"]', '[class*="advertisement"]', '[id*="ad-"]',
      '.comments', '#comments', '.comment-section'
    ];
    
    adSelectors.forEach(selector => {
      try {
        const elements = element.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      } catch (e) {
        // Invalid selector, skip
      }
    });
    
    // Remove hidden elements
    const allElements = element.querySelectorAll('*');
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        el.remove();
      }
    });
  }
  
  /**
   * Clean extracted text
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      // Normalize whitespace
      .replace(/[\t\r]+/g, ' ')
      // Remove multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove multiple spaces
      .replace(/ {2,}/g, ' ')
      // Trim lines
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      // Final trim
      .trim();
  }
  
  /**
   * Get page metadata
   */
  getMetadata() {
    return {
      title: document.title,
      url: window.location.href,
      description: this.getMetaContent('description'),
      author: this.getMetaContent('author'),
      publishedDate: this.getMetaContent('article:published_time') || 
                     this.getMetaContent('datePublished')
    };
  }
  
  /**
   * Get meta tag content
   */
  getMetaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  }
}

// ===== Message Handler =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getContent') {
    const extractor = new ContentExtractor();
    const content = extractor.extract();
    const metadata = extractor.getMetadata();
    
    sendResponse({
      success: true,
      content: content,
      metadata: metadata,
      wordCount: content.split(/\s+/).length
    });
  }
  
  return true; // Keep message channel open for async response
});

// ===== Notify Background Script =====
// Let background know content script is ready
try {
  chrome.runtime.sendMessage({ action: 'contentScriptReady' });
} catch (e) {
  // Extension context might not be available
}

console.log('FathomAI content script loaded');
