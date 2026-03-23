"use client";

import { useState, useEffect } from "react";
import styles from "./groceries.module.css";
import { supabase } from "@/lib/supabase";
import { getEmoji } from "@/lib/emoji";

type GroceryItem = {
  id: string;
  name: string;
  qty: string;
  rawQty?: number;
  rawUnit?: string;
  checked: boolean;
  category: string;
};

const categories = ["All", "Supermarket", "Produce", "Meat", "Bakery", "Pantry", "Others"];
const addCategories = ["Supermarket", "Produce", "Meat", "Bakery", "Pantry", "Others"];
const units = ["pieces", "packs", "bottles", "rolls", "others"];

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

export default function GroceriesPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [filter, setFilter] = useState("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState("piece");
  const [newCategory, setNewCategory] = useState("Pantry");

  useEffect(() => {
    fetchGroceries();
  }, []);

  const fetchGroceries = async () => {
    const { data } = await supabase.from("grocery_list").select("*").order("created_at", { ascending: true });
    if (data) {
      const mapped = data.map((d: any) => ({
        id: d.id,
        name: d.item_name,
        qty: `${d.quantity || 1} ${d.unit || ''}`.trim(),
        rawQty: d.quantity || 1,
        rawUnit: d.unit || 'pieces',
        checked: d.status === 'bought',
        category: d.category || "Pantry"
      }));
      setItems(mapped);
    }
  };

  const toggle = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const newChecked = !item.checked;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: newChecked } : i)));

    const { error: updateError } = await supabase.from("grocery_list").update({ status: newChecked ? 'bought' : 'pending' }).eq("id", id);
    
    let syncError = null;
    if (newChecked) {
      const sessionRes = await supabase.auth.getSession();
      const userId = sessionRes.data.session?.user.id;
      
      const py = { 
        item_name: item.name, 
        quantity: Number(item.rawQty) || 1, 
        unit: item.rawUnit || 'pieces', 
        category: item.category,
        emoji: getEmoji(item.category, item.name),
        is_countable: ["pcs", "piece", "pieces", "packs"].includes((item.rawUnit || 'pieces').toLowerCase())
      } as any;
      if (userId) py.user_id = userId;

      const { data, error } = await supabase.from("inventory").insert([py]).select().single();
      syncError = error;
      
      if (!error && userId) {
        await supabase.from("activity_log").insert([{
          user_id: userId,
          action: "Bought",
          item: item.name,
          icon: "🛍️"
        }]);
      }

      if (data) {
        fetch("https://n8n.ivangan.my/webhook-test/inventory-item-added", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: data.id,
            item_name: data.item_name
          })
        }).catch(err => console.error("Webhook trigger failed", err));
      }
    } else {
      // Find the most recent inventory match to delete as compensation for accidental tick
      const { data } = await supabase.from("inventory").select("id").eq("item_name", item.name).order("created_at", { ascending: false }).limit(1);
      if (data && data.length > 0) {
        const { error } = await supabase.from("inventory").delete().eq("id", data[0].id);
        syncError = error;
      }
      
      // Also delete the most recent "Bought" activity log for this item
      const sessionRes = await supabase.auth.getSession();
      const userId = sessionRes.data.session?.user.id;
      if (userId) {
        const { data: logData } = await supabase.from("activity_log")
          .select("id")
          .eq("user_id", userId)
          .eq("action", "Bought")
          .eq("item", item.name)
          .order("created_at", { ascending: false })
          .limit(1);
          
        if (logData && logData.length > 0) {
          await supabase.from("activity_log").delete().eq("id", logData[0].id);
        }
      }
    }

    if (updateError || syncError) {
      alert("Failed to sync: " + (updateError?.message || syncError?.message || "Unknown error"));
      console.error("Sync error:", updateError, syncError);
      if (updateError) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !newChecked } : i)));
      }
    }
  };

  const saveItem = async () => {
    if (!newItemName.trim()) return;
    const itemText = newItemName.trim();

    const q = newQty;
    const u = newUnit;
    const c = newCategory;

    // Reset and close modal
    setNewItemName("");
    setNewQty(1);
    setNewUnit("piece");
    setNewCategory("Pantry");
    setIsModalOpen(false);

    if (editingItemId) {
      const id = editingItemId;
      setEditingItemId(null);
      
      setItems((prev) => prev.map(i => i.id === id ? { ...i, name: itemText, qty: `${q} ${u}`.trim(), rawQty: q, rawUnit: u, category: c } : i));
      
      const py = { item_name: itemText, quantity: q, unit: u, category: c };
      const { error } = await supabase.from("grocery_list").update(py).eq("id", id);
      
      if (error) {
        alert("Failed to update item: " + error.message);
        console.error("Update error:", error);
      }
    } else {
      const optId = Date.now().toString() + Math.random().toString(36).substring(2);
      const optItem: GroceryItem = { id: optId, name: itemText, qty: `${q} ${u}`.trim(), rawQty: q, rawUnit: u, checked: false, category: c };
      setItems((prev) => [...prev, optItem]);

      const py = { item_name: itemText, quantity: q, unit: u, status: 'pending', category: c } as any;
      const userRes = await supabase.auth.getUser();
      if (userRes.data.user) py.user_id = userRes.data.user.id;

      const { data, error } = await supabase.from("grocery_list")
        .insert([py])
        .select()
        .single();
        
      if (error) {
        alert("Database failed to save: " + error.message);
        console.error("Insert error:", error);
        setItems((prev) => prev.filter((i) => i.id !== optId));
        return;
      }

      if (userRes.data.user) {
        await supabase.from("activity_log").insert([{
          user_id: userRes.data.user.id,
          action: "Added to list",
          item: py.item_name,
          icon: "🛒"
        }]);
      }

      if (data) {
        const realItem: GroceryItem = {
          id: data.id,
          name: data.item_name,
          qty: `${data.quantity || 1} ${data.unit || ''}`.trim(),
          rawQty: data.quantity || 1,
          rawUnit: data.unit || 'pieces',
          checked: data.status === 'bought',
          category: data.category || "Pantry"
        };
        setItems((prev) => prev.map((i) => i.id === optId ? realItem : i));
      }
    }
  };

  const openEditModal = (item: GroceryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setNewItemName(item.name);
    setNewQty(item.rawQty || 1);
    setNewUnit(item.rawUnit || "piece");
    setNewCategory(item.category || "Pantry");
    setIsModalOpen(true);
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering the toggle event
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("grocery_list").delete().eq("id", id);
  };

  const filtered = items.filter((i) => filter === "All" || i.category === filter);
  const done = items.filter((i) => i.checked).length;

  return (
    <div>
      {/* Progress */}
      <div className={`card animate-fade-in ${styles.progressCard}`}>
        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm" style={{ fontWeight: 600 }}>Shopping Progress</span>
          <span className="badge badge-green">{done}/{items.length} done</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: items.length ? `${(done / items.length) * 100}%` : '0%' }} />
        </div>
      </div>

      {/* Category Filter */}
      <div className={`${styles.filterRow} animate-fade-in animate-delay-1`}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`chip ${filter === cat ? "active" : ""}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className={`${styles.itemsList} animate-fade-in animate-delay-2`}>
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`${styles.groceryItem} ${item.checked ? styles.checked : ""}`}
            onClick={() => toggle(item.id)}
          >
            <div className={`${styles.checkbox} ${item.checked ? styles.checkboxDone : ""}`}>
              {item.checked && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className={styles.itemInfo}>
              <span className={styles.itemName}>{item.name}</span>
              <span className={styles.itemMeta}>{item.qty} · {item.category}</span>
            </div>
            <div style={{ display: 'flex', marginLeft: 'auto', gap: '4px' }}>
              <button
                onClick={(e) => openEditModal(item, e)}
                style={{ color: 'var(--text-muted)', opacity: 0.8, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
              <button
                onClick={(e) => deleteItem(item.id, e)}
                style={{ color: 'var(--color-danger)', opacity: 0.8, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        ))}
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
        onClick={() => setIsModalOpen(true)}
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
              <h2 className="text-2xl">{editingItemId ? "Edit Item" : "Add to List"}</h2>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingItemId(null); }} 
                style={{ padding: '8px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
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

            <div style={{ position: 'relative', zIndex: 900 }}>
              <CustomSelect value={newCategory} onChange={setNewCategory} options={addCategories} />
            </div>

            <button className="btn btn-primary w-full mt-sm" style={{ padding: '16px', fontSize: '1.05rem' }} onClick={saveItem}>
              {editingItemId ? "Save Changes" : "Add to Groceries"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
