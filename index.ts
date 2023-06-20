import express from "express";
import { Readability, isProbablyReaderable } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import got from "got";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import "dotenv/config";

const app = express();
const port = 8888;

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

app.get("/", async (req, res) => {
  const searchEngine = "https://api.search.brave.com/res/v1/web/search";
  let query = req.query.q as string;

  if (!query) {
    res.sendFile(path.join(__dirname + "/dist/index.html"));
    return;
  }

  const key = process.env.CYCLIC_BRAVE_KEY;

  if (!key) {
    throw new Error("No brave key found");
  }

  fetch(`${searchEngine}?q=${query}`, {
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "X-Subscription-Token": key,
    },
  })
    .then((page) => {
      page.json().then((response) => {
        const results: any[] = [];
        const url = process.env.DEV_MODE
          ? "http://localhost:8888/blazed"
          : "https://blaze.cyclic.app/blazed";
        // @ts-ignore
        response.web.results.forEach((result) => {
          results.push(`
            <article>
            <a href="${url}?url=${result.url}">
              <h2>${result.title}</h2>
              </a>              
              <span>${result.meta_url.hostname}</span>
              <p>${result.description}</p>
            </article>
            <hr />
          `);
        });
        res.send(`<html>
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
        </html>`);
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/blazed", (req, res) => {
  const pageToBlaze = req.query.url as string;

  got(pageToBlaze)
    .then((response) => {
      const dom = new JSDOM(response.body);

      if (!isProbablyReaderable(dom.window.document)) {
        res.sendFile(path.join(__dirname + "/dist/not_blazed.html"));
        return;
      }

      let reader = new Readability(dom.window.document);
      let article = reader.parse();

      if (!article) {
        res.send("Something went wrong");
        return;
      }

      res.send(article.content);
    })
    .catch((err) => {
      console.log(err);
    });
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
