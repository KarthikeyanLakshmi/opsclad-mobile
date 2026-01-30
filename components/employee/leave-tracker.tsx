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
import DateTimePicker from "@react-native-community/datetimepicker";

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

const COLORS = {
  primary: "#1b2a41",   // navy
  accent: "#ff6b6b",    // coral
  bg: "#f4f4f5",
  card: "#ffffff",
  muted: "#6b7280",
  border: "#e5e7eb",
  success: "#16a34a",
  warning: "#ca8a04",
  danger: "#dc2626",
};

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
    hours: 8, // full day fixed
    reason: "",
  });

  const [submittingPTO, setSubmittingPTO] = useState(false);

  // Date picker visibility states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showPTODatePicker, setShowPTODatePicker] = useState(false);

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

      /* ---------- Prevent duplicate PTO/non-PTO for same date ---------- */
      const { data: existing, error: existingError } = await supabase
        .from("pto_records")
        .select("id, status, is_pto")
        .eq("sender_email", currentUser.email)
        .eq("date", ptoRequest.date);

      if (existingError) {
        console.error("Error checking existing PTO:", existingError);
      }

      if (existing && existing.length > 0) {
        showError(
          "Duplicate Request",
          `You already have a leave record for ${format(
            requestDate,
            "yyyy-MM-dd"
          )}. Please pick a different date.`
        );
        return;
      }
      /* -------------------------------------------------------------- */

      /* ---------- PTO automation logic ---------- */
      // Look at this employee's PTO records for the selected year
      const yearPtoRecords = ptoRecords.filter((r) => {
        const d = new Date(r.date);
        return (
          r.sender_email === currentEmployee.email_id &&
          r.is_pto &&
          d >= yearStart &&
          d <= yearEnd
        );
      });

      const approvedPtoHours = yearPtoRecords
        .filter((r) => r.status === "approved")
        .reduce((sum, r) => sum + r.hours, 0);

      const pendingPtoHours = yearPtoRecords
        .filter((r) => r.status === "pending")
        .reduce((sum, r) => sum + r.hours, 0);

      const approvedDays = approvedPtoHours / 8;
      const pendingDays = pendingPtoHours / 8;
      const totalCommittedDays = approvedDays + pendingDays;
      const remainingPtoDays = BASE_PTO_LIMIT_DAYS - approvedDays;

      // PTO is considered "fully exhausted & settled" only when:
      // - all PTO limit days are approved, and
      // - there are no pending PTO days left.
      const isPtoExhausted =
        remainingPtoDays <= 0 && pendingDays === 0;

      let isPTOFlag = true;
      let activityLabel = "PTO Request";

      if (!isPtoExhausted) {
        // We still have some PTO capacity OR some pending PTO.
        // Stop employee from over-booking PTO (approved + pending > limit).
        const newRequestDays = ptoRequest.hours / 8; // full day = 1
        if (totalCommittedDays + newRequestDays > BASE_PTO_LIMIT_DAYS) {
          showError(
            "PTO Limit Reached",
            `You have already used or requested ${totalCommittedDays.toFixed(
              1
            )} days of PTO this year. Your limit is ${BASE_PTO_LIMIT_DAYS} days. Please wait for your manager to approve or reject existing requests before submitting more PTO.`
          );
          return;
        }
        // In this branch, request is PTO.
        isPTOFlag = true;
        activityLabel = "PTO Request";
      } else {
        // PTO days fully used and no pending PTO.
        // From now on, any new leave will be treated as Non-PTO.
        isPTOFlag = false;
        activityLabel = "Non-PTO Leave Request";
      }
      /* ------------------------------------------ */

      const { error } = await supabase.from("pto_records").insert({
        date: ptoRequest.date,
        day: dayName,
        hours: ptoRequest.hours, // always 8 (full day)
        employee_name: currentEmployee.name,
        employee_id: currentEmployee.employee_id,
        sender_email: currentUser.email,
        activity: activityLabel,
        status: "pending",
        request_reason: ptoRequest.reason,
        is_pto: isPTOFlag,
      });

      if (error) {
        console.error("Error submitting leave request:", error);
        showError(
          "Submission Failed",
          "Failed to submit your leave request. Please try again."
        );
        return;
      }

      showInfo(
        "Request Submitted",
        isPTOFlag
          ? "Your PTO request has been submitted for manager approval."
          : "Your Non-PTO leave request has been submitted for manager approval."
      );

      setPtoRequest({ date: "", hours: 8, reason: "" });
      setIsPTORequestOpen(false);
      await loadPTORecords();
    } catch (err) {
      console.error("Unexpected error submitting leave request:", err);
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
  const isPtoDepletedForUi =
    summary ? summary.remaining_pto_days <= 0 : false;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View style={{ flex: 1, paddingTop: 10, backgroundColor: "#f4f4f5" }}>
        <View style={[styles.container]}>
          {/* BACK BUTTON + TITLE */}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/home")}
            >
              <Feather name="arrow-left" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Leave Tracking</Text>
          </View>

          {/* Header subtitle */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSubtitle}>
                Year {currentYear} • PTO limit:{" "}
                {summary?.effective_pto_limit || BASE_PTO_LIMIT_DAYS} days
              </Text>
            </View>
          </View>

          {/* Year selector + Request Leave in same row */}
          <View style={styles.yearActionRow}>
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

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: "#0A1A4F" }]}
              onPress={() => setIsPTORequestOpen(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color={COLORS.accent} />
              <Text style={styles.btnText}>
                {isPtoDepletedForUi ? "Request Non-PTO Leave" : "Request Leave"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
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
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <View>
                {/* Date filters */}
                <View style={styles.filterRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Start Date</Text>
                    <TouchableOpacity
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <View style={styles.input}>
                        <Text
                          style={{
                            color: dateRange.start ? "#111827" : "#9ca3af",
                          }}
                        >
                          {dateRange.start || "YYYY-MM-DD"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={
                          dateRange.start
                            ? new Date(dateRange.start)
                            : new Date()
                        }
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          setShowStartDatePicker(false);
                          if (selectedDate) {
                            setDateRange((prev) => ({
                              ...prev,
                              start: format(selectedDate, "yyyy-MM-dd"),
                            }));
                          }
                        }}
                      />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>End Date</Text>
                    <TouchableOpacity
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <View style={styles.input}>
                        <Text
                          style={{
                            color: dateRange.end ? "#111827" : "#9ca3af",
                          }}
                        >
                          {dateRange.end || "YYYY-MM-DD"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={
                          dateRange.end ? new Date(dateRange.end) : new Date()
                        }
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          setShowEndDatePicker(false);
                          if (selectedDate) {
                            setDateRange((prev) => ({
                              ...prev,
                              end: format(selectedDate, "yyyy-MM-dd"),
                            }));
                          }
                        }}
                      />
                    )}
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

                {/* PTO date picker */}
                <TouchableOpacity onPress={() => setShowPTODatePicker(true)}>
                  <View style={styles.modalInput}>
                    <Text
                      style={{
                        color: ptoRequest.date ? "#111827" : "#9ca3af",
                      }}
                    >
                      {ptoRequest.date || "Date (YYYY-MM-DD)"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {showPTODatePicker && (
                  <DateTimePicker
                    value={
                      ptoRequest.date ? new Date(ptoRequest.date) : new Date()
                    }
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      setShowPTODatePicker(false);
                      if (selectedDate) {
                        setPtoRequest((prev) => ({
                          ...prev,
                          date: format(selectedDate, "yyyy-MM-dd"),
                        }));
                      }
                    }}
                  />
                )}

                {/* Fixed 8 hours (full day) */}
                <View style={styles.modalInput}>
                  <Text style={{ color: "#111827", fontSize: 13 }}>
                    8 hours (Full day)
                  </Text>
                </View>

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
                        backgroundColor: "#0A1A4F",
                        borderColor: "#0A1A4F",
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
                        <Text
                          style={{
                            color: "#ffffff",
                            marginLeft: 6,
                            fontWeight: "600",
                          }}
                        >
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
      </View>
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  /* ---------- Layout ---------- */
  container: {
    flex: 1,
    padding: 14,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },

  backButton: {
    padding: 6,
    borderRadius: 20,
  },

  /* ---------- Header ---------- */
  header: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },

  /* ---------- Year + Action ---------- */
  yearActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  yearBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: COLORS.border,
  },
  yearText: {
    marginHorizontal: 10,
    fontWeight: "600",
    color: COLORS.primary,
  },

  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  btnText: {
    color: "#ffffff",
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },

  /* ---------- Tabs ---------- */
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.border,
    borderRadius: 22,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 18,
  },
  activeTab: {
    backgroundColor: COLORS.card,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  /* ---------- Filters ---------- */
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  /* ---------- Cards ---------- */
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },

  /* ---------- Records ---------- */
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: `${COLORS.primary}15`,
    marginHorizontal: 4,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 11,
    color: COLORS.primary,
    textTransform: "capitalize",
    fontWeight: "600",
  },

  /* ---------- Summary ---------- */
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  /* ---------- Progress Bar ---------- */
  barBg: {
    marginTop: 10,
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  barFill: {
    height: 12,
    backgroundColor: COLORS.primary,
  },

  /* ---------- Modal ---------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 10,
  },
  modalBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
