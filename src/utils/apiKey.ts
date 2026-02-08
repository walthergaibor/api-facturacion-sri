import { randomBytes } from 'crypto';

export function generateApiKey(prefix = 'neo'): string {
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}
