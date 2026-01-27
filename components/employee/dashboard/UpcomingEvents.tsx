import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../../src/lib/supabase";

/* ---------------- TYPES ---------------- */

type Employee = {
  id: string;
  name: string;
  birthday: string | null;
};

type Holiday = {
  id: string;
  holiday: string;
  holiday_date: string;
  holiday_description?: string;
};

type EventType = "Birthday" | "Holiday";

type EventItem = {
  id: string;
  date: string;
  displayDate: string;
  type: EventType;
  title: string;
  description?: string;
};

/* ---------------- HELPERS ---------------- */

function normalizeDate(date: string | null): string | null {
  if (!date) return null;
  if (date.includes("T")) return date.split("T")[0];
  return date;
}

function pretty(date: string) {
  return new Date(date).toLocaleDateString();
}

/* ---------------- COMPONENT ---------------- */

export default function UpcomingEvents() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);

    try {
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name, birthday");

      setEmployees(emp || []);

      const { data: hol } = await supabase.from("holidays").select("*");
      setHolidays(hol || []);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- BUILD EVENTS ---------------- */

  const events = useMemo<EventItem[]>(() => {
    const items: EventItem[] = [];
    const [year, month] = currentMonth.split("-");

    // Birthdays
    employees.forEach((e) => {
      const d = normalizeDate(e.birthday);
      if (!d) return;

      const [, mm, dd] = d.split("-");
      if (mm === month) {
        const date = `${year}-${mm}-${dd}`;
        items.push({
          id: `b-${e.id}`,
          date,
          displayDate: pretty(date),
          type: "Birthday",
          title: `${e.name}'s Birthday`,
        });
      }
    });

    // Holidays
    holidays.forEach((h) => {
      if (!h.holiday_date.startsWith(currentMonth)) return;

      items.push({
        id: `h-${h.id}`,
        date: h.holiday_date,
        displayDate: pretty(h.holiday_date),
        type: "Holiday",
        title: h.holiday,
        description: h.holiday_description,
      });
    });

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [employees, holidays, currentMonth]);

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#0A1A4F" />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>No upcoming events this month.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {events.map((e) => (
        <View key={e.id} style={styles.row}>
          <Text style={styles.date}>{e.displayDate}</Text>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.badge,
                e.type === "Birthday"
                  ? styles.badgeBirthday
                  : styles.badgeHoliday,
              ]}
            >
              {e.type}
            </Text>

            <Text style={styles.title}>{e.title}</Text>

            {e.description && (
              <Text style={styles.desc}>{e.description}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },

  center: {
    paddingVertical: 20,
    alignItems: "center",
  },

  empty: {
    textAlign: "center",
    color: "#6B7280",
    paddingVertical: 10,
  },

  row: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },

  date: {
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
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },

  badgeBirthday: {
    backgroundColor: "#EAB308",
  },

  badgeHoliday: {
    backgroundColor: "#F97316",
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  desc: {
    fontSize: 14,
    color: "#475569",
  },
});
