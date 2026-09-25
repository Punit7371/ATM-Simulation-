import { CurrencyCode } from './currency';

export type QRActionType = 'WITHDRAWAL' | 'DEPOSIT' | 'LOGIN' | 'ANY';

export type QRSessionStatus = 'READY' | 'SCANNED' | 'AUTHORIZING' | 'SUCCESS' | 'EXPIRED';

export interface QRSession {
  sessionId: string;
  kioskId: string;
  terminalName: string;
  status: QRSessionStatus;
  expiresAt: number;
  totalDurationSec: number;
  actionType: QRActionType;
  currency: CurrencyCode;
  suggestedAmount: number;
  payload: string; // The encoded QR string (e.g., apex://atm/auth?token=...)
  clientDeviceName?: string;
  completedAt?: number;
}

export interface QRAuthPayload {
  terminalId: string;
  sessionId: string;
  action: QRActionType;
  amount: number;
  currency: CurrencyCode;
  accountId: string;
  customerName: string;
  biometricVerified: boolean;
}
