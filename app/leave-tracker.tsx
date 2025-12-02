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
import { Ionicons, Feather } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
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

  const BASE_PTO_LIMIT_DAYS = 12;
  const currentYear = selectedYear;

  const yearStart = useMemo(
    () => startOfYear(new Date(currentYear, 0, 1)),
    [currentYear]
  );
  const yearEnd = useMemo(
    () => endOfYear(new Date(currentYear, 11, 31)),
    [currentYear]
  );

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
    const effectiveLimit = BASE_PTO_LIMIT_DAYS;
    const remaining = Math.max(0, effectiveLimit - ptoDays);

    return {
      employee_id: currentEmployee.employee_id,
      employee_name: currentEmployee.name,
      sender_email: currentEmployee.email_id,
      total_pto_hours: ptoHours,
      total_pto_days: ptoDays,
      remaining_pto_days: remaining,
      non_pto_hours: nonPtoHours,
      non_pto_days: nonPtoDays,
      effective_pto_limit: effectiveLimit,
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
        console.error("Error loading PTO records:", error);
        showError(
          "Error Loading Data",
          "Failed to fetch leave records. Please try again."
        );
        setLoading(false);
        return;
      }

      setPtoRecords((data || []) as PTORecord[]);
    } catch (err) {
      console.error("Error loading PTO records:", err);
      showError(
        "Error",
        "An unexpected error occurred while loading your data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPTORecords();
  }, [selectedYear]);

  /* ------------------------- ACTIONS ------------------------- */

  const submitPTORequest = async () => {
    if (
      !currentUser ||
      !currentEmployee ||
      !ptoRequest.date ||
      ptoRequest.hours <= 0
    ) {
      showError("Invalid Request", "Please fill in all required fields.");
      return;
    }

    const requestDate = new Date(ptoRequest.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requestDate.setHours(0, 0, 0, 0);

    if (!isFuture(requestDate) && !isToday(requestDate)) {
      showError(
        "Invalid Date",
        "You can only request leave for today or future dates."
      );
      return;
    }

    setSubmittingPTO(true);

    try {
      const dayName = requestDate
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();

      const { error } = await supabase.from("pto_records").insert({
        date: ptoRequest.date,
        day: dayName,
        hours: ptoRequest.hours,
        employee_name: currentEmployee.name,
        employee_id: currentEmployee.employee_id,
        sender_email: currentUser.email,
        activity: "PTO Request",
        status: "pending",
        request_reason: ptoRequest.reason,
        is_pto: false,
      });

      // @ts-ignore - unique violation check
      if (error && error.code === "23505") {
        showError(
          "Duplicate Request",
          `A leave request for ${format(requestDate, "yyyy-MM-dd")} already exists.`
        );
        return;
      }

      if (error) {
        console.error("Error submitting PTO request:", error);
        showError(
          "Submission Failed",
          "Failed to submit your leave request. Please try again."
        );
        return;
      }

      showInfo(
        "Request Submitted",
        "Your leave request has been submitted for manager approval."
      );

      setPtoRequest({ date: "", hours: 8, reason: "" });
      setIsPTORequestOpen(false);
      await loadPTORecords();
    } catch (err) {
      console.error("Unexpected error submitting PTO request:", err);
      showError(
        "Error",
        "An unexpected error occurred while submitting your request."
      );
    } finally {
      setSubmittingPTO(false);
    }
  };

  /* ------------------------- RENDER ------------------------- */

  if (!currentEmployee) {
    return (
      <View style={[styles.center, { backgroundColor: "#f4f4f5" }]}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={{ color: "#4b5563", marginTop: 8 }}>
          Loading employee information...
        </Text>
      </View>
    );
  }

  const summary = getSummary();
  const records = filteredRecords();

  return (
    <View style={[styles.container, { backgroundColor: "#f4f4f5" }]}>
      {/* BACK BUTTON */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/(tabs)/home")}
      >
        <Feather name="arrow-left" size={22} color="#111827" />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Leave Tracking</Text>
          <Text style={styles.headerSubtitle}>
            Year {currentYear} • PTO limit:{" "}
            {summary?.effective_pto_limit || BASE_PTO_LIMIT_DAYS} days
          </Text>
        </View>
      </View>

      {/* Year Selector */}
      <View style={styles.yearRow}>
        <TouchableOpacity
          onPress={() => setSelectedYear((y) => y - 1)}
          style={styles.yearBtn}
        >
          <Ionicons name="chevron-back" size={16} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.yearText}>{selectedYear}</Text>

        <TouchableOpacity
          onPress={() => setSelectedYear((y) => y + 1)}
          style={styles.yearBtn}
        >
          <Ionicons name="chevron-forward" size={16} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: "#f97316" }]}
          onPress={() => setIsPTORequestOpen(true)}
        >
          <Ionicons name="add-circle-outline" size={16} color="white" />
          <Text style={styles.btnText}>Request Leave</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setActiveTab("overview")}
          style={[
            styles.tab,
            activeTab === "overview" && styles.activeTab,
          ]}
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
          style={[
            styles.tab,
            activeTab === "reports" && styles.activeTab,
          ]}
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
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <View>
            {/* Date filters */}
            <View style={styles.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  value={dateRange.start}
                  onChangeText={(text) =>
                    setDateRange((prev) => ({ ...prev, start: text }))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End Date</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  value={dateRange.end}
                  onChangeText={(text) =>
                    setDateRange((prev) => ({ ...prev, end: text }))
                  }
                />
              </View>
            </View>

            {/* Records card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>My Leave Records</Text>
              <Text style={styles.cardSubtitle}>
                Showing {records.length} records for {currentYear}
              </Text>

              {loading ? (
                <View style={{ marginTop: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#111827" />
                </View>
              ) : records.length === 0 ? (
                <View style={{ marginTop: 20, alignItems: "center" }}>
                  <Text style={{ color: "#6b7280" }}>
                    No leave records found.
                  </Text>
                </View>
              ) : (
                records.map((rec) => (
                  <View
                    key={rec.id}
                    style={[styles.recordRow, { borderColor: "#e5e7eb" }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#111827", fontSize: 13 }}>
                        {format(parseISO(rec.date), "yyyy-MM-dd")}
                      </Text>
                      <Text style={{ color: "#6b7280", fontSize: 11 }}>
                        {rec.day}
                      </Text>
                    </View>

                    <View style={styles.badgeSmall}>
                      <Text style={{ color: "#1d4ed8", fontSize: 11 }}>
                        {rec.hours} h
                      </Text>
                    </View>

                    <View style={styles.badgeSmall}>
                      <Text
                        style={{
                          color: rec.is_pto ? "#0f766e" : "#d97706",
                          fontSize: 11,
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
                        {rec.status.charAt(0).toUpperCase() +
                          rec.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && summary && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Leave Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>PTO Used</Text>
                <Text style={[styles.summaryValue, { color: "#1d4ed8" }]}>
                  {summary.total_pto_days.toFixed(1)} days
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>PTO Remaining</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        summary.remaining_pto_days <= 1
                          ? "#dc2626"
                          : "#16a34a",
                    },
                  ]}
                >
                  {summary.remaining_pto_days.toFixed(1)} days
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Non-PTO</Text>
                <Text style={[styles.summaryValue, { color: "#d97706" }]}>
                  {summary.non_pto_days.toFixed(1)} days
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>PTO Usage</Text>
              <Text style={styles.cardSubtitle}>
                Visual representation of used vs total
              </Text>

              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${
                        Math.min(
                          100,
                          (summary.total_pto_days /
                            summary.effective_pto_limit) *
                            100
                        ) || 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* PTO Request Modal */}
      <Modal
        visible={isPTORequestOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPTORequestOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Request Leave</Text>

            <TextInput
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#9ca3af"
              style={styles.modalInput}
              value={ptoRequest.date}
              onChangeText={(text) =>
                setPtoRequest((prev) => ({ ...prev, date: text }))
              }
            />

            <TextInput
              placeholder="Hours (e.g., 8)"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              style={styles.modalInput}
              value={String(ptoRequest.hours)}
              onChangeText={(text) =>
                setPtoRequest((prev) => ({
                  ...prev,
                  hours: parseInt(text || "0", 10) || 0,
                }))
              }
            />

            <TextInput
              placeholder="Reason (optional)"
              placeholderTextColor="#9ca3af"
              style={[styles.modalInput, { height: 80 }]}
              multiline
              value={ptoRequest.reason}
              onChangeText={(text) =>
                setPtoRequest((prev) => ({ ...prev, reason: text }))
              }
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsPTORequestOpen(false)}
                style={[styles.modalBtn, { borderColor: "#d1d5db" }]}
              >
                <Text style={{ color: "#374151" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitPTORequest}
                disabled={submittingPTO}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#f97316",
                    borderColor: "#f97316",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                {submittingPTO ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons
                      name="send-outline"
                      size={16}
                      color="#ffffff"
                    />
                    <Text style={{ color: "#ffffff", marginLeft: 6 }}>
                      Submit
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  yearBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  yearText: {
    marginHorizontal: 10,
    fontWeight: "600",
    color: "#111827",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnText: {
    color: "#ffffff",
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 20,
    padding: 4,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#ffffff",
  },
  tabText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#111827",
    fontWeight: "700",
  },

  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    // light shadow similar to other pages
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
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
    color: "#111827",
    textTransform: "capitalize",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
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

  barBg: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  barFill: {
    height: 10,
    backgroundColor: "#16a34a",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 10,
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  backButton: {
    marginBottom: 10,
    alignSelf: "flex-start",
    padding: 6,
  },
});
