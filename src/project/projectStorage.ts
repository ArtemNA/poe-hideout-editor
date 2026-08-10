import type { HideoutProject } from '../hideout/types'

const DB_NAME = 'poe-hideout-editor'
const STORE = 'projects'
const AUTOSAVE_KEY = 'autosave'

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveAutosave(project: HideoutProject): Promise<void> {
  const db = await database()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(project, AUTOSAVE_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

export async function loadAutosave(): Promise<HideoutProject | undefined> {
  const db = await database()
  const result = await new Promise<HideoutProject | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(AUTOSAVE_KEY)
    request.onsuccess = () => resolve(request.result as HideoutProject | undefined)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return result
}

export function serializeEditorProject(project: HideoutProject): string {
  return JSON.stringify({ fileType: 'poehideoutproject', version: 1, project }, null, 2)
}

export function parseEditorProject(source: string): HideoutProject {
  const parsed = JSON.parse(source) as { fileType?: string; version?: number; project?: HideoutProject }
  if (parsed.fileType !== 'poehideoutproject' || parsed.version !== 1 || !parsed.project) throw new Error('Not a supported .poehideoutproject file.')
  return parsed.project
}
