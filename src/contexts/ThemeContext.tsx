'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

const STORAGE_KEY = 'tysonkeebs-theme';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setCurrentTheme(isDark ? 'dark' : 'light');
    setReady(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const isDark = currentTheme === 'dark';

  const antdTheme = {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorLink: isDark ? '#ffffff' : '#121212',
      colorLinkHover: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(18,18,18,0.75)',
      colorBgElevated: isDark ? '#0a0a0a' : '#ffffff',
      colorText: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(18,18,18,0.75)',
      colorTextBase: isDark ? '#ffffff' : '#121212',
      colorBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(18,18,18,0.1)',
    },
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, toggleTheme }}>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
