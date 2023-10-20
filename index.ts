import express from "express";
import { Readability, isProbablyReaderable } from "@mozilla/readability";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { parseHTML, parseJSON } from "linkedom";
import XHR2 from "xhr2";
const XMLHttpRequest = XHR2.XMLHttpRequest;
import { minify } from "html-minifier";
import {
  blazeFunctionality,
  blazeUrl,
  highlightBlazedLinks,
  injectBlazeToPageLinks,
} from "./utils.js";
import etag from "etag";
import compression from "compression";
import fs from "fs";

const app = express();
const port = 8888;

const minifierOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeOptionalTags: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeTagWhitespace: true,
  useShortDoctype: true,
  minifyCSS: true,
};

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export type SerpResponse = {
  url: string;
  title: string;
  description: string;
  meta_url: {
    hostname: string;
  };
};

// Middlewares
app.use(compression());
app.use((req, res, next) => {
  res.set("Cache-Control", "public, max-age=60000");
  res.set("Service-Worker-Allowed", "/");
  next();
});

// Routes
app.get("/", async (req, res) => {
  const searchEngine = "https://api.search.brave.com/res/v1/web/search";
  const query = req.query.q as string;

  if (!query) {
    return res.sendFile(path.join(__dirname, "/index.html"));
  }

  const key = process.env.CYCLIC_BRAVE_KEY;

  if (!key) {
    throw new Error("No brave key found");
  }

  try {
    const xhr = new XMLHttpRequest();
    const formattedQuery = encodeURIComponent(query);
    xhr.open(
      "GET",
      `${searchEngine}?q=${formattedQuery}&safesearch=moderate`,
      true
    );
    xhr.setRequestHeader("Accept", "*/*");
    xhr.setRequestHeader("X-Subscription-Token", key);

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status !== 200) {
        console.error("XHR request failed:", xhr.status, xhr.statusText);
        return;
      }
      const data = JSON.parse(xhr.responseText);

      const results = data.web.results.map(
        (result: SerpResponse) => `
            <article>
              <h2><a href="${blazeUrl}/blazed?url=${result.url}">
                ${result.title}
              </a></h2>
              <span>${result.meta_url.hostname}</span>
              <p>${result.description}</p>
            </article>
            <hr />
          `
      );

      const html = `
            <html>
              <head>
                <meta charset="UTF-8">
                <link rel="icon" type="image/x-icon" href="/favicon.svg" />
                <link rel="stylesheet" href="/styles/serp.css" media="print" onload="this.media='all'">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <title>Blaze - ${query}</title>
                <style>
                  body {font-family:sans-serif}
                  h2 {margin-bottom:0}
                  span {font-size:.9rem}
                </style>
              </head>
              <body>
                <header>
                <label>
                  <a href="/"><strong>BLAZE</strong></a>
                  <input type="search" value="${query}" />
                  <button>Blaze it</button>
                </label>
                </header>
                <hr/>
                ${results.join("")}
                <script>
                  ${blazeFunctionality}
                  ${highlightBlazedLinks}

                  blazeFunctionality('${blazeUrl}')
                  const links = document.querySelectorAll('a')
                  highlightBlazedLinks(links)

                </script>
              </body>
            </html>
          `;

      try {
        const minifiedSerp = minify(html, minifierOptions);
        res.set("X-Blaze-Etag", etag(minifiedSerp));
        res.send(minifiedSerp);
      } catch (e) {
        console.log("Error during html minifier:", e);
        res.sendFile(path.join(__dirname, "/not_blazed.html"));
      }
    };
    xhr.send();
  } catch (err) {
    console.error(err);
  }
});

