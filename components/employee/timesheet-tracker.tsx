import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

/* Internal screens */
import ManualTimesheetEntryScreen from "./timesheet/manual-timesheet";
import EmployeeReportsScreen from "./timesheet/timesheet-list";

export default function EmployeeTimesheets() {
  // ✅ Manual entry is the FIRST and DEFAULT tab
  const [tab, setTab] = useState<"manual" | "reports">("manual");

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Timesheets</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "manual" && styles.activeTab]}
          onPress={() => setTab("manual")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "manual" && styles.activeTabText,
            ]}
          >
            Manual Entry
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === "reports" && styles.activeTab]}
          onPress={() => setTab("reports")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "reports" && styles.activeTabText,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1 }}>
        {tab === "manual" && <ManualTimesheetEntryScreen />}
        {tab === "reports" && <EmployeeReportsScreen />}
      </View>
    </View>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },

  /* ---------- Header ---------- */
  header: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1b2a41",
  },

  /* ---------- Tabs ---------- */
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#1b2a41",
  },

  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },

  activeTabText: {
    color: "#1b2a41",
    fontWeight: "700",
  },
});
