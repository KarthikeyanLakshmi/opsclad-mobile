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
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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

  const [submittingPTO, setSubmittingPTO] = useState(false);

  // Date picker visibility states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [leaveRange, setLeaveRange] = useState({
    start: "",
    end: "",
  })

  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)

  const [leaveReason, setLeaveReason] = useState("");


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
  const insets = useSafeAreaInsets();


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

  const checkForDuplicateDates = async (dates: string[]) => {
    const { data, error } = await supabase
      .from("pto_records")
      .select("date")
      .eq("sender_email", currentUser!.email)
      .in("date", dates);

    if (error) {
      throw new Error("Failed to validate existing leave records.");
    }

    return data || [];
  };

const submitLeaveRange = async () => {
  if (!leaveRange.start || !leaveRange.end) {
    showError("Invalid Request", "Please select a valid date range.");
    return;
  }

  setSubmittingPTO(true);

  try {
    /* ---------------------------------
       Build date list
    --------------------------------- */
    const dates: string[] = [];
    let cur = new Date(leaveRange.start);
    const end = new Date(leaveRange.end);

    while (cur <= end) {
      dates.push(format(cur, "yyyy-MM-dd"));
      cur.setDate(cur.getDate() + 1);
    }

    /* ---------------------------------
       DUPLICATE DATE CHECK (NEW)
    --------------------------------- */
    const existing = await checkForDuplicateDates(dates);

    if (existing.length > 0) {
      showError(
        "Date Conflict",
        `You already have leave on:\n${existing
          .map((e) => e.date)
          .join(", ")}`
      );
      return;
    }

    /* ---------------------------------
       Build rows
    --------------------------------- */
    const rows = dates.map((date) => ({
      date,
      day: new Date(date)
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase(),
      hours: 8,
      employee_name: currentEmployee!.name,
      employee_id: currentEmployee!.employee_id,
      sender_email: currentUser!.email,
      activity: "PTO Request",
      status: "pending",
      request_reason: leaveReason,
      is_pto: true,
    }));

    /* ---------------------------------
       Insert
    --------------------------------- */
    const { error } = await supabase.from("pto_records").insert(rows);

    if (error) {
      showError("Submission Failed", "Could not submit leave request.");
      return;
    }

    showInfo(
      "Leave Submitted",
      `Leave requested for ${dates.length} day(s).`
    );

    /* ---------------------------------
       Cleanup
    --------------------------------- */
    setLeaveRange({ start: "", end: "" });
    setLeaveReason("");
    setIsPTORequestOpen(false);
    loadPTORecords();
  } catch (err) {
    console.error(err);
    showError("Error", "Unexpected error while submitting leave.");
  } finally {
    setSubmittingPTO(false);
  }
};


const resetLeaveForm = () => {
  setLeaveRange({ start: "", end: "" });
  setLeaveReason("");
  setShowStartPicker(false);
  setShowEndPicker(false);
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
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.bg,
            paddingTop: insets.top, // ONLY top safe area
          }}
        >
        <View style={[styles.container]}>
          {/* BACK BUTTON + TITLE */}
          <View style={styles.row}>
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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: 20, // small breathing room, NOT tab bar height
          }}
        >      
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
            onRequestClose={() => {
              resetLeaveForm();
              setIsPTORequestOpen(false);
            }}          
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Request Leave</Text>

                {/* PTO date picker */}
                {/* START DATE */}
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(true)}>
                  <View style={styles.modalInput}>
                    <Text style={{ color: leaveRange.start ? "#111827" : "#9ca3af" }}>
                      {leaveRange.start || "YYYY-MM-DD"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {showStartPicker && (
                  <DateTimePicker
                    value={leaveRange.start ? new Date(leaveRange.start) : new Date()}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onChange={(e, d) => {
                      setShowStartPicker(false);
                      if (d)
                        setLeaveRange({ start: format(d, "yyyy-MM-dd"), end: "" });
                    }}
                  />
                )}

                {/* END DATE */}
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity
                  disabled={!leaveRange.start}
                  onPress={() => setShowEndPicker(true)}
                >
                  <View style={[styles.modalInput, !leaveRange.start && { opacity: 0.5 }]}>
                    <Text style={{ color: leaveRange.end ? "#111827" : "#9ca3af" }}>
                      {leaveRange.end || "YYYY-MM-DD"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {showEndPicker && (
                  <DateTimePicker
                    value={leaveRange.end ? new Date(leaveRange.end) : new Date(leaveRange.start)}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date(leaveRange.start)}
                    onChange={(e, d) => {
                      setShowEndPicker(false);
                      if (d)
                        setLeaveRange(prev => ({
                          ...prev,
                          end: format(d, "yyyy-MM-dd"),
                        }));
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
                  value={leaveReason}
                  onChangeText={setLeaveReason}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      resetLeaveForm();
                      setIsPTORequestOpen(false);
                    }}
                    style={[styles.modalBtn, { borderColor: "#d1d5db" }]}
                  >
                    <Text style={{ color: "#374151" }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={submitLeaveRange}
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
