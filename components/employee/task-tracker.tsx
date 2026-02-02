import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../../src/lib/supabase";

const TASK_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "blocked", label: "Blocked" },
];

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "completed":
      return { backgroundColor: "#7ba48b", color: "white" };
    case "in_progress":
      return { backgroundColor: "#95bdff", color: "white" };
    case "on_hold":
      return { backgroundColor: "#f0ad4e", color: "white" };
    case "blocked":
      return { backgroundColor: "#d9534f", color: "white" };
    default:
      return { backgroundColor: "#ccc", color: "black" };
  }
};

export interface Task {
  id: string;
  task_id: string;
  description: string;
  owner: string;
  department: string;
  start_date?: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  status: string;
  pending_changes?: any;
  created_at?: string;
  updated_at?: string;
}

export default function MyTasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Task>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const filteredTasks = tasks.filter((task) => {
  const q = searchQuery.toLowerCase();
    return (
      task.task_id.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q) ||
      task.department.toLowerCase().includes(q)
    );
  });

  const currentUser = "Karthikeyan Lakshmi"; // TODO replace later

  const fetchTasks = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("task_overviews")
      .select("*")
      .eq("owner", currentUser)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    const formatted = (data ?? []).map((t: any) => ({
      ...t,
      start_date: t.start_date?.split("T")[0] ?? "",
      estimated_completion_date:
        t.estimated_completion_date?.split("T")[0] ?? "",
      actual_completion_date: t.actual_completion_date?.split("T")[0] ?? "",
    }));

    setTasks(formatted);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditValues({
      description: task.description,
      estimated_completion_date: task.estimated_completion_date,
      actual_completion_date: task.actual_completion_date,
      status: task.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from("task_overviews")
      .update({
        pending_changes: JSON.stringify({
          ...editValues,
          changed_by: currentUser,
          change_requested_at: new Date().toISOString(),
        }),
      })
      .eq("id", editingId);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Success", "Changes submitted for approval!");
    fetchTasks();
    cancelEdit();
  };

  const renderItem = ({ item }: { item: Task }) => {
    const isEditing = editingId === item.id;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>Task: {item.task_id}</Text>

        {isEditing ? (
          <>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={editValues.description}
              placeholderTextColor="#6B7280"
              onChangeText={(t) =>
                setEditValues({ ...editValues, description: t })
              }
            />

            <Text style={styles.label}>Estimated Completion</Text>
            <TextInput
              style={styles.input}
              value={editValues.estimated_completion_date}
              placeholderTextColor="#6B7280"
              onChangeText={(t) =>
                setEditValues({
                  ...editValues,
                  estimated_completion_date: t,
                })
              }
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>Actual Completion</Text>
            <TextInput
              style={styles.input}
              value={editValues.actual_completion_date}
              placeholderTextColor="#6B7280"
              onChangeText={(t) =>
                setEditValues({
                  ...editValues,
                  actual_completion_date: t,
                })
              }
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={editValues.status}
                onValueChange={(value) =>
                  setEditValues({ ...editValues, status: value })
                }
              >
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <Picker.Item
                    key={opt.value}
                    label={opt.label}
                    value={opt.value}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.row}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text>Description: {item.description}</Text>
            <Text>Dept: {item.department}</Text>
            <Text>Start: {item.start_date}</Text>
            <Text>Est: {item.estimated_completion_date}</Text>
            <Text>Actual: {item.actual_completion_date || "N/A"}</Text>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    getStatusBadgeStyle(item.status).backgroundColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: getStatusBadgeStyle(item.status).color },
                ]}
              >
                {
                  TASK_STATUS_OPTIONS.find((s) => s.value === item.status)
                    ?.label
                }
              </Text>
            </View>

            {item.pending_changes && (
              <Text style={styles.pendingText}>Pending Approval</Text>
            )}

            <TouchableOpacity
              style={[
                styles.editBtn,
                item.pending_changes && { backgroundColor: "#aaa" },
              ]}
              disabled={!!item.pending_changes}
              onPress={() => startEdit(item)}
            >
              <Text style={styles.btnText}>
                {item.pending_changes ? "Pending" : "Edit"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0A1A4F" />
      </View>
    );

return (
  <View style={{ padding: 12 }}>

    {/* SEARCH BAR */}
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search tasks..."
        placeholderTextColor="#6B7280"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </View>

    <FlatList
      data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No tasks found...</Text>
          </View>
        }
      />
    </View>
  );
}

const COLORS = {
  primary: "#1b2a41", // navy
  accent: "#ff6b6b",  // coral
  bg: "#f4f4f5",
  card: "#ffffff",
  muted: "#6b7280",
  border: "#e5e7eb",
  danger: "#dc2626",
  success: "#16a34a",
  warning: "#d97706",
  info: "#2563eb",
};

const styles = StyleSheet.create({
  /* ---------- Layout ---------- */
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  /* ---------- Card ---------- */
  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: COLORS.primary,
  },

  /* ---------- Labels & Text ---------- */
  label: {
    marginTop: 6,
    color: COLORS.primary,
    fontWeight: "600",
  },

  pendingText: {
    color: COLORS.warning,
    marginTop: 6,
    fontWeight: "600",
  },

  emptyBox: {
    marginTop: 40,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 15,
    color: COLORS.muted,
    fontStyle: "italic",
  },

  /* ---------- Inputs ---------- */
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    backgroundColor: COLORS.card,
    color: COLORS.primary,
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 6,
    overflow: "hidden",
    backgroundColor: COLORS.card,
  },

  /* ---------- Buttons ---------- */
  editBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },

  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 6,
  },

  cancelBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    marginLeft: 6,
  },

  btnText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    marginTop: 12,
  },

  /* ---------- Status Badge ---------- */
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginTop: 8,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },

  /* ---------- Search ---------- */
  searchContainer: {
    marginBottom: 12,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.primary,
  },
});
