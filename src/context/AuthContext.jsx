import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { AuthContext } from "./authContextInstance";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile fetch error:", error.message);
      return null;
    }

    return data;
  }

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        const currentProfile = await fetchProfile(currentUser.id);
        setProfile(currentProfile);
      }

      setLoading(false);
    }

    loadSession();

    // Refresh permissions when a tab resumes; suspended accounts must not
    // retain a stale active profile in the interface.
    let lastChecked = 0;
    const refreshOnFocus = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastChecked < 5000) return;
      lastChecked = Date.now();
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user;
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        return;
      }
      setUser(currentUser);
      const freshProfile = await fetchProfile(currentUser.id);
      setProfile(freshProfile);
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

 const { data: listener } = supabase.auth.onAuthStateChange(
  (event, session) => {
    // Supabase emits TOKEN_REFRESHED and INITIAL_SESSION when a tab resumes.
    // Those events should not reset form or dashboard state.
    if (event === "TOKEN_REFRESHED") return;
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }
    // Avoid a redundant full profile query on every tab-focus token refresh.
    if (event === "INITIAL_SESSION") return;
    setTimeout(async () => {
      const currentProfile = await fetchProfile(currentUser.id);
      setProfile(currentProfile);
      setLoading(false);
    }, 0);
  }
);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, []);

  async function signUp({ fullName, email, password, role }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) throw error;

    return data;
  }

async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  setUser(data.user);

  const currentProfile = await fetchProfile(data.user.id);
  setProfile(currentProfile);

  return {
    data,
    profile: currentProfile,
  };
}

  async function refreshProfile() {
    if (!user) return null;
    const latest = await fetchProfile(user.id);
    setProfile(latest);
    return latest;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}