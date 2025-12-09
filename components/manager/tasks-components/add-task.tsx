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
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

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

  // Date pickers visibility
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEstimatedPicker, setShowEstimatedPicker] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const { data } = await supabase.from("employees").select("name");
    setEmployees(data || []);
    setLoading(false);
  }

  // -------------------------------------------------------
  // 🔥 AUTO-GENERATE TASK ID (TSK-smallest_available_number)
  // -------------------------------------------------------
  async function generateTaskId() {
    const { data, error } = await supabase
      .from("task_overviews")
      .select("task_id");

    if (error || !data) return "TSK-001";

    // Extract numbers from "TSK-###"
    const numbers = data
      .map((t) => parseInt(t.task_id?.replace("TSK-", ""), 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    // Find the lowest missing number
    let next = 1;
    for (let n of numbers) {
      if (n === next) {
        next++;
      } else if (n > next) {
        break;
      }
    }

    // Pad number to 3 digits → 001, 023, 120  
    const padded = String(next).padStart(3, "0");

    return `TSK-${padded}`;
  }

  // -------------------------------------------------------
  // ADD TASK WITH AUTO-GENERATED ID
  // -------------------------------------------------------
  async function addTask() {
    if (!task.description || !task.owner) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }

    // Generate task ID before inserting
    const newTaskId = await generateTaskId();

    const payload = {
      ...task,
      task_id: newTaskId,
    };

    const { error } = await supabase.from("task_overviews").insert([payload]);

    if (error) {
      Alert.alert("Error", "Failed to add task");
      return;
    }

    Alert.alert("Success", `Task ${newTaskId} added successfully`);

    // Reset form
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
      {/* DESCRIPTION */}
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Task Description"
        value={task.description}
        placeholderTextColor="#6B7280"
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
      <Text style={styles.label}>Department</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={task.department}
          onValueChange={(v) => setTask({ ...task, department: v })}
        >
          <Picker.Item label="Select Department" value="" />
          <Picker.Item label="IT" value="it" />
          <Picker.Item label="HR" value="hr" />
          <Picker.Item label="Sales" value="sales" />
          <Picker.Item label="Marketing" value="marketing" />
          <Picker.Item label="Operations" value="operations" />
          <Picker.Item label="Engineering" value="engineering" />
        </Picker>
      </View>

      {/* STATUS */}
      <Text style={styles.label}>Status</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={task.status}
          onValueChange={(v) => setTask({ ...task, status: v })}
        >
          <Picker.Item label="In Progress" value="in_progress" />
          <Picker.Item label="Completed" value="completed" />
          <Picker.Item label="On Hold" value="on_hold" />
          <Picker.Item label="Cancelled" value="cancelled" />
        </Picker>
      </View>

      {/* START DATE */}
      <Text style={styles.label}>Start Date</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowStartPicker(true)}
      >
        <Text>{task.start_date || "Select Start Date"}</Text>
      </TouchableOpacity>

      {showStartPicker && (
        <DateTimePicker
          mode="date"
          value={task.start_date ? new Date(task.start_date) : new Date()}
          onChange={(e, selected) => {
            setShowStartPicker(false);
            if (selected) {
              setTask({
                ...task,
                start_date: selected.toISOString().split("T")[0],
              });
            }
          }}
        />
      )}

      {/* ESTIMATED DATE */}
      <Text style={styles.label}>Estimated Completion Date</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowEstimatedPicker(true)}
      >
        <Text>{task.estimated_completion_date || "Select Estimated Date"}</Text>
      </TouchableOpacity>

      {showEstimatedPicker && (
        <DateTimePicker
          mode="date"
          value={
            task.estimated_completion_date
              ? new Date(task.estimated_completion_date)
              : new Date()
          }
          onChange={(e, selected) => {
            setShowEstimatedPicker(false);
            if (selected) {
              setTask({
                ...task,
                estimated_completion_date:
                  selected.toISOString().split("T")[0],
              });
            }
          }}
        />
      )}

      {/* SUBMIT BUTTON */}
      <TouchableOpacity style={styles.saveBtn} onPress={addTask}>
        <Text style={styles.saveText}>Add Task</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ----------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------
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
    marginBottom: 6,
    marginTop: 6,
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
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginBottom: 12,
  },
  dateButton: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
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
