import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";

/* ---------------- TYPES ---------------- */

interface Expense {
  id: string;
  employee_name: string;
  amount: number;
  currency: string;
  reimbursement_type: string;
  transaction_id: string;
  request_reason: string;
  invoice_url: string;
  google_drive_file_id: string;
  status: "pending" | "approved" | "rejected";
}

/* ---------------- COMPONENT ---------------- */

export default function ManagerExpensesTrackerScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  /* ---------------- LOAD CURRENT USER (PTO STYLE) ---------------- */

  const loadCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      Alert.alert("Session expired", "Please log in again.");
      setLoading(false);
      return;
    }

    setCurrentUser(data.user);
  };

  /* ---------------- LOAD ALL EXPENSES ---------------- */

  const loadExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", "Failed to load expenses.");
      setLoading(false);
      return;
    }

    setExpenses((data as Expense[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await loadCurrentUser();
      await loadExpenses();
    })();
  }, []);

  /* ---------------- UPDATE STATUS ---------------- */

  const updateStatus = async (
    expenseId: string,
    status: "approved" | "rejected"
  ) => {
    if (!currentUser?.email) return;

    setProcessing(expenseId);

    /* 1️⃣ Update database */
    const { data, error } = await supabase
      .from("expenses")
      .update({
        status,
        invoice_folder: status,
        approved_at: new Date().toISOString(),
        approved_by: currentUser.email,
      })
      .eq("id", expenseId)
      .select("google_drive_file_id")
      .single();

    if (error || !data?.google_drive_file_id) {
      Alert.alert("Error", "Failed to update expense.");
      setProcessing(null);
      return;
    }

    /* 2️⃣ Move invoice in Google Drive */
    try {
      await fetch("https://your-domain.com/api/move-expense-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: data.google_drive_file_id,
          targetFolder: status === "approved" ? "Approved" : "Rejected",
        }),
      });
    } catch {
      Alert.alert(
        "Drive Error",
        "Expense updated, but invoice could not be moved."
      );
    }

    Alert.alert("Success", `Expense ${status}.`);
    loadExpenses();
    setProcessing(null);
  };

  /* ---------------- RENDER ITEM ---------------- */

  const renderExpense = ({ item }: { item: Expense }) => {
    const statusColor =
      item.status === "approved"
        ? "#16a34a"
        : item.status === "pending"
        ? "#ca8a04"
        : "#dc2626";

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.employee}>{item.employee_name}</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.txn}>{item.transaction_id}</Text>

        <Text style={styles.text}>
          {item.currency} {item.amount.toFixed(2)} •{" "}
          {item.reimbursement_type}
        </Text>

        <Text style={styles.reason} numberOfLines={2}>
          {item.request_reason}
        </Text>

        <TouchableOpacity
          onPress={() => Linking.openURL(item.invoice_url)}
        >
          <Text style={styles.link}>View Invoice</Text>
        </TouchableOpacity>

        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity
            disabled={processing === item.id || item.status !== "pending"}
            style={[styles.btn, styles.approveBtn]}
            onPress={() => updateStatus(item.id, "approved")}
          >
            {processing === item.id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#fff"
                />
                <Text style={styles.btnText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={processing === item.id || item.status !== "pending"}
            style={[styles.btn, styles.rejectBtn]}
            onPress={() => updateStatus(item.id, "rejected")}
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color="#fff"
            />
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading expenses…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expenses Approval</Text>

      <FlatList
        data={expenses}
        keyExtractor={(i) => i.id}
        renderItem={renderExpense}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses found</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
    backgroundColor: "#0f172a",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  employee: {
    fontWeight: "700",
    color: "#e5e7eb",
  },
  status: {
    fontWeight: "700",
    fontSize: 12,
  },
  txn: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  text: {
    color: "#e5e7eb",
    marginTop: 6,
  },
  reason: {
    color: "#cbd5f5",
    fontSize: 12,
    marginTop: 6,
  },
  link: {
    color: "#60a5fa",
    marginTop: 6,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flex: 1,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: "#16a34a",
  },
  rejectBtn: {
    backgroundColor: "#dc2626",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 40,
  },
});
