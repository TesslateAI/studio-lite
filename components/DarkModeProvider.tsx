"use client";
import React, { useEffect, useState, createContext, useContext } from "react";

const DarkModeContext = createContext<{
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
} | null>(null);

export function useDarkMode() {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error("useDarkMode must be used within DarkModeProvider");
  return ctx;
}

export default function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    if (stored) setDarkMode(stored === "true");
  }, []);

  useEffect(() => {
    document.body.style.filter = darkMode
      ? "invert(0.9) hue-rotate(180deg) brightness(1.05) contrast(1.05)"
      : "";
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
} 