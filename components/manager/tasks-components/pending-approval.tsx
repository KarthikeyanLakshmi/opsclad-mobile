import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { supabase } from "../../../src/lib/supabase";

type PendingApprovalsProps = {
  emptyComponent?: React.ReactNode;
};

type PendingChanges = {
  description?: string;
  estimated_completion_date?: string | null;
  actual_completion_date?: string | null;
  status?: string;
  changed_by?: string;
  change_requested_at?: string;
};

export default function PendingApprovals({
  emptyComponent,
}: PendingApprovalsProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);

    const { data } = await supabase
      .from("task_overviews")
      .select("*")
      .not("pending_changes", "is", null);

    setTasks(data || []);
    setLoading(false);
  }

  async function approveTask() {
  if (!selectedTask?.id) return;

  let parsed: PendingChanges = {};
  try {
    parsed = JSON.parse(selectedTask.pending_changes || "{}");
  } catch (e) {
    console.error("Invalid pending_changes JSON.", e);
    return;
  }

  // Only pick fields that actually exist in task_overviews
  const allowedFields = {
    description: parsed.description,
    estimated_completion_date: parsed.estimated_completion_date || null,
    actual_completion_date:
      parsed.actual_completion_date === "" ? null : parsed.actual_completion_date,
    status: parsed.status,
  };

  console.log("APPLYING:", allowedFields);

  const { error } = await supabase
    .from("task_overviews")
    .update({
      ...allowedFields,
      pending_changes: null,
    })
    .eq("id", selectedTask.id);

  if (error) {
    console.error("Update failed:", error);
    return;
  }

  setSelectedTask(null);
  loadPending();
}


  async function rejectTask() {
    if (!selectedTask?.id) return;

    await supabase
      .from("task_overviews")
      .update({ pending_changes: null })
      .eq("id", selectedTask.id);

    setSelectedTask(null);
    loadPending();
  }

  // ----------------------------
  // EMPTY STATE HANDLING
  // ----------------------------
  if (loading) {
    return (
      <View style={styles.center}>
<ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      (emptyComponent as any) ?? (
        <View style={styles.center}>
<Text style={{ color: COLORS.muted, fontSize: 16, marginTop: 20 }}>
            No pending approvals...
          </Text>
        </View>
      )
    );
  }

  // ----------------------------
  // MAIN VIEW
  // ----------------------------
  return (
    <ScrollView style={styles.container}>
      {tasks.map((task: any) => {
        const changes = JSON.parse(task.pending_changes || "{}");

        return (
          <TouchableOpacity
            key={task.id}
            style={styles.card}
            onPress={() => setSelectedTask(task)}
          >
            <Text style={styles.title}>{task.task_id}</Text>
            <Text>Description: {task.description}</Text>
            <Text>Status: {task.status}</Text>

            <Text style={styles.pendingBadge}>Pending Approval</Text>
          </TouchableOpacity>
        );
      })}

      {/* ----------------------------
          MODAL FOR CHANGE REVIEW
      ---------------------------- */}
      {selectedTask && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Review Changes</Text>

              <ScrollView>
                <Text style={styles.sectionTitle}>Current:</Text>
                <Text>Description: {selectedTask.description}</Text>
                <Text>Status: {selectedTask.status}</Text>

                <Text style={styles.sectionTitle}>Proposed:</Text>
                <Text>
                  Description:{" "}
                  {JSON.parse(selectedTask.pending_changes || "{}").description}
                </Text>
                <Text>
                  Status:{" "}
                  {JSON.parse(selectedTask.pending_changes || "{}").status}
                </Text>
              </ScrollView>

              <View style={styles.row}>
                <TouchableOpacity style={styles.rejectBtn} onPress={rejectTask}>
                  <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.approveBtn} onPress={approveTask}>
                  <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedTask(null)}
                style={styles.closeBtn}
              >
                <Text style={{ color: "#fff" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const COLORS = {
  primary: "#1b2a41", // navy
  accent: "#ff6b6b",  // coral
  bg: "#f4f4f5",
  card: "#ffffff",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  warning: "#f59e0b",
  success: "#16a34a",
  danger: "#dc2626",
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: COLORS.bg,
  },

  /* ---------- CARD ---------- */
  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.accent, // 🔥 pending highlight
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
    color: COLORS.primary,
  },

  pendingBadge: {
    marginTop: 6,
    color: COLORS.warning,
    fontWeight: "700",
  },

  /* ---------- CENTER ---------- */
  center: {
    flex: 1,
    paddingTop: 30,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  /* ---------- MODAL ---------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  modalBox: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 20,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    color: COLORS.primary,
  },

  sectionTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: "700",
    color: COLORS.primary,
  },

  /* ---------- ACTION ROW ---------- */
  row: {
    flexDirection: "row",
    marginTop: 20,
  },

  approveBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.success,
    borderRadius: 10,
    marginLeft: 6,
  },

  rejectBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    marginRight: 6,
  },

  btnText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  closeBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
  },
});
