import { parse } from 'node-html-parser'

export function replaceLinks(raw: string): string {
  const html = parse(raw)
  html.querySelectorAll('a').forEach((el) => {
    if (el.hasAttribute('data-preserve-link')) return
    const href = el.getAttribute('href')
    if (href) {
      el.setAttribute('href', `/browse?${new URLSearchParams({ url: href }).toString()}`)
    }
  })
  return html.toString()
}

export function cleanContent(raw: string, base: string): string {
  const html = parse(raw)

  const tagsToRemove = ['script', 'style', 'img', 'picture', 'video', 'iframe', 'svg']
  for (const tag of tagsToRemove) {
    html.querySelectorAll(tag).forEach((el) => el.remove())
  }
  html.querySelectorAll('a').forEach((el) => {
    const href = el.getAttribute('href')
    if (href) {
      el.setAttribute('href', new URL(href, base).toString())
    }
  })

  return html.querySelector('body')?.innerHTML ?? ''
}
