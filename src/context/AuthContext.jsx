import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

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

 const { data: listener } = supabase.auth.onAuthStateChange(
  (_event, session) => {
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setTimeout(async () => {
      const currentProfile = await fetchProfile(currentUser.id);
      setProfile(currentProfile);
      setLoading(false);
    }, 0);
  }
);

    return () => {
      listener.subscription.unsubscribe();
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}