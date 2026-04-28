import { appStateRepository } from './AppStateRepository'

export class BrowserCredentialRepository {
  async get<T>(scope: string): Promise<T | null> {
    return await appStateRepository.getCredential<T>(scope)
  }

  async set(scope: string, value: unknown): Promise<void> {
    await appStateRepository.setCredential(scope, value)
  }

  async clear(scope: string): Promise<void> {
    await appStateRepository.clearCredential(scope)
  }
}

export const browserCredentialRepository = new BrowserCredentialRepository()
