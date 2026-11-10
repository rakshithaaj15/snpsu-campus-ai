import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { APPROVED_REFERENCE, verifyApprovedReference } from './verify-approved-reference.mjs';

test('the actual canonical original and registry verify without any writes', async () => {
  const result = await verifyApprovedReference();
  assert.equal(result.status, 'verified unchanged original');
  assert.equal(result.width, 1672);
  assert.equal(result.height, 941);
});

test('missing source fails closed and requests the exact original upload', async () => {
  await assert.rejects(
    verifyApprovedReference({ read: async () => { throw new Error('ENOENT'); } }),
    /STOP.*exact original image.*Do not use Canva/,
  );
});

test('unrelated bytes cannot become a replacement reference', async () => {
  // Arbitrary non-image test data, not a modified copy of the user's image.
  await assert.rejects(
    verifyApprovedReference({ read: async () => Buffer.from('not the approved image') }),
    /frozen byte-level checksum.*STOP/,
  );
});

test('changing the registry cannot authorize a different source or checksum', async () => {
  await assert.rejects(
    verifyApprovedReference({
      read: async (path, encoding) => {
        if (path.endsWith(APPROVED_REFERENCE.file)) return readFile(path);
        const manifest = JSON.parse(await readFile(path, encoding));
        manifest.sha256 = '0'.repeat(64);
        return JSON.stringify(manifest);
      },
    }),
    /registry disagrees.*Do not reset the checksum/,
  );
});
