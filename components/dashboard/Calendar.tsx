import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { supabase } from "../../src/lib/supabase";
import { format } from "date-fns";

/* =====================================================
   TYPES
===================================================== */

type Role = "manager" | "employee";

type PTORecord = {
  id: string;
  date: string;
  day?: string;
  hours?: number;
  employee_name: string;
  employee_id: string;
  sender_email?: string;
  updated_at?: string;
  is_pto: boolean;
  status: "pending" | "approved" | "rejected";
};

type Employee = {
  id: string;
  name: string;
  birthday: string | null;
};

type HolidayRecord = {
  id: string;
  holiday: string;
  holiday_date: string;
  holiday_description: string | null;
};

type SelectedDateInfo = {
  date: Date;
  ptoRecords: PTORecord[];
  birthdays: Employee[];
  holidays: HolidayRecord[];
};

type Props = {
  role: Role;
};

/* =====================================================
   HELPERS
===================================================== */

function normalizeDate(date: string | null): string | null {
  if (!date) return null;
  if (date.includes("T")) return date.split("T")[0];
  return date;
}

function expandRange(start: string, end: string): string[] {
  const s = new Date(start);
  const e = new Date(end);
  const arr: string[] = [];
  const cur = new Date(s);

  while (cur <= e) {
    arr.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
}

function buildRanges(dates: string[]) {
  if (!dates.length) return [];
  const sorted = [...dates].sort();
  const ranges: { start: string; end: string }[] = [];

  let start = sorted[0];
  let prev = sorted[0];

  sorted.slice(1).forEach((d) => {
    const diff =
      (new Date(d).getTime() - new Date(prev).getTime()) / 86400000;
    if (diff === 1) {
      prev = d;
    } else {
      ranges.push({ start, end: prev });
      start = d;
      prev = d;
    }
  });

  ranges.push({ start, end: prev });
  return ranges;
}

/* =====================================================
   DATE DETAILS MODAL
===================================================== */

function DateDetailsModal({
  selectedDate,
  onClose,
}: {
  selectedDate: SelectedDateInfo | null;
  onClose: () => void;
}) {
  if (!selectedDate) return null;

  return (
    <Modal animationType="slide" transparent visible>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderText}>
              {format(selectedDate.date, "MMMM dd, yyyy")}
            </Text>

            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✖</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedDate.birthdays.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: "#FFD54F" }]}>
                  🎉 Birthdays
                </Text>
                {selectedDate.birthdays.map((emp) => (
                  <View key={emp.id} style={[styles.itemBox, styles.yellowBox]}>
                    <Text style={styles.itemName}>{emp.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedDate.ptoRecords.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: "#81C784" }]}>
                  👥 Employees on Leave
                </Text>
                {selectedDate.ptoRecords.map((rec) => (
                  <View key={rec.id} style={[styles.itemBox, styles.greenBox]}>
                    <Text style={styles.itemName}>{rec.employee_name}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedDate.holidays.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: "#FFB74D" }]}>
                  🎌 Public Holidays
                </Text>
                {selectedDate.holidays.map((hol) => (
                  <View key={hol.id} style={[styles.itemBox, styles.orangeBox]}>
                    <Text style={styles.itemName}>{hol.holiday}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedDate.birthdays.length === 0 &&
              selectedDate.ptoRecords.length === 0 &&
              selectedDate.holidays.length === 0 && (
                <Text style={{ color: "#aaa", textAlign: "center" }}>
                  No activity for this date
                </Text>
              )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* =====================================================
   CALENDAR TAB (MAIN EXPORT)
===================================================== */

export default function CalendarTab({ role }: Props) {
  const [loading, setLoading] = useState(true);
  const [ptoRecords, setPtoRecords] = useState<PTORecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedInfo, setSelectedInfo] =
    useState<SelectedDateInfo | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: pto } = await supabase.from("pto_records").select("*");
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name, birthday");
      const { data: hol } = await supabase.from("holidays").select("*");

      setPtoRecords(pto || []);
      setEmployees(emp || []);
      setHolidays(hol || []);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const marks: any = {};
    const year = new Date().getFullYear();

    function addDot(date: string, color: string) {
      (marks[date] ||= { dots: [] }).dots.push({ color });
    }

    const ptoDates = ptoRecords
      .filter((p) => p.is_pto && p.status !== "rejected")
      .map((p) => normalizeDate(p.date)!);

    buildRanges(ptoDates).forEach((r) =>
      expandRange(r.start, r.end).forEach((d) => addDot(d, "green"))
    );

    employees.forEach((e) => {
      const d = normalizeDate(e.birthday);
      if (!d) return;
      const [, mm, dd] = d.split("-");
      addDot(`${year}-${mm}-${dd}`, "yellow");
    });

    holidays.forEach((h) => addDot(h.holiday_date, "orange"));

    setMarkedDates(marks);
  }, [ptoRecords, employees, holidays]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0A1A4F" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView>
        <View style={styles.card}>
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={(day) =>
              setSelectedInfo({
                date: new Date(day.dateString),
                ptoRecords: ptoRecords.filter(
                  (p) => normalizeDate(p.date) === day.dateString
                ),
                birthdays: employees.filter((e) => {
                  const d = normalizeDate(e.birthday);
                  if (!d) return false;
                  const [, mm, dd] = d.split("-");
                  return (
                    `${new Date().getFullYear()}-${mm}-${dd}` ===
                    day.dateString
                  );
                }),
                holidays: holidays.filter(
                  (h) => h.holiday_date === day.dateString
                ),
              })
            }
          />
        </View>
      </ScrollView>

      <DateDetailsModal
        selectedDate={selectedInfo}
        onClose={() => setSelectedInfo(null)}
      />
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    maxHeight: "85%",
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalHeaderText: { fontSize: 20, color: "#fff" },
  close: { fontSize: 20, color: "#ccc" },
  modalContent: { padding: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "bold", marginBottom: 10 },
  itemBox: { padding: 12, borderRadius: 10, marginBottom: 8 },
  yellowBox: { backgroundColor: "rgba(255,214,79,0.2)" },
  greenBox: { backgroundColor: "rgba(129,199,132,0.2)" },
  orangeBox: { backgroundColor: "rgba(255,183,77,0.2)" },
  itemName: { color: "#fff", fontSize: 16 },
});
