"use client";

import { useState, useEffect } from "react";
import styles from "./recipes.module.css";
import { supabase } from "@/lib/supabase";
import { getEmoji } from "@/lib/emoji";

type Recipe = {
  id: string;
  name: string;
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  ingredients: string[];
  rawIngredients?: { item_name: string; qty_required: number; unit: string; is_countable: boolean }[];
  instructions?: string;
  emoji: string;
  match: number;
};

const difficultyColors = {
  Easy: "badge-green",
  Medium: "badge-yellow",
  Hard: "badge-red",
};

const filters = ["All", "Easy", "Medium", "Hard"];
const addCategories = ["Supermarket", "Produce", "Meat", "Bakery", "Pantry", "Others"];
const units = ["pieces", "packs", "bottles", "rolls", "others"];

function CustomSelect({ value, onChange, options }: { value: string; onChange: (val: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", flex: 1, width: "100%" }} tabIndex={0} onBlur={() => setOpen(false)}>
      <div
        style={{ minHeight: "50px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: "16px" }}
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

export default function RecipesPage() {
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [ingredientAnalysis, setIngredientAnalysis] = useState<Record<string, "sufficient" | "check" | "missing" | "yes" | "no" | "partial"> | null>(null);
  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [importUrlStr, setImportUrlStr] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const [showCartModal, setShowCartModal] = useState(false);
  const [cartItemName, setCartItemName] = useState("");
  const [cartItemQty, setCartItemQty] = useState<number | string>(1);
  const [cartItemUnit, setCartItemUnit] = useState("pieces");
  const [cartItemCategory, setCartItemCategory] = useState("Pantry");

  const [showCookedModal, setShowCookedModal] = useState(false);
  const [usageMap, setUsageMap] = useState<Record<number, { qty: number | string, finished: boolean }>>({});
  const [isDeducting, setIsDeducting] = useState(false);
  const [deductSuccess, setDeductSuccess] = useState(false);

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [mTitle, setMTitle] = useState("");
  const [mTime, setMTime] = useState("30 min");
  const [mDifficulty, setMDifficulty] = useState("Medium");
  const [mInstructions, setMInstructions] = useState("");
  const [mIngredients, setMIngredients] = useState<{ name: string, qty: string, unit: string }[]>([{ name: "", qty: "1", unit: "piece" }]);

  const handleImport = async () => {
    if (!importUrlStr.trim()) return;
    setIsImporting(true);

    try {
      const response = await fetch('https://n8n.ivangan.my/webhook/analyze_recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrlStr.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Success!", responseData);

      const recipeData = Array.isArray(responseData) ? responseData[0] : responseData;
      if (!recipeData) throw new Error("Empty response from AI");

      setMTitle(recipeData.recipe_name || recipeData.title || recipeData.name || "");

      const pTime = recipeData.prep_time_minutes ? `${recipeData.prep_time_minutes} min` : (recipeData.time || recipeData.prep_time || "30 min");
      setMTime(String(pTime));

      setMDifficulty(recipeData.difficulty || "Medium");

      let instr = "";
      if (Array.isArray(recipeData.instructions)) {
        instr = recipeData.instructions.map((step: string, idx: number) => `${idx + 1}. ${step}`).join('\n\n');
      } else {
        instr = recipeData.instructions || recipeData.description || "";
      }
      setMInstructions(instr);

      if (recipeData.ingredients && Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0) {
        const parsedIngs = recipeData.ingredients.map((i: any) => {
          if (typeof i === 'string') return { name: i, qty: "1", unit: "piece" };
          return {
            name: i.name || i.item_name || i.ingredient || "",
            qty: String(i.qty_required || i.qty || i.quantity || i.amount || "1"),
            unit: i.unit || "piece"
          };
        });
        setMIngredients(parsedIngs);
      }

      setShowImportUrl(false);
      setImportUrlStr("");
      setShowManualEntry(true);

    } catch (error) {
      console.error("The Alchemist failed!", error);
      alert("AI Extraction failed. Ensure your n8n workflow is active and returning exact JSON mappings.");
    } finally {
      setIsImporting(false);
    }
  };

  const saveManualRecipe = async () => {
    if (!mTitle.trim() || mIngredients.length === 0 || mIngredients.some(i => !i.name.trim())) {
      alert("Please fill all ingredient names and the recipe title.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Parse time string to INT4
    let parsedTime = parseInt(String(mTime).replace(/[^\d]/g, ''), 10);
    if (isNaN(parsedTime)) parsedTime = 30;

    // Parse instructions block into a JSONB array
    const instrArray = mInstructions.split('\n').map(s => s.trim()).filter(Boolean);

    // 1. Upsert Recipe
    const rPayload = {
      title: mTitle.trim(),
      prep_time_minutes: parsedTime,
      difficulty: mDifficulty,
      instructions: instrArray
    } as any;

    if (user) rPayload.user_id = user.id;

    let activeRecipeId = editingRecipeId;

    if (editingRecipeId) {
      const { error: updateErr } = await supabase.from("recipes").update(rPayload).eq("id", editingRecipeId);
      if (updateErr) {
        alert("Failed to update recipe: " + updateErr.message);
        return;
      }
      // Wipe old ingredients for clean replacement
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", editingRecipeId);
    } else {
      const { data: recData, error: recErr } = await supabase.from("recipes").insert([rPayload]).select().single();
      if (recErr) {
        alert("Failed to save recipe: " + recErr.message);
        return;
      }
      activeRecipeId = recData.id;
    }

    // 2. Insert Ingredients
    if (activeRecipeId && mIngredients.length > 0) {
      const pPayloads = mIngredients.filter(i => i.name.trim() !== "").map(i => ({
        recipe_id: activeRecipeId,
        item_name: i.name.trim().toLowerCase(),
        qty_required: Number(i.qty) || 1,
        unit: i.unit,
        category: "Pantry",
        is_countable: ["pcs", "piece", "pieces", "packs"].includes(i.unit.toLowerCase())
      }));

      if (pPayloads.length > 0) {
        const { error: ingErr } = await supabase.from("recipe_ingredients").insert(pPayloads);
        if (ingErr) console.error("Ingredients error:", ingErr);
      }
    }

    setEditingRecipeId(null);
    setMTitle("");
    setMTime("30 min");
    setMDifficulty("Medium");
    setMInstructions("");
    setMIngredients([{ name: "", qty: "1", unit: "piece" }]);
    setShowManualEntry(false);
    fetchRecipes();
  };

  const handleCheckIngredients = async (recipe: Recipe) => {
    setCheckStatus("checking");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to check ingredients against your inventory.");
        setCheckStatus("error");
        return;
      }

      const payload = {
        user_id: user.id,
        recipe_id: recipe.id,
        needed_ingredients: recipe.rawIngredients || []
      };

      const response = await fetch('https://n8n.ivangan.my/webhook/check-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Check Inventory Success!", responseData);

      let statusMap: Record<string, "sufficient" | "check" | "missing"> = {};
      const items = Array.isArray(responseData) ? responseData : (responseData.needed_ingredients || responseData.results || responseData.data || []);

      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          if (item && item.item_name && item.status) {
            statusMap[item.item_name.toLowerCase()] = item.status.toLowerCase();
          }
        });
      } else if (typeof responseData === 'object' && responseData !== null) {
        Object.entries(responseData).forEach(([k, v]: [string, any]) => {
          if (typeof v === 'string') statusMap[k.toLowerCase()] = v.toLowerCase() as any;
          else if (v && v.status) statusMap[k.toLowerCase()] = v.status.toLowerCase() as any;
        });
      }

      setIngredientAnalysis(statusMap);
      setCheckStatus("success");
      setTimeout(() => setCheckStatus("idle"), 3000);

    } catch (error) {
      console.error("Check ingredients failed!", error);
      setCheckStatus("error");
      setTimeout(() => setCheckStatus("idle"), 3000);
    }
  };

  const deleteRecipe = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecipes(prev => prev.filter(r => r.id !== id));
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
    await supabase.from("recipes").delete().eq("id", id);
  };

  const addToGroceryList = (rawIng: any) => {
    if (!rawIng) return;
    setCartItemName(rawIng.item_name || "");
    setCartItemQty(typeof rawIng.qty_required === 'number' ? rawIng.qty_required : 1);
    setCartItemUnit(rawIng.unit || "pieces");
    setCartItemCategory("Pantry");
    setShowCartModal(true);
  };

  const confirmAddToCart = async () => {
    if (!cartItemName.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const py = {
        item_name: cartItemName.trim(),
        quantity: Number(cartItemQty) || 1,
        unit: cartItemUnit,
        category: cartItemCategory,
        status: "pending"
      } as any;
      if (user) py.user_id = user.id;

      const { error } = await supabase.from("grocery_list").insert([py]);
      if (error) throw error;

      if (user) {
        await supabase.from("activity_log").insert([{
          user_id: user.id,
          action: "Added to list",
          item: py.item_name,
          icon: "🛒"
        }]);
      }

      alert(`Added ${cartItemName} to Groceries!`);
      setShowCartModal(false);
    } catch (err: any) {
      alert("Failed to add to groceries: " + err.message);
    }
  };

  const openCookedModal = () => {
    if (!selected || !selected.rawIngredients) return;
    const initialMap: Record<number, { qty: number | string, finished: boolean }> = {};
    selected.rawIngredients.forEach((ing, i) => {
      initialMap[i] = {
        qty: ing.is_countable ? (ing.qty_required || 1) : "",
        finished: false
      };
    });
    setUsageMap(initialMap);
    setShowCookedModal(true);
  };

  const confirmCookedDeductions = async () => {
    if (!selected || !selected.rawIngredients) return;
    setIsDeducting(true);
    try {
      for (let i = 0; i < selected.rawIngredients.length; i++) {
        const rawIng = selected.rawIngredients[i];
        const usage = usageMap[i];
        if (!usage) continue;

        const { data: invMatches } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("item_name", rawIng.item_name)
          .order("created_at", { ascending: true });

        if (!invMatches || invMatches.length === 0) continue;

        if (rawIng.is_countable) {
          let remainingToDeduct = Number(usage.qty) || 0;
          if (remainingToDeduct <= 0) continue;

          for (const match of invMatches) {
            if (remainingToDeduct <= 0) break;
            const currentQty = match.quantity || 0;

            if (currentQty <= remainingToDeduct) {
              await supabase.from("inventory").delete().eq("id", match.id);
              remainingToDeduct -= currentQty;
            } else {
              await supabase.from("inventory").update({ quantity: currentQty - remainingToDeduct }).eq("id", match.id);
              remainingToDeduct = 0;
            }
          }
        } else {
          if (usage.finished) {
            for (const match of invMatches) {
              await supabase.from("inventory").delete().eq("id", match.id);
            }
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("activity_log").insert([{
          user_id: user.id,
          action: "Cooked",
          item: selected.name,
          icon: "🍳"
        }]);
      }

      setDeductSuccess(true);
      setTimeout(() => {
        setDeductSuccess(false);
        setShowCookedModal(false);
        setSelected(null);
      }, 1500);

    } catch (err: any) {
      alert("Error updating inventory: " + err.message);
    } finally {
      setIsDeducting(false);
    }
  };

  const openEditModal = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRecipeId(recipe.id);
    setMTitle(recipe.name);
    setMTime(recipe.time);
    setMDifficulty(recipe.difficulty);
    setMInstructions(recipe.instructions || "");

    if (recipe.rawIngredients && recipe.rawIngredients.length > 0) {
      setMIngredients(recipe.rawIngredients.map(ing => ({
        name: ing.item_name,
        qty: String(ing.qty_required),
        unit: ing.unit
      })));
    } else {
      setMIngredients([{ name: "", qty: "1", unit: "piece" }]);
    }
    setShowManualEntry(true);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    const { data } = await supabase.from("recipes").select("*, recipe_ingredients(*)").order("created_at", { ascending: true });
    if (data) {
      const mapped: Recipe[] = data.map((d: any) => ({
        id: d.id,
        name: d.title || d.name || "Unknown Recipe",
        time: d.prep_time_minutes ? `${d.prep_time_minutes} min` : "30 min",
        difficulty: d.difficulty || "Medium",
        ingredients: d.recipe_ingredients ? d.recipe_ingredients.map((i: any) => `${i.qty_required || ''} ${i.unit || ''} ${i.item_name}`.trim()) : [],
        rawIngredients: d.recipe_ingredients ? d.recipe_ingredients.map((i: any) => ({ item_name: i.item_name, qty_required: i.qty_required, unit: i.unit, is_countable: i.is_countable || false })) : [],
        instructions: Array.isArray(d.instructions) ? d.instructions.join('\n\n') : (d.instructions || ""),
        emoji: getEmoji("Recipe", d.title || d.name || ""),
        match: 100
      }));
      setRecipes(mapped);
    }
  };

  const filtered = recipes
    .filter((r) => filter === "All" || r.difficulty === filter)
    .sort((a, b) => b.match - a.match);

  return (
    <div>


      {/* Filter */}
      <div className={`${styles.filterRow} animate-fade-in animate-delay-1`}>
        {filters.map((f) => (
          <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Recipe Cards */}
      <div className={`${styles.recipeList} animate-fade-in animate-delay-2`}>
        {filtered.map((recipe) => (
          <div key={recipe.id} className={`card ${styles.recipeCard}`} onClick={() => setSelected(recipe)} style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px', zIndex: 10 }}>
              <button onClick={(e) => openEditModal(recipe, e)} style={{ color: 'var(--text-muted)', opacity: 0.8, padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
              </button>
              <button onClick={(e) => deleteRecipe(recipe.id, e)} style={{ color: 'var(--color-danger)', opacity: 0.8, padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
            <div className={styles.recipeTop}>
              <span className={styles.recipeEmoji}>{recipe.emoji}</span>
              <div className={styles.recipeInfo} style={{ paddingRight: '48px' }}>
                <p className={styles.recipeName}>{recipe.name}</p>
                <div className="flex items-center gap-sm" style={{ flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#f3f4f6', backgroundColor: '#374151', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{recipe.difficulty}</span>
                  <span className="text-xs text-muted" style={{ fontWeight: 600 }}>⏱ {recipe.time}</span>
                </div>
              </div>
            </div>
            {/* Ingredient match bar */}
            <div className={styles.matchRow}>
              <span className="text-xs text-muted">Ingredients match</span>
              <span className="text-xs text-green" style={{ fontWeight: 700 }}>{recipe.match}%</span>
            </div>
            <div className={styles.matchBar}>
              <div className={styles.matchFill} style={{ width: `${recipe.match}%`, opacity: recipe.match === 100 ? 1 : 0.7 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className={styles.modalOverlay} onClick={() => { setSelected(null); setCheckStatus("idle"); setIngredientAnalysis(null); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span style={{ fontSize: "2.5rem" }}>{selected.emoji}</span>
              <button className={styles.closeBtn} onClick={() => { setSelected(null); setCheckStatus("idle"); setIngredientAnalysis(null); }}>✕</button>
            </div>
            <h2 className={styles.modalTitle}>{selected.name}</h2>
            <div className="flex gap-sm" style={{ marginTop: 8, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#f3f4f6', backgroundColor: '#374151', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{selected.difficulty}</span>
              <span className="text-sm text-muted" style={{ fontWeight: 600 }}>⏱ {selected.time}</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Ingredients</p>
            {selected.ingredients.map((ing, idx) => {
              const rawIng = selected.rawIngredients?.[idx];
              const nameKey = rawIng ? rawIng.item_name.toLowerCase() : "";
              const status = ingredientAnalysis && ingredientAnalysis[nameKey] ? ingredientAnalysis[nameKey] : null;

              const isSufficient = status === 'sufficient' || status === 'yes';
              const isMissing = status === 'missing' || status === 'no';
              const isCheck = status === 'check' || status === 'partial';

              return (
                <div key={idx} className={styles.ingredientRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={isMissing ? "text-red" : isCheck ? "text-yellow" : "text-green"}>
                      {isMissing ? "⛔" : isCheck ? "!" : "✅"}
                    </span>
                    <span style={{ fontSize: "0.9rem" }}>{ing}</span>
                  </div>

                  {status && isMissing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => addToGroceryList(rawIng)}
                        style={{ background: 'var(--bg-elevated)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--brand-primary)', flexShrink: 0 }}
                        title="Add to Grocery List"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {Boolean(selected.instructions) && (
              <>
                <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 8 }}>Instructions</p>
                <div style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-primary)", whiteSpace: 'pre-wrap' }}>
                  {selected.instructions}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: 20 }}>
              <button
                className="btn"
                style={{ flex: 1, padding: '12px 8px', fontSize: '13px', textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.2, backgroundColor: '#ffffff', color: 'var(--brand-primary)', boxShadow: '0 4px 15px rgba(255,255,255,0.1)' }}
                onClick={() => handleCheckIngredients(selected)}
                disabled={checkStatus === "checking"}
              >
                {checkStatus === "checking" ? "⏳ Sending..." : checkStatus === "success" ? "✅ Checked!" : checkStatus === "error" ? "❌ Failed" : "📝 Check Ingredients"}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px 8px', fontSize: '14px', textAlign: 'center' }}
                onClick={openCookedModal}
              >
                🍳 Cooked
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import URL Modal */}
      {showImportUrl && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="text-2xl">Import Recipe</h2>
              <button
                onClick={() => { setShowImportUrl(false); setImportUrlStr(""); }}
                style={{ padding: '8px', color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <p className="text-sm text-muted" style={{ lineHeight: 1.5 }}>
              Paste a recipe URL from any website. We will automatically extract the ingredients, instructions, and cooking time!
            </p>

            <div className="input-wrapper">
              <input
                autoFocus
                className="input"
                placeholder="https://example.com/recipe"
                value={importUrlStr}
                onChange={(e) => setImportUrlStr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && importUrlStr.trim() !== "") {
                    handleImport();
                  }
                }}
              />
            </div>

            <button
              className="btn btn-primary w-full"
              disabled={isImporting || !importUrlStr.trim()}
              onClick={handleImport}
              style={{ padding: '14px', fontSize: '15px', display: 'flex', justifyContent: 'center' }}
            >
              {isImporting ? <span style={{ opacity: 0.8 }}>⚡ AI Analyzing...</span> : "Extract Recipe"}
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', maxHeight: '85vh', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="text-2xl">{editingRecipeId ? "Edit Recipe" : "Manual Recipe"}</h2>
              <button
                onClick={() => { setShowManualEntry(false); setEditingRecipeId(null); }}
                style={{ padding: '8px', color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="input-wrapper">
              <input className="input" placeholder="Recipe Title (e.g. Pasta)" value={mTitle} onChange={(e) => setMTitle(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '8px', zIndex: 200, position: 'relative' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CustomSelect value={mDifficulty} onChange={setMDifficulty} options={["Easy", "Medium", "Hard"]} />
              </div>
              <div className="input-wrapper" style={{ flex: 1, minWidth: 0, minHeight: "50px" }}>
                <input className="input" placeholder="Time" value={mTime} onChange={(e) => setMTime(e.target.value)} style={{ minWidth: 0 }} />
              </div>
            </div>

            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', textTransform: 'uppercase' }}>Ingredients</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mIngredients.map((ing, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                  <input className="input" style={{ flex: 2.5, padding: '10px', minWidth: 0 }} placeholder="Name" value={ing.name} onChange={(e) => setMIngredients(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))} />
                  <input className="input" style={{ flex: 1, padding: '10px', minWidth: 0, textAlign: 'center' }} placeholder="Qty" value={ing.qty} onChange={(e) => setMIngredients(prev => prev.map((p, i) => i === idx ? { ...p, qty: e.target.value } : p))} />
                  <input className="input" style={{ flex: 2, padding: '10px', minWidth: 0, textAlign: 'center' }} placeholder="Unit" value={ing.unit} onChange={(e) => setMIngredients(prev => prev.map((p, i) => i === idx ? { ...p, unit: e.target.value } : p))} />
                  <button onClick={() => setMIngredients(prev => prev.filter((_, i) => i !== idx))} style={{ color: 'var(--color-danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setMIngredients(prev => [...prev, { name: "", qty: "1", unit: "piece" }])}
              style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px dashed var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
            >
              + Add Ingredient
            </button>

            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', textTransform: 'uppercase' }}>Instructions</p>
            <div className="input-wrapper">
              <textarea
                className="input"
                placeholder="Step 1: Boil water..."
                value={mInstructions}
                onChange={(e) => setMInstructions(e.target.value)}
                style={{ minHeight: '80px', resize: 'vertical', paddingTop: '12px', lineHeight: 1.5 }}
              />
            </div>

            <button className="btn btn-primary w-full mt-sm" style={{ padding: '14px', fontSize: '15px' }} onClick={saveManualRecipe}>
              Save Recipe
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Menu */}
      <div style={{ position: 'fixed', bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 24px)', right: '24px', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>

        {/* The expanded menu items */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', marginBottom: '8px',
          opacity: showFabMenu ? 1 : 0,
          transform: showFabMenu ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          pointerEvents: showFabMenu ? 'auto' : 'none'
        }}>
          <button
            className="card"
            style={{ padding: '12px 20px', borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontWeight: 700, fontSize: '15px', cursor: 'pointer', background: '#ffffff', color: '#000000' }}
            onClick={() => { setShowFabMenu(false); setShowImportUrl(true); }}
          >
            Import URL
          </button>
          <button
            className="card"
            style={{ padding: '12px 20px', borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontWeight: 700, fontSize: '15px', cursor: 'pointer', background: '#ffffff', color: '#000000' }}
            onClick={() => { setShowFabMenu(false); setEditingRecipeId(null); setShowManualEntry(true); }}
          >
            Manual Entry
          </button>
        </div>

        {/* The main FAB */}
        <button
          className="btn btn-primary animate-fade-in animate-delay-3"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            padding: 0,
            boxShadow: '0 8px 24px rgba(var(--brand-shadow-rgb), 0.5)',
            transform: showFabMenu ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onClick={() => setShowFabMenu(!showFabMenu)}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Add to Grocery Modal */}
      {showCartModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCartModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="text-2xl">Add to Groceries</h2>
              <button className={styles.closeBtn} onClick={() => setShowCartModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="input-wrapper">
                <input className="input" placeholder="Item Name" value={cartItemName} onChange={(e) => setCartItemName(e.target.value)} autoFocus />
              </div>

              <div style={{ display: 'flex', gap: '12px', zIndex: 300, position: 'relative' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => setCartItemQty(Math.max(1, Number(cartItemQty) - 1))} style={{ padding: '14px 16px', fontSize: '1.2rem', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>−</button>
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{cartItemQty}</span>
                  <button onClick={() => setCartItemQty(Number(cartItemQty) + 1)} style={{ padding: '14px 16px', fontSize: '1.2rem', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>+</button>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <CustomSelect value={cartItemUnit} onChange={setCartItemUnit} options={units} />
                </div>
              </div>

              <div style={{ zIndex: 200, position: 'relative' }}>
                <CustomSelect value={cartItemCategory} onChange={setCartItemCategory} options={addCategories} />
              </div>

              <button
                className="btn btn-primary w-full"
                style={{ marginTop: '8px', padding: '14px', fontSize: '16px' }}
                onClick={confirmAddToCart}
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cooked Deduction Modal */}
      {showCookedModal && selected && (
        <div className={styles.modalOverlay} onClick={() => !isDeducting && setShowCookedModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="text-2xl">Confirm Ingredients Used</h2>
              {!isDeducting && <button className={styles.closeBtn} onClick={() => setShowCookedModal(false)}>✕</button>}
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Adjust the amounts you actually used so we can update your inventory.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
              {selected.rawIngredients?.map((ing, idx) => {
                const myUsage = usageMap[idx];
                if (!myUsage) return null;

                return (
                  <div key={idx} className="card" style={{ padding: '12px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ing.item_name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recipe: {ing.qty_required} {ing.unit}</span>
                    </div>

                    {ing.is_countable ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Amount Used:</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', minWidth: '100px' }}>
                          <button
                            onClick={() => setUsageMap(prev => {
                              const cur = Number(prev[idx].qty) || 0;
                              return { ...prev, [idx]: { ...prev[idx], qty: Math.max(0, cur - 1) } };
                            })}
                            style={{ padding: '6px 12px', fontSize: '1.2rem', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            −
                          </button>
                          <span style={{ fontWeight: 600, fontSize: '1.05rem', minWidth: '24px', textAlign: 'center' }}>
                            {myUsage.qty}
                          </span>
                          <button
                            onClick={() => setUsageMap(prev => {
                              const cur = Number(prev[idx].qty) || 0;
                              return { ...prev, [idx]: { ...prev[idx], qty: cur + 1 } };
                            })}
                            style={{ padding: '6px 12px', fontSize: '1.2rem', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            +
                          </button>
                        </div>
                        <span style={{ fontSize: '0.85rem', width: '40px' }}>{ing.unit}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Finished all of this ingredient?</span>
                        <div
                          onClick={() => setUsageMap(prev => ({ ...prev, [idx]: { ...prev[idx], finished: !myUsage.finished } }))}
                          style={{
                            width: '26px', height: '26px', borderRadius: '6px',
                            background: myUsage.finished ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
                            border: myUsage.finished ? 'none' : '1px solid var(--border-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'
                          }}
                        >
                          {myUsage.finished && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-primary w-full"
              style={{
                marginTop: '24px', padding: '14px', fontSize: '16px',
                opacity: isDeducting ? 0.7 : 1,
                backgroundColor: deductSuccess ? 'var(--color-success)' : undefined,
                color: deductSuccess ? '#ffffff' : undefined,
                border: deductSuccess ? 'none' : undefined,
                transition: 'all 0.3s ease'
              }}
              onClick={confirmCookedDeductions}
              disabled={isDeducting || deductSuccess}
            >
              {deductSuccess ? "✅ Updated!" : isDeducting ? "⏳ Updating Inventory..." : "Confirm Deductions"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
