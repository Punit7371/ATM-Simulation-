import { CurrencyCode } from './currency';
import { ATMTheme, CanonicalThemeId } from './theme';

export type { ATMTheme, CanonicalThemeId };
export type ReceiptPreference = 'always' | 'never' | 'ask';
export type DispenserPreference = 'optimal' | 'prefer_small' | 'prefer_large';

export interface UserPreferences {
  favoriteFastCash: number; // e.g. 20, 40, 60, 100, 200, 300
  receiptPreference: ReceiptPreference;
  dispenserPreference: DispenserPreference;
  theme: ATMTheme;
  soundEffects: boolean;
  quickTransferTarget?: string;
  autoInsertCardOnLogin: boolean;
  customWelcomeMessage?: string;
  preferredCurrency: CurrencyCode; // Preferred withdrawal currency (e.g. 'USD', 'EUR', 'GBP', 'JPY')
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
  plainPasswordHint?: string; // For testing/demo convenience
  linkedAccountId: string; // Associated Account id (e.g. acc-1)
  createdAt: string;
  lastLogin: string;
  preferences: UserPreferences;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteFastCash: 60,
  receiptPreference: 'ask',
  dispenserPreference: 'optimal',
  theme: 'matrix_green',
  soundEffects: true,
  autoInsertCardOnLogin: true,
  preferredCurrency: 'USD',
};
