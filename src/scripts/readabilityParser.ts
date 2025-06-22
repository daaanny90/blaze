interface ContentExtractionResult {
  content: string;
  textContent: string;
  title: string;
  length: number;
}

// Elements to completely remove
const REMOVE_SELECTORS = [
  "script",
  "style",
  "nav",
  "header",
  "footer",
  "aside",
  ".advertisement",
  ".ads",
  ".social-share",
  ".comments",
  ".sidebar",
  ".related-posts",
  ".newsletter-signup",
  '[class*="ad-"]',
  '[id*="ad-"]',
  '[class*="social"]',
  ".cookie-banner",
  ".popup",
  ".modal",
  ".overlay",
];

// Elements that are likely noise
const NOISE_CLASSES = [
  "share",
  "social",
  "comment",
  "sidebar",
  "ad",
  "advertisement",
  "promotion",
  "newsletter",
  "subscribe",
  "related",
  "suggested",
  "recommended",
  "trending",
  "popular",
  "more-stories",
];

function extractContent(document: Document): ContentExtractionResult | null {
  // 1. Quick semantic element check
  const semanticSelectors = ["article", "main", '[role="main"]'];
  for (const selector of semanticSelectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.textContent && element.textContent.length > 300) {
      return processContent(element, document);
    }
  }

  // 2. Score major containers by simple heuristics
  const candidates = document.querySelectorAll(
    "div, section"
  ) as NodeListOf<HTMLElement>;
  let bestCandidate: HTMLElement | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreElement(candidate);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate ? processContent(bestCandidate, document) : null;
}

function scoreElement(element: HTMLElement): number {
  const text = element.textContent || "";
  const textLength = text.length;

  if (textLength < 100) return 0;

  let score = textLength / 100; // Base score on content length

  // Simple class-based scoring
  const className =
    typeof element.className === "string"
      ? element.className.toLowerCase()
      : "";
  if (/content|article|post|main|story|entry/.test(className)) score += 25;
  if (/sidebar|nav|ad|comment|footer|header|menu/.test(className)) score -= 25;

  // Penalize high link density
  const links = element.querySelectorAll("a") as NodeListOf<HTMLAnchorElement>;
  const linkText = Array.from(links).reduce(
    (sum, a) => sum + (a.textContent?.length || 0),
    0
  );
  const linkDensity = linkText / textLength;
  if (linkDensity > 0.3) score -= 25;

  // Boost elements with paragraphs
  const paragraphs = element.querySelectorAll("p").length;
  if (paragraphs > 3) score += 10;

  return score;
}

function processContent(
  element: HTMLElement,
  document: Document
): ContentExtractionResult {
  // Clone the element to avoid modifying the original DOM
  const contentElement = element.cloneNode(true) as HTMLElement;

  // Clean the content
  const cleanedContent = cleanContent(contentElement, document);

  // Extract title from document
  const title = extractTitle(document);

  return {
    content: cleanedContent.innerHTML,
    textContent: cleanedContent.textContent || "",
    title,
    length: (cleanedContent.textContent || "").length,
  };
}

function cleanContent(element: HTMLElement, document: Document): HTMLElement {
  // 1. Remove unwanted elements
  removeUnwantedElements(element);

  // 2. Clean up attributes and inline styles
  cleanAttributes(element);

  // 3. Remove empty or low-content elements
  removeEmptyElements(element);

  // 4. Fix relative URLs (if needed)
  // fixRelativeUrls(element, baseUrl);

  // 5. Normalize whitespace
  normalizeWhitespace(element, document);

  return element;
}

function removeUnwantedElements(element: HTMLElement): void {
  // Remove elements by selector
  REMOVE_SELECTORS.forEach((selector) => {
    const elements = element.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  });

  // Remove elements with noise classes
  const allElements = element.querySelectorAll("*") as NodeListOf<HTMLElement>;
  for (const el of allElements) {
    const className =
      typeof el.className === "string" ? el.className.toLowerCase() : "";
    const hasNoiseClass = NOISE_CLASSES.some((noiseClass) =>
      className.includes(noiseClass)
    );

    if (hasNoiseClass) {
      // Check if element has substantial content before removing
      const textContent = el.textContent || "";
      if (textContent.length < 100 || isLikelyNoise(el)) {
        el.remove();
      }
    }
  }

  // Remove elements with high link density
  const containers = element.querySelectorAll(
    "div, section, aside"
  ) as NodeListOf<HTMLElement>;
  for (const container of containers) {
    if (hasHighLinkDensity(container)) {
      container.remove();
    }
  }
}

