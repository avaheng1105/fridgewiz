"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });
      if (error) setAuthError(error.message);
      else alert("Check your email or log in if auto-confirm is enabled.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100dvh", backgroundColor: "var(--bg-base)" }}>
        <p className="text-secondary">Loading FridgeWiz...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-content" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 className="text-3xl" style={{ background: "linear-gradient(135deg, var(--brand-secondary), var(--brand-primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FridgeWiz</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>Your smart kitchen awaits</p>
        </div>
        
        <form onSubmit={handleAuth} className="card animate-fade-in" style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "1rem",
          background: "linear-gradient(145deg, var(--bg-card) 0%, rgba(59, 130, 246, 0.15) 50%, rgba(139, 92, 246, 0.25) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          boxShadow: "0 8px 32px rgba(139, 92, 246, 0.15)"
        }}>
          <h2 className="text-xl">{isRegister ? "Create Account" : "Log In"}</h2>
          
          {authError && <div className="badge badge-red" style={{ padding: "8px 12px", whiteSpace: "normal" }}>{authError}</div>}
          
          <div className="input-wrapper">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          
          {isRegister && (
            <div className="input-wrapper">
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="input" required />
            </div>
          )}
          
          <div className="input-wrapper">
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="input" required minLength={6} />
          </div>
          
          <button type="submit" className="btn btn-primary mt-sm">{isRegister ? "Sign Up" : "Log In"}</button>
          
          <button type="button" onClick={() => { setIsRegister(!isRegister); setAuthError(""); }} className="btn btn-ghost">
            {isRegister ? "Already have an account? Log in" : "Need an account? Sign up"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
