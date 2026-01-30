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

/* =========================
   THEME
========================= */
const COLORS = {
  primary: "#1b2a41",
  accent: "#ff6b6b",
  bg: "#F3F4F6",
  card: "#ffffff",
  modal: "#ffffff",
  border: "#E5E7EB",
  textDark: "#111827",
  textMuted: "#6B7280",
};

/* =========================
   TYPES
========================= */

type Role = "manager" | "employee";

type PTORecord = {
  id: string;
  date: string;
  employee_name: string;
  employee_id: string;
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
};

type SelectedDateInfo = {
  date: Date;
  ptoRecords: PTORecord[];
  birthdays: Employee[];
  holidays: HolidayRecord[];
};

type Props = { role: Role };

/* =========================
   HELPERS
========================= */

function normalizeDate(date: string | null) {
  if (!date) return null;
  return date.includes("T") ? date.split("T")[0] : date;
}

function expandRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const out: string[] = [];
  const cur = new Date(s);

  while (cur <= e) {
    out.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
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

/* =========================
   DATE DETAILS MODAL
========================= */

function DateDetailsModal({
  selectedDate,
  onClose,
}: {
  selectedDate: SelectedDateInfo | null;
  onClose: () => void;
}) {
  if (!selectedDate) return null;

  return (
    <Modal transparent animationType="slide">
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
              <Section title="🎉 Birthdays" color="#FACC15">
                {selectedDate.birthdays.map((b) => (
                  <Item key={b.id} bg="rgba(250,204,21,0.15)" text={b.name} />
                ))}
              </Section>
            )}

            {selectedDate.ptoRecords.length > 0 && (
              <Section title="👥 Employees on Leave" color="#22C55E">
                {selectedDate.ptoRecords.map((p) => (
                  <Item
                    key={p.id}
                    bg="rgba(34,197,94,0.15)"
                    text={p.employee_name}
                  />
                ))}
              </Section>
            )}

            {selectedDate.holidays.length > 0 && (
              <Section title="🎌 Public Holidays" color={COLORS.accent}>
                {selectedDate.holidays.map((h) => (
                  <Item
                    key={h.id}
                    bg="rgba(255,107,107,0.15)"
                    text={h.holiday}
                  />
                ))}
              </Section>
            )}

            {selectedDate.birthdays.length === 0 &&
              selectedDate.ptoRecords.length === 0 &&
              selectedDate.holidays.length === 0 && (
                <Text style={styles.emptyText}>No activity for this date</Text>
              )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const Section = ({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
    {children}
  </View>
);

const Item = ({ text, bg }: { text: string; bg: string }) => (
  <View style={[styles.itemBox, { backgroundColor: bg }]}>
    <Text style={styles.itemText}>{text}</Text>
  </View>
);

/* =========================
   CALENDAR TAB
========================= */

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
      expandRange(r.start, r.end).forEach((d) =>
        addDot(d, "#22C55E")
      )
    );

    employees.forEach((e) => {
      const d = normalizeDate(e.birthday);
      if (!d) return;
      const [, mm, dd] = d.split("-");
      addDot(`${year}-${mm}-${dd}`, "#FACC15");
    });

    holidays.forEach((h) => addDot(h.holiday_date, COLORS.accent));

    setMarkedDates(marks);
  }, [ptoRecords, employees, holidays]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
                  return `${new Date().getFullYear()}-${mm}-${dd}` === day.dateString;
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

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    margin: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 15,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    backgroundColor: COLORS.modal,
    borderRadius: 16,
    maxHeight: "85%",
  },

  modalHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  modalHeaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },

  close: {
    fontSize: 18,
    color: COLORS.textMuted,
  },

  modalContent: { padding: 20 },

  section: { marginBottom: 20 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  itemBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },

  itemText: {
    color: COLORS.textDark,
    fontSize: 16,
  },

  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
  },
});