function cleanAttributes(element: HTMLElement): void {
  const allowedAttributes = new Set(["href", "src", "alt", "title"]);

  function cleanElementAttributes(el: Element): void {
    const attributes = Array.from(el.attributes);
    for (const attr of attributes) {
      if (!allowedAttributes.has(attr.name)) {
        el.removeAttribute(attr.name);
      }
    }
  }

  // Clean attributes from all elements
  cleanElementAttributes(element);
  const allElements = element.querySelectorAll("*");
  allElements.forEach(cleanElementAttributes);
}

function removeEmptyElements(element: HTMLElement): void {
  // Remove empty elements multiple times to handle nested empty elements
  let removed = true;
  while (removed) {
    removed = false;
    const elements = element.querySelectorAll("*") as NodeListOf<HTMLElement>;

    for (const el of elements) {
      const tagName = el.tagName.toLowerCase();

      // Skip elements that can be empty
      if (
        ["img", "br", "hr", "input", "area", "base", "meta"].includes(tagName)
      ) {
        continue;
      }

      const textContent = el.textContent?.trim() || "";
      const hasImages = el.querySelector("img") !== null;

      if (textContent.length === 0 && !hasImages) {
        el.remove();
        removed = true;
      }
    }
  }
}

function normalizeWhitespace(element: HTMLElement, document: Document): void {
  // Normalize whitespace in text nodes using a Node.js compatible approach
  const textNodes: Text[] = [];

  // Recursively find all text nodes
  function findTextNodes(node: Node): void {
    if (node.nodeType === 3) {
      // Node.TEXT_NODE = 3
      textNodes.push(node as Text);
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        findTextNodes(node.childNodes[i]);
      }
    }
  }

  findTextNodes(element);

  for (const textNode of textNodes) {
    if (textNode.textContent) {
      // Replace multiple whitespace with single space
      textNode.textContent = textNode.textContent.replace(/\s+/g, " ");
    }
  }
}

function isLikelyNoise(element: HTMLElement): boolean {
  const text = element.textContent || "";
  const textLength = text.length;

  if (textLength < 50) return true;

  // Check for common noise patterns
  const noisePatterns = [
    /^(share|tweet|like|follow|subscribe)/i,
    /^(advertisement|sponsored|promoted)/i,
    /^(read more|continue reading|view all)/i,
    /^(tags?:|categories?:|filed under)/i,
  ];

  return noisePatterns.some((pattern) => pattern.test(text.trim()));
}

function hasHighLinkDensity(element: HTMLElement): boolean {
  const textContent = element.textContent || "";
  const textLength = textContent.length;

  if (textLength < 50) return false;

  const links = element.querySelectorAll("a") as NodeListOf<HTMLAnchorElement>;
  const linkTextLength = Array.from(links).reduce(
    (sum, link) => sum + (link.textContent?.length || 0),
    0
  );

  const linkDensity = linkTextLength / textLength;
  return linkDensity > 0.5; // More than 50% links
}

function extractTitle(document: Document): string {
  // Try different title sources in order of preference
  const titleSources = [
    () => document.querySelector("h1")?.textContent,
    () =>
      document.querySelector('[property="og:title"]')?.getAttribute("content"),
    () =>
      document
        .querySelector('meta[name="twitter:title"]')
        ?.getAttribute("content"),
    () => document.querySelector("title")?.textContent,
    () => document.querySelector(".title, .headline, .post-title")?.textContent,
  ];

  for (const getTitle of titleSources) {
    const title = getTitle();
    if (title && title.trim().length > 0) {
      return title.trim();
    }
  }

  return "Untitled";
}

// Optional: Fix relative URLs
function fixRelativeUrls(element: HTMLElement, baseUrl: string): void {
  if (!baseUrl) return;

  const links = element.querySelectorAll(
    "a[href]"
  ) as NodeListOf<HTMLAnchorElement>;
  for (const link of links) {
    const href = link.getAttribute("href");
    if (href && !href.startsWith("http") && !href.startsWith("//")) {
      try {
        link.href = new URL(href, baseUrl).href;
      } catch (e) {
        // Invalid URL, remove the link but keep the text
        link.replaceWith(...link.childNodes);
      }
    }
  }

  const images = element.querySelectorAll(
    "img[src]"
  ) as NodeListOf<HTMLImageElement>;
  for (const img of images) {
    const src = img.getAttribute("src");
    if (src && !src.startsWith("http") && !src.startsWith("//")) {
      try {
        img.src = new URL(src, baseUrl).href;
      } catch (e) {
        // Invalid URL, remove the image
        img.remove();
      }
    }
  }
}

// Usage example:
// const result = extractContent(document);
// if (result) {
//   console.log('Title:', result.title);
//   console.log('Content length:', result.length);
//   console.log('HTML:', result.content);
// }

export { extractContent, cleanContent, ContentExtractionResult };
