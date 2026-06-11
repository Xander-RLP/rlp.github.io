// Gedeelde helpers voor de versleutelde LAN-foto's (zie scripts/encrypt-photos.mjs):
// AES-256-GCM-blobs in public/fotos/, sleutel via PBKDF2 uit het deelnemerswachtwoord.
// Ontsleutelen gebeurt volledig in de browser.

export const FOTOS_WACHTWOORD_KEY = "rlp26-fotos-wachtwoord";

export async function deriveKey(password: string, saltB64: string, iterations: number) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

export async function fetchDecrypted(key: CryptoKey, path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
}

export type FotoGroep = { title: string; photos: string[] };

// verkeerd wachtwoord ⇒ GCM-verificatie van het manifest faalt (throw)
export async function unlockFotos(password: string) {
  const meta = await (await fetch("/fotos/meta.json")).json() as { salt: string; iterations: number };
  const key = await deriveKey(password, meta.salt, meta.iterations);
  const manifest = JSON.parse(new TextDecoder().decode(
    await fetchDecrypted(key, "/fotos/manifest.enc"),
  )) as { groups: FotoGroep[] };
  return { key, groups: manifest.groups, photos: manifest.groups.flatMap((g) => g.photos) };
}

export async function decryptFotoUrl(key: CryptoKey, path: string) {
  const data = await fetchDecrypted(key, path);
  return URL.createObjectURL(new Blob([data], { type: "image/jpeg" }));
}
