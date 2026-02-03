import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
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
  ScrollView, 
  Dimensions,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import DropDownPicker from "react-native-dropdown-picker";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import currencyCodes from "currency-codes-ts";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";




/* =========================
   THEME COLORS
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

/* =========================
   TYPES
========================= */
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

/* =========================
   CURRENCY LIST
========================= */

export const CURRENCIES = currencyCodes.data.map(c => ({
  value: c.code,
  label: `${c.code} — ${c.currency}`,
}))

/* =========================
  EXPENSE TYPES
========================= */
const EXPENSE_TYPES = [
  { label: "Travel", value: "travel" },
  { label: "Meals", value: "meals" },
  { label: "Office Supplies", value: "office" },
  { label: "Client Expense", value: "client" },
  { label: "Professional Development", value: "professional" },
];

export default function EmployeeExpensesScreen() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeItems, setTypeItems] = useState(EXPENSE_TYPES);
  const [description, setDescription] = useState("");
  const [file, setFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [driveReady, setDriveReady] = useState<boolean | null>(null);
  const [imageHeight, setImageHeight] = useState<number | null>(null);


  /* currency dropdown state */
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencyItems, setCurrencyItems] = useState(CURRENCIES);

  /* ---------------- AUTH ---------------- */

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

  useEffect(() => {
    if (file?.mimeType?.startsWith("image/")) {
      Image.getSize(
        file.uri,
        (width, height) => {
          const screenWidth = Dimensions.get("window").width - 40; // padding safe
          const ratio = height / width;
          setImageHeight(screenWidth * ratio);
        },
        (error) => {
          console.warn("Failed to get image size", error);
        }
      );
    }
  }, [file]);

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
      Alert.alert("Google Drive not ready", "Uploads are unavailable.");
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
      if (!res.ok || !json.success) throw new Error(json.error);

      Alert.alert("Success", "Expense submitted for approval.");

      setAmount("");
      setCurrency(null);
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
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ color: COLORS.textMuted }}>Loading expenses…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>My Expenses</Text>
        </View>

        {/* FORM */}
        <Text style={styles.label}>Currency</Text>
        <DropDownPicker
          open={currencyOpen}
          value={currency}
          items={currencyItems}
          setOpen={setCurrencyOpen}
          setValue={setCurrency}
          setItems={setCurrencyItems}
          placeholder="Select currency"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          zIndex={3000}
        />
        <Text style={styles.label}>Amount</Text>
        <TextInput
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />

        {/* EXPENSE TYPE DROPDOWN */}
        <Text style={styles.label}>Expense Type</Text>
        <DropDownPicker
          open={typeOpen}
          value={type}
          items={typeItems}
          setOpen={setTypeOpen}
          setValue={setType}
          setItems={setTypeItems}
          placeholder="Select expense type"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          zIndex={2000}
          zIndexInverse={3000}
        />


        <Text style={styles.label}>Description / Reason</Text>
        <TextInput
          placeholder="Enter description or reason for expense"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { height: 90 }]}
          multiline
        />

        <Text style={styles.label}>Invoice / Receipt</Text>
        <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
          <Feather name="upload" size={16} color={COLORS.primary} />
          <Text style={{ color: COLORS.textDark }}>
            {file ? file.name : "Upload Invoice"}
          </Text>
        </TouchableOpacity>

        {file?.mimeType?.startsWith("image/") && imageHeight && (
          <ScrollView
            style={{ maxHeight: 400 }}     // prevents layout explosion
            contentContainerStyle={{ alignItems: "center" }}
            showsVerticalScrollIndicator
          >
            <Image
              source={{ uri: file.uri }}
              style={{
                width: "100%",
                height: imageHeight,
                borderRadius: 10,
              }}
              resizeMode="contain"
            />
          </ScrollView>
        )}

        {file && file.mimeType === "application/pdf" && (
          <TouchableOpacity
            style={styles.fileBtn}
            onPress={async () => {
              if (!(await Sharing.isAvailableAsync())) {
                Alert.alert("Not supported", "Cannot open PDF on this device.");
                return;
              }

              await Sharing.shareAsync(file.uri);
            }}
          >
            <Feather name="file-text" size={16} color={COLORS.primary} />
            <Text style={{ color: COLORS.primary }}>Open PDF</Text>
          </TouchableOpacity>
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

        {/* EXPENSE LIST */}
        <FlatList
          data={expenses}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={
            <Text style={styles.empty}>No expenses submitted yet</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.txn}>{item.transaction_id}</Text>
              <Text style={styles.amount}>
                {item.currency} {item.amount}
              </Text>
              <Text style={styles.type}>{item.reimbursement_type}</Text>
              <Text style={styles[item.status]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 4,
    marginTop: 6,
    paddingLeft: 4,
  },

  container: { flex: 1, padding: 20 },

  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.primary },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  dropdown: {
    borderColor: COLORS.border,
    borderRadius: 10,
    marginBottom: 10,
  },

  dropdownContainer: {
    borderColor: COLORS.border,
  },

  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },

  preview: {
    height: 200,
    marginVertical: 10,
    borderRadius: 10,
  },

  submitBtn: {
    backgroundColor: COLORS.accent,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 12,
  },

  submitText: { color: "#fff", fontWeight: "700" },

  card: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  txn: { fontSize: 12, color: COLORS.textMuted },
  amount: { fontSize: 16, fontWeight: "600", color: COLORS.textDark },
  type: { color: COLORS.textMuted },

  pending: { color: "#ca8a04", fontWeight: "600" },
  approved: { color: "#16a34a", fontWeight: "600" },
  rejected: { color: "#dc2626", fontWeight: "600" },

  empty: { textAlign: "center", marginTop: 30, color: COLORS.textMuted },
});
