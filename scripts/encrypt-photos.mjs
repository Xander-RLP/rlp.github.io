#!/usr/bin/env node
// Versleutelt een map met foto's naar public/fotos/ zodat ze veilig in de
// publieke repo kunnen. AES-256-GCM, sleutel via PBKDF2 uit een wachtwoord —
// de /fotos-pagina ontsleutelt ze in de browser met hetzelfde wachtwoord.
//
// Gebruik:  node scripts/encrypt-photos.mjs <fotomap> <wachtwoord>
// Submappen worden groepen in de galerij (mapnaam = kopje, bijv. "RLP 2024");
// losse foto's in de hoofdmap komen onder "Overig". Vereist ImageMagick.

import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [srcDir, password] = process.argv.slice(2);
if (!srcDir || !password) {
  console.error("gebruik: node scripts/encrypt-photos.mjs <fotomap> <wachtwoord>");
  process.exit(1);
}

const outDir = "public/fotos";
const ITERATIONS = 300_000;
const salt = randomBytes(16);
const key = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");

// iv (12B) + ciphertext + GCM-tag (16B) in één blob; WebCrypto verwacht ct+tag aaneen
function encrypt(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, ct, cipher.getAuthTag()]);
}

function resized(file, maxPx, quality) {
  return execFileSync("convert", [
    file, "-auto-orient", "-resize", `${maxPx}x${maxPx}>`,
    "-strip", "-quality", String(quality), "jpg:-",
  ], { maxBuffer: 64 * 1024 * 1024 });
}

const isFoto = (f) => /\.(jpe?g|png|webp|heic)$/i.test(f);
const entries = readdirSync(srcDir).sort();
const subdirs = entries.filter((e) => statSync(join(srcDir, e)).isDirectory());
const loose = entries.filter((e) => !statSync(join(srcDir, e)).isDirectory() && isFoto(e));

// elke submap is een groep; losse foto's in de hoofdmap vallen onder "Overig"
const groupDefs = subdirs.map((d) => ({
  title: d,
  files: readdirSync(join(srcDir, d)).filter(isFoto).sort().map((f) => join(srcDir, d, f)),
}));
if (loose.length) {
  groupDefs.push({ title: subdirs.length ? "Overig" : "Foto's", files: loose.map((f) => join(srcDir, f)) });
}
if (!groupDefs.some((g) => g.files.length)) {
  console.error(`geen foto's gevonden in ${srcDir}`);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let n = 0;
const groups = groupDefs.filter((g) => g.files.length).map((g) => {
  const photos = g.files.map((src) => {
    const id = `foto-${String(++n).padStart(2, "0")}`;
    writeFileSync(join(outDir, `${id}.thumb.enc`), encrypt(resized(src, 480, 72)));
    writeFileSync(join(outDir, `${id}.full.enc`), encrypt(resized(src, 1600, 84)));
    console.log(`${id}  ←  ${src}`);
    return id;
  });
  return { title: g.title, photos };
});

writeFileSync(join(outDir, "manifest.enc"), encrypt(Buffer.from(JSON.stringify({ groups }))));
writeFileSync(join(outDir, "meta.json"), JSON.stringify({
  salt: salt.toString("base64"),
  iterations: ITERATIONS,
}));
console.log(`\n${n} foto's in ${groups.length} groep(en) versleuteld naar ${outDir}/`);
