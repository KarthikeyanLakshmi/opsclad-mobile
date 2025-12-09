/** FULL FILE — WITH DATE PICKERS ADDED **/

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";
import {
  format,
  parseISO,
  startOfYear,
  endOfYear,
  isFuture,
  isToday,
} from "date-fns";

/* ------------------------- TYPES ------------------------- */
interface PTORecord {
  id: string;
  date: string;
  day: string;
  hours: number;
  employee_name: string;
  employee_id: string;
  sender_email: string;
  updated_at: string;
  is_pto: boolean;
  status: string;
  request_reason?: string;
}

interface PTORequest {
  date: string;
  hours: number;
  reason: string;
}

interface EmployeePTOSummary {
  employee_id: string;
  employee_name: string;
  sender_email: string;
  total_pto_hours: number;
  total_pto_days: number;
  remaining_pto_days: number;
  non_pto_hours: number;
  non_pto_days: number;
  effective_pto_limit: number;
}

interface Employee {
  employee_id: string;
  name: string;
  email_id: string;
}

/* ------------------------- MAIN SCREEN ------------------------- */
export default function EmployeePTOTrackingScreen() {
  const [ptoRecords, setPtoRecords] = useState<PTORecord[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "reports">("overview");

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [isPTORequestOpen, setIsPTORequestOpen] = useState(false);
  const [ptoRequest, setPtoRequest] = useState<PTORequest>({
    date: "",
    hours: 8,
    reason: "",
  });

  const [submittingPTO, setSubmittingPTO] = useState(false);

  /* ---------------- DATE PICKER STATES ---------------- */
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRequestPicker, setShowRequestPicker] = useState(false);

  const BASE_PTO_LIMIT_DAYS = 12;

  const router = useRouter();

  /* ------------------------- HELPERS ------------------------- */

  const showError = (title: string, message: string) =>
    Alert.alert(title, message);

  const showInfo = (title: string, message: string) =>
    Alert.alert(title, message);

  const loadEmployeeInfo = async (userEmail: string) => {
    const { data, error } = await supabase
      .from("employees")
      .select("employee_id, name, email_id")
      .eq("email_id", userEmail)
      .single();

    if (!error && data) {
      setCurrentEmployee(data as Employee);
    } else {
      setCurrentEmployee({
        employee_id: "TEMP_" + Date.now(),
        name: "Unknown Employee",
        email_id: userEmail,
      });
    }
  };

  const yearStart = useMemo(
    () => startOfYear(new Date(selectedYear, 0, 1)),
    [selectedYear]
  );
  const yearEnd = useMemo(
    () => endOfYear(new Date(selectedYear, 11, 31)),
    [selectedYear]
  );

  const getSummary = (): EmployeePTOSummary | null => {
    if (!currentEmployee) return null;

    const userRecords = ptoRecords.filter((r) => {
      const d = new Date(r.date);
      return (
        r.sender_email === currentEmployee.email_id &&
        r.status === "approved" &&
        d >= yearStart &&
        d <= yearEnd
      );
    });

    let ptoHours = 0;
    let nonPtoHours = 0;

    userRecords.forEach((rec) =>
      rec.is_pto ? (ptoHours += rec.hours) : (nonPtoHours += rec.hours)
    );

    const ptoDays = ptoHours / 8;
    const nonPtoDays = nonPtoHours / 8;
    const remaining = Math.max(0, BASE_PTO_LIMIT_DAYS - ptoDays);

    return {
      employee_id: currentEmployee.employee_id,
      employee_name: currentEmployee.name,
      sender_email: currentEmployee.email_id,
      total_pto_hours: ptoHours,
      total_pto_days: ptoDays,
      remaining_pto_days: remaining,
      non_pto_hours: nonPtoHours,
      non_pto_days: nonPtoDays,
      effective_pto_limit: BASE_PTO_LIMIT_DAYS,
    };
  };

  const filteredRecords = () =>
    ptoRecords.filter((r) => {
      const d = new Date(r.date);
      return (
        r.sender_email === currentEmployee?.email_id &&
        d >= yearStart &&
        d <= yearEnd &&
        (!dateRange.start || r.date >= dateRange.start) &&
        (!dateRange.end || r.date <= dateRange.end)
      );
    });

  /* ------------------------- LOAD DATA ------------------------- */

  const loadPTORecords = async () => {
    try {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      await loadEmployeeInfo(user.email!);

      const { data, error } = await supabase
        .from("pto_records")
        .select("*")
        .eq("sender_email", user.email)
        .order("date", { ascending: false });

      if (error) {
        showError("Error Loading Data", "Unable to load PTO records.");
        return;
      }

      setPtoRecords(data || []);
    } catch (err) {
      showError("Error", "Unexpected error loading data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPTORecords();
  }, [selectedYear]);

  /* ------------------------- SUBMIT PTO REQUEST ------------------------- */

  const submitPTORequest = async () => {
    if (!ptoRequest.date) {
      showError("Invalid", "Please choose a date.");
      return;
    }

    const requestDate = new Date(ptoRequest.date);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    requestDate.setHours(0, 0, 0, 0);

    if (!isFuture(requestDate) && !isToday(requestDate)) {
      showError("Invalid Date", "Request date cannot be in the past.");
      return;
    }

    setSubmittingPTO(true);

    try {
      const dayName = requestDate.toLocaleDateString("en-US", {
        weekday: "short",
      });

      await supabase.from("pto_records").insert({
        date: ptoRequest.date,
        day: dayName.toUpperCase(),
        hours: ptoRequest.hours,
        employee_name: currentEmployee?.name,
        employee_id: currentEmployee?.employee_id,
        sender_email: currentUser?.email,
        request_reason: ptoRequest.reason,
        status: "pending",
        is_pto: false,
        activity: "PTO Request",
      });

      showInfo("Success", "Leave request submitted.");
      setIsPTORequestOpen(false);

      setPtoRequest({ date: "", hours: 8, reason: "" });

      loadPTORecords();
    } catch (err) {
      showError("Error", "Request failed.");
    } finally {
      setSubmittingPTO(false);
    }
  };

  /* ------------------------- RENDER ------------------------- */

  if (!currentEmployee) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
        <Text>Loading employee info...</Text>
      </View>
    );
  }

  const summary = getSummary();
  const records = filteredRecords();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View style={{ flex: 1, paddingTop: 10, backgroundColor: "#f4f4f5" }}>
        <View style={[styles.container]}>
          {/* BACK */}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/home")}
            >
              <Feather name="arrow-left" size={22} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Leave Tracking</Text>
          </View>

          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>
              Year {selectedYear} • PTO limit: {summary?.effective_pto_limit} days
            </Text>
          </View>

          {/* YEAR SELECTOR */}
          <View style={styles.yearRow}>
            <TouchableOpacity
              onPress={() => setSelectedYear((y) => y - 1)}
              style={styles.yearBtn}
            >
              <Ionicons name="chevron-back" size={16} color="#111" />
            </TouchableOpacity>

            <Text style={styles.yearText}>{selectedYear}</Text>

            <TouchableOpacity
              onPress={() => setSelectedYear((y) => y + 1)}
              style={styles.yearBtn}
            >
              <Ionicons name="chevron-forward" size={16} color="#111" />
            </TouchableOpacity>
          </View>

          {/* REQUEST LEAVE BUTTON */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: "#0A1A4F" }]}
              onPress={() => setIsPTORequestOpen(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color="white" />
              <Text style={styles.btnText}>Request Leave</Text>
            </TouchableOpacity>
          </View>

          {/* TABS */}
          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => setActiveTab("overview")}
              style={[styles.tab, activeTab === "overview" && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "overview" && styles.tabTextActive,
                ]}
              >
                Leave Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("reports")}
              style={[styles.tab, activeTab === "reports" && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "reports" && styles.tabTextActive,
                ]}
              >
                My Analytics
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {/* ------------------- OVERVIEW TAB ------------------- */}
            {activeTab === "overview" && (
              <View>
                {/* DATE FILTERS */}
                <View style={styles.filterRow}>
                  {/* Start date */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Start Date</Text>

                    <TouchableOpacity
                      onPress={() => setShowStartPicker(true)}
                      style={styles.input}
                    >
                      <Text
                        style={{
                          color: dateRange.start ? "#111827" : "#9ca3af",
                        }}
                      >
                        {dateRange.start || "Start Date"}
                      </Text>
                    </TouchableOpacity>

                    {showStartPicker && (
                      <DateTimePicker
                        value={new Date()}
                        mode="date"
                        onChange={(e, d) => {
                          setShowStartPicker(false);
                          if (d) {
                            setDateRange((prev) => ({
                              ...prev,
                              start: d.toISOString().split("T")[0],
                            }));
                          }
                        }}
                      />
                    )}
                  </View>

                  {/* End date */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>End Date</Text>

                    <TouchableOpacity
                      onPress={() => setShowEndPicker(true)}
                      style={styles.input}
                    >
                      <Text
                        style={{
                          color: dateRange.end ? "#111827" : "#9ca3af",
                        }}
                      >
                        {dateRange.end || "End Date"}
                      </Text>
                    </TouchableOpacity>

                    {showEndPicker && (
                      <DateTimePicker
                        value={new Date()}
                        mode="date"
                        onChange={(e, d) => {
                          setShowEndPicker(false);
                          if (d) {
                            setDateRange((prev) => ({
                              ...prev,
                              end: d.toISOString().split("T")[0],
                            }));
                          }
                        }}
                      />
                    )}
                  </View>
                </View>

                {/* ---------------- RECORD LIST ---------------- */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>My Leave Records</Text>
                  <Text style={styles.cardSubtitle}>
                    Showing {records.length} records for {selectedYear}
                  </Text>

                  {loading ? (
                    <View style={{ marginTop: 16 }}>
                      <ActivityIndicator size="small" color="#111" />
                    </View>
                  ) : records.length === 0 ? (
                    <Text style={{ textAlign: "center", marginTop: 20 }}>
                      No records found.
                    </Text>
                  ) : (
                    records.map((rec) => (
                      <View
                        key={rec.id}
                        style={[styles.recordRow, { borderColor: "#e5e7eb" }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#111", fontSize: 13 }}>
                            {format(parseISO(rec.date), "yyyy-MM-dd")}
                          </Text>
                          <Text style={{ color: "#6b7280", fontSize: 11 }}>
                            {rec.day}
                          </Text>
                        </View>

                        <View style={styles.badgeSmall}>
                          <Text style={{ color: "#1d4ed8" }}>
                            {rec.hours} h
                          </Text>
                        </View>

                        <View style={styles.badgeSmall}>
                          <Text
                            style={{
                              color: rec.is_pto ? "#0f766e" : "#d97706",
                            }}
                          >
                            {rec.is_pto ? "PTO" : "Non-PTO"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                rec.status === "approved"
                                  ? "#dcfce7"
                                  : rec.status === "pending"
                                  ? "#fef9c3"
                                  : "#fee2e2",
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              rec.status === "approved"
                                ? "checkmark-circle"
                                : rec.status === "pending"
                                ? "time"
                                : "close-circle"
                            }
                            size={12}
                            color={
                              rec.status === "approved"
                                ? "#16a34a"
                                : rec.status === "pending"
                                ? "#ca8a04"
                                : "#b91c1c"
                            }
                          />

                          <Text style={styles.statusText}>
                            {rec.status}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* ------------------- REPORTS TAB ------------------- */}
            {activeTab === "reports" && summary && (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Leave Summary</Text>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>PTO Used</Text>
                    <Text style={{ fontWeight: "700" }}>
                      {summary.total_pto_days.toFixed(1)} days
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>PTO Remaining</Text>
                    <Text
                      style={{
                        fontWeight: "700",
                        color:
                          summary.remaining_pto_days <= 1
                            ? "#dc2626"
                            : "#16a34a",
                      }}
                    >
                      {summary.remaining_pto_days.toFixed(1)} days
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Non-PTO</Text>
                    <Text style={{ fontWeight: "700" }}>
                      {summary.non_pto_days.toFixed(1)} days
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ------------------- PTO REQUEST MODAL ------------------- */}
          <Modal visible={isPTORequestOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Request Leave</Text>

                {/* DATE PICKER FIELD */}
                <TouchableOpacity
                  onPress={() => setShowRequestPicker(true)}
                  style={styles.modalInput}
                >
                  <Text style={{ color: ptoRequest.date ? "#111" : "#9ca3af" }}>
                    {ptoRequest.date || "Select Date"}
                  </Text>
                </TouchableOpacity>

                {showRequestPicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    onChange={(e, d) => {
                      setShowRequestPicker(false);
                      if (d) {
                        setPtoRequest((prev) => ({
                          ...prev,
                          date: d.toISOString().split("T")[0],
                        }));
                      }
                    }}
                  />
                )}

                {/* HOURS */}
                <TextInput
                  placeholder="Hours (e.g., 8)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  style={styles.modalInput}
                  value={String(ptoRequest.hours)}
                  onChangeText={(text) =>
                    setPtoRequest((prev) => ({
                      ...prev,
                      hours: parseInt(text || "0", 10),
                    }))
                  }
                />

                {/* REASON */}
                <TextInput
                  placeholder="Reason (optional)"
                  placeholderTextColor="#9ca3af"
                  style={[styles.modalInput, { height: 80 }]}
                  multiline
                  value={ptoRequest.reason}
                  onChangeText={(t) =>
                    setPtoRequest((prev) => ({ ...prev, reason: t }))
                  }
                />

                {/* BUTTONS */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    onPress={() => setIsPTORequestOpen(false)}
                    style={[styles.modalBtn, { borderColor: "#d1d5db" }]}
                  >
                    <Text>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={submitPTORequest}
                    disabled={submittingPTO}
                    style={[
                      styles.modalBtn,
                      {
                        backgroundColor: "#f97316",
                        borderColor: "#f97316",
                      },
                    ]}
                  >
                    {submittingPTO ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: "white", fontWeight: "700" }}>
                        Submit
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },

  backButton: {
    padding: 6,
    alignSelf: "flex-start",
  },

  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },

  headerSubtitle: { fontSize: 12, color: "#6b7280" },

  yearRow: { flexDirection: "row", alignItems: "center", marginVertical: 12 },

  yearBtn: {
    padding: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 20,
  },

  yearText: { marginHorizontal: 10, fontWeight: "700" },

  actionRow: { flexDirection: "row", justifyContent: "flex-end" },

  btnPrimary: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  btnText: { color: "#fff", fontWeight: "700", marginLeft: 6 },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 20,
    padding: 4,
    marginVertical: 10,
  },

  tab: { flex: 1, paddingVertical: 6, alignItems: "center" },

  activeTab: { backgroundColor: "#fff", borderRadius: 20 },

  tabText: { fontSize: 12, color: "#6b7280" },

  tabTextActive: { color: "#111827", fontWeight: "700" },

  filterRow: { flexDirection: "row", gap: 10, marginBottom: 10 },

  label: { fontSize: 12, color: "#4b5563", marginBottom: 4 },

  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },

  cardTitle: { fontSize: 16, fontWeight: "700" },

  cardSubtitle: { fontSize: 12, color: "#6b7280" },

  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    marginHorizontal: 4,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },

  statusText: {
    marginLeft: 4,
    fontSize: 11,
    textTransform: "capitalize",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },

  modalBox: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },

  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },

  modalInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  modalBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
  },

  summaryValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  
  header: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
},
});
