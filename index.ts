import express from "express";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import got from "got";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 5763;

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  let url = req.query.at as string;

  if (!url) {
    res.sendFile(path.join(__dirname + "/dist/index.html"));
  }

  var re = new RegExp("^(http|https)://", "i");
  var match = re.test(url);

  if (!match) {
    url = `https://${url}`
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

app.listen(port, () => {
  console.log(`Got request`);
});
