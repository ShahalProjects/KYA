  // ══════════════════════════════════════════════════════════════════
  //  SETTINGS & VAULT — Shared state (moved from onehub.js during split)
  // ══════════════════════════════════════════════════════════════════
  let _settingsActiveTab = ''; // empty/welcome state by default
  let _vaultWired = false;
  let _activeFolderHandle = null;
  let _activeFolderPermission = false;

  const KYA_DB_NAME = 'KyaFolderStorage';
  const KYA_STORE_NAME = 'handles';

  function getIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(KYA_DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(KYA_STORE_NAME)) {
          db.createObjectStore(KYA_STORE_NAME);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async function saveDirectoryHandle(handle) {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KYA_STORE_NAME, 'readwrite');
      const store = tx.objectStore(KYA_STORE_NAME);
      const request = store.put(handle, 'current_directory');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function loadDirectoryHandle() {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KYA_STORE_NAME, 'readonly');
      const store = tx.objectStore(KYA_STORE_NAME);
      const request = store.get('current_directory');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function clearDirectoryHandle() {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KYA_STORE_NAME, 'readwrite');
      const store = tx.objectStore(KYA_STORE_NAME);
      const request = store.delete('current_directory');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function verifyDirectoryPermission(handle, withRequest = false) {
    if (!handle) return false;
    const options = { mode: 'readwrite' };
    try {
      if ((await handle.queryPermission(options)) === 'granted') {
        return true;
      }
      if (withRequest) {
        if ((await handle.requestPermission(options)) === 'granted') {
          return true;
        }
      }
    } catch (e) {
      console.error('Permission verification failed:', e);
    }
    return false;
  }

  async function writeDataToDirectory(directoryHandle, backupData) {
    try {
      const fileHandle = await directoryHandle.getFileHandle('kya_backup_data.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(backupData, null, 2));
      await writable.close();
      return true;
    } catch (e) {
      console.error('Failed to write to folder:', e);
      throw e;
    }
  }

  async function readDataFromDirectory(directoryHandle) {
    try {
      const fileHandle = await directoryHandle.getFileHandle('kya_backup_data.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      return text;
    } catch (e) {
      console.error('Failed to read from folder:', e);
      throw e;
    }
  }

  function getActiveVaultPath() {
    return localStorage.getItem('kya_current_path') || 'kya-database';
  }

  function getVaultKey(key, path) {
    const p = path || getActiveVaultPath();
    if (p === 'kya-database' || p === 'default') {
      return key;
    }
    return key + '_' + p.trim();
  }

  // ── LEDGERS MODULE ──────────────────────────────────────────
  let _ledgerActiveTab = 'list'; // 'list', 'add', 'alter'
  let _ledgerEditId = null; // ID of ledger being edited/altered
  let _ledgerAddAliases = [];
  let _ledgerAlterAliases = [];
  let _ledgerSearchQuery = '';
  let _ledgerStatementId = null;
  let _customerSearchQuery = '';
  let _supplierSearchQuery = '';
  let _customerStatementId = null;
  let _supplierStatementId = null;
