"use client";

import Link from "next/link";
import styles from "./Home.module.css";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const quickActions = [
  { label: "Add to Groceries", href: "/groceries", icon: "➕" },
  { label: "Update Inventory", href: "/inventory", icon: "📝" },
  { label: "Find Recipes", href: "/recipes", icon: "🔍" },
];

export default function HomeClient() {
  const [inStock, setInStock] = useState("-");
  const [expiringSoon, setExpiringSoon] = useState("-");
  const [shoppingList, setShoppingList] = useState("-");
  const [recipesReady, setRecipesReady] = useState("-");
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { count: inventoryCount } = await supabase.from("inventory").select("*", { count: "exact", head: true });
    setInStock(inventoryCount?.toString() || "0");

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const { count: expiringTotal } = await supabase.from("inventory")
       .select("*", { count: "exact", head: true })
       .lte("expiry_date", threeDaysFromNow.toISOString().split('T')[0]);
    setExpiringSoon(expiringTotal?.toString() || "0");

    const { count: shoppingCount } = await supabase.from("grocery_list")
       .select("*", { count: "exact", head: true })
       .eq("status", "pending");
    setShoppingList(shoppingCount?.toString() || "0");

    const { count: recipesCount } = await supabase.from("recipes").select("*", { count: "exact", head: true });
    setRecipesReady(recipesCount?.toString() || "0");

    const { data: logs } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(4);
    if (logs) setRecentActivity(logs);
  };

  const dynamicStats = [
    { label: "In Stock", value: inStock, unit: "items", color: "green", icon: "📦" },
    { label: "Expiring Soon", value: expiringSoon, unit: "items", color: "yellow", icon: "⚠️" },
    { label: "Shopping List", value: shoppingList, unit: "items", color: "blue", icon: "🛒" },
    { label: "Recipes", value: recipesReady, unit: "saved", color: "purple", icon: "🍽️" },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <section className={`${styles.hero} animate-fade-in`}>
        <div className={styles.heroText}>
          <p className="text-secondary text-sm">Good evening 👋</p>
          <h2 className={styles.heroTitle}>What&apos;s in your fridge?</h2>
        </div>
        <div className={styles.heroIcon}>🧊</div>
      </section>

      {/* Stats Grid */}
      <section className="mt-lg animate-fade-in animate-delay-1">
        <p className={styles.sectionLabel}>Overview</p>
        <div className="grid-2">
          {dynamicStats.map((stat) => (
            <div key={stat.label} className={`card ${styles.statCard}`}
              style={{ borderColor: stat.color === "green" ? "rgba(16,185,129,0.2)" : stat.color === "yellow" ? "rgba(251,191,36,0.2)" : stat.color === "blue" ? "rgba(96,165,250,0.2)" : "rgba(167,139,250,0.2)" }}
            >
              <span className={styles.statIcon}>{stat.icon}</span>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statUnit}>{stat.unit}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mt-lg animate-fade-in animate-delay-2">
        <p className={styles.sectionLabel}>Quick Actions</p>
        <div className={styles.quickActions}>
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className={styles.quickAction}>
              <span className={styles.quickIcon}>{action.icon}</span>
              <span className={styles.quickLabel}>{action.label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mt-lg animate-fade-in animate-delay-3">
        <div className="flex items-center justify-between mb-md">
          <p className={styles.sectionLabel} style={{ marginBottom: 0 }}>Recent Activity</p>
          <span className="text-xs text-green" style={{ fontWeight: 600 }}>See all</span>
        </div>
        <div className={styles.activityList}>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted" style={{ padding: '8px 0' }}>No recent activity yet.</p>
          ) : recentActivity.map((item, i) => {
            const dateObj = new Date(item.created_at);
            const timeStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });

            return (
              <div key={i} className={styles.activityItem}>
                <span className={styles.activityIcon}>{item.icon}</span>
                <div className={styles.activityInfo}>
                  <p className={styles.activityAction}>
                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{item.action} </span>
                    {item.item}
                  </p>
                  <p className="text-xs text-muted">{timeStr}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
