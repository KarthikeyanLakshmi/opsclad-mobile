import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/src/lib/supabase";

/* =========================
   THEME
========================= */
const COLORS = {
  bg: "#f4f4f5",          // light neutral background
  card: "#ffffff",
  border: "#e5e7eb",

  primary: "#1b2a41",     // navy (main brand)
  accent: "#ff6b6b",      // coral (actions / highlights)

  text: "#1b2a41",
  muted: "#6b7280",

  success: "#16a34a",     // green (safe to keep)
  warning: "#f59e0b",     // amber
  danger: "#ef4444",      // red
};

/* =========================
   COMPONENT
========================= */
export default function ManualTimesheetEntryScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  /* Date range */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  /* Entry fields */
  const [hours, setHours] = useState(8);
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");

  /* Projects */
  const [assignedProjects, setAssignedProjects] = useState<
    { client: string; project: string }[]
  >([]);

  /* Range analysis */
  const [rangeStatus, setRangeStatus] = useState<
    {
      date: string;
      exists: boolean;
      blocked: boolean;
      blockedReason?: "PTO" | "HOLIDAY";
    }[]
  >([]);

  /* ================= LOAD USER ================= */

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      Alert.alert("Session expired", "Please log in again.");
      return;
    }

    setCurrentUser(data.user);

    const { data: role, error } = await supabase
    .from("user_roles")
    .select("profiles(employee_id, username, email)")
    .eq("user_id", data.user.id)
    .single();

    if (error || !role?.profiles) {
    Alert.alert("Profile error", "Unable to load profile");
    return;
    }

const profile = Array.isArray(role.profiles)
  ? role.profiles[0]
  : role.profiles;

if (!profile?.employee_id) {
  Alert.alert("Profile error", "Employee ID not found");
  return;
}

