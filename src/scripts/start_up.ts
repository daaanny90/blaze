const DEV = 1,
  searchUrl = DEV ? "http://localhost:8888" : "https://blaze.cyclic.app",
  button = document.querySelector("button"),
  input = document.querySelector("input");

if (!button || !input) {
  throw Error("Something wrong in index.html: no button or input found.");
}

button.addEventListener("click", () => {
  fetch(`${searchUrl}?q=${encodeURIComponent(input.value)}`)
    .then((res) => res.text())
    .then((html) => {
      document.open();
      document.write(html);
      document.close();
    });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch((error) => {
    console.log(
      "Something went wrong with installation of the service worker:",
      error
    );
  });
}
