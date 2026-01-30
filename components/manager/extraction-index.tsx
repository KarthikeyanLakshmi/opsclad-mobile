import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Only keep ReportsScreen
import ReportsScreen from "./timesheet-components/reports";

/* ---------------- THEME ---------------- */
const COLORS = {
  primary: "#1b2a41", // navy
  accent: "#ff6b6b",  // coral
  bg: "#f4f4f5",
  card: "#ffffff",
  border: "#e5e7eb",
  text: "#111827",
};

export default function ExtractionIndex() {
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timesheet Reports</Text>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1 }}>
        <ReportsScreen />
      </View>
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderBottomWidth: 2,
    borderColor: COLORS.primary,
  },

  headerTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
