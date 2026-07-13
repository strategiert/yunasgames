const DB_NAME = "zauber-maler";
const STORE = "sessions";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out?.result);
    t.onerror = () => reject(t.error);
  });
}

// session = { id, createdAt, drawing: Blob, results: { pixar, comic, anime } (Blob|null) }
export async function saveSession(session) {
  const db = await openDb();
  await tx(db, "readwrite", (s) => s.put(session));
  db.close();
}

export async function listSessions() {
  const db = await openDb();
  const result = await tx(db, "readonly", (s) => s.getAll());
  db.close();
  return (result || []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSession(id) {
  const db = await openDb();
  await tx(db, "readwrite", (s) => s.delete(id));
  db.close();
}
