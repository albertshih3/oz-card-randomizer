// originally written by @imoaazahmed

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ThemeProps = {
  key: "theme",
  light: "light",
  dark: "dark",
} as const;

type Theme = typeof ThemeProps.light | typeof ThemeProps.dark;

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  setLightTheme: () => void;
  setDarkTheme: () => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const applyThemeToDOM = (newTheme: Theme): void => {
  localStorage.setItem(ThemeProps.key, newTheme);
  document.documentElement.classList.remove(ThemeProps.light, ThemeProps.dark);
  document.documentElement.classList.add(newTheme);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return ThemeProps.light;
    const raw = localStorage.getItem(ThemeProps.key);
    return raw === ThemeProps.dark ? ThemeProps.dark : ThemeProps.light;
  });

  const isDark = useMemo(() => theme === ThemeProps.dark, [theme]);
  const isLight = useMemo(() => theme === ThemeProps.light, [theme]);

  const setLightTheme = useCallback(() => {
    applyThemeToDOM(ThemeProps.light);
    setTheme(ThemeProps.light);
  }, []);

  const setDarkTheme = useCallback(() => {
    applyThemeToDOM(ThemeProps.dark);
    setTheme(ThemeProps.dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next =
        prev === ThemeProps.dark ? ThemeProps.light : ThemeProps.dark;
      applyThemeToDOM(next);
      return next;
    });
  }, []);

  // Sync DOM class on initial mount (localStorage may have been set by a previous session)
  useEffect(() => {
    document.documentElement.classList.remove(
      ThemeProps.light,
      ThemeProps.dark,
    );
    document.documentElement.classList.add(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark,
      isLight,
      setLightTheme,
      setDarkTheme,
      toggleTheme,
    }),
    [theme, isDark, isLight, setLightTheme, setDarkTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
