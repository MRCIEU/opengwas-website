// gwas-storage.js

const dbName = 'GwasDB';
const storeName = 'GwasStore';
const cacheKey = 'cachedGwasJson';

const jsonUrl = 'https://ieup4.objectstorage.uk-london-1.oci.customer-oci.com/p/41JaF94OZtoD84dQxC6oSzpqhO6q3c2fYM2iJ9Yx9bM-6yXqy_NvGYaeV15D7AvA/n/ieup4/b/igd/o/gwasinfo.json';

// Open or create the IndexedDB database
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
  });
}

// Retrieve a value from IndexedDB by key
export function getFromDB(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Store a key-value pair into IndexedDB
export function putToDB(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Fetch the JSON file with optional ETag and report download progress
async function fetchWithProgress(url, onProgress, cachedEtag = null) {
  const headers = cachedEtag ? { 'If-None-Match': cachedEtag } : {};
  const response = await fetch(url, { headers });
  if (response.status === 304) return null;

  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

  const contentLength = response.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength, 10) : null;
  const reader = response.body.getReader();

  let received = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total && onProgress) {
      onProgress(Math.floor((received / total) * 100));
    }
  }

  const fullArray = new Uint8Array(received);
  let position = 0;
  for (const chunk of chunks) {
    fullArray.set(chunk, position);
    position += chunk.length;
  }

  const text = new TextDecoder('utf-8').decode(fullArray);
  const data = JSON.parse(text);
  const newEtag = response.headers.get('ETag');

  return { data, etag: newEtag };
}

/**
 * Main function to load the GWAS JSON data.
 * It uses IndexedDB caching and ETag validation.
 * @param {function(number):void} onProgress - Callback receiving download progress as a percentage (0-100).
 * @returns {Promise<object>} - Resolves with the loaded JSON data.
 */
export async function loadData(onProgress) {
  const db = await openDB();
  const cached = await getFromDB(db, cacheKey);
  const cachedEtag = cached?.etag || null;

  const fetched = await fetchWithProgress(jsonUrl, onProgress, cachedEtag);

  let jsonData;
  if (fetched === null) {
    // Cache is valid, use cached data
    jsonData = cached.data;
  } else {
    jsonData = fetched.data;
    await putToDB(db, cacheKey, {
      data: jsonData,
      etag: fetched.etag,
    });
  }
  return jsonData;
}
