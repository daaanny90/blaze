import { SearchEngine } from './index.js'

// https://transform.tools/json-to-typescript
export interface Root {
  query: Query
  mixed: Mixed
  type: string
  web: Web
}

export interface Query {
  original: string
  show_strict_warning: boolean
  is_navigational: boolean
  is_news_breaking: boolean
  spellcheck_off: boolean
  country: string
  bad_results: boolean
  should_fallback: boolean
  postal_code: string
  city: string
  header_country: string
  more_results_available: boolean
  state: string
}

export interface Mixed {
  type: string
  main: Main[]
  top: any[]
  side: any[]
}

export interface Main {
  type: string
  index: number
  all: boolean
}

export interface Web {
  type: string
  results: Result[]
  family_friendly: boolean
}

export interface Result {
  title: string
  url: string
  is_source_local: boolean
  is_source_both: boolean
  description: string
  language: string
  family_friendly: boolean
  type: string
  subtype: string
  meta_url: MetaUrl
  age?: string
}

export interface MetaUrl {
  scheme: string
  netloc: string
  hostname: string
  favicon: string
  path: string
}

export class Brave implements SearchEngine {
  private static URL = 'https://api.search.brave.com/res/v1/web/search'

  constructor(private key: string) {}

  async search(query: string) {
    const url = `${Brave.URL}?${new URLSearchParams({
      q: query,
      safesearch: 'moderate',
      result_filter: 'web',
    }).toString()}`

    const data: Root = await fetch(url, {
      headers: { 'X-Subscription-Token': this.key },
    }).then((response) => response.json())

    return data.web.results.map((result) => {
      return {
        title: result.title,
        description: result.description,
        url: result.url,
      }
    })
  }
}
