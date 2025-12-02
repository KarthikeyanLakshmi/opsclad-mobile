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

export default function AllTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

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
    setLoading(false);
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
      {tasks.map((task: any) => (
        <View key={task.id} style={styles.card}>
          {editingId === task.id ? (
            <>
              <TextInput
                style={styles.input}
                value={editValues.task_id}
                onChangeText={(t) => setEditValues({ ...editValues, task_id: t })}
                placeholder="Task ID"
              />

              <TextInput
                style={styles.input}
                value={editValues.description}
                onChangeText={(t) => setEditValues({ ...editValues, description: t })}
                placeholder="Description"
              />

              <TextInput
                style={styles.input}
                value={editValues.status}
                onChangeText={(t) => setEditValues({ ...editValues, status: t })}
                placeholder="Status"
              />

              <TextInput
                style={styles.input}
                value={editValues.estimated_completion_date || ""}
                onChangeText={(t) =>
                  setEditValues({ ...editValues, estimated_completion_date: t })
                }
                placeholder="Estimated (YYYY-MM-DD)"
              />

              <TextInput
                style={styles.input}
                value={editValues.actual_completion_date || ""}
                onChangeText={(t) =>
                  setEditValues({ ...editValues, actual_completion_date: t })
                }
                placeholder="Actual (YYYY-MM-DD)"
              />

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
    padding: 8,
    borderRadius: 6,
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
