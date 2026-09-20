"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/* Icons are wired to the data-theme attribute in CSS, so the first paint is
   already correct. State only carries the announced action */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("gb-theme", next);
    } catch {
      /* storage blocked, the switch still applies to this session */
    }
    setIsDark(next === "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-9 w-9 items-center justify-center border border-line bg-card p-0 text-muted transition-colors duration-150 hover:border-muted"
    >
      <Sun aria-hidden="true" size={16} strokeWidth={2} className="gb-icon-sun" />
      <Moon
        aria-hidden="true"
        size={16}
        strokeWidth={2}
        className="gb-icon-moon"
      />
    </button>
  );
}