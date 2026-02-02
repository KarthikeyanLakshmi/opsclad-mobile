import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

// Internal screens
import PendingApprovals from "./tasks-components/pending-approval";
import AllTasks from "./tasks-components/all-tasks";
import AddTask from "./tasks-components/add-task";

export default function ManagerTasks() {
  const [tab, setTab] = useState<"pending" | "all" | "add">("pending");

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
          <Text style={[styles.tabText, tab === "pending" && styles.activeTabText]}>
            Pending Approvals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === "all" && styles.activeTab]}
          onPress={() => setTab("all")}
        >
          <Text style={[styles.tabText, tab === "all" && styles.activeTabText]}>
            All Tasks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === "add" && styles.activeTab]}
          onPress={() => setTab("add")}
        >
          <Text style={[styles.tabText, tab === "add" && styles.activeTabText]}>
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

        {tab === "all" && <AllTasks />}

        {tab === "add" && <AddTask />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ---------------- CONTAINER ---------------- */
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },

  /* ---------------- HEADER ---------------- */
  header: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  headerTitle: {
    color: "#1b2a41", // primary
    fontSize: 20,
    fontWeight: "700",
  },

  /* ---------------- TABS ---------------- */
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
    paddingHorizontal: 10,
  },

  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#1b2a41", // primary
  },

  tabText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },

  activeTabText: {
    color: "#1b2a41", // primary
    fontWeight: "700",
  },

  /* ---------------- EMPTY STATE ---------------- */
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
