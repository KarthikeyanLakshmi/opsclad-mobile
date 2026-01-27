import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import OverviewTab from "./Overview";
import CalendarTab from "./Calendar";

/* ---------------- TYPES ---------------- */

type Role = "manager" | "employee";

type Props = {
  role: Role;
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
    backgroundColor: "#fff",
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
