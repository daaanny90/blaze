import express from "express";
import { Readability, isProbablyReaderable } from "@mozilla/readability";
import got from "got";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { parseHTML, parseJSON } from "linkedom";
// @ts-ignore
import XHR2 from "xhr2";
const XMLHttpRequest = XHR2.XMLHttpRequest;
import { minify } from "html-minifier";
import { blazeUrl, injectBlazeToPageLinks } from "./utils.js";

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

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

app.get("/", async (req, res) => {
  const searchEngine = "https://api.search.brave.com/res/v1/web/search";
  const query = req.query.q as string;

  if (!query) {
    return res.sendFile(path.join(__dirname, "/dist/index.html"));
  }

  const key = process.env.CYCLIC_BRAVE_KEY;

  if (!key) {
    throw new Error("No brave key found");
  }

  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `${searchEngine}?q=${query}&safesearch=moderate`, true);
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

      // @ts-ignore
      const results = data.web.results.map(
        (result: any) => `
            <article>
              <a href="${blazeUrl}/blazed?url=${result.url}">
                <h2>${result.title}</h2>
              </a>
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
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <title>Blaze - ${query}</title>
                <style>
                  body {font-family:sans-serif}
                  h2 {margin-bottom:0}
                  span {font-size:.9rem}
                </style>
              </head>
              <body>
                ${results.join("")}
              </body>
            </html>
          `;

      const minifiedSerp = minify(html, minifierOptions);

      res.send(minifiedSerp);
    };
    xhr.send();
  } catch (err) {
    console.error(err);
  }
});

app.get("/blazed", async (req, res) => {
  const pageToBlaze = req.query.url as string;

  try {
    const response = await got(pageToBlaze, {
      headers: { Accept: "text/html" },
    });
    const { document } = parseHTML(response.body);

    // TODO: missing handling of 404. The idea is to send the blaze 404 page, otherwise will show error page on client

    if (!isProbablyReaderable(document)) {
      // TODO: send minimalized version of the page instead the read mode
      // implementation draft:
      // document.querySelectorAll("link").forEach((l) => {
      //   l.remove();
      // });

      // document.querySelectorAll("style").forEach((s) => {
      //   s.remove;
      // });

      // document.querySelectorAll("script").forEach((s) => {
      //   s.remove();
      // });

      // // @ts-ignore
      // const jsonDocument = document.toJSON();

      // const cleanDocument = parseJSON(jsonDocument);
      // return res.send(document.toString());

      return res.sendFile(path.join(__dirname, "/dist/not_blazed.html"));
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
      </script>
    </body></html>
    `;

    const minifiedBlazedPage = minify(blazedPage, minifierOptions);

    res.send(minifiedBlazedPage);
  } catch (err) {
    console.log(err);
  }
});

app.get("/info", (_, res) => {
  res.sendFile(path.join(__dirname + "/dist/info.html"));
});

app.get("/ooops", (_, res) => {
  res.sendFile(path.join(__dirname + "/dist/info_not_blazed.html"));
});

app.get("/favicon.svg", (_, res) => {
  res.sendFile(path.join(__dirname + "/favicon.svg"));
});

app.listen(port, () => {
  console.log(`Got request`);
});
