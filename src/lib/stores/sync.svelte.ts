class SyncStore {
  status = $state<'synced' | 'syncing' | 'offline'>('synced')

  constructor() {
    if (typeof window !== 'undefined') {
      this.status = navigator.onLine ? 'synced' : 'offline'
      window.addEventListener('offline', () => { this.status = 'offline' })
      window.addEventListener('online',  () => {
        if (this.status !== 'syncing') this.status = 'synced'
      })
    }
  }

  setSyncing() {
    if (this.status !== 'offline') this.status = 'syncing'
  }

  setSynced() {
    if (this.status !== 'offline') this.status = 'synced'
  }
}

export const syncStore = new SyncStore()
