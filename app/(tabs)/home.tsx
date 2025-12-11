import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Animated,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import DateDetailsModal from "../../components/dashboard/DateDetailsModal";
import { LoadingOverlay } from "../../src/components/loadingOverlay";

import {
  PTORecord,
  Employee,
  HolidayRecord,
  SelectedDateInfo,
} from "../../src/types/calendar";

// ---------- Types ----------
type EventType = "Birthday" | "Holiday";

interface MonthEvent {
  id: string;
  sortDate: string;
  displayDate: string;
  type: EventType;
  title: string;
  description?: string;
}

// ---------- Utility Helpers ----------
function normalizeDate(date: string | null): string | null {
  if (!date) return null;
  if (date.includes("T")) return date.split("T")[0];
  if (date.includes("/")) {
    const [day, month, year] = date.split("/");
    return `${year}-${month}-${day}`;
  }
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

function formatPretty(date: string) {
  return new Date(date).toLocaleDateString();
}

function formatRangePretty(start: string, end: string) {
  if (start === end) return formatPretty(start);
  return `${formatPretty(start)} - ${formatPretty(end)}`;
}

function buildContinuousRanges(dates: string[]): { start: string; end: string }[] {
  if (dates.length === 0) return [];

  const result: { start: string; end: string }[] = [];
  let rangeStart = dates[0];
  let prev = dates[0];

  dates.slice(1).forEach((cur) => {
    const diff =
      (new Date(cur).getTime() - new Date(prev).getTime()) / 86400000;

    if (diff === 1) {
      prev = cur;
    } else {
      result.push({ start: rangeStart, end: prev });
      rangeStart = cur;
      prev = cur;
    }
  });

  result.push({ start: rangeStart, end: prev });
  return result;
}

function rangeIntersectsMonth(start: string, end: string, month: string) {
  return expandRange(start, end).some((d) => d.startsWith(month));
}

// ---------- Home Screen ----------
export default function HomeScreen() {
  const [loading, setLoading] = useState(false);

  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedInfo, setSelectedInfo] = useState<SelectedDateInfo | null>(null);
  const [isManager, setIsManager] = useState(false);

  const [ptoRecords, setPtoRecords] = useState<PTORecord[]>([]);
  const [birthdays, setBirthdays] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);

  const [monthEvents, setMonthEvents] = useState<MonthEvent[]>([]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
  });

  // Animation refs
  const ptoAnim = useRef(new Animated.Value(0)).current;
  const nonPtoAnim = useRef(new Animated.Value(0)).current;

  function animateBadge(anim: Animated.Value) {
    Animated.timing(anim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }

  // ---------- Load Data ----------
  async function loadCalendarData() {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setIsManager(false);
        setPtoRecords([]);
        setBirthdays([]);
        setHolidays([]);
        setLoading(false);
        return;
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setIsManager(roleRow?.role === "manager");

      let ptoQuery = supabase.from("pto_records").select("*");
      if (roleRow?.role !== "manager") {
        ptoQuery = ptoQuery.eq("sender_email", user.email);
      }

      const { data: ptoData } = await ptoQuery;
      setPtoRecords(ptoData || []);

      const { data: empData } = await supabase
        .from("employees")
        .select("id, name, birthday");
      setBirthdays(empData || []);

      const { data: holData } = await supabase.from("holidays").select("*");
      setHolidays(holData || []);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendarData();
  }, []);


    // ---------- PTO RANGES ----------
  const ptoRanges = useMemo(() => {
    const byEmp: Record<string, string[]> = {};

    ptoRecords.forEach((p) => {
      if (p.is_pto === false) return;
      const key = `${p.employee_id}__${p.employee_name}`;
      (byEmp[key] ||= []).push(normalizeDate(p.date)!);
    });

    const result: { employeeId: string; employeeName: string; start: string; end: string }[] = [];

    Object.entries(byEmp).forEach(([key, dates]) => {
      const [id, name] = key.split("__");
      const sorted = dates.sort();
      const ranges = buildContinuousRanges(sorted);

      ranges.forEach((r) =>
        result.push({ employeeId: id, employeeName: name, start: r.start, end: r.end })
      );
    });

    return result;
  }, [ptoRecords]);

  // ---------- NON PTO RANGES ----------
  const nonPtoRanges = useMemo(() => {
    const byEmp: Record<string, string[]> = {};

    ptoRecords.forEach((p) => {
      if (p.is_pto !== false) return;
      const key = `${p.employee_id}__${p.employee_name}`;
      (byEmp[key] ||= []).push(normalizeDate(p.date)!);
    });

    const result: { employeeId: string; employeeName: string; start: string; end: string }[] = [];

    Object.entries(byEmp).forEach(([key, dates]) => {
      const [id, name] = key.split("__");
      const sorted = dates.sort();
      const ranges = buildContinuousRanges(sorted);

      ranges.forEach((r) =>
        result.push({ employeeId: id, employeeName: name, start: r.start, end: r.end })
      );
    });

    return result;
  }, [ptoRecords]);

  // ---------- Mark Calendar ----------
  useEffect(() => {
    const marks: Record<string, any> = {};
    const year = new Date().getFullYear();

    function addDot(date: string, color: string) {
      (marks[date] ||= { dots: [] }).dots.push({ color });
    }

    ptoRanges.forEach((r) =>
      expandRange(r.start, r.end).forEach((d) => addDot(d, "green"))
    );

    nonPtoRanges.forEach((r) =>
      expandRange(r.start, r.end).forEach((d) => addDot(d, "purple"))
    );

    birthdays.forEach((b) => {
      const clean = normalizeDate(b.birthday);
      if (clean) {
        const [, mm, dd] = clean.split("-");
        addDot(`${year}-${mm}-${dd}`, "yellow");
      }
    });

    holidays.forEach((h) => addDot(h.holiday_date, "orange"));

    setMarkedDates(marks);
  }, [ptoRanges, nonPtoRanges, birthdays, holidays]);

  // ---------- MONTH EVENTS (only Holidays + Birthdays) ----------
  useEffect(() => {
    const events: MonthEvent[] = [];
    const [year, month] = currentMonth.split("-");

    birthdays.forEach((b) => {
      const clean = normalizeDate(b.birthday);
      if (!clean) return;
      const [, mm, dd] = clean.split("-");
      if (mm === month) {
        const date = `${year}-${mm}-${dd}`;
        events.push({
          id: `bday-${b.id}`,
          sortDate: date,
          displayDate: formatPretty(date),
          type: "Birthday",
          title: `Birthday – ${b.name}`,
        });
      }
    });

    // group holidays
    const holMap: Record<string, { dates: string[]; desc?: string }> = {};
    holidays.forEach((h) => {
      if (!h.holiday_date.startsWith(currentMonth)) return;
      (holMap[h.holiday] ||= { dates: [], desc: h.holiday_description }).dates.push(
        h.holiday_date
      );
    });

    Object.entries(holMap).forEach(([name, group]) => {
      const sorted = group.dates.sort();
      const ranges = buildContinuousRanges(sorted);

      ranges.forEach((r, i) =>
        events.push({
          id: `hol-${name}-${i}`,
          sortDate: r.start,
          displayDate: formatRangePretty(r.start, r.end),
          type: "Holiday",
          title: name,
          description: group.desc,
        })
      );
    });

    events.sort((a, b) => a.sortDate.localeCompare(b.sortDate));
    setMonthEvents(events);
  }, [birthdays, holidays, currentMonth]);

  // ---------- PTO TABLE (Approved + Pending only) ----------
  const ptoTable = useMemo(() => {
    const rows: {
      name: string;
      ranges: { start: string; end: string; status: string }[];
    }[] = [];

    const byEmp: Record<string, { name: string; items: { date: string; status: string }[] }> = {};

    ptoRecords.forEach((p) => {
      if (p.is_pto === false) return;

      // ❌ Skip rejected leaves entirely
      if (p.status?.toLowerCase() === "rejected") return;

      const date = normalizeDate(p.date);
      if (!date) return;

      const key = `${p.employee_id}__${p.employee_name}`;
      (byEmp[key] ||= { name: p.employee_name, items: [] }).items.push({
        date,
        status: p.status?.toLowerCase() === "approved" ? "Approved" : "Pending",
      });
    });

    Object.values(byEmp).forEach((emp) => {
      const sorted = emp.items.sort((a, b) => a.date.localeCompare(b.date));
      const dates = sorted.map((x) => x.date);
      const ranges = buildContinuousRanges(dates);

      const finalRanges = ranges
        .map((r) => {
          const statuses = sorted
            .filter((x) => x.date >= r.start && x.date <= r.end)
            .map((x) => x.status);

          const status = statuses.includes("Pending") ? "Pending" : "Approved";
          return { start: r.start, end: r.end, status };
        })
        .filter((r) => rangeIntersectsMonth(r.start, r.end, currentMonth));

      if (finalRanges.length) rows.push({ name: emp.name, ranges: finalRanges });
    });

    if (rows.length) animateBadge(ptoAnim);

    return rows;
  }, [ptoRecords, currentMonth]);

  // ---------- NON PTO TABLE (Approved + Pending only) ----------
  const nonPtoTable = useMemo(() => {
    const rows: {
      name: string;
      ranges: { start: string; end: string; status: string }[];
    }[] = [];

    const byEmp: Record<string, { name: string; items: { date: string; status: string }[] }> = {};

    ptoRecords.forEach((p) => {
      if (p.is_pto !== false) return;

      // ❌ Skip rejected leaves entirely
      if (p.status?.toLowerCase() === "rejected") return;

      const date = normalizeDate(p.date);
      if (!date) return;

      const key = `${p.employee_id}__${p.employee_name}`;
      (byEmp[key] ||= { name: p.employee_name, items: [] }).items.push({
        date,
        status: p.status?.toLowerCase() === "approved" ? "Approved" : "Pending",
      });
    });

    Object.values(byEmp).forEach((emp) => {
      const sorted = emp.items.sort((a, b) => a.date.localeCompare(b.date));
      const dates = sorted.map((x) => x.date);
      const ranges = buildContinuousRanges(dates);

      const finalRanges = ranges
        .map((r) => {
          const statuses = sorted
            .filter((x) => x.date >= r.start && x.date <= r.end)
            .map((x) => x.status);

          const status = statuses.includes("Pending") ? "Pending" : "Approved";
          return { start: r.start, end: r.end, status };
        })
        .filter((r) => rangeIntersectsMonth(r.start, r.end, currentMonth));

      if (finalRanges.length) rows.push({ name: emp.name, ranges: finalRanges });
    });

    if (rows.length) animateBadge(nonPtoAnim);

    return rows;
  }, [ptoRecords, currentMonth]);

  // ---------- Day Select ----------
  function onDaySelect(day: { dateString: string }) {
    const clicked = day.dateString;
    const year = new Date().getFullYear();

    const ptoForDay = ptoRecords.filter(
      (p) => normalizeDate(p.date) === clicked
    );

    const selected: SelectedDateInfo = {
      date: new Date(clicked),
      ptoRecords: ptoForDay,
      birthdays: birthdays.filter((b) => {
        const d = normalizeDate(b.birthday);
        if (!d) return false;
        const [, mm, dd] = d.split("-");
        return `${year}-${mm}-${dd}` === clicked;
      }),
      holidays: holidays.filter((h) => h.holiday_date === clicked),
    };

    setSelectedInfo(selected);
  }

  // ---------- UI ----------
  return (
    <View style={styles.root}>
      {loading && <LoadingOverlay />}

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DataClad Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Calendar */}
        <View style={styles.card}>
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={onDaySelect}
            onMonthChange={(m) => {
              const mm = String(m.month).padStart(2, "0");
              setCurrentMonth(`${m.year}-${mm}`);
            }}
            style={styles.calendar}
            renderHeader={(date) => (
              <Text style={styles.calendarHeaderText}>
                {date.toString("MMMM yyyy")}
              </Text>
            )}
            theme={{
              todayTextColor: "#0A1A4F",
              arrowColor: "#0A1A4F",
            }}
          />
        </View>

        {/* EVENTS */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
        </View>
        <View style={styles.card}>
          {monthEvents.length === 0 ? (
            <Text style={styles.emptyText}>No events this month.</Text>
          ) : (
            monthEvents.map((ev: MonthEvent) => (
              <View key={ev.id} style={styles.eventRow}>
                <Text style={styles.eventDate}>{ev.displayDate}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.badge,
                      ev.type === "Birthday"
                        ? styles.badgeBirthday
                        : styles.badgeHoliday,
                    ]}
                  >
                    {ev.type}
                  </Text>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  {ev.description && (
                    <Text style={styles.eventDesc}>{ev.description}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* PTO HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Paid Time Offs</Text>
          {ptoTable.length > 0 && (
            <Animated.View
              style={[
                styles.pillBadge,
                styles.pillPto,
                {
                  opacity: ptoAnim,
                  transform: [
                    {
                      scale: ptoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="white"
              />
              <Text style={styles.pillText}>PTO</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.card}>
          {ptoTable.length === 0 ? (
            <Text style={styles.emptyText}>No PTO records.</Text>
          ) : (
            ptoTable.map((emp) => (
              <View key={emp.name} style={styles.ptoBlock}>
                <Text style={styles.ptoName}>{emp.name}</Text>

                {emp.ranges.map((range, idx) => (
                  <Text key={idx} style={styles.ptoRange}>
                    • {formatRangePretty(range.start, range.end)}{" "}
                    <Text
                      style={
                        range.status === "Approved"
                          ? styles.statusApproved
                          : styles.statusPending
                      }
                    >
                      ({range.status})
                    </Text>
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>

        {/* NON PTO HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Non PTO Leaves</Text>
          {nonPtoTable.length > 0 && (
            <Animated.View
              style={[
                styles.pillBadge,
                styles.pillNonPto,
                {
                  opacity: nonPtoAnim,
                  transform: [
                    {
                      scale: nonPtoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={16} color="white" />
              <Text style={styles.pillText}>Non-PTO</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.card}>
          {nonPtoTable.length === 0 ? (
            <Text style={styles.emptyText}>No non-PTO leave records.</Text>
          ) : (
            nonPtoTable.map((emp) => (
              <View key={emp.name} style={styles.ptoBlock}>
                <Text style={styles.ptoName}>{emp.name}</Text>

                {emp.ranges.map((range, idx) => (
                  <Text key={idx} style={styles.ptoRange}>
                    • {formatRangePretty(range.start, range.end)}{" "}
                    <Text
                      style={
                        range.status === "Approved"
                          ? styles.statusApproved
                          : styles.statusPending
                      }
                    >
                      ({range.status})
                    </Text>
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <DateDetailsModal
        selectedDate={selectedInfo}
        onClose={() => setSelectedInfo(null)}
      />
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  header: {
    paddingTop: 55,
    paddingBottom: 20,
    backgroundColor: "#0A1A4F",
    alignItems: "center",
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "white",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0A1A4F",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    marginTop: 10,
    marginBottom: 6,
    gap: 10,
  },

  // Pill Badges
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },

  pillPto: {
    backgroundColor: "#22C55E",
  },

  pillNonPto: {
    backgroundColor: "purple",
  },

  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
  },

  card: {
    marginHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    marginBottom: 16,
  },

  calendar: {
    borderRadius: 16,
    backgroundColor: "#fff",
  },

  calendarHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0A1A4F",
    paddingVertical: 6,
    textAlign: "center",
  },

  emptyText: {
    textAlign: "center",
    paddingVertical: 10,
    color: "#6B7280",
  },

  eventRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },

  eventDate: {
    width: 100,
    fontWeight: "700",
    color: "#111827",
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    color: "white",
    fontWeight: "700",
    fontSize: 11,
    marginBottom: 4,
  },

  badgeBirthday: { backgroundColor: "#EAB308" },
  badgeHoliday: { backgroundColor: "#F97316" },

  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  eventDesc: {
    fontSize: 14,
    color: "#475569",
  },

  ptoBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },

  ptoName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A1A4F",
    marginBottom: 4,
  },

  ptoRange: {
    fontSize: 14,
    color: "#374151",
  },

  statusApproved: {
    color: "#16A34A",
    fontWeight: "600",
  },

  statusPending: {
    color: "#F97316",
    fontWeight: "600",
  },
});
