import { Result, SearchEngine } from './index.js'
import { faker } from '@faker-js/faker'

export class Mock implements SearchEngine {
  async search(query: string): Promise<Result[]> {
    return [...new Array(20)].map((_) => ({
      title: faker.internet.displayName(),
      url: faker.internet.url(),
      description: faker.lorem.sentences(),
    }))
  }
}
