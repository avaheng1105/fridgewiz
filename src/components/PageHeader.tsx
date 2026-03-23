"use client";

import { usePathname } from "next/navigation";
import styles from "./PageHeader.module.css";

const pageTitles: Record<string, { title: string; emoji: string }> = {
  "/": { title: "FridgeWiz", emoji: "🧊" },
  "/groceries": { title: "Groceries", emoji: "🛒" },
  "/inventory": { title: "Inventory", emoji: "📦" },
  "/recipes": { title: "Recipes", emoji: "🍽️" },
  "/profile": { title: "Profile", emoji: "👤" },
  "/offline": { title: "Offline", emoji: "📡" },
};

export default function PageHeader() {
  const pathname = usePathname();

  const key = Object.keys(pageTitles)
    .filter((k) => (k === "/" ? pathname === "/" : pathname.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0] ?? "/";

  const { title, emoji } = pageTitles[key] ?? pageTitles["/"];

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.titleGroup}>
          <span className={styles.emoji}>{emoji}</span>
          <h1 className={styles.title}>{title}</h1>
        </div>
        <div className={styles.actions}>
          <button className={styles.iconBtn} aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
