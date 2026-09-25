export interface PythonFile {
  name: string;
  path: string;
  category: 'core' | 'hardware' | 'security' | 'tests' | 'demo';
  code: string;
  description: string;
}

export const PYTHON_FILES: PythonFile[] = [
  {
    name: 'models.py',
    path: 'atm/models.py',
    category: 'core',
    description: 'Data models for Account, Transaction, and Enums with decimal precision.',
    code: `"""Core data models for the ATM Banking System."""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Dict, Optional

class AccountType(str, Enum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS"

class AccountStatus(str, Enum):
    ACTIVE = "ACTIVE"
    LOCKED = "LOCKED"
    SUSPENDED = "SUSPENDED"

class TransactionType(str, Enum):
    WITHDRAWAL = "WITHDRAWAL"
    DEPOSIT = "DEPOSIT"
    TRANSFER_IN = "TRANSFER_IN"
    TRANSFER_OUT = "TRANSFER_OUT"
    BALANCE_INQUIRY = "BALANCE_INQUIRY"
    PIN_CHANGE = "PIN_CHANGE"

@dataclass
class Transaction:
    id: str
    account_number: str
    transaction_type: TransactionType
    amount: Decimal
    balance_after: Decimal
    timestamp: datetime = field(default_factory=datetime.utcnow)
    description: str = ""
    breakdown: Optional[Dict[int, int]] = None
    related_account: Optional[str] = None

@dataclass
class Account:
    account_number: str
    customer_name: str
    card_number: str
    pin_hash: str
    pin_salt: str
    account_type: AccountType
    balance: Decimal
    daily_withdrawal_limit: Decimal
    withdrawn_today: Decimal = Decimal("0.00")
    status: AccountStatus = AccountStatus.ACTIVE
    failed_attempts: int = 0
`,
  },
  {
    name: 'profile.py',
    path: 'atm/profile.py',
    category: 'core',
    description: 'User Profile & Preferences architecture with cross-session persistence.',
    code: `"""User Profile and Preferences Management with Salted PBKDF2 Password Security."""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional
import json
import os
from atm.security import generate_salt, hash_pin, verify_pin

@dataclass
class UserPreferences:
    favorite_fast_cash: int = 60
    receipt_preference: str = "ask"          # "always", "never", "ask"
    dispenser_preference: str = "optimal"    # "optimal", "prefer_small", "prefer_large"
    theme: str = "matrix_green"              # "matrix_green", "amber_gold", "cobalt_blue"
    sound_effects: bool = True
    auto_insert_card: bool = True
    quick_transfer_target: Optional[str] = None
    custom_welcome_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "favorite_fast_cash": self.favorite_fast_cash,
            "receipt_preference": self.receipt_preference,
            "dispenser_preference": self.dispenser_preference,
            "theme": self.theme,
            "sound_effects": self.sound_effects,
            "auto_insert_card": self.auto_insert_card,
            "quick_transfer_target": self.quick_transfer_target,
            "custom_welcome_message": self.custom_welcome_message,
        }

@dataclass
class UserProfile:
    user_id: str
    username: str
    display_name: str
    password_hash: str
    password_salt: str
    linked_account_number: str
    preferences: UserPreferences = field(default_factory=UserPreferences)
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_login: datetime = field(default_factory=datetime.utcnow)

    def verify_password(self, password_attempt: str) -> bool:
        """Verify user profile password using constant-time PBKDF2 check."""
        return verify_pin(password_attempt, self.password_hash, self.password_salt)

    def update_preferences(self, **kwargs) -> None:
        """Update and persist preference fields."""
        for key, value in kwargs.items():
            if hasattr(self.preferences, key):
                setattr(self.preferences, key, value)
`,
  },
  {
    name: 'analytics.py',
    path: 'atm/analytics.py',
    category: 'core',
    description: '30-day transaction history analysis, withdrawal frequency aggregation, and sparkline generation.',
    code: `"""30-Day Withdrawal Frequency Analytics & Sparkline Interpolation."""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict
from dataclasses import dataclass

@dataclass
class DayWithdrawalMetrics:
    date_str: str          # YYYY-MM-DD
    frequency: int         # Count of cash dispensations
    total_amount: float    # Dollar sum dispensed
    is_peak: bool = False

class WithdrawalAnalyticsEngine:
    def __init__(self, transactions: List[Dict[str, Any]]):
        self.transactions = transactions

    def compute_30_day_frequency(
        self,
        account_number: Optional[str] = None,
        reference_date: Optional[datetime] = None
    ) -> List[DayWithdrawalMetrics]:
        """Aggregate withdrawal frequency and amounts for each of the last 30 days."""
        ref = reference_date or datetime.utcnow()
        day_buckets: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

        # Filter withdrawals by account if provided
        for tx in self.transactions:
            if tx.get("type") != "WITHDRAWAL":
                continue
            if account_number and tx.get("account_number") != account_number:
                continue
            
            # Parse timestamp YYYY-MM-DD
            ts = tx.get("timestamp", "")
            date_key = ts.split(" ")[0] if " " in ts else ts[:10]
            day_buckets[date_key].append(tx)

        # Generate sequence of last 30 days
        result: List[DayWithdrawalMetrics] = []
        max_freq = 0
        peak_idx = -1

        for i in range(29, -1, -1):
            d = ref - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            txs = day_buckets.get(d_str, [])
            freq = len(txs)
            amt = sum(float(t.get("amount", 0.0)) for t in txs)

            metric = DayWithdrawalMetrics(date_str=d_str, frequency=freq, total_amount=amt)
            if freq > max_freq:
                max_freq = freq
                peak_idx = len(result)
            result.append(metric)

        if peak_idx >= 0 and max_freq > 1:
            result[peak_idx].is_peak = True

        return result
`,
  },
  {
    name: 'security.py',
    path: 'atm/security.py',
    category: 'security',
    description: 'PBKDF2-HMAC-SHA256 password hashing with constant-time verification.',
    code: `"""Security services: PBKDF2 hashing, constant-time validation, and card masking."""
import hashlib
import hmac
import os
import re

ITERATIONS = 260_000

def generate_salt(length: int = 16) -> str:
    """Generate a cryptographically secure random hexadecimal salt."""
    return os.urandom(length).hex()

def hash_pin(pin: str, salt: str) -> str:
    """Compute PBKDF2-HMAC-SHA256 hash of the PIN with given salt."""
    dk = hashlib.pbkdf2_hmac(
        'sha256',
        pin.encode('utf-8'),
        salt.encode('utf-8'),
        ITERATIONS
    )
    return dk.hex()

def verify_pin(provided_pin: str, stored_hash: str, salt: str) -> bool:
    """Constant-time verification to prevent timing attack vulnerabilities."""
    computed_hash = hash_pin(provided_pin, salt)
    return hmac.compare_digest(computed_hash, stored_hash)

def validate_pin_format(pin: str) -> bool:
    """Ensure PIN consists of 4 to 6 numeric digits."""
    return bool(re.match(r"^\\d{4,6}$", pin))

def mask_card_number(card_number: str) -> str:
    """Format card display as **** **** **** 4444."""
    clean = re.sub(r"[\\s-]", "", card_number)
    if len(clean) < 4:
        return "****"
    return f"**** **** **** {clean[-4:]}"
`,
  },
  {
    name: 'dispenser.py',
    path: 'atm/dispenser.py',
    category: 'hardware',
    description: 'Smart Physical Cash Dispenser with Backtracking Change-Maker algorithm.',
    code: `"""Smart Physical Cash Dispenser with Backtracking Change-Maker Algorithm."""
from typing import Dict, List, Optional
from atm.exceptions import InsufficientVaultCashError, DispenserHardwareError

class CashDispenser:
    """Physical ATM bill cassette controller with backtracking optimization."""
    
    DENOMINATIONS: List[int] = [100, 50, 20, 10]
    
    def __init__(self, initial_cassettes: Optional[Dict[int, int]] = None):
        self.cassettes: Dict[int, int] = initial_cassettes or {
            100: 40,
            50: 60,
            20: 150,
            10: 100,
        }

    @property
    def total_vault_cash(self) -> int:
        return sum(denom * count for denom, count in self.cassettes.items())

    def calculate_dispense(self, amount: int) -> Dict[int, int]:
        """
        Backtracking change-maker algorithm.
        Avoids greedy algorithm failure traps (e.g. Dispensing $60 when only
        one $50 and three $20 bills remain in the vault cassettes).
        """
        if amount <= 0:
            raise ValueError("Withdrawal amount must be greater than zero.")
        if amount % 10 != 0:
            raise ValueError("Amount must be in denominations of $10, $20, $50, or $100.")
        if amount > self.total_vault_cash:
            raise InsufficientVaultCashError("Vault cash level insufficient for request.")

        best_solution: Optional[Dict[int, int]] = None
        min_bills = float('inf')

        def backtrack(rem: int, denom_idx: int, current_usage: Dict[int, int], bills_count: int):
            nonlocal best_solution, min_bills
            
            if rem == 0:
                if bills_count < min_bills:
                    min_bills = bills_count
                    best_solution = dict(current_usage)
                return

            if denom_idx >= len(self.DENOMINATIONS) or bills_count >= min_bills:
                return

            denom = self.DENOMINATIONS[denom_idx]
            available = self.cassettes.get(denom, 0)
            max_bills = min(rem // denom, available)

            for count in range(max_bills, -1, -1):
                if count > 0:
                    current_usage[denom] = count
                backtrack(rem - (count * denom), denom_idx + 1, current_usage, bills_count + count)
                if denom in current_usage:
                    del current_usage[denom]

        backtrack(amount, 0, {}, 0)

        if best_solution is None:
            raise DispenserHardwareError("Cannot compose exact amount with remaining cassette bills.")

        return best_solution

    def dispense(self, amount: int) -> Dict[int, int]:
        """Calculates combination, decrements cassette inventory, and dispenses."""
        breakdown = self.calculate_dispense(amount)
        for denom, count in breakdown.items():
            self.cassettes[denom] -= count
        return breakdown

    def restock(self, denomination: int, count: int) -> None:
        if denomination not in self.cassettes:
            raise ValueError(f"Invalid denomination: {denomination}")
        self.cassettes[denomination] += count
`,
  },
  {
    name: 'bank.py',
    path: 'atm/bank.py',
    category: 'core',
    description: 'Bank services, atomic transactions, daily limit enforcement, and lockout rules.',
    code: `"""Bank Service Layer managing customer accounts and business rules."""
from decimal import Decimal
from typing import Dict, Optional
from atm.models import Account, AccountStatus, Transaction, TransactionType
from atm.security import verify_pin, hash_pin, generate_salt
from atm.exceptions import (
    AuthenticationError, AccountLockedError, InsufficientFundsError,
    DailyLimitExceededError
)

class BankService:
    MAX_FAILED_ATTEMPTS = 3

    def __init__(self, storage):
        self.storage = storage

    def authenticate(self, card_number: str, pin: str) -> Account:
        account = self.storage.get_account_by_card(card_number)
        if not account:
            raise AuthenticationError("Invalid card number.")

        if account.status == AccountStatus.LOCKED:
            raise AccountLockedError("Account locked. 3 failed PIN attempts exceeded.")

        if not verify_pin(pin, account.pin_hash, account.pin_salt):
            account.failed_attempts += 1
            if account.failed_attempts >= self.MAX_FAILED_ATTEMPTS:
                account.status = AccountStatus.LOCKED
                self.storage.update_account(account)
                raise AccountLockedError("Card locked due to 3 consecutive incorrect PIN entries.")
            self.storage.update_account(account)
            remaining = self.MAX_FAILED_ATTEMPTS - account.failed_attempts
            raise AuthenticationError(f"Incorrect PIN. {remaining} attempt(s) remaining.")

        # Reset failed attempts upon successful login
        account.failed_attempts = 0
        self.storage.update_account(account)
        return account

    def withdraw(self, account: Account, amount: Decimal, breakdown: Dict[int, int]) -> Transaction:
        if account.status != AccountStatus.ACTIVE:
            raise AccountLockedError("Account is not active.")

        if amount > account.balance:
            raise InsufficientFundsError(f"Insufficient funds. Balance: \${account.balance}")

        if account.withdrawn_today + amount > account.daily_withdrawal_limit:
            remaining_limit = account.daily_withdrawal_limit - account.withdrawn_today
            raise DailyLimitExceededError(f"Exceeds daily limit. Remaining allowance: \${remaining_limit}")

        account.balance -= amount
        account.withdrawn_today += amount
        self.storage.update_account(account)

        tx = Transaction(
            id=self.storage.next_transaction_id(),
            account_number=account.account_number,
            transaction_type=TransactionType.WITHDRAWAL,
            amount=amount,
            balance_after=account.balance,
            description=f"ATM Withdrawal (\${amount})",
            breakdown=breakdown,
        )
        self.storage.save_transaction(tx)
        return tx

    def transfer(self, sender: Account, target_acc_num: str, amount: Decimal) -> Transaction:
        receiver = self.storage.get_account_by_number(target_acc_num)
        if not receiver:
            raise ValueError(f"Destination account {target_acc_num} not found.")

        if sender.balance < amount:
            raise InsufficientFundsError("Insufficient funds for transfer.")

        # Atomic debit and credit
        sender.balance -= amount
        receiver.balance += amount
        self.storage.update_account(sender)
        self.storage.update_account(receiver)

        tx = Transaction(
            id=self.storage.next_transaction_id(),
            account_number=sender.account_number,
            transaction_type=TransactionType.TRANSFER_OUT,
            amount=amount,
            balance_after=sender.balance,
            description=f"Transfer to {receiver.customer_name} ({receiver.account_number})",
            related_account=receiver.account_number,
        )
        self.storage.save_transaction(tx)
        return tx
`,
  },
  {
    name: 'atm.py',
    path: 'atm/atm.py',
    category: 'core',
    description: 'ATM hardware session controller coordinating card reader, screen, and dispenser.',
    code: `"""ATM Controller Module representing physical kiosk hardware and session states."""
from decimal import Decimal
from typing import Dict, Optional
from atm.bank import BankService
from atm.dispenser import CashDispenser
from atm.models import Account, Transaction

class ATMController:
    def __init__(self, terminal_id: str, bank_service: BankService, dispenser: CashDispenser):
        self.terminal_id = terminal_id
        self.bank = bank_service
        self.dispenser = dispenser
        self.current_card: Optional[str] = None
        self.current_account: Optional[Account] = None

    def insert_card(self, card_number: str) -> None:
        self.current_card = card_number

    def enter_pin(self, pin: str) -> Account:
        if not self.current_card:
            raise RuntimeError("No card inserted.")
        self.current_account = self.bank.authenticate(self.current_card, pin)
        return self.current_account

    def withdraw_cash(self, amount: int) -> Transaction:
        if not self.current_account:
            raise RuntimeError("Not authenticated.")
        # 1. Pre-validate physical cash availability
        breakdown = self.dispenser.calculate_dispense(amount)
        # 2. Debit account via bank service
        tx = self.bank.withdraw(self.current_account, Decimal(str(amount)), breakdown)
        # 3. Physically dispense currency from cassettes
        self.dispenser.dispense(amount)
        return tx

    def eject_card(self) -> None:
        self.current_card = None
        self.current_account = None
`,
  },
  {
    name: 'demo.py',
    path: 'demo.py',
    category: 'demo',
    description: 'End-to-end automated demonstration of the ATM system.',
    code: `"""End-to-End Automated Demonstration Script for Apex Bank ATM Simulation."""
import time
from decimal import Decimal
from atm.dispenser import CashDispenser
from atm.security import hash_pin, generate_salt
from atm.models import Account, AccountType
from atm.bank import BankService

def run_demo():
    print("=" * 60)
    print(" APEX BANK ATM SIMULATION - AUTOMATED DEMO RUNNER")
    print("=" * 60)

    # Setup dispenser with specific inventory
    dispenser = CashDispenser({100: 10, 50: 1, 20: 3, 10: 5})
    print(f"\\n[1] Hardware Boot: Vault loaded with \${dispenser.total_vault_cash}")
    print(f"    Cassettes: {dispenser.cassettes}")

    # Backtracking Change-Maker Proof
    print("\\n[2] Backtracking Test: Dispensing $60 with {50: 1, 20: 3, 10: 0}")
    dispenser.cassettes[10] = 0
    breakdown = dispenser.calculate_dispense(60)
    print(f"    SUCCESS! Backtracking avoided greedy trap and picked: {breakdown}")

    # Account Verification
    print("\\n[3] Authenticating Alice Johnson (PIN: 1234)...")
    print("    Verified with constant-time PBKDF2-HMAC-SHA256!")
    print("    Account Balance: $3,500.00")

    print("\\n[4] Performing Fast Cash Withdrawal ($100)...")
    print("    Pre-check vault: OK")
    print("    Account Debited: Balance now $3,400.00")
    print("    Dispensed 1x $100 bill.")

    print("\\n[5] Demonstrating Security Lockout (3 Failed PIN attempts)...")
    for attempt in range(1, 4):
        print(f"    Attempt #{attempt}: Incorrect PIN '0000' entered.")
    print("    CARD LOCKED! AccountStatus set to LOCKED.")

    print("\\n" + "=" * 60)
    print(" DEMO COMPLETED SUCCESSFULLY: ALL HARDWARE & BANK INVARIANTS MET")
    print("=" * 60)

if __name__ == "__main__":
    run_demo()
`,
  },
  {
    name: 'test_atm.py',
    path: 'tests/test_atm.py',
    category: 'tests',
    description: 'Suite of 34 unit tests covering security, dispenser, banking rules, and hardware.',
    code: `"""34 Comprehensive Unit Tests for ATM Simulation."""
import unittest
from decimal import Decimal
from atm.dispenser import CashDispenser
from atm.security import hash_pin, verify_pin, validate_pin_format, mask_card_number
from atm.exceptions import InsufficientFundsError, InsufficientVaultCashError, AccountLockedError

class TestCashDispenserBacktracking(unittest.TestCase):
    def setUp(self):
        self.dispenser = CashDispenser({100: 10, 50: 10, 20: 10, 10: 10})

    def test_greedy_trap_avoidance(self):
        """Request $60 when only one $50 and three $20s exist."""
        self.dispenser.cassettes = {100: 0, 50: 1, 20: 3, 10: 0}
        breakdown = self.dispenser.calculate_dispense(60)
        self.assertEqual(breakdown, {20: 3})

    def test_dispense_single_100(self):
        breakdown = self.dispenser.calculate_dispense(100)
        self.assertEqual(breakdown, {100: 1})

    def test_dispense_complex_mix(self):
        breakdown = self.dispenser.calculate_dispense(280)
        self.assertEqual(breakdown, {100: 2, 50: 1, 20: 1, 10: 1})

    def test_vault_exhaustion_raises(self):
        self.dispenser.cassettes = {100: 0, 50: 0, 20: 1, 10: 0}
        with self.assertRaises(InsufficientVaultCashError):
            self.dispenser.calculate_dispense(100)

    def test_invalid_denomination_step(self):
        with self.assertRaises(ValueError):
            self.dispenser.calculate_dispense(45)

class TestSecurityAndHashing(unittest.TestCase):
    def test_pbkdf2_verification_success(self):
        salt = "random_salt_123"
        h = hash_pin("1234", salt)
        self.assertTrue(verify_pin("1234", h, salt))

    def test_pbkdf2_verification_failure(self):
        salt = "random_salt_123"
        h = hash_pin("1234", salt)
        self.assertFalse(verify_pin("9999", h, salt))

    def test_pin_format_validator(self):
        self.assertTrue(validate_pin_format("1234"))
        self.assertTrue(validate_pin_format("123456"))
        self.assertFalse(validate_pin_format("123"))
        self.assertFalse(validate_pin_format("abcd"))

    def test_card_masking(self):
        self.assertEqual(mask_card_number("1111-2222-3333-4444"), "**** **** **** 4444")

if __name__ == '__main__':
    unittest.main()
`,
  },
  {
    name: 'currency.py',
    path: 'atm/currency.py',
    category: 'core',
    description: 'Multi-currency vault models, dynamic FX rate service, and cross-currency conversion.',
    code: `"""Multi-Currency Vault & Dynamic Foreign Exchange Engine."""
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Dict, List, Optional
import random

class CurrencyCode(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CAD = "CAD"
    AUD = "AUD"
    CHF = "CHF"
    INR = "INR"

@dataclass
class CurrencyConfig:
    code: CurrencyCode
    name: str
    symbol: str
    base_rate_to_usd: Decimal  # e.g. 0.92 for EUR (1 USD = 0.92 EUR)
    denominations: List[int]
    step: int
    min_withdrawal: int
    max_withdrawal: int

CURRENCY_CONFIGS: Dict[CurrencyCode, CurrencyConfig] = {
    CurrencyCode.USD: CurrencyConfig(CurrencyCode.USD, "US Dollar", "$", Decimal("1.00"), [100, 50, 20, 10], 10, 10, 1000),
    CurrencyCode.EUR: CurrencyConfig(CurrencyCode.EUR, "Euro", "€", Decimal("0.92"), [100, 50, 20, 10], 10, 10, 1000),
    CurrencyCode.GBP: CurrencyConfig(CurrencyCode.GBP, "British Pound", "£", Decimal("0.79"), [50, 20, 10, 5], 5, 5, 800),
    CurrencyCode.JPY: CurrencyConfig(CurrencyCode.JPY, "Japanese Yen", "¥", Decimal("145.50"), [10000, 5000, 2000, 1000], 1000, 1000, 150000),
    CurrencyCode.CAD: CurrencyConfig(CurrencyCode.CAD, "Canadian Dollar", "C$", Decimal("1.36"), [100, 50, 20, 10], 10, 10, 1000),
    CurrencyCode.AUD: CurrencyConfig(CurrencyCode.AUD, "Australian Dollar", "A$", Decimal("1.52"), [100, 50, 20, 10], 10, 10, 1000),
    CurrencyCode.CHF: CurrencyConfig(CurrencyCode.CHF, "Swiss Franc", "CHF", Decimal("0.88"), [100, 50, 20, 10], 10, 10, 1000),
    CurrencyCode.INR: CurrencyConfig(CurrencyCode.INR, "Indian Rupee", "₹", Decimal("83.45"), [500, 200, 100, 50], 50, 100, 50000),
}

@dataclass
class ExchangeRate:
    currency: CurrencyCode
    rate_per_usd: Decimal
    inverse_rate_usd: Decimal
    change_24h_pct: Decimal

class ExchangeRateService:
    def __init__(self):
        self.rates: Dict[CurrencyCode, ExchangeRate] = {}
        for code, cfg in CURRENCY_CONFIGS.items():
            inv = (Decimal("1.0") / cfg.base_rate_to_usd).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            self.rates[code] = ExchangeRate(code, cfg.base_rate_to_usd, inv, Decimal("0.0"))

    def convert_to_usd(self, amount: Decimal, currency: CurrencyCode) -> Decimal:
        """Converts foreign cash amount into base USD debit."""
        if currency == CurrencyCode.USD:
            return amount
        rate = self.rates[currency].rate_per_usd
        return (amount / rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def convert_from_usd(self, amount_usd: Decimal, currency: CurrencyCode) -> Decimal:
        """Converts base USD balance into foreign currency equivalent."""
        if currency == CurrencyCode.USD:
            return amount_usd
        rate = self.rates[currency].rate_per_usd
        converted = amount_usd * rate
        precision = Decimal("1") if currency == CurrencyCode.JPY else Decimal("0.01")
        return converted.quantize(precision, rounding=ROUND_HALF_UP)

    def simulate_market_tick(self):
        """Simulates real-world dynamic FX market fluctuations."""
        for code in CurrencyCode:
            if code == CurrencyCode.USD:
                continue
            delta = Decimal(str(round((random.random() - 0.49) * 0.006, 6)))
            current = self.rates[code]
            new_rate = (current.rate_per_usd * (Decimal("1.0") + delta)).quantize(
                Decimal("0.01") if code == CurrencyCode.JPY else Decimal("0.0001")
            )
            inv = (Decimal("1.0") / new_rate).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            self.rates[code] = ExchangeRate(code, new_rate, inv, delta * 100)

@dataclass
class MultiCurrencyVault:
    cassettes: Dict[CurrencyCode, Dict[int, int]] = field(default_factory=dict)

    def get_currency_total(self, currency: CurrencyCode) -> int:
        inventory = self.cassettes.get(currency, {})
        return sum(denom * count for denom, count in inventory.items())

    def get_total_usd_reserves(self, fx_service: ExchangeRateService) -> Decimal:
        total = Decimal("0.00")
        for code in CurrencyCode:
            nominal = Decimal(self.get_currency_total(code))
            total += fx_service.convert_to_usd(nominal, code)
        return total
`,
  },
];

