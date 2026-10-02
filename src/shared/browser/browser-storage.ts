export type BrowserStorageRead = { ok: true; value: string | null } | { ok: false };

export function readBrowserStorageItem(key: string): BrowserStorageRead {
  try {
    return { ok: true, value: window.localStorage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

export function writeBrowserStorageItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
