import express from "express";
import { Readability, isProbablyReaderable } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import got from "got";
import path from "path";
import { fileURLToPath } from "url";
import fetch from 'node-fetch'
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
    return
  }

  const key = process.env.CYCLIC_BRAVE_KEY

  if (!key) {
    throw new Error("No brave key found");
  }

  fetch(`${searchEngine}?q=${query}`, {
    headers: {
      "Accept": "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "X-Subscription-Token": key,
    },
  })
    .then((page) => {
      page.json().then(response => {
        const results: any[] = []
        // @ts-ignore
        response.web.results.forEach(result => {
          results.push(`
            <div>
              <h2>${result.title}</h2>
              <span>${result.meta_url.hostname}</span>
             <a href="https://blaze.cyclic.app/blazed?url=${result.url}">
              <p>${result.description}</p>
             </a>              
            </div>
            <hr />
          `);
        })
        res.send(`<html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>Blaze The Page</title>
            <style>
              h2 {margin-bottom:0}
              span {font-size: .9rem}
            </style>
          </head>
          <body>
            ${results.join("")}
          </body>
        </html>`);
      })
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/blazed", (req, res) => {
const pageToBlaze = req.query.url as string
 
got(pageToBlaze)
   .then((response) => {
     const dom = new JSDOM(response.body);

     if (!isProbablyReaderable(dom.window.document)) {
      res.send("This page can not be blazed... Sorry!")
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
})

app.get("/info", (_, res) => {
  res.sendFile(path.join(__dirname + "/dist/info.html"));
})

app.listen(port, () => {
  console.log(`Got request`);
});
