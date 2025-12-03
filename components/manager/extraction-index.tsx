import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Only keep ReportsScreen
import ReportsScreen from "./timesheet-components/reports";

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6" },

  header: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },

  headerTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "700",
  },
});
