import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Dark-only theme — always forced to dark
  const theme = 'dark';

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');

    // Force dark in localStorage
    localStorage.setItem('theme', 'dark');

    // Update CSS variables for toast notifications
    document.documentElement.style.setProperty('--toast-bg', '#1a1a1a');
    document.documentElement.style.setProperty('--toast-color', '#e0e0e0');
  }, []);

  // toggleTheme is a no-op in dark-only mode (kept for API compatibility)
  const toggleTheme = () => {};

  const value = {
    theme,
    toggleTheme,
    isDark: true,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};