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
        <ActivityIndicator size="large" color="#0A1A4F" />
      </View>
    );

  return (
    <ScrollView style={styles.container}>

      {/* 🔍 SEARCH BAR */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor="#666"
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
                placeholderTextColor="#6B7280"
              />

              {/* DESCRIPTION */}
              <TextInput
                style={styles.input}
                value={editValues.description}
                placeholderTextColor="#6B7280"
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

const styles = StyleSheet.create({
  container: { padding: 12 },

  // SEARCH BAR
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearSearch: {
    color: "red",
    marginLeft: 10,
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#0A1A4F",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#0A1A4F",
  },
  input: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  label: { marginTop: 10, fontWeight: "600" },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  dateButton: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    marginTop: 10,
  },
  editBtn: {
    flex: 1,
    backgroundColor: "#0A1A4F",
    padding: 10,
    borderRadius: 6,
    marginRight: 6,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "red",
    padding: 10,
    borderRadius: 6,
    marginLeft: 6,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "green",
    padding: 10,
    borderRadius: 6,
    marginRight: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "gray",
    padding: 10,
    borderRadius: 6,
    marginLeft: 6,
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
