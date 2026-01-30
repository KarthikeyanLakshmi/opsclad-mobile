import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";

/* =========================
   THEME COLORS
========================= */
const COLORS = {
  primary: "#1b2a41",   // deep navy
  accent: "#ff6b6b",    // coral
  bg: "#F3F4F6",
  card: "#ffffff",
  textDark: "#1F2937",
  textMuted: "#374151",
};

export default function ProfileScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const userId = authData.user.id;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: employeeData } = await supabase
        .from("employees")
        .select("birthday")
        .eq("employee_id", profileData.employee_id)
        .maybeSingle();

      setProfile({
        ...profileData,
        birthday: employeeData?.birthday ?? null,
      });

      if (roleData) setRole(roleData.role);
    } catch (err) {
      console.log("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatBirthday(dateString?: string | null) {
    if (!dateString) return "Not provided";

    return new Date(dateString).toLocaleDateString("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  useEffect(() => {
    loadProfile();
  }, []);

  /* -------------------------
     LOADING STATE
  ------------------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18, color: COLORS.textDark }}>
          No profile found
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER WITH BACK BUTTON */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* NAME */}
      <Text style={styles.nameHeader}>{profile.username}</Text>

      {/* PROFILE CARD */}
      <View style={styles.card}>
        <Text style={styles.label}>
          Email: <Text style={styles.value}>{profile.email}</Text>
        </Text>

        <Text style={styles.label}>
          Employee ID:{" "}
          <Text style={styles.value}>{profile.employee_id}</Text>
        </Text>

        <Text style={styles.label}>
          Birthday:{" "}
          <Text style={styles.value}>
            {formatBirthday(profile.birthday)}
          </Text>
        </Text>

        <Text style={styles.label}>
          Role: <Text style={styles.value}>{role}</Text>
        </Text>
      </View>
    </View>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    padding: 25,
    paddingTop: 50,
    backgroundColor: COLORS.bg,
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },

  nameHeader: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 25,
    textAlign: "center",
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 25,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  label: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
    color: COLORS.textMuted,
  },

  value: {
    fontWeight: "400",
    color: COLORS.textDark,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
});
