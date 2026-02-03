import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { WebView } from "react-native-webview";
import { supabase } from "../../src/lib/supabase";

interface Expense {
  id: string;
  amount: number;
  currency: string;
  reimbursement_type: string;
  transaction_id: string;
  invoice_url: string;
  status: "pending" | "approved" | "rejected";
  request_reason: string;
  created_at: string;
}

export default function EmployeeExpensesScreen() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [driveReady, setDriveReady] = useState<boolean | null>(null);

  /* ---------------- AUTH (PTO STYLE) ---------------- */

  const loadCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      Alert.alert("Session expired", "Please log in again.");
      setLoading(false);
      return;
    }

    setCurrentUser(data.user);
    setLoading(false);
  };

  /* ---------------- DRIVE CHECK ---------------- */

  const checkDrive = async () => {
    try {
      const res = await fetch("https://your-domain.com/api/gdrive");
      const json = await res.json();
      setDriveReady(Boolean(json?.success));
    } catch {
      setDriveReady(false);
    }
  };

  /* ---------------- LOAD EXPENSES ---------------- */

  const loadExpenses = async (email: string) => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("sender_email", email)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", "Failed to load expenses.");
      return;
    }

    setExpenses((data || []) as Expense[]);
  };

  useEffect(() => {
    loadCurrentUser();
    checkDrive();
  }, []);

  useEffect(() => {
    if (currentUser?.email) {
      loadExpenses(currentUser.email);
    }
  }, [currentUser]);

  /* ---------------- PICK FILE ---------------- */

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });

    if (!res.canceled) {
      setFile(res.assets[0]);
    }
  };

  /* ---------------- SUBMIT ---------------- */

  const submitExpense = async () => {
    if (
      !currentUser ||
      !amount ||
      !currency ||
      !type ||
      !description ||
      !file
    ) {
      Alert.alert("Missing fields", "All fields are required.");
      return;
    }

    if (!driveReady) {
      Alert.alert(
        "Google Drive not ready",
        "Expense uploads are unavailable."
      );
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date();
      const date = now.toISOString().slice(0, 10).replace(/-/g, "");
      const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
      const transactionId = `REM${date}${time}${currentUser.id}`;

      const formData = new FormData();

      formData.append("invoice", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      } as any);

      formData.append("sender_email", currentUser.email);
      formData.append("employee_name", currentUser.user_metadata?.name || "");
      formData.append("employee_id", currentUser.user_metadata?.employee_id || "");
      formData.append("amount", amount);
      formData.append("currency", currency);
      formData.append("reimbursement_type", type);
      formData.append("transaction_id", transactionId);
      formData.append("request_reason", description);

      const res = await fetch(
        "https://your-domain.com/api/google-drive/expenses/submit",
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Submission failed");
      }

      Alert.alert("Success", "Expense submitted for approval.");

      setAmount("");
      setCurrency("");
      setType("");
      setDescription("");
      setFile(null);

      loadExpenses(currentUser.email);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
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
      <Text style={styles.title}>My Expenses</Text>

      <TextInput
        placeholder="Currency (SGD, USD)"
        value={currency}
        onChangeText={setCurrency}
        style={styles.input}
      />

      <TextInput
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
      />

      <TextInput
        placeholder="Expense Type"
        value={type}
        onChangeText={setType}
        style={styles.input}
      />

      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, { height: 80 }]}
        multiline
      />

      <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
        <Text>{file ? file.name : "Upload Invoice"}</Text>
      </TouchableOpacity>

      {file?.mimeType?.startsWith("image/") && (
        <Image
          source={{ uri: file.uri }}
          style={{ height: 200, marginVertical: 10 }}
          resizeMode="contain"
        />
      )}

      {file?.mimeType === "application/pdf" && (
        <WebView source={{ uri: file.uri }} style={{ height: 300 }} />
      )}

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={submitExpense}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit Expense</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={expenses}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses submitted yet</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.txn}>{item.transaction_id}</Text>
            <Text>
              {item.currency} {item.amount}
            </Text>
            <Text>{item.reimbursement_type}</Text>
            <Text style={styles[item.status]}>{item.status.toUpperCase()}</Text>
          </View>
        )}
      />
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  fileBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: "#0A1A4F",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 12,
  },
  submitText: { color: "#fff", fontWeight: "600" },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  txn: { fontSize: 12, color: "#6b7280" },
  pending: { color: "#ca8a04" },
  approved: { color: "#16a34a" },
  rejected: { color: "#dc2626" },
  empty: { textAlign: "center", marginTop: 30, color: "#6b7280" },
});
