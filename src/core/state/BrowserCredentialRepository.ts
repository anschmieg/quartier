import { appStateRepository } from './AppStateRepository'
import type { StorageValue } from 'unstorage'

export class BrowserCredentialRepository {
  async get<T>(scope: string): Promise<T | null> {
    return await appStateRepository.getCredential<T>(scope)
  }

  async set(scope: string, value: StorageValue): Promise<void> {
    await appStateRepository.setCredential(scope, value)
  }

  async clear(scope: string): Promise<void> {
    await appStateRepository.clearCredential(scope)
  }
}

export const browserCredentialRepository = new BrowserCredentialRepository()
