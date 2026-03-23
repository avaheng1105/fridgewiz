"use client";

import { useState, useEffect } from "react";
import styles from "./inventory.module.css";
import { supabase } from "@/lib/supabase";
import { getEmoji } from "@/lib/emoji";

type InventoryItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  category: string;
  status: "fresh" | "expiring" | "expired" | "none";
  emoji: string;
  expiry: string;
  rawExpiry: string | null;
};

const categories = ["All", "Supermarket", "Produce", "Meat", "Bakery", "Pantry", "Others"];
const addCategories = ["Supermarket", "Produce", "Meat", "Bakery", "Pantry", "Others"];
const units = ["pieces", "packs", "bottles", "rolls", "others"];

const statusConfig = {
  fresh: { label: "Fresh", bg: "#d1fae5", text: "#065f46" },
  expiring: { label: "Expiring", bg: "#fef3c7", text: "#92400e" },
  expired: { label: "Expired", bg: "#fee2e2", text: "#991b1b" },
  none: { label: "", bg: "transparent", text: "transparent" }
};

function getExpiryStatus(dateString: string | null): "fresh" | "expiring" | "expired" | "none" {
  if (!dateString || dateString === 'N/A') return "none";
  const parts = dateString.split('-');
  if (parts.length !== 3) return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  exp.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= 3) return "expiring";
  return "fresh";
}



