/**
 * Security utilities: PBKDF2 simulated hash verification, constant-time comparison,
 * and card masking.
 */

// Simple deterministic salt generator for demo purposes
export function generateSalt(length = 16): string {
  const chars = '0123456789abcdef';
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += chars[Math.floor(Math.random() * chars.length)];
  }
  return salt;
}

// Pseudo-PBKDF2 SHA-256 hash representation
export function hashPin(pin: string, salt: string): string {
  // Simple deterministic hash function for demo consistency
  let hash = 0x811c9dc5;
  const str = `${salt}:${pin}:apex_bank_vault_kdf_2026`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Produce 64 hex characters
  const baseHex = (hash >>> 0).toString(16).padStart(8, '0');
  return `pbkdf2_sha256$260000$${salt}$${(baseHex + baseHex + baseHex + baseHex).slice(0, 32)}`;
}

/**
 * Constant-time string comparison simulation (timing attack resistance).
 */
export function verifyPin(providedPin: string, storedHash: string, salt: string): boolean {
  const computedHash = hashPin(providedPin, salt);
  if (computedHash.length !== storedHash.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Masks a 16-digit card number to display only the last 4 digits.
 * e.g. "1111-2222-3333-4444" -> "•••• •••• •••• 4444"
 */
export function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\s|-/g, '');
  if (clean.length < 4) return '••••';
  const lastFour = clean.slice(-4);
  return `•••• •••• •••• ${lastFour}`;
}

/**
 * Formats raw card input with dashes.
 */
export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
}
