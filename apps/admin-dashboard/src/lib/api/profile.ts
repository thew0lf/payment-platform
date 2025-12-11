import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: ThemePreference;
  sidebarCollapsed: boolean;
}

export interface UpdatePreferencesDto {
  theme?: ThemePreference;
  sidebarCollapsed?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const profileApi = {
  /**
   * Get current user's preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    return apiRequest.get<UserPreferences>('/api/me/preferences');
  },

  /**
   * Update current user's preferences
   */
  async updatePreferences(data: UpdatePreferencesDto): Promise<UserPreferences> {
    return apiRequest.patch<UserPreferences>('/api/me/preferences', data);
  },
};
