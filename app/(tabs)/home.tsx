// app/home/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../src/lib/supabase";

// tabs
import OverviewTab from "../../components/dashboard/Overview";
import CalendarTab from "../../components/dashboard/Calendar";

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"manager" | "employee">("employee");
  const [tab, setTab] = useState<"overview" | "calendar">("overview");

  /* --------------------------------------------------
     LOAD USER ROLE
  -------------------------------------------------- */
  useEffect(() => {
    async function loadRole() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth?.user) {
        setRole("employee");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .single();

      if (!error && data?.role === "manager") {
        setRole("manager");
      } else {
        setRole("employee");
      }

      setLoading(false);
    }

    loadRole();
  }, []);

  /* --------------------------------------------------
     LOADING STATE
  -------------------------------------------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0A1A4F" />
      </View>
    );
  }

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DataClad</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "overview" && styles.activeTab]}
          onPress={() => setTab("overview")}
        >
          <Text style={tab === "overview" ? styles.activeText : styles.text}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === "calendar" && styles.activeTab]}
          onPress={() => setTab("calendar")}
        >
          <Text style={tab === "calendar" ? styles.activeText : styles.text}>
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1 }}>
        {tab === "overview" ? (
          <OverviewTab role={role} />
        ) : (
          <CalendarTab role={role} />
        )}
      </View>
    </View>
  );
}

/* --------------------------------------------------
   STYLES
-------------------------------------------------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#0A1A4F",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 40,
    fontWeight: "700",
    color: "#fff",
  },

  roleText: {
    marginTop: 4,
    fontSize: 13,
    color: "#CBD5E1",
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    margin: 16,
    borderRadius: 20,
    padding: 4,
  },

  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 20,
  },

  activeTab: {
    backgroundColor: "#ffffff",
  },

  text: {
    color: "#6b7280",
    fontWeight: "600",
  },

  activeText: {
    color: "#0A1A4F",
    fontWeight: "700",
  },
});
