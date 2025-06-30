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
    if (darkMode) {
      // Apply dark mode filter to body but exclude iframes
      document.body.style.filter = "invert(0.9) hue-rotate(180deg) brightness(1.05) contrast(1.05)";
      
      // Create CSS rule to counter-invert iframes to keep them light
      const existingStyle = document.getElementById('dark-mode-iframe-fix');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'dark-mode-iframe-fix';
        style.textContent = `
          iframe {
            filter: invert(0.9) hue-rotate(180deg) brightness(1.05) contrast(1.05) !important;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      // Remove dark mode filter
      document.body.style.filter = "";
      
      // Remove iframe counter-invert
      const style = document.getElementById('dark-mode-iframe-fix');
      if (style) {
        style.remove();
      }
    }
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
} 