setProfile(profile);
loadAssignedProjects(profile.employee_id);
    setLoading(false);
  };

  const loadAssignedProjects = async (employeeId: string) => {
    const { data } = await supabase
      .from("projects")
      .select("client, project")
      .eq("employee_id", employeeId);

    setAssignedProjects(data || []);
  };

  /* ================= HELPERS ================= */

  const getDateRange = (from: string, to: string) => {
    const start = new Date(from);
    const end = new Date(to);
    const dates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }

    return dates;
  };

  const toMMDDYYYY = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y}`;
  };

  /* ================= RANGE CHECK ================= */

  useEffect(() => {
    if (fromDate && toDate && profile?.employee_id) {
      checkRange();
    } else {
      setRangeStatus([]);
    }
  }, [fromDate, toDate]);

  const checkRange = async () => {
    const dates = getDateRange(fromDate, toDate);
    if (!dates.length) return;

    const formatted = dates.map(toMMDDYYYY);

    const { data: timesheets } = await supabase
      .from("timesheets")
      .select("date")
      .eq("employee_id", profile.employee_id)
      .in("date", formatted);

    const existingSet = new Set((timesheets || []).map(t => t.date));

    const { data: pto } = await supabase
      .from("pto_records")
      .select("date")
      .eq("employee_id", profile.employee_id)
      .eq("status", "approved")
      .in("date", dates);

    const ptoSet = new Set((pto || []).map(p => p.date));

    const { data: holidays } = await supabase
      .from("holidays")
      .select("holiday_date")
      .in("holiday_date", dates);

    const holidaySet = new Set((holidays || []).map(h => h.holiday_date));

    setRangeStatus(
      dates.map(d => {
        if (ptoSet.has(d)) {
          return { date: d, exists: false, blocked: true, blockedReason: "PTO" };
        }
        if (holidaySet.has(d)) {
          return { date: d, exists: false, blocked: true, blockedReason: "HOLIDAY" };
        }
        return {
          date: d,
          exists: existingSet.has(toMMDDYYYY(d)),
          blocked: false,
        };
      })
    );
  };

  /* ================= SUBMIT ================= */

  const submitManual = async () => {
    if (!profile?.employee_id || !client || !project) {
      Alert.alert("Missing fields", "Please complete all fields.");
      return;
    }

    if (hours <= 0 || hours > 8) {
      Alert.alert("Invalid hours", "Hours must be between 1 and 8.");
      return;
    }

    if (rangeStatus.length === 0) {
      Alert.alert("Select dates", "Please select a valid date range.");
      return;
    }

    const payload = rangeStatus
      .filter(r => !r.blocked)
      .map(r => ({
        date: toMMDDYYYY(r.date),
        day: new Date(r.date).toLocaleDateString("en-US", { weekday: "long" }),
        hours,
        required_hours: 8,
        client,
        project,
        activity: "manual",
        employee_id: profile.employee_id,
        employee_name: profile.username,
        sender_email: profile.email,
        updated_at: new Date().toISOString(),
      }));

    if (!payload.length) {
      Alert.alert("No valid dates", "All dates are PTO or holidays.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("timesheets").upsert(payload, {
      onConflict: "date,sender_email,project,client",
    });

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", "Failed to save timesheet.");
      return;
    }

    Alert.alert("Success", "Manual timesheet saved.");
    setRangeStatus([]);
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const clients = [...new Set(assignedProjects.map(p => p.client))];
  const projects = assignedProjects
    .filter(p => !client || p.client === client)
    .map(p => p.project);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          {/* DATE RANGE */}
          <Text style={styles.label}>From Date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
            <Text style={styles.text}>{fromDate || "Select date"}</Text>
          </TouchableOpacity>

          {showFromPicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              onChange={(_, d) => {
                setShowFromPicker(false);
                if (d) setFromDate(d.toISOString().split("T")[0]);
              }}
            />
          )}

          <Text style={styles.label}>To Date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
            <Text style={styles.text}>{toDate || "Select date"}</Text>
          </TouchableOpacity>

          {showToPicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              onChange={(_, d) => {
                setShowToPicker(false);
                if (d) setToDate(d.toISOString().split("T")[0]);
              }}
            />
          )}

          {/* HOURS */}
          <Text style={styles.label}>Hours</Text>
          <Picker selectedValue={hours} onValueChange={setHours}>
            {[1,2,3,4,5,6,7,8].map(h => (
              <Picker.Item key={h} label={`${h}`} value={h} />
            ))}
          </Picker>

          {/* CLIENT */}
          <Text style={styles.label}>Client</Text>
          <Picker selectedValue={client} onValueChange={setClient}>
            <Picker.Item label="Select client" value="" />
            {clients.map(c => (
              <Picker.Item key={c} label={c} value={c} />
            ))}
          </Picker>

          {/* PROJECT */}
          <Text style={styles.label}>Project</Text>
          <Picker selectedValue={project} onValueChange={setProject}>
            <Picker.Item label="Select project" value="" />
            {projects.map(p => (
              <Picker.Item key={p} label={p} value={p} />
            ))}
          </Picker>

          {/* PREVIEW */}
          {rangeStatus.length > 0 && (
            <View style={styles.preview}>
              {rangeStatus.map(r => (
                <Text
                  key={r.date}
                  style={{
                    color: r.blocked
                      ? COLORS.danger
                      : r.exists
                      ? COLORS.warning
                      : COLORS.success,
                  }}
                >
                  {r.date} → {r.blocked ? r.blockedReason : r.exists ? "Update" : "New"}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={submitManual}
            disabled={submitting}
          >
            <Text style={styles.submitText}>
              {submitting ? "Submitting…" : "Submit Entry"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  label: {
    color: COLORS.text,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 4,
  },

  text: { color: COLORS.text },

  dateBtn: {
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  preview: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 8,
  },

  submitBtn: {
    backgroundColor: COLORS.accent,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },

  submitText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
  },
});
