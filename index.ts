import express from "express";
import { Readability, isProbablyReaderable } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import got from "got";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 8888;

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  const searchEngine = "https://duckduckgo.com/html/";
  let query = req.query.q as string;

  if (!query) {
    res.sendFile(path.join(__dirname + "/dist/index.html"));
    return
  }

  got(`${searchEngine}?q=${query}`)
    .then((response) => {

      if (response.statusCode !== 200) {
        console.log("Error code:", response.statusCode)
        res.send(`Error code ${response.statusCode}`)
        return;
      }
      
      const dom = new JSDOM(response.body);
      const links = dom.window.document.querySelectorAll('link')
      const results = dom.window.document.querySelectorAll('.result')

      // add custom style
      const style = dom.window.document.createElement('style')
      dom.window.document.querySelector('head')?.appendChild(style)
      style.innerHTML = `
        .result {
          padding: 1rem;
          border: 1px solid black;
          margin-bottom: 10px:
        }

        .result__snippet, .result__url {
          text-decoration: none;
          color: black
        }
      `
      // clean up dom
      links.forEach(linkTag => linkTag.remove())
      dom.window.document.querySelector('form')?.remove()
      dom.window.document.querySelector('#header')?.remove()

      // modify urls
      results.forEach(result => {
        const hrefArray = result.querySelector('.result__snippet')?.getAttribute('href')?.split('')
        hrefArray?.splice(0,25)
        const cleanHref = hrefArray?.join('')
        const newHref = `https://ill-red-skunk-wig.cyclic.app/blazed?url=${cleanHref}`;
        result.querySelector('.result__snippet')?.setAttribute('href', newHref)
        result.querySelector('.result__url')?.setAttribute('href', newHref)
        result.querySelector('.result__a')?.setAttribute('href', newHref)
      })

      res.send(dom.serialize())
      return;
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

app.listen(port, () => {
  console.log(`Got request`);
});
