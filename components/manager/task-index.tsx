import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

// Internal screens
import PendingApprovals from "./tasks-components/pending-approval";
import AddTask from "./tasks-components/add-task";

export default function ManagerTasks() {
  const [tab, setTab] = useState<"pending" | "add">("pending");

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Tasks</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "pending" && styles.activeTab]}
          onPress={() => setTab("pending")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "pending" && styles.activeTabText,
            ]}
          >
            Pending Approvals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === "add" && styles.activeTab]}
          onPress={() => setTab("add")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "add" && styles.activeTabText,
            ]}
          >
            Add Task
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1 }}>
        {tab === "pending" && (
          <PendingApprovals
            emptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No pending approvals...</Text>
              </View>
            }
          />
        )}

        {tab === "add" && <AddTask />}
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
    fontSize: 20,
    fontWeight: "700",
  },

  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },

  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#0A1A4F",
  },

  tabText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },

  activeTabText: {
    color: "#0A1A4F",
    fontWeight: "700",
  },

  emptyBox: {
    marginTop: 30,
    alignItems: "center",
  },
  
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    fontStyle: "italic",
  },
});
