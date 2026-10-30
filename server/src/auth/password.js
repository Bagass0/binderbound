import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// Paramètres recommandés par l'OWASP pour scrypt (N = 2^17, r = 8, p = 1 → 128 Mo).
const PARAMS = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const KEY_LENGTH = 64;

/** Empreinte au format `scrypt$N$r$p$sel$hash` : les paramètres voyagent avec le hash. */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password, stored) {
  const [algo, N, r, p, salt, hash] = stored.split('$');
  if (algo !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  });
  return timingSafeEqual(actual, expected);
}

/** Empreinte jetable : un e-mail inconnu coûte le même temps qu'un mauvais mot de passe. */
export const DUMMY_HASH = await hashPassword(randomBytes(16).toString('hex'));
