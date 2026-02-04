import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/src/lib/supabase";
import { Feather } from "@expo/vector-icons";

export default function LeaveReport() {
  const router = useRouter();

  const [records, setRecords] = useState<any[]>([]);
  const [carryRequests, setCarryRequests] = useState<any[]>([]); // reserved for future use
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"overview" | "approvals">(
    "overview"
  );

  const [filterEmployee, setFilterEmployee] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  /* ---------------- LOAD PTO RECORDS ---------------- */
  const loadRecords = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("pto_records")
        .select("*")
        .gte("date", `${selectedYear}-01-01`)
        .lte("date", `${selectedYear}-12-31`)
        .order("date", { ascending: false });

      if (error) {
        console.error(error);
        Alert.alert("Error", "Failed to load leave records.");
      }

      setRecords(data || []);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- LOAD CARRY FORWARD REQUESTS ---------------- */
  const loadCarryRequests = async () => {
    const { data } = await supabase
      .from("carry_forward_requests")
      .select("*");
    setCarryRequests(data || []);
  };

  useEffect(() => {
    loadRecords();
    loadCarryRequests();
    setActiveTab("overview");
  }, [selectedYear]);

  /* ---------------- FILTERS ---------------- */
  const employees = [...new Set(records.map((x) => x.employee_name))];

  const filteredRecords = records.filter((r) => {
    if (filterEmployee !== "all" && r.employee_name !== filterEmployee)
      return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  /* ---------------- APPROVAL HANDLERS ---------------- */
  const handleApproval = async (id: string, action: "approve" | "reject") => {
    const newStatus = action === "approve" ? "approved" : "rejected";

    const { error } = await supabase
      .from("pto_records")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      Alert.alert("Error", "Failed to update status.");
      return;
    }

    Alert.alert("Success", `Request ${newStatus}.`);
    loadRecords();
  };

  /* ---------------- RENDER ---------------- */
  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leave Report</Text>
      </View>
      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.activeTab]}
          onPress={() => setActiveTab("overview")}
        >
          <Text
            style={activeTab === "overview" ? styles.activeTabText : styles.tabText}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "approvals" && styles.activeTab]}
          onPress={() => setActiveTab("approvals")}
        >
          <Text
            style={activeTab === "approvals" ? styles.activeTabText : styles.tabText}
          >
            Approvals
          </Text>
        </TouchableOpacity>
      </View>


      {/* ---------------- OVERVIEW TAB ---------------- */}
      {activeTab === "overview" && (
        <View>
          <Text style={styles.sectionTitle}>Filters</Text>

          <View style={styles.filterBox}>
            <Picker
              selectedValue={filterEmployee}
              onValueChange={(v) => setFilterEmployee(v)}
            >
              <Picker.Item label="All Employees" value="all" />
              {employees.map((e, idx) => (
                <Picker.Item key={`${e}-${idx}`} label={e} value={e} />
              ))}
            </Picker>
          </View>

          {/* FROM DATE */}
          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => setShowFromPicker(true)}
          >
            <Text>{dateFrom || "From Date"}</Text>
          </TouchableOpacity>

          {showFromPicker && (
            <DateTimePicker
              value={dateFrom ? new Date(dateFrom) : new Date()}
              mode="date"
              onChange={(_, d) => {
                setShowFromPicker(false);
                if (d) setDateFrom(d.toISOString().split("T")[0]);
              }}
            />
          )}

          {/* TO DATE */}
          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => setShowToPicker(true)}
          >
            <Text>{dateTo || "To Date"}</Text>
          </TouchableOpacity>

          {showToPicker && (
            <DateTimePicker
              value={dateTo ? new Date(dateTo) : new Date()}
              mode="date"
              onChange={(_, d) => {
                setShowToPicker(false);
                if (d) setDateTo(d.toISOString().split("T")[0]);
              }}
            />
          )}

          {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
          ) : filteredRecords.length === 0 ? (
            <Text style={styles.noData}>No records found.</Text>
          ) : (
            filteredRecords.map((r) => (
              <View key={r.id} style={styles.recordCard}>
                <Text style={styles.recordTitle}>{r.employee_name}</Text>
                <Text>Date: {r.date}</Text>
                <Text>Hours: {r.hours}</Text>
                <Text>
                  Type: {r.is_pto ? "PTO" : "Non-PTO"} | Status: {r.status}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* ---------------- APPROVALS TAB ---------------- */}
      {activeTab === "approvals" && (
        <View>
          <Text style={styles.sectionTitle}>Pending Approvals</Text>

          {records.filter((x) => x.status === "pending").length === 0 ? (
            <Text style={styles.noData}>No pending requests.</Text>
          ) : (
            records
              .filter((x) => x.status === "pending")
              .map((r) => (
                <View key={r.id} style={styles.requestCard}>
                  <Text style={styles.recordTitle}>{r.employee_name}</Text>
                  <Text>{r.date}</Text>
                  <Text>{r.hours} hours</Text>

                  <View style={styles.approvalRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.approve]}
                      onPress={() => handleApproval(r.id, "approve")}
                    >
                      <Text style={styles.btnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, styles.reject]}
                      onPress={() => handleApproval(r.id, "reject")}
                    >
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const COLORS = {
  primary: "#1b2a41", // navy
  accent: "#ff6b6b",  // coral
  bg: "#f6f6f6",
  card: "#ffffff",
  border: "#e5e7eb",
  muted: "#6b7280",
};

/* ---------------- STYLES ---------------- */
/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f6f6f6",
    padding: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1b2a41", // primary
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  backButton: {
    padding: 6,
  },

  /* ---------------- TABS ---------------- */
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
  },

  activeTab: {
    backgroundColor: "#1b2a41", // primary
  },

  activeTabText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  tabText: {
    color: "#1b2a41",
    fontWeight: "600",
  },

  /* ---------------- SECTIONS ---------------- */
  sectionTitle: {
    fontSize: 18,
    marginVertical: 10,
    fontWeight: "600",
    color: "#1b2a41",
  },

  filterBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginBottom: 10,
  },

  dateBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },

  /* ---------------- CARDS ---------------- */
  recordCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  requestCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  recordTitle: {
    fontWeight: "700",
    marginBottom: 4,
    color: "#1b2a41",
  },

  noData: {
    color: "#6b7280",
    textAlign: "center",
    paddingVertical: 20,
  },

  /* ---------------- APPROVAL BUTTONS ---------------- */
  approvalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  btn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },

  approve: {
    backgroundColor: "#1b2a41", // primary
  },

  reject: {
    backgroundColor: "#ff6b6b", // accent
  },

  btnText: {
    color: "#ffffff",
    fontWeight: "700",
  },/* ---------------- HEADER ---------------- */
  header: {
    padding: 20,
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "700",
  },
});
