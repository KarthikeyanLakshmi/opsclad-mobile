import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import OverviewTab from "./Overview";
import CalendarTab from "./Calendar";

/* ---------------- TYPES ---------------- */

type Role = "manager" | "employee";

type Props = {
  role: Role;
};

/* ---------------- THEME ---------------- */

const COLORS = {
  primary: "#1b2a41", // navy
  accent: "#ff6b6b",  // coral
  bg: "#E5E7EB",
  card: "#FFFFFF",
  textMuted: "#6B7280",
};

/* ---------------- COMPONENT ---------------- */

export default function HomeTabs({ role }: Props) {
  const [tab, setTab] = useState<"overview" | "calendar">("overview");

  return (
    <View style={{ flex: 1 }}>
      {/* TAB SWITCH */}
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

      {/* CONTENT */}
      {tab === "overview" ? (
        <OverviewTab role={role} />
      ) : (
        <CalendarTab role={role} />
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    marginHorizontal: 16,
    marginTop: 8,       // tight under header
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
    backgroundColor: COLORS.card,
  },

  text: {
    color: COLORS.textMuted,
    fontWeight: "600",
  },

  activeText: {
    color: COLORS.accent,
    fontWeight: "700",
  },
});
