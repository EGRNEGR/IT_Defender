// @ts-check

import { dbConfig } from "./constants.js";

let dbPromise;

/**
 * @returns {Promise<IDBDatabase>}
 */
function openDb() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbConfig.name, dbConfig.version);

    request.addEventListener("upgradeneeded", () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("links")) {
        const store = db.createObjectStore("links", { keyPath: "id" });
        store.createIndex("by_url", "normalizedUrl", { unique: false });
        store.createIndex("by_domain", "domain", { unique: false });
        store.createIndex("by_last_seen", "lastSeenAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("checkerCache")) {
        const store = db.createObjectStore("checkerCache", { keyPath: "key" });
        store.createIndex("by_source", "source", { unique: false });
        store.createIndex("by_expiry", "ttlExpiresAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("decisions")) {
        const store = db.createObjectStore("decisions", { keyPath: "eventId" });
        store.createIndex("by_link", "linkId", { unique: false });
        store.createIndex("by_timestamp", "timestamp", { unique: false });
      }

      if (!db.objectStoreNames.contains("feeds")) {
        db.createObjectStore("feeds", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("metrics")) {
        db.createObjectStore("metrics", { keyPath: "id" });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });

  return dbPromise;
}

/**
 * @template T
 * @param {string} storeName
 * @param {"readonly"|"readwrite"} mode
 * @param {(store: IDBObjectStore) => IDBRequest<T>} operation
 * @returns {Promise<T>}
 */
async function withStore(storeName, mode, operation) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

/**
 * @template T
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<T | undefined>}
 */
export async function getRecord(storeName, key) {
  return withStore(storeName, "readonly", (store) => store.get(key));
}

/**
 * @template T
 * @param {string} storeName
 * @param {T} value
 * @returns {Promise<T>}
 */
export async function putRecord(storeName, value) {
  await withStore(storeName, "readwrite", (store) => store.put(value));
  return value;
}

/**
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<void>}
 */
export async function deleteRecord(storeName, key) {
  await withStore(storeName, "readwrite", (store) => store.delete(key));
}

/**
 * @template T
 * @param {string} storeName
 * @returns {Promise<T[]>}
 */
export async function getAllRecords(storeName) {
  return withStore(storeName, "readonly", (store) => store.getAll());
}
