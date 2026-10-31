import { normalizeCardUid } from './cardUid.ts';

describe('normalizeCardUid', () => {
  it('remove espaços, dois-pontos e hífens e passa para maiúsculo', () => {
    expect(normalizeCardUid(' a1 b2:c3-d4 ')).toBe('A1B2C3D4');
  });

  it('aceita UID de 7 bytes', () => {
    expect(normalizeCardUid('04 1A 2B 3C 4D 5E 6F')).toBe('041A2B3C4D5E6F');
  });

  it('recusa UID curto demais', () => {
    expect(() => normalizeCardUid('A1B2')).toThrow(
      'O UID deve ter de 8 a 20 dígitos hexadecimais.',
    );
  });

  it('recusa caracteres que não são hexadecimais', () => {
    expect(() => normalizeCardUid('A1B2C3ZZ')).toThrow(
      'O UID deve ter de 8 a 20 dígitos hexadecimais.',
    );
  });
});
