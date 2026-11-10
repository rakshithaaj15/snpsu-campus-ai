import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Frozen baseline from the actual approved original. Never learn a replacement
// hash from a changed file or silently select an unrelated asset.
export const APPROVED_REFERENCE = Object.freeze({
  file: 'attached_assets/Futuristic_University_Campus_Dashboard_1791531879550.png',
  sha256: '41db1c8117c15052e367882aa5899bf4cefd5c782986677598bbe70ea2a1f7e7',
  bytes: 2516603,
  width: 1672,
  height: 941,
});
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recovery = 'STOP. Ask the user to upload the exact original image into Replit. Do not use Canva, an image editor, generation, cropping, or a substitute.';

export async function verifyApprovedReference({ root = projectRoot, read = readFile } = {}) {
  let bytes;
  try {
    bytes = await read(resolve(root, APPROVED_REFERENCE.file));
  } catch {
    throw new Error(`Approved original is missing or unreadable: ${APPROVED_REFERENCE.file}. ${recovery}`);
  }
  if (!Buffer.isBuffer(bytes) || bytes.length !== APPROVED_REFERENCE.bytes
      || createHash('sha256').update(bytes).digest('hex') !== APPROVED_REFERENCE.sha256) {
    throw new Error(`Approved original does not match its frozen byte-level checksum. ${recovery}`);
  }
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
      || bytes.subarray(12, 16).toString() !== 'IHDR'
      || bytes.readUInt32BE(16) !== APPROVED_REFERENCE.width
      || bytes.readUInt32BE(20) !== APPROVED_REFERENCE.height) {
    throw new Error(`Approved original PNG dimensions or header do not match. ${recovery}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(await read(resolve(root, 'docs/approved-reference-integrity.json'), 'utf8'));
  } catch {
    throw new Error(`Reference registry is missing or invalid. ${recovery}`);
  }
  if (manifest.canonicalFile !== APPROVED_REFERENCE.file
      || manifest.sha256 !== APPROVED_REFERENCE.sha256
      || manifest.bytes !== APPROVED_REFERENCE.bytes
      || manifest.width !== APPROVED_REFERENCE.width
      || manifest.height !== APPROVED_REFERENCE.height
      || !Array.isArray(manifest.originalFiles)
      || !manifest.originalFiles.includes(APPROVED_REFERENCE.file)) {
    throw new Error(`Reference registry disagrees with the frozen original. Do not reset the checksum to accept a replacement. ${recovery}`);
  }
  return { ...APPROVED_REFERENCE, status: 'verified unchanged original' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifyApprovedReference();
    console.log(`Reference verified: ${result.file}`);
    console.log(`${result.width} × ${result.height}; ${result.bytes} bytes; SHA-256 ${result.sha256}`);
    console.log('Read-only visual guidance. No editor handoff or image transformation.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
