class SyncStore {
  status = $state<'synced' | 'syncing' | 'offline'>('synced')

  private _offlineHandler = () => { this.status = 'offline' }
  private _onlineHandler  = () => { if (this.status !== 'syncing') this.status = 'synced' }

  constructor() {
    if (typeof window !== 'undefined') {
      this.status = navigator.onLine ? 'synced' : 'offline'
      window.addEventListener('offline', this._offlineHandler)
      window.addEventListener('online',  this._onlineHandler)
    }
  }

  setSyncing() {
    if (this.status !== 'offline') this.status = 'syncing'
  }

  setSynced() {
    if (this.status !== 'offline') this.status = 'synced'
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('offline', this._offlineHandler)
      window.removeEventListener('online',  this._onlineHandler)
    }
  }
}

export const syncStore = new SyncStore()