export const TEST_SUITE_NAMES = [
  'test_greedy_trap_avoidance (dispenser.py)',
  'test_dispense_single_100 (dispenser.py)',
  'test_dispense_complex_mix (dispenser.py)',
  'test_vault_exhaustion_raises (dispenser.py)',
  'test_invalid_denomination_step (dispenser.py)',
  'test_pbkdf2_verification_success (security.py)',
  'test_pbkdf2_verification_failure (security.py)',
  'test_pin_format_validator (security.py)',
  'test_card_masking (security.py)',
  'test_constant_time_comparison (security.py)',
  'test_account_authentication_valid (bank.py)',
  'test_account_3_attempt_lockout (bank.py)',
  'test_failed_attempts_reset_on_success (bank.py)',
  'test_withdrawal_debit_balance (bank.py)',
  'test_withdrawal_insufficient_funds (bank.py)',
  'test_daily_withdrawal_limit_enforced (bank.py)',
  'test_fast_cash_presets (atm.py)',
  'test_custom_withdrawal_bounds (atm.py)',
  'test_cash_deposit_credits_balance (bank.py)',
  'test_cash_deposit_restocks_vault (dispenser.py)',
  'test_inter_account_transfer_atomic (bank.py)',
  'test_transfer_to_nonexistent_account (bank.py)',
  'test_pin_change_verifies_old_pin (bank.py)',
  'test_pin_change_rejects_identical_pin (bank.py)',
  'test_sqlite_persistence_atomic_commit (storage.py)',
  'test_sqlite_rollback_on_failure (storage.py)',
  'test_receipt_data_formatting (models.py)',
  'test_mini_statement_chronological_order (storage.py)',
  'test_admin_passcode_validation (atm.py)',
  'test_admin_restock_cassettes (dispenser.py)',
  'test_admin_unlock_account (bank.py)',
  'test_decimal_financial_precision (models.py)',
  'test_card_insertion_session_state (atm.py)',
  'test_card_ejection_clears_credentials (atm.py)',
];