function CustomSelect({ value, onChange, options }: { value: string; onChange: (val: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", flex: 1, width: "100%" }} tabIndex={0} onBlur={() => setOpen(false)}>
      <div
        style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: "16px" }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ color: "var(--text-primary)" }}>{value}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
      </div>
      {open && (
        <div className="card animate-fade-in" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "8px", padding: "8px", zIndex: 1001, display: "flex", flexDirection: "column", gap: "2px", maxHeight: "180px", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          {options.map(opt => (
            <div
              key={opt}
              style={{ padding: "12px", borderRadius: "8px", cursor: "pointer", background: value === opt ? "var(--brand-green-glow)" : "transparent", color: value === opt ? "var(--brand-primary)" : "var(--text-primary)", fontWeight: value === opt ? 600 : 400 }}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomDatePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div style={{ position: "relative", width: "100%" }} tabIndex={0} onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
    }}>
      <div
        style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: "16px" }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>Expiry Date</span>
        <span style={{ color: value ? "var(--text-primary)" : "var(--text-muted)", fontWeight: value ? 600 : 400 }}>
          {value ? new Date(value).toLocaleDateString() : "Select Date"}
        </span>
      </div>

      {open && (
        <div className="card animate-fade-in" style={{ position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: "8px", padding: "16px", zIndex: 1002, display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onMouseDown={(e) => { e.preventDefault(); setViewDate(new Date(year, month - 1, 1)); }} style={{ padding: "8px", color: "var(--text-primary)", fontWeight: 'bold' }}>&lt;</button>
            <span style={{ fontWeight: 600 }}>{monthNames[month]} {year}</span>
            <button onMouseDown={(e) => { e.preventDefault(); setViewDate(new Date(year, month + 1, 1)); }} style={{ padding: "8px", color: "var(--text-primary)", fontWeight: 'bold' }}>&gt;</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {days.map((d, i) => {
              if (d === null) return <div key={`empty-${i}`} />;

              const isSelected = value && parseInt(value.split('-')[2]) === d && parseInt(value.split('-')[1]) - 1 === month && parseInt(value.split('-')[0]) === year;
              const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;

              return (
                <div
                  key={d}
                  style={{
                    padding: "8px 0",
                    textAlign: "center",
                    borderRadius: "50%",
                    cursor: "pointer",
                    background: isSelected ? "linear-gradient(135deg, var(--brand-secondary), var(--brand-primary))" : "transparent",
                    color: isSelected ? "#fff" : (isToday ? "var(--brand-primary)" : "var(--text-primary)"),
                    fontWeight: isSelected || isToday ? 600 : 400
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const yStr = year;
                    const mStr = String(month + 1).padStart(2, '0');
                    const dStr = String(d).padStart(2, '0');
                    onChange(`${yStr}-${mStr}-${dStr}`);
                    setOpen(false);
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--brand-green-glow)' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {d}
                </div>
              );
            })}
          </div>
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); }}
            style={{ marginTop: "4px", padding: "8px", fontSize: "14px", color: "var(--color-danger)", cursor: "pointer", background: "rgba(248,113,113,0.1)", borderRadius: "var(--radius-full)" }}
          >
            Clear Date
          </button>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState("pieces");
  const [newCategory, setNewCategory] = useState("Pantry");
  const [newExpiry, setNewExpiry] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase.from("inventory").select("*").order("created_at", { ascending: true });
    if (data) {
      const mapped: InventoryItem[] = data.map((d: any) => ({
        id: d.id,
        name: d.item_name,
        qty: d.quantity || 0,
        unit: d.unit || 'pieces',
        category: d.category || "Pantry",
        status: getExpiryStatus(d.expiry_date),
        emoji: d.emoji || getEmoji(d.category || "Pantry", d.item_name || ""),
        expiry: d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : 'N/A',
        rawExpiry: d.expiry_date || null
      }));
      setInventoryData(mapped);
    }
  };

  const openEditModal = (item: InventoryItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingItemId(item.id);
    setNewItemName(item.name);
    setNewQty(item.qty);
    setNewUnit(item.unit);
    setNewCategory(item.category);
    setNewExpiry(item.rawExpiry || "");
    setIsModalOpen(true);
  };

  const saveItem = async () => {
    if (!newItemName.trim()) return;
    const itemText = newItemName.trim();

    const q = newQty;
    const u = newUnit;
    const c = newCategory;
    const ex = newExpiry; // "YYYY-MM-DD"
    const suggestedEmoji = getEmoji(c, itemText);

    // Reset and close
    setNewItemName("");
    setNewQty(1);
    setNewUnit("pieces");
    setNewCategory("Pantry");
    setNewExpiry("");
    setIsModalOpen(false);

    const py = {
      item_name: itemText, quantity: q, unit: u, category: c, emoji: suggestedEmoji,
      is_countable: ["pcs", "piece", "pieces", "packs"].includes(u.toLowerCase())
    } as any;
    if (ex) py.expiry_date = ex;

    const userRes = await supabase.auth.getUser();
    if (userRes.data.user) py.user_id = userRes.data.user.id;

    if (editingItemId) {
      const orig = inventoryData.find(i => i.id === editingItemId);
      const { data, error } = await supabase.from("inventory").update(py).eq("id", editingItemId).select().single();
      setEditingItemId(null);
      if (error) {
        alert("Database failed to update: " + error.message);
        console.error("Update Error:", error);
        return;
      }
      if (userRes.data.user && orig && py.quantity !== orig.qty) {
        await supabase.from("activity_log").insert([{
          user_id: userRes.data.user.id,
          action: py.quantity < orig.qty ? "Used" : "Added",
          item: py.item_name,
          icon: "📦"
        }]);
      }
      if (data) {
        const realItem: InventoryItem = { id: data.id, name: data.item_name, qty: data.quantity || 0, unit: data.unit || 'pieces', category: data.category || "Pantry", status: getExpiryStatus(data.expiry_date), emoji: data.emoji || getEmoji(data.category || "Pantry", data.item_name || ""), expiry: data.expiry_date ? new Date(data.expiry_date).toLocaleDateString() : 'N/A', rawExpiry: data.expiry_date || null };
        setInventoryData(prev => prev.map(i => i.id === editingItemId ? realItem : i));
      }
    } else {
      const optId = Date.now().toString() + Math.random().toString(36).substring(2);
      const optItem: InventoryItem = { id: optId, name: itemText, qty: q, unit: u, category: c, status: getExpiryStatus(ex), emoji: suggestedEmoji, expiry: ex ? new Date(ex).toLocaleDateString() : 'N/A', rawExpiry: ex || null };
      setInventoryData((prev) => [...prev, optItem]);

      const { data, error } = await supabase.from("inventory").insert([py]).select().single();
      if (error) {
        alert("Database failed to save: " + error.message);
        console.error("Insert Error:", error);
        setInventoryData((prev) => prev.filter((i) => i.id !== optId));
        return;
      }
      if (userRes.data.user) {
        await supabase.from("activity_log").insert([{
          user_id: userRes.data.user.id,
          action: "Added",
          item: py.item_name,
          icon: "📦"
        }]);
      }
      if (data) {
        const realItem: InventoryItem = { id: data.id, name: data.item_name, qty: data.quantity || 0, unit: data.unit || 'pieces', category: data.category || "Pantry", status: getExpiryStatus(data.expiry_date), emoji: data.emoji || getEmoji(data.category || "Pantry", data.item_name || ""), expiry: data.expiry_date ? new Date(data.expiry_date).toLocaleDateString() : 'N/A', rawExpiry: data.expiry_date || null };
        setInventoryData((prev) => prev.map((i) => i.id === optId ? realItem : i));
      }
    }
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInventoryData((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("inventory").delete().eq("id", id);
  };

  const filtered = inventoryData
    .filter((i) => activeFilter === "All" || i.category === activeFilter)
    .sort((a, b) => {
      if (!a.rawExpiry && !b.rawExpiry) return 0;
      if (!a.rawExpiry) return 1;
      if (!b.rawExpiry) return -1;
      return new Date(a.rawExpiry).getTime() - new Date(b.rawExpiry).getTime();
    });

  const expiringCount = inventoryData.filter((i) => i.status === "expiring").length;
  const expiredCount = inventoryData.filter((i) => i.status === "expired" || i.status === "none" && false).length;

  return (
    <div>
      {/* Summary Row */}
      <div className={`${styles.summaryRow} animate-fade-in`}>
        <div className="card" style={{ flex: 1, textAlign: "center", padding: "12px" }}>
          <p className="text-2xl" style={{ color: "var(--brand-green)" }}>{inventoryData.length}</p>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>Total Items</p>
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center", padding: "12px", borderColor: expiringCount > 0 ? "rgba(251,191,36,0.3)" : undefined }}>
          <p className="text-2xl" style={{ color: "var(--color-warning)" }}>{expiringCount}</p>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>Expiring</p>
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center", padding: "12px", borderColor: expiredCount > 0 ? "rgba(248,113,113,0.3)" : undefined }}>
          <p className="text-2xl" style={{ color: "var(--color-danger)" }}>{expiredCount}</p>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>Expired</p>
        </div>
      </div>

      {/* Filter */}
      <div className={`${styles.filterRow} animate-fade-in animate-delay-1`}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`chip ${activeFilter === cat ? "active" : ""}`}
            onClick={() => setActiveFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="animate-fade-in animate-delay-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {filtered.map((item) => {
          const actualExpiredCount = inventoryData.filter((i) => i.status === "expired" || i.status === "none" && false).length;
          return (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '12px', borderRadius: '16px', position: 'relative' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '2px' }}>
                  <div style={{ fontSize: '8px', fontWeight: 700, color: '#f3f4f6', backgroundColor: '#374151', padding: '1px 3px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                    {item.expiry === 'N/A' ? 'No Expiry' : item.expiry}
                  </div>
                  {item.status !== "none" && (
                    <span style={{
                      fontSize: '8px',
                      padding: '1px 3px',
                      borderRadius: '3px',
                      backgroundColor: (statusConfig as any)[item.status]?.bg,
                      color: (statusConfig as any)[item.status]?.text,
                      fontWeight: 800,
                      whiteSpace: 'nowrap'
                    }}>
                      {(statusConfig as any)[item.status]?.label}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={(e) => openEditModal(item, e)}
                    style={{ color: 'var(--text-muted)', opacity: 0.8, padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => deleteItem(item.id, e)}
                    style={{ color: 'var(--color-danger)', opacity: 0.8, padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, gap: '4px', marginBottom: '16px' }}>
                <div style={{ fontSize: '36px', marginBottom: '2px' }}>{item.emoji}</div>
                <span style={{ fontWeight: 600, fontSize: '15px', lineHeight: 1.2 }}>{item.name}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.qty} {item.unit}</span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); deleteItem(item.id, e); }}
                style={{ background: 'linear-gradient(135deg, var(--brand-secondary), var(--brand-primary))', color: '#ffffff', border: 'none', width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(var(--brand-shadow-rgb), 0.3)' }}
              >
                Cooked
              </button>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button */}
      <button
        className="btn btn-primary animate-fade-in animate-delay-3"
        style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 24px)',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          padding: 0,
          boxShadow: '0 8px 24px rgba(var(--brand-shadow-rgb), 0.5)',
          zIndex: 100
        }}
        onClick={() => {
          setEditingItemId(null);
          setNewItemName("");
          setNewQty(1);
          setNewUnit("pieces");
          setNewCategory("Pantry");
          setNewExpiry("");
          setIsModalOpen(true);
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Add Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="text-2xl">{editingItemId ? "Edit Inventory" : "Add Inventory"}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingItemId(null); }} style={{ padding: '8px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="input-wrapper">
              <input
                autoFocus
                className="input"
                placeholder="Item name (e.g. Milk)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveItem()}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <button onClick={() => setNewQty(Math.max(1, newQty - 1))} style={{ padding: '14px 16px', fontSize: '1.2rem', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>−</button>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{newQty}</span>
                <button onClick={() => setNewQty(newQty + 1)} style={{ padding: '14px 16px', fontSize: '1.2rem', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>+</button>
              </div>
              <CustomSelect value={newUnit} onChange={setNewUnit} options={units} />
            </div>

            <CustomSelect value={newCategory} onChange={setNewCategory} options={addCategories} />

            <CustomDatePicker value={newExpiry} onChange={setNewExpiry} />

            <button className="btn btn-primary w-full mt-sm" style={{ padding: '16px', fontSize: '1.05rem', cursor: 'pointer' }} onClick={saveItem}>
              {editingItemId ? "Save Changes" : "Add to Inventory"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
