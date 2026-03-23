"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!user || !profile) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        <p className="text-muted animate-pulse">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Profile Info Card */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, var(--brand-secondary), var(--brand-primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "#fff", fontWeight: "bold", textTransform: "uppercase" }}>
          {profile.username ? profile.username.charAt(0) : "!"}
        </div>
        <div>
          <h2 className="text-xl" style={{ fontWeight: 700 }}>{profile.username}</h2>
          <p className="text-muted text-sm" style={{ marginTop: 2 }}>{user.email}</p>
        </div>
      </div>

      {/* Action Area */}
      <div className="card">
        <button onClick={handleLogout} className="btn btn-danger w-full">
          Log Out
        </button>
      </div>
    </div>
  );
}
