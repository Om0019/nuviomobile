import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabaseSyncService } from './supabaseSyncService';
import { mmkvStorage } from './mmkvStorage';
import { logger } from '../utils/logger';

const PUSH_TOKEN_STORAGE_KEY = '@push_token:last_registered';
const PUSH_TOKEN_ACCOUNT_STORAGE_KEY = '@push_token:last_registered_account';

type PushTokenRow = {
  expo_push_token: string;
  platform: string;
  device_name?: string;
  app_version?: string;
  account_user_id?: string | null;
  enabled: boolean;
  updated_at?: string;
};

class PushTokenService {
  private static instance: PushTokenService;
  private registerPromise: Promise<void> | null = null;

  static getInstance(): PushTokenService {
    if (!PushTokenService.instance) {
      PushTokenService.instance = new PushTokenService();
    }
    return PushTokenService.instance;
  }

  public async registerForPushNotifications(): Promise<void> {
    if (this.registerPromise) {
      return this.registerPromise;
    }

    this.registerPromise = this.performRegistration();

    try {
      await this.registerPromise;
    } finally {
      this.registerPromise = null;
    }
  }

  private async performRegistration(): Promise<void> {
    if (!Device.isDevice) {
      return;
    }

    if (!supabaseSyncService.isConfigured()) {
      logger.warn('[PushTokenService] Supabase is not configured; push registration skipped.');
      return;
    }

    try {
      const permission = await Notifications.getPermissionsAsync();
      let finalStatus = permission.status;

      if (finalStatus !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('[PushTokenService] Notification permission not granted; push registration skipped.');
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId;

      if (!projectId) {
        logger.warn('[PushTokenService] Missing EAS projectId; push registration skipped.');
        return;
      }

      const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (!expoPushToken) {
        logger.warn('[PushTokenService] Expo push token is empty; push registration skipped.');
        return;
      }

      const lastRegisteredToken = await mmkvStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      const accountUserId = supabaseSyncService.getCurrentSessionUser()?.id || null;
      const lastRegisteredAccountId = await mmkvStorage.getItem(PUSH_TOKEN_ACCOUNT_STORAGE_KEY);

      if (lastRegisteredToken === expoPushToken && lastRegisteredAccountId === (accountUserId || 'anonymous')) {
        return;
      }

      const payload: PushTokenRow = {
        expo_push_token: expoPushToken,
        platform: Platform.OS,
        device_name: Device.deviceName || `${Platform.OS} device`,
        app_version: Constants.expoConfig?.version || 'unknown',
        account_user_id: accountUserId,
        enabled: true,
        updated_at: new Date().toISOString(),
      };

      await this.upsertPushToken(payload);
      await mmkvStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expoPushToken);
      await mmkvStorage.setItem(PUSH_TOKEN_ACCOUNT_STORAGE_KEY, accountUserId || 'anonymous');
      logger.log('[PushTokenService] Registered Expo push token.');
    } catch (error) {
      logger.error('[PushTokenService] Failed to register Expo push token:', error);
    }
  }

  private async upsertPushToken(row: PushTokenRow): Promise<void> {
    const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !anonKey) {
      throw new Error('Supabase env vars missing');
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/device_push_tokens?on_conflict=expo_push_token`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(row),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Push token upsert failed: ${response.status} ${text}`);
    }
  }
}

export const pushTokenService = PushTokenService.getInstance();
export default pushTokenService;
