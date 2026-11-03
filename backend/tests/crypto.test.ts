import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

process.env.SETTINGS_ENCRYPTION_KEY = randomBytes(32).toString('base64');
const {decryptSecret, encryptSecret, hashPassword, randomCode, verifyPassword} = await import('../src/lib/crypto.ts');

test('secrets round-trip and ciphertext differs every time', () => {
  const a = encryptSecret('rzp_live_secret_value');
  const b = encryptSecret('rzp_live_secret_value');
  assert.notEqual(a, b);
  assert.equal(decryptSecret(a), 'rzp_live_secret_value');
  assert.throws(() => decryptSecret(a.slice(0, -2) + 'AA'));
});

test('passwords verify only with the right password', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', hash), true);
  assert.equal(await verifyPassword('wrong password here', hash), false);
});

test('affiliate codes are random and use an unambiguous alphabet', () => {
  const codes = new Set(Array.from({length: 500}, () => randomCode()));
  assert.equal(codes.size, 500);
  for (const code of codes) assert.match(code, /^[A-HJ-NP-Za-km-z2-9]{10}$/);
});
