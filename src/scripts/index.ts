import express from "express";
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
import { extractContent } from "./readabilityParser.js";

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

// app.use(express.static("public"));

if (process.env.NODE_ENV === "development") {
  // app.use(express.static("dist"));

  // so the sourceMaps original files can be found
  app.get("*.ts", (req, res, next) => {
    const urlArray = req.path.split("/");
    const filename = urlArray.pop();
    const dirname = __dirname.replace("/dist", "");

    if (!filename) {
      res.sendStatus(404);
      return;
    }

    const mappath = path.join(dirname, "src/scripts", filename);
    if (fs.existsSync(mappath)) {
      res.sendFile(mappath);
    } else {
      next();
    }
  });
}

// Middlewares
app.use(compression());
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  res.set("Cache-Control", "public, max-age=60000");
  res.set("Service-Worker-Allowed", "/");
  next();
});

// Routes
app.get("/", async (req, res) => {
  const searchEngine = "https://api.search.brave.com/res/v1/web/search";
  const query = req.query.q as string;

  if (!query) {
    console.log("No query parameter, serving home page template");
    const homePageTemplate = path.join(__dirname, "index.html");
    return res.sendFile(homePageTemplate);
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
      const pageContent = extractContent(document);

      const blazedPage = `<html><head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>body {font-family: sans-serif}</style>
      </head>
      <body>
       ${pageContent?.content}
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

app.get("/service-worker.js", (_, res) => {
  res.sendFile(path.join(__dirname + "/service-worker.js"));
});

// Static file middleware - placed after routes so routes take precedence
app.use(express.static("public"));

if (process.env.NODE_ENV === "development") {
  app.use(express.static("dist"));
}

app.listen(port, () => {
  console.log(`Got request`);
});
