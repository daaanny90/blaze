export const blazeUrl = process.env.DEV_MODE
  ? "http://localhost:8888"
  : "https://blaze.cyclic.app";

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

export function blazeFunctionality(blazeUrl: string) {
  const t = document.querySelector("button"),
    c = document.querySelector("input");
  t!.addEventListener("click", () => {
    location.href = blazeUrl + "?q=" + encodeURIComponent(c!.value);
  });
}
