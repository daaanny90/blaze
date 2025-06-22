/**
 * Current blaze url, based on dev or prod environment.
 */
export const blazeUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8888"
    : "https://blaze.cyclic.app";

/**
 * Change every link found in the page to a blaze query.
 * In this way, every link found in the page will bring to a blazed version of it.
 *
 * @param blazeUrl - Current blaze url
 * @param currentUrl - Url of the current blazed page
 */
export function injectBlazeToPageLinks(blazeUrl: string, currentUrl: string) {
  const url = new URL(currentUrl);
  const re = new RegExp("^(http|https)://", "i");
  window.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll("a");
    links.forEach((link) => {
      let originalHref = link.getAttribute("href");

      if (!originalHref) {
        return;
      }

      const isAbsoluteLink = re.test(originalHref);
      if (!isAbsoluteLink) {
        originalHref = `${url.protocol}//${url.hostname}${originalHref}`;
      }

      link.setAttribute("href", `${blazeUrl}/blazed?url=${originalHref}`);
    });
  });
}

/**
 * Start the search clicking the button on the home page.
 *
 * @param blazeUrl The current blaze url
 */
export function blazeFunctionality(blazeUrl: string) {
  const t = document.querySelector("button"),
    c = document.querySelector("input");
  t!.addEventListener("click", () => {
    location.href = blazeUrl + "?q=" + encodeURIComponent(c!.value);
  });
}

/**
 * Put a little light on the links that are already visited and found in the cache
 * and that are reachable also offline, other than open in milliseconds.
 */
export function highlightBlazedLinks(links: HTMLLinkElement[]) {
  links.forEach((link) => {
    if (
      !link.href ||
      link.href === "http://localhost:8888/" ||
      link.href === "https://blaze.cyclic.app"
    ) {
      return;
    }

    const url = new URL(link.href);
    caches.open("blaze").then((cache) => {
      cache.match(url.href).then((response) => {
        if (response) {
          link.innerHTML = `${link.textContent} ⚡`;
        }
      });
    });
  });
}
