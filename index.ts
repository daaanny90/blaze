import express from "express";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import got from "got";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 5763;

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

let url: string

app.get("/", (req, res) => {
  url = req.query.at as string;

  if (!url) {
    res.sendFile(path.join(__dirname + "/dist/index.html"));
  }

  got(url)
    .then((response) => {
      const dom = new JSDOM(response.body);
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
