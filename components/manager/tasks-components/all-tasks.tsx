import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../../src/lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

export default function AllTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const [showEstimatedPicker, setShowEstimatedPicker] = useState(false);
  const [showActualPicker, setShowActualPicker] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);

    const { data, error } = await supabase
      .from("task_overviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", "Failed to load tasks");
      setLoading(false);
      return;
    }

    setTasks(data || []);
    setFilteredTasks(data || []);
    setLoading(false);
  }

  function handleSearch(text: string) {
    setSearch(text);

    const lower = text.toLowerCase();

    const filtered = tasks.filter((t) =>
      (t.task_id?.toLowerCase().includes(lower) ||
        t.description?.toLowerCase().includes(lower) ||
        t.status?.toLowerCase().includes(lower) ||
        t.estimated_completion_date?.toLowerCase().includes(lower) ||
        t.actual_completion_date?.toLowerCase().includes(lower))
    );

    setFilteredTasks(filtered);
  }

  function startEdit(task: any) {
    setEditingId(task.id);
    setEditValues({
      task_id: task.task_id,
      description: task.description,
      status: task.status,
      estimated_completion_date: task.estimated_completion_date,
      actual_completion_date: task.actual_completion_date,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  async function saveEdit() {
    if (!editingId) return;

    const { error } = await supabase
      .from("task_overviews")
      .update({
        task_id: editValues.task_id,
        description: editValues.description,
        status: editValues.status,
        estimated_completion_date: editValues.estimated_completion_date,
        actual_completion_date: editValues.actual_completion_date,
      })
      .eq("id", editingId);

    if (error) {
      Alert.alert("Error", "Failed to save task");
      return;
    }

    await loadTasks();
    cancelEdit();
  }

  async function deleteTask(id: string) {
    Alert.alert("Confirm", "Delete this task?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: async () => {
          await supabase.from("task_overviews").delete().eq("id", id);
          await loadTasks();
        },
      },
    ]);
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );

  return (
    <ScrollView style={styles.container}>

      {/* 🔍 SEARCH BAR */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Text style={styles.clearSearch}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {filteredTasks.map((task: any) => (
        <View key={task.id} style={styles.card}>
          {editingId === task.id ? (
            <>
              {/* TASK ID */}
              <TextInput
                style={styles.input}
                value={editValues.task_id}
                onChangeText={(t) => setEditValues({ ...editValues, task_id: t })}
                placeholder="eg.TSK-001"
placeholderTextColor={COLORS.muted}
              />

              {/* DESCRIPTION */}
              <TextInput
                style={styles.input}
                value={editValues.description}
placeholderTextColor={COLORS.muted}
                onChangeText={(t) =>
                  setEditValues({ ...editValues, description: t })
                }
                placeholder="Description"
              />

              {/* STATUS DROPDOWN */}
              <Text style={styles.label}>Status</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={editValues.status}
                  onValueChange={(val) =>
                    setEditValues({ ...editValues, status: val })
                  }
                >
                  <Picker.Item label="In Progress" value="in_progress" />
                  <Picker.Item label="Completed" value="completed" />
                  <Picker.Item label="On Hold" value="on_hold" />
                  <Picker.Item label="Cancelled" value="cancelled" />
                </Picker>
              </View>

              {/* ESTIMATED DATE */}
              <Text style={styles.label}>Estimated Completion Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEstimatedPicker(true)}
              >
                <Text>
                  {editValues.estimated_completion_date ||
                    "Select Estimated Completion Date"}
                </Text>
              </TouchableOpacity>

              {showEstimatedPicker && (
                <DateTimePicker
                  mode="date"
                  value={
                    editValues.estimated_completion_date
                      ? new Date(editValues.estimated_completion_date)
                      : new Date()
                  }
                  onChange={(e, selected) => {
                    setShowEstimatedPicker(false);
                    if (selected) {
                      setEditValues({
                        ...editValues,
                        estimated_completion_date:
                          selected.toISOString().split("T")[0],
                      });
                    }
                  }}
                />
              )}

              {/* ACTUAL DATE */}
              <Text style={styles.label}>Actual Completion Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowActualPicker(true)}
              >
                <Text>
                  {editValues.actual_completion_date ||
                    "Select Actual Completion Date"}
                </Text>
              </TouchableOpacity>

              {showActualPicker && (
                <DateTimePicker
                  mode="date"
                  value={
                    editValues.actual_completion_date
                      ? new Date(editValues.actual_completion_date)
                      : new Date()
                  }
                  onChange={(e, selected) => {
                    setShowActualPicker(false);
                    if (selected) {
                      setEditValues({
                        ...editValues,
                        actual_completion_date:
                          selected.toISOString().split("T")[0],
                      });
                    }
                  }}
                />
              )}

              {/* SAVE + CANCEL BUTTONS */}
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
              {/* DISPLAY MODE */}
              <Text style={styles.title}>{task.task_id}</Text>
              <Text>Description: {task.description}</Text>
              <Text>Status: {task.status}</Text>
              <Text>Est: {task.estimated_completion_date || "N/A"}</Text>
              <Text>Actual: {task.actual_completion_date || "N/A"}</Text>

              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => startEdit(task)}
                >
                  <Text style={styles.btnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteTask(task.id)}
                >
                  <Text style={styles.btnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const COLORS = {
  primary: "#1b2a41", // navy
  accent: "#ff6b6b",  // coral
  bg: "#f4f4f5",
  card: "#ffffff",
  inputBg: "#f9fafb",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  danger: "#dc2626",
  success: "#16a34a",
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: COLORS.bg,
  },

  /* ---------- SEARCH ---------- */
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },

  clearSearch: {
    color: COLORS.accent,
    marginLeft: 10,
    fontWeight: "700",
  },

  /* ---------- CARD ---------- */
  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: COLORS.primary,
  },

  /* ---------- INPUTS ---------- */
  input: {
    backgroundColor: COLORS.inputBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },

  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: "700",
    color: COLORS.primary,
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: COLORS.card,
    overflow: "hidden",
  },

  dateButton: {
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  /* ---------- ACTION ROW ---------- */
  row: {
    flexDirection: "row",
    marginTop: 12,
  },

  editBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    marginRight: 6,
  },

  deleteBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 10,
    marginLeft: 6,
  },

  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.success,
    padding: 12,
    borderRadius: 10,
    marginRight: 6,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.muted,
    padding: 12,
    borderRadius: 10,
    marginLeft: 6,
  },

  btnText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
});
