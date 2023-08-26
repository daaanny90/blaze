export type Result = {
  title: string
  url: string
  description: string
}

export abstract class SearchEngine {
  abstract search(query: string): Promise<Result[]>
}

export * from './brave.js'
