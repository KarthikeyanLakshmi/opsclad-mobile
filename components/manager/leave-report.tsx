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
  const [carryRequests, setCarryRequests] = useState<any[]>([]);
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

  // ---------------------------
  // Load PTO Records
  // ---------------------------
  const loadRecords = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("pto_records")
        .select("*")
        .gte("date", `${selectedYear}-01-01`)
        .lte("date", `${selectedYear}-12-31`)
        .order("date", { ascending: false });

      if (error) console.error(error);
      setRecords(data || []);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Load Carry Forward Requests
  // ---------------------------
  const loadCarryRequests = async () => {
    const { data } = await supabase.from("carry_forward_requests").select("*");
    setCarryRequests(data || []);
  };

  useEffect(() => {
    loadRecords();
    loadCarryRequests();
    setActiveTab("overview");
  }, [selectedYear]);

  // ---------------------------
  // Filters
  // ---------------------------
  const employees = [...new Set(records.map((x) => x.employee_name))];

  const filteredRecords = records.filter((r) => {
    if (filterEmployee !== "all" && r.employee_name !== filterEmployee)
      return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  // ---------------------------
  // Approve / Reject logic
  // ---------------------------
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

  return (
    <ScrollView style={styles.container}>
    <View style={{ flex: 1, paddingTop: 100 }}>
        
      {/* ---------------- HEADER ---------------- */}
        <View style={styles.row}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>Leave Report</Text>
        </View>
      {/* ---------------- TABS ---------------- */}
      <View style={styles.tabs}>
        <TouchableOpacity
        style={[styles.tab, activeTab === "overview" && styles.activeTab]}
        onPress={() => setActiveTab("overview")}
        >
        <Text style={activeTab === "overview" ? styles.activeTabText : styles.tabText}>
            Overview
        </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "approvals" && styles.activeTab]}
          onPress={() => setActiveTab("approvals")}
        >
        <Text style={activeTab === "approvals" ? styles.activeTabText : styles.tabText}>
            Approvals
        </Text>        
        </TouchableOpacity>
      </View>

      {/* ---------------- OVERVIEW TAB ---------------- */}
      {activeTab === "overview" && (
        <View style={{ marginTop: 20 }}>
          {/* Filters */}
          <Text style={styles.sectionTitle}>Filters</Text>

          {/* Employee filter */}
          <View style={styles.filterBox}>
            <Picker
              selectedValue={filterEmployee}
              onValueChange={(v) => setFilterEmployee(v)}
            >
              <Picker.Item label="All Employees" value="all" />
              {employees.map((e) => (
                <Picker.Item key={e} label={e} value={e} />
              ))}
            </Picker>
          </View>

          {/* From Date */}
          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => setShowFromPicker(true)}
          >
            <Text>{dateFrom || "From Date"}</Text>
          </TouchableOpacity>

          {showFromPicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              onChange={(_, d) => {
                setShowFromPicker(false);
                if (d) setDateFrom(d.toISOString().split("T")[0]);
              }}
            />
          )}

          {/* To Date */}
          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => setShowToPicker(true)}
          >
            <Text>{dateTo || "To Date"}</Text>
          </TouchableOpacity>

          {showToPicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              onChange={(_, d) => {
                setShowToPicker(false);
                if (d) setDateTo(d.toISOString().split("T")[0]);
              }}
            />
          )}

          {/* Records */}
          <Text style={styles.sectionTitle}>Leave Records</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#0A1A4F" />
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
        <View style={{ marginTop: 20 }}>
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
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f6f6f6", padding: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#0A1A4F", marginBottom: 10 },

  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#ddd",
    borderRadius: 8,
    alignItems: "center",
  },
  activeTab: { backgroundColor: "#0A1A4F" },

activeTabText: {
    color: "#fff",
    fontWeight: "700",
    },
tabText: {
    color: "#000",
    fontWeight: "600",
    },

  sectionTitle: { fontSize: 18, marginVertical: 10, fontWeight: "600" },

  filterBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 10,
  },

  dateBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },

  recordCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  recordTitle: { fontWeight: "700", marginBottom: 4 },

  noData: {
    color: "#777",
    textAlign: "center",
    paddingVertical: 20,
  },

  requestCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },

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
  approve: { backgroundColor: "#10b981" },
  reject: { backgroundColor: "#ef4444" },
  btnText: { color: "#fff", fontWeight: "700" },

row: {
    flexDirection: "row",
    gap: 10,
  },
    backButton: {
    marginBottom: 10,
    alignSelf: "flex-start",
    padding: 6,
  },
});
