import express from "express";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import got from "got";

const app = express();
const port = 5763;

app.get("/", (req, res) => {
  const url = req.query.at as string;

  if (!url) {
    res.send("URL not valid");
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
  console.log(`Example app listening on port ${port}`);
});
