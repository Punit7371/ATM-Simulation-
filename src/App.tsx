/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AtmHeader } from './components/AtmHeader';
import { AtmKiosk } from './components/AtmKiosk';
import { AdminVaultModal } from './components/AdminVaultModal';
import { PythonExplorerModal } from './components/PythonExplorerModal';
import { UserProfileModal } from './components/UserProfileModal';
import { PersistentStorage } from './utils/persistentStorage';
import {
  Account,
  MultiCurrencyVault,
  Transaction,
  AuditLogEntry,
} from './types/atm';
import { UserProfile, UserPreferences } from './types/profile';
import { normalizeTheme, THEME_CONFIGS } from './types/theme';
import { ExchangeRateMap } from './types/currency';
import { setSoundEnabled } from './utils/audio';
import { hashPin, generateSalt } from './utils/security';
import { ShieldCheck, Terminal, Vault, User, Sliders } from 'lucide-react';

export default function App() {
  // Global simulation states with persistent localStorage loading
  const [profiles, setProfiles] = useState<UserProfile[]>(() => PersistentStorage.loadProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() =>
    PersistentStorage.loadActiveProfileId()
  );
  const [accounts, setAccounts] = useState<Account[]>(() => PersistentStorage.loadAccounts());
  const [vault, setVault] = useState<MultiCurrencyVault>(() => PersistentStorage.loadVault());
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateMap>(() =>
    PersistentStorage.loadExchangeRates()
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    PersistentStorage.loadTransactions()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    PersistentStorage.loadAuditLogs()
  );

  // Active profile object
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  // Audio & Tab Navigation
  const [soundActive, setSoundActive] = useState<boolean>(() => {
    return activeProfile ? activeProfile.preferences.soundEffects : true;
  });
  const [activeTab, setActiveTab] = useState<'kiosk' | 'admin' | 'python'>('kiosk');

  // Modals
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [showPythonModal, setShowPythonModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Sync state to PersistentStorage across sessions
  useEffect(() => {
    PersistentStorage.saveProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
    PersistentStorage.saveActiveProfileId(activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    PersistentStorage.saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    PersistentStorage.saveVault(vault);
  }, [vault]);

  useEffect(() => {
    PersistentStorage.saveExchangeRates(exchangeRates);
  }, [exchangeRates]);

  useEffect(() => {
    PersistentStorage.saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    PersistentStorage.saveAuditLogs(auditLogs);
  }, [auditLogs]);

  // Synchronize audio preference when active profile changes
  useEffect(() => {
    if (activeProfile) {
      setSoundActive(activeProfile.preferences.soundEffects);
      setSoundEnabled(activeProfile.preferences.soundEffects);
    }
  }, [activeProfile]);

  // Profile Action: Select / Switch Profile
  const handleSelectProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    const target = profiles.find((p) => p.id === profileId);
    if (target) {
      setSoundActive(target.preferences.soundEffects);
      setSoundEnabled(target.preferences.soundEffects);
      // Update last login timestamp
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId
            ? { ...p, lastLogin: new Date().toISOString().replace('T', ' ').slice(0, 19) }
            : p
        )
      );
    }
  };

  // Profile Action: Create New User Profile
  const handleCreateProfile = (
    newProfileData: Omit<UserProfile, 'id' | 'createdAt' | 'lastLogin'>,
    createAccountData?: {
      customerName: string;
      accountType: 'CHECKING' | 'SAVINGS';
      balance: number;
      pin: string;
    }
  ) => {
    let finalAccountId = newProfileData.linkedAccountId;

    // If customer opted to mint a new bank account
    if (createAccountData) {
      const newSalt = generateSalt();
      const newHash = hashPin(createAccountData.pin, newSalt);
      const randomAccNum = `ACC-${Math.floor(1000 + Math.random() * 9000)}`;
      const randomCardNum = `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(
        1000 + Math.random() * 9000
      )}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newAccount: Account = {
        id: `acc-${Date.now()}`,
        accountNumber: randomAccNum,
        customerName: createAccountData.customerName,
        cardNumber: randomCardNum,
        pinHash: newHash,
        pinSalt: newSalt,
        plainPinHint: createAccountData.pin,
        accountType: createAccountData.accountType,
        balance: createAccountData.balance,
        dailyWithdrawalLimit: 1000,
        withdrawnToday: 0,
        status: 'ACTIVE',
        failedPinAttempts: 0,
      };

      setAccounts((prev) => [...prev, newAccount]);
      finalAccountId = newAccount.id;

      // Log account creation
      const accLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        event: 'ACCOUNT_MINTED',
        level: 'INFO',
        details: `Created new ${newAccount.accountType} account ${newAccount.accountNumber} with card ${randomCardNum}.`,
      };
      setAuditLogs((prev) => [accLog, ...prev]);
    }

    const nowTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const createdProfile: UserProfile = {
      ...newProfileData,
      id: `user-${Date.now()}`,
      linkedAccountId: finalAccountId,
      createdAt: nowTime,
      lastLogin: nowTime,
    };

    setProfiles((prev) => [...prev, createdProfile]);
    setActiveProfileId(createdProfile.id);

    const log: AuditLogEntry = {
      id: `log-${Date.now()}-prof`,
      timestamp: nowTime,
      event: 'PROFILE_CREATED',
      level: 'INFO',
      details: `New profile @${createdProfile.username} registered with username and password.`,
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  // Profile Action: Update Preferences
  const handleUpdatePreferences = (profileId: string, preferences: UserPreferences) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, preferences } : p))
    );
    setSoundActive(preferences.soundEffects);
    setSoundEnabled(preferences.soundEffects);

    const log: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      event: 'PREFERENCES_UPDATED',
      level: 'INFO',
      details: `Preferences updated for profile ${profileId}. Synced across sessions.`,
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  // Profile Action: Sign Out
  const handleLogoutProfile = () => {
    setActiveProfileId(null);
  };

  // Full reset back to factory defaults
  const handleResetAll = () => {
    PersistentStorage.resetAll();
    const loadedProfiles = PersistentStorage.loadProfiles();
    setProfiles(loadedProfiles);
    setActiveProfileId(loadedProfiles[0]?.id || null);
    setAccounts(PersistentStorage.loadAccounts());
    setVault(PersistentStorage.loadVault());
    setExchangeRates(PersistentStorage.loadExchangeRates());
    setTransactions(PersistentStorage.loadTransactions());
    setAuditLogs(PersistentStorage.loadAuditLogs());
  };

  // Admin actions
  const handleUnlockAccount = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? { ...acc, status: 'ACTIVE' as const, failedPinAttempts: 0 }
          : acc
      )
    );
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      event: 'ADMIN_UNLOCK',
      level: 'SECURITY',
      details: `Administrator unlocked account ${accountId} and reset failed PIN counter.`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleResetLimits = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, withdrawnToday: 0 } : acc))
    );
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      event: 'ADMIN_LIMIT_RESET',
      level: 'INFO',
      details: `Daily withdrawal allowance counter reset to $0.00 for ${accountId}.`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const activeTheme = normalizeTheme(activeProfile?.preferences.theme);

  return (
    <div
      data-theme={activeTheme}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden"
    >
      {/* Liquid Glass Ambient Mesh & Floating Light Orbs */}
      <div className="liquid-mesh-bg" aria-hidden="true">
        <div className="liquid-orb-1" />
        <div className="liquid-orb-2" />
        <div className="liquid-orb-3" />
      </div>

      {/* 3-Zone Header with User Profile Launcher */}
      <AtmHeader
        onOpenAdmin={() => setShowAdminModal(true)}
        onOpenPython={() => setShowPythonModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onResetAll={handleResetAll}
        soundActive={soundActive}
        setSoundActive={setSoundActive}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProfile={activeProfile}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col justify-center items-center py-4 sm:py-8 px-2 sm:px-4 relative z-10">
        <AtmKiosk
          accounts={accounts}
          setAccounts={setAccounts}
          vault={vault}
          setVault={setVault}
          transactions={transactions}
          setTransactions={setTransactions}
          auditLogs={auditLogs}
          setAuditLogs={setAuditLogs}
          exchangeRates={exchangeRates}
          setExchangeRates={setExchangeRates}
          onOpenAdmin={() => setShowAdminModal(true)}
          onOpenPython={() => setShowPythonModal(true)}
          activeProfile={activeProfile}
          onOpenProfile={() => setShowProfileModal(true)}
        />
      </main>

      {/* User Profile & Preferences Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profiles={profiles}
        activeProfile={activeProfile}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={handleCreateProfile}
        onUpdatePreferences={handleUpdatePreferences}
        onLogoutProfile={handleLogoutProfile}
        accounts={accounts}
      />

      {/* Administrative Vault Maintenance & FX Modal */}
      <AdminVaultModal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setActiveTab('kiosk');
        }}
        accounts={accounts}
        vault={vault}
        onUpdateVault={setVault}
        onUnlockAccount={handleUnlockAccount}
        onResetLimits={handleResetLimits}
        auditLogs={auditLogs}
        exchangeRates={exchangeRates}
        onUpdateExchangeRates={setExchangeRates}
      />

      {/* Python Code Architecture & 34 Unit Tests Modal */}
      <PythonExplorerModal
        isOpen={showPythonModal}
        onClose={() => {
          setShowPythonModal(false);
          setActiveTab('kiosk');
        }}
      />

      {/* Clean, unboxed footer with no clutter */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Apex Bank ATM Terminal Simulation · Multi-Currency Vault & Dynamic FX Architecture
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfileModal(true)}
              className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>{activeProfile ? `@${activeProfile.username} Profile` : 'User Profiles'}</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setShowPythonModal(true)}
              className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Python Architecture</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setShowAdminModal(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Vault className="w-3.5 h-3.5" />
              <span>Multi-Currency Vault</span>
            </button>
            <span aria-hidden="true">·</span>
            <span className="text-slate-600">Encrypted localStorage Persistence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
