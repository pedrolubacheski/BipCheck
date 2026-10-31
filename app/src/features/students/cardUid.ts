import { z } from 'zod';

// Aceita o UID como as pessoas costumam digitar ("a1 b2:c3-d4") e devolve "A1B2C3D4"
const cardUidSchema = z
  .string()
  .transform((value) => value.replace(/[\s:-]/g, '').toUpperCase())
  .pipe(z.string().regex(/^[0-9A-F]{8,20}$/, 'O UID deve ter de 8 a 20 dígitos hexadecimais.'));

export function normalizeCardUid(value: string): string {
  return cardUidSchema.parse(value);
}
