export const blazeUrl = process.env.DEV_MODE
  ? "http://localhost:8888"
  : "https://blaze.cyclic.app";

export function injectBlazeToPageLinks(blazeUrl: string, currentUrl: string) {
  const re = new RegExp("^(http|https)://", "i");
  window.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll("a");
    console.log(links);
    links.forEach((link) => {
      let originalHref = link.getAttribute("href");

      if (!originalHref) {
        return;
      }

      const isAbsoluteLink = re.test(originalHref);
      // TODO: is still buggy, probably some href with h,t,p,s inside are detected as false positives
      // generating an original href like "https:///"
      if (!isAbsoluteLink) {
        const hostname = re.exec(currentUrl)![0];
        originalHref = `${hostname}${originalHref}`;
      }

      link.setAttribute("href", `${blazeUrl}/blazed?url=${originalHref}`);
    });
  });
}
