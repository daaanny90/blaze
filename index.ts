import express from "express";
import { Readability, isProbablyReaderable } from "@mozilla/readability";
import got from "got";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { parseHTML } from "linkedom";
// @ts-ignore
import XHR2 from "xhr2";
const XMLHttpRequest = XHR2.XMLHttpRequest;

const app = express();
const port = 8888;

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
    xhr.open("GET", `${searchEngine}?q=${query}`, true);
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

      const url = process.env.DEV_MODE
        ? "http://localhost:8888/blazed"
        : "https://blaze.cyclic.app/blazed";

      // @ts-ignore
      const results = data.web.results.map(
        (result: any) => `
            <article>
              <a href="${url}?url=${result.url}">
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

      res.send(html);
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
    if (!isProbablyReaderable(document)) {
      return res.sendFile(path.join(__dirname, "/dist/not_blazed.html"));
    }

    //TODO: find if there are more performant ways to remove images or evaluate if is the case to remove images
    document.querySelectorAll("img").forEach((img) => img.remove());

    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      return res.send("Something went wrong");
    }

    res.send(article.content);
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
