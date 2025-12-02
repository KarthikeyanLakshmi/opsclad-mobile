import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../../src/lib/supabase";

export default function AddTask() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [task, setTask] = useState({
    task_id: "",
    description: "",
    owner: "",
    department: "",
    start_date: "",
    estimated_completion_date: "",
    status: "in_progress",
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const { data } = await supabase
      .from("employees")
      .select("name");

    setEmployees(data || []);
    setLoading(false);
  }

  async function addTask() {
    if (!task.task_id || !task.description || !task.owner) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }

    const { error } = await supabase.from("task_overviews").insert([task]);

    if (error) {
      Alert.alert("Error", "Failed to add task");
      return;
    }

    Alert.alert("Success", "Task added");
    setTask({
      task_id: "",
      description: "",
      owner: "",
      department: "",
      start_date: "",
      estimated_completion_date: "",
      status: "in_progress",
    });
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0A1A4F" />
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      {/* TASK ID */}
      <TextInput
        style={styles.input}
        placeholder="Task ID"
        value={task.task_id}
        onChangeText={(v) => setTask({ ...task, task_id: v })}
      />

      {/* DESCRIPTION */}
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Description"
        value={task.description}
        onChangeText={(v) => setTask({ ...task, description: v })}
        multiline
      />

      {/* OWNER PICKER */}
      <Text style={styles.label}>Assign To</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {employees.map((emp) => (
          <TouchableOpacity
            key={emp.name}
            style={[
              styles.chip,
              task.owner === emp.name && styles.chipSelected,
            ]}
            onPress={() => setTask({ ...task, owner: emp.name })}
          >
            <Text
              style={[
                styles.chipText,
                task.owner === emp.name && styles.chipTextSelected,
              ]}
            >
              {emp.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* DEPARTMENT */}
      <TextInput
        style={styles.input}
        placeholder="Department (IT/HR/Sales...)"
        value={task.department}
        onChangeText={(v) => setTask({ ...task, department: v })}
      />

      {/* DATES */}
      <TextInput
        style={styles.input}
        placeholder="Start Date (YYYY-MM-DD)"
        value={task.start_date}
        onChangeText={(v) => setTask({ ...task, start_date: v })}
      />

      <TextInput
        style={styles.input}
        placeholder="Estimated Completion (YYYY-MM-DD)"
        value={task.estimated_completion_date}
        onChangeText={(v) =>
          setTask({ ...task, estimated_completion_date: v })
        }
      />

      {/* SAVE */}
      <TouchableOpacity style={styles.saveBtn} onPress={addTask}>
        <Text style={styles.saveText}>Add Task</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  input: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  textarea: {
    height: 80,
    textAlignVertical: "top",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: "#0A1A4F",
  },
  chipText: {
    color: "#333",
  },
  chipTextSelected: {
    color: "#fff",
  },
  saveBtn: {
    marginTop: 15,
    backgroundColor: "#0A1A4F",
    padding: 14,
    borderRadius: 8,
  },
  saveText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
