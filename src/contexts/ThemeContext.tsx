import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { mmkvStorage } from '../services/mmkvStorage';
import { settingsEmitter } from '../hooks/useSettings';
import { colors as defaultColors } from '../styles/colors';

// Define the Theme interface
export interface Theme {
  id: string;
  name: string;
  colors: typeof defaultColors;
  isEditable: boolean;
}

const MOVIE_THEME: Theme = {
  id: 'movie',
  name: 'Movie',
  colors: {
    ...defaultColors,
    primary: '#ef4444',
    secondary: '#fb7185',
    darkBackground: '#1a0d0a',
  },
  isEditable: false,
};

// Default built-in themes
export const DEFAULT_THEMES: Theme[] = [MOVIE_THEME];

// Theme context props
interface ThemeContextProps {
  currentTheme: Theme;
  availableThemes: Theme[];
  setCurrentTheme: (themeId: string) => void;
  addCustomTheme: (theme: Omit<Theme, 'id' | 'isEditable'>) => void;
  updateCustomTheme: (theme: Theme) => void;
  deleteCustomTheme: (themeId: string) => void;
}

// Create the context
const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// Storage keys (kept for backward compatibility). Primary source of truth is app_settings
const CURRENT_THEME_KEY = 'current_theme';
const CUSTOM_THEMES_KEY = 'custom_themes';

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentThemeState] = useState<Theme>(MOVIE_THEME);
  const [availableThemes, setAvailableThemes] = useState<Theme[]>(DEFAULT_THEMES);

  // Load themes from app_settings (scoped), with legacy fallbacks
  useEffect(() => {
    const loadThemes = async () => {
      try {
        const scope = (await mmkvStorage.getItem('@user:current')) || 'local';
        const appSettingsJson = await mmkvStorage.getItem(`@user:${scope}:app_settings`);
        const appSettings = appSettingsJson ? JSON.parse(appSettingsJson) : {};
        appSettings.themeId = MOVIE_THEME.id;
        appSettings.customThemes = [];
        await mmkvStorage.setItem(`@user:${scope}:app_settings`, JSON.stringify(appSettings));
        await mmkvStorage.setItem(CURRENT_THEME_KEY, MOVIE_THEME.id);
        await mmkvStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify([]));
        setAvailableThemes(DEFAULT_THEMES);
        setCurrentThemeState(MOVIE_THEME);
      } catch (error) {
        if (__DEV__) console.error('Failed to load themes:', error);
      }
    };
    loadThemes();
    // Stop live refresh from remote; only refresh on app restart or local changes
    return () => {};
  }, []);

  // Set current theme
  const setCurrentTheme = async (_themeId: string) => {
    const scope = (await mmkvStorage.getItem('@user:current')) || 'local';
    const key = `@user:${scope}:app_settings`;
    let settings = {} as any;
    try { settings = JSON.parse((await mmkvStorage.getItem(key)) || '{}'); } catch {}
    settings.themeId = MOVIE_THEME.id;
    settings.customThemes = [];
    await mmkvStorage.setItem(key, JSON.stringify(settings));
    await mmkvStorage.setItem(CURRENT_THEME_KEY, MOVIE_THEME.id);
    await mmkvStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify([]));
    setAvailableThemes(DEFAULT_THEMES);
    setCurrentThemeState(MOVIE_THEME);
  };

  // Add custom theme
  const addCustomTheme = async (_themeData: Omit<Theme, 'id' | 'isEditable'>) => {
    return;
  };

  // Update custom theme
  const updateCustomTheme = async (_updatedTheme: Theme) => {
    return;
  };

  // Delete custom theme
  const deleteCustomTheme = async (_themeId: string) => {
    return;
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        availableThemes,
        setCurrentTheme,
        addCustomTheme,
        updateCustomTheme,
        deleteCustomTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 
