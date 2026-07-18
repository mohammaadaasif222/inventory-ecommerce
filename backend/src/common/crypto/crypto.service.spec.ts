import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

const KEY = 'a'.repeat(64); // 32-byte hex

function makeService(key = KEY): CryptoService {
  const config = {
    get: (k: string) =>
      k === 'security.configEncryptionKey' ? key : undefined,
  } as unknown as ConfigService;
  return new CryptoService(config);
}

describe('CryptoService', () => {
  it('rejects an invalid key length', () => {
    expect(() => makeService('short')).toThrow();
  });

  it('round-trips a secret value', () => {
    const svc = makeService();
    const secret = 'sk_live_supersecret_123';
    const enc = svc.encrypt(secret);
    expect(enc).not.toBeNull();
    expect(enc).not.toContain(secret); // not stored in plaintext
    expect(svc.decrypt(enc)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const svc = makeService();
    const a = svc.encrypt('same');
    const b = svc.encrypt('same');
    expect(a).not.toBe(b);
    expect(svc.decrypt(a)).toBe('same');
    expect(svc.decrypt(b)).toBe('same');
  });

  it('returns null for empty input and malformed ciphertext', () => {
    const svc = makeService();
    expect(svc.encrypt('')).toBeNull();
    expect(svc.encrypt(null)).toBeNull();
    expect(svc.decrypt('not:valid')).toBeNull();
    expect(svc.decrypt(null)).toBeNull();
  });

  it('masks secrets keeping only the last 4 characters', () => {
    expect(CryptoService.mask('abcdefgh')).toBe('••••••••efgh');
    expect(CryptoService.mask('')).toBe('');
    expect(CryptoService.mask('ab')).toBe('••••');
  });
});
