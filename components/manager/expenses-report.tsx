import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";

/* =========================
   THEME COLORS (same as User Roles)
========================= */
const COLORS = {
  primary: "#1b2a41",
  accent: "#ff6b6b",
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textDark: "#111827",
  textMuted: "#475569",
};

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
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  /* ---------------- LOAD CURRENT USER ---------------- */

  const loadCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      Alert.alert("Session expired", "Please log in again.");
      setLoading(false);
      return;
    }

    setCurrentUser(data.user);
  };

  /* ---------------- LOAD EXPENSES ---------------- */

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
        {/* HEADER ROW */}
        <View style={styles.rowBetween}>
          <Text style={styles.employee}>{item.employee_name}</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.txn}>{item.transaction_id}</Text>

        <Text style={styles.amount}>
          {item.currency} {item.amount.toFixed(2)}
        </Text>

        <Text style={styles.type}>{item.reimbursement_type}</Text>

        <Text style={styles.reason} numberOfLines={2}>
          {item.request_reason}
        </Text>

        <TouchableOpacity onPress={() => Linking.openURL(item.invoice_url)}>
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
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={processing === item.id || item.status !== "pending"}
            style={[styles.btn, styles.rejectBtn]}
            onPress={() => updateStatus(item.id, "rejected")}
          >
            <Ionicons name="close-circle-outline" size={16} color="#fff" />
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
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ color: COLORS.textMuted }}>Loading expenses…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.container}>
        {/* HEADER (same as User Roles) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Expenses Approval</Text>
        </View>

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
    </SafeAreaView>
  );
}

/* =========================
   STYLES (aligned with User Roles)
========================= */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  employee: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
  },

  status: {
    fontSize: 12,
    fontWeight: "700",
  },

  txn: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  amount: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textDark,
    marginTop: 6,
  },

  type: {
    color: COLORS.textMuted,
    marginTop: 2,
  },

  reason: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 6,
  },

  link: {
    color: "#2563eb",
    marginTop: 6,
    fontWeight: "600",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
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
    color: COLORS.textMuted,
    marginTop: 40,
  },
});
