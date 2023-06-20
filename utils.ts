export const blazeUrl = process.env.DEV_MODE
  ? "http://localhost:8888"
  : "https://blaze.cyclic.app";

export function injectBlazeToPageLinks(blazeUrl: string) {
  window.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll("a");
    console.log(links);
    links.forEach((link) => {
      const originalHref = link.getAttribute("href");
      link.setAttribute("href", `${blazeUrl}/blazed?url=${originalHref}`);
    });
  });
}
