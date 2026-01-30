import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { supabase } from "../../src/lib/supabase"

import OverviewTab from "../../components/dashboard/Overview"
import CalendarTab from "../../components/dashboard/Calendar"

/* =========================
   THEME COLORS
========================= */
const COLORS = {
  primary: "#1b2a41",   // deep navy (header)
  accent: "#ff6b6b",    // coral
  bg: "#F3F4F6",        // app background
  tabBg: "#E5E7EB",
  muted: "#6B7280",
  white: "#FFFFFF",
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<"manager" | "employee">("employee")
  const [tab, setTab] = useState<"overview" | "calendar">("overview")

  /* --------------------------------------------------
     LOAD USER ROLE
  -------------------------------------------------- */
  useEffect(() => {
    async function loadRole() {
      const { data: auth } = await supabase.auth.getUser()

      if (!auth?.user) {
        setRole("employee")
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .single()

      setRole(data?.role === "manager" ? "manager" : "employee")
      setLoading(false)
    }

    loadRole()
  }, [])

  /* --------------------------------------------------
     LOADING STATE
  -------------------------------------------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>DataClad</Text>
      </View>

      {/* CURVED CONTENT CARD */}
      <View style={styles.contentCard}>
        {/* TAB SELECTOR */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === "overview" && styles.activeTab]}
            onPress={() => setTab("overview")}
          >
            <Text
              style={tab === "overview" ? styles.activeText : styles.text}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, tab === "calendar" && styles.activeTab]}
            onPress={() => setTab("calendar")}
          >
            <Text
              style={tab === "calendar" ? styles.activeText : styles.text}
            >
              Calendar
            </Text>
          </TouchableOpacity>
        </View>

        {/* SCREEN CONTENT */}
        <View style={{ flex: 1 }}>
          {tab === "overview" ? (
            <OverviewTab role={role} />
          ) : (
            <CalendarTab role={role} />
          )}
        </View>
      </View>
    </View>
  )
}

/* --------------------------------------------------
   STYLES
-------------------------------------------------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primary, // header background
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* HEADER */
  header: {
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 1,
  },

  /* CURVED CONTENT AREA */
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 16,
    overflow: "hidden", // 🔑 makes the curve work
  },

  /* TABS */
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.tabBg,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    padding: 4,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },

  activeTab: {
    backgroundColor: COLORS.white,
  },

  text: {
    color: COLORS.muted,
    fontWeight: "600",
  },

  activeText: {
    color: COLORS.accent,
    fontWeight: "700",
  },
})