app.get("/blazed", async (req, res) => {
  const pageToBlaze = req.query.url as string;

  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", pageToBlaze, true);
    xhr.setRequestHeader("Accept", "text/html");

    xhr.onreadystatechange = async () => {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status === 404) {
        res.sendFile(path.join(__dirname, "/404.html"));
        return;
      }

      if (xhr.status !== 200) {
        console.error("XHR request failed:", xhr.status, xhr.statusText);
        res.send(
          minify(
            `
          <html>
          <head>
            <meta charset="UTF-8" />
            <link rel="icon" type="image/x-icon" href="/favicon.svg" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>Blaze - error</title>
          </head>
          <body>
          <div style="text-align: center; display: flex; align-items: center; flex-direction: column; justify-content: center; font-family: sans-serif; width: 100%; height: 100%">
            <h1>Blaze could not load the page :(</h1>
            <p>Reason: <code>${xhr.status} ${xhr.statusText}</code></p>
            <br />
            <br />
            <p>
              If you want (it would be great!) you can report this problem, writing the requested URL and the reason, 
              at <a href="mailto:support.blaze@dannyspina.com">support.blaze@dannyspina.com</a>
            </p>
            <br />
            <a href="#" role="button" onclick="history.back()">Go back</a>
          </div>
          </body>
          </html>
        `,
            minifierOptions
          )
        );
        return;
      }

      const response = xhr.responseText;
      const { document } = parseHTML(response);

      if (!isProbablyReaderable(document)) {
        // TODO: still a lot of bugs, must be refined to handle some cases, like
        // cookie banners, etc.
        document.querySelectorAll("link").forEach((l) => {
          l.remove();
        });

        document.querySelectorAll("style").forEach((s) => {
          s.remove();
        });

        document.querySelectorAll("script").forEach((s) => {
          s.remove();
        });

        document.querySelectorAll("img").forEach((i) => {
          i.remove();
        });

        document.querySelectorAll("iframe").forEach((f) => {
          f.remove();
        });

        const blazeDisclaimer = document.createElement("div");
        blazeDisclaimer.style.width = "100dvw";
        blazeDisclaimer.style.border = "1px solid red";
        blazeDisclaimer.style.padding = "1rem";
        blazeDisclaimer.style.textAlign = "center";
        blazeDisclaimer.innerHTML = `
        <h2>BLAZE INFO</h2>
        <p>
          The page you are seeing <strong>could not be correctly blazed</strong> due to these webpage characteristics.
          <strong>Blaze served anyway</strong> a lightweight version of the page.
          Keep in mind that this kind of pages <strong>can be hard or even impossible to use, read or understand</strong>.
        </p>
        `;

        const referenceElement = document.body.firstChild;
        document.body.insertBefore(blazeDisclaimer, referenceElement);

        const blazedPage = minify(document.toString(), minifierOptions);

        return res.send(blazedPage);
      }

      //TODO: find if there are more performant ways to remove images or evaluate if is the case to remove images
      document.querySelectorAll("img").forEach((img) => img.remove());

      const reader = new Readability(document);
      const article = reader.parse();

      if (!article) {
        return res.send("Something went wrong");
      }

      const blazedPage = `<html><head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>body {font-family: sans-serif}</style>
      </head>
      <body>
       ${article.content}
        <script>
          ${injectBlazeToPageLinks}
          const url = "${blazeUrl}"
          const currentUrl = "${req.query.url}"
          injectBlazeToPageLinks(url, currentUrl)

          ${highlightBlazedLinks}
          const links = document.querySelectorAll('a')
          highlightBlazedLinks(links)
        </script>
      </body></html>
      `;

      const minifiedBlazedPage = minify(blazedPage, minifierOptions);

      res.send(minifiedBlazedPage);
    };
    xhr.send();
  } catch (err) {
    console.log(err);
  }
});

app.get("/info", (_, res) => {
  let Etag;
  fs.readFile(path.join(__dirname + "/info.html"), "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    Etag = etag(data);
    res.set("X-Blaze-Etag", Etag);
    res.sendFile(path.join(__dirname + "/info.html"));
  });
});

app.get("/ooops", (_, res) => {
  res.sendFile(path.join(__dirname + "/info_not_blazed.html"));
});

app.get("/favicon.svg", (_, res) => {
  res.sendFile(path.join(__dirname + "/favicon.svg"));
});

app.get("/service-worker.js", (_, res) => {
  res.sendFile(path.join(__dirname + "/service-worker.js"));
});

app.get("/styles/serp.css", (_, res) => {
  res.sendFile(path.join(__dirname + "/styles/serp.css"));
});

app.listen(port, () => {
  console.log(`Got request`);
});
