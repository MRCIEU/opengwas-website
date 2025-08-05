// gwas-storage.js

const dbName = 'GwasDB';
const storeName = 'GwasStore';

const keys_and_urls = {
  'gwasinfo': {
    'key': 'gwasinfo.json',
    'url': 'https://ieup4.objectstorage.uk-london-1.oci.customer-oci.com/p/sigwHf-vsYcWCJ5YUAvRCxYKPzHlc4LWNljUJmyzO7beGE9n2ctwzLeCidDDG-Uh/n/ieup4/b/igd/o/gwasinfo.json'
  },
  'batches': {
    'key': 'gwasinfo_batches.json',
    'url': 'https://ieup4.objectstorage.uk-london-1.oci.customer-oci.com/p/sigwHf-vsYcWCJ5YUAvRCxYKPzHlc4LWNljUJmyzO7beGE9n2ctwzLeCidDDG-Uh/n/ieup4/b/igd/o/gwasinfo_batches.json'
  }
}

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
export async function loadData(target, onProgress = null) {
  const db = await openDB();
  const cached = await getFromDB(db, keys_and_urls[target].key);
  const cachedEtag = cached?.etag || null;

  const fetched = await fetchWithProgress(keys_and_urls[target].url, onProgress, cachedEtag);

  if (fetched === null) return cached.data;

  await putToDB(db, keys_and_urls[target].key, {
    data: fetched.data,
    etag: fetched.etag,
  });
  
  return fetched.data;
}
