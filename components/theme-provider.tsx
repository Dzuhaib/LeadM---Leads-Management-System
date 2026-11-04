"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: "class" | "data-theme";
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  themes: Theme[];
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage can be blocked; try the cookie below.
  }
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${storageKey}=([^;]*)`),
    );
    const cookieTheme = match?.[1];
    if (
      cookieTheme === "light" ||
      cookieTheme === "dark" ||
      cookieTheme === "system"
    ) {
      return cookieTheme;
    }
  } catch {
    // Cookies can be blocked; fall back to the default.
  }
  return fallback;
}

function persistTheme(storageKey: string, theme: Theme) {
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // Storage can be blocked; the in-memory theme still works.
  }
  try {
    document.cookie = `${storageKey}=${theme}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookies can be blocked; the in-memory theme still works.
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  attribute = "class",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() =>
    readStoredTheme(storageKey, defaultTheme),
  );
  const [systemTheme, setSystemTheme] =
    React.useState<ResolvedTheme>(getSystemTheme);

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : theme;

  React.useEffect(() => {
    if (!enableSystem) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(query.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    onChange();
    return () => query.removeEventListener("change", onChange);
  }, [enableSystem]);

  React.useEffect(() => {
    const root = document.documentElement;
    let style: HTMLStyleElement | null = null;

    if (disableTransitionOnChange) {
      style = document.createElement("style");
      style.textContent =
        "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;transition:none!important}";
      document.head.appendChild(style);
    }

    if (attribute === "class") {
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
    } else {
      root.setAttribute(attribute, resolvedTheme);
    }
    root.style.colorScheme = resolvedTheme;

    if (style) {
      const node = style;
      window.setTimeout(() => node.remove(), 1);
    }
  }, [attribute, disableTransitionOnChange, resolvedTheme]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = event.newValue;
      if (next === "light" || next === "dark" || next === "system") {
        setThemeState(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  const setTheme = React.useCallback(
    (next: Theme) => {
      setThemeState(next);
      persistTheme(storageKey, next);
    },
    [storageKey],
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: enableSystem
        ? ["light", "dark", "system"]
        : ["light", "dark"],
    }),
    [enableSystem, resolvedTheme, setTheme, systemTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
