import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../src/lib/supabase";

/* =========================
   THEME
========================= */
const COLORS = {
  primary: "#1b2a41", // navy
  accent: "#ff6b6b",  // coral
  bg: "#FFFFFF",
  border: "#E5E7EB",
  textDark: "#111827",
  textMuted: "#6B7280",
  birthday: "#CA8A04",
  holiday: "#ff6b6b",
};

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

type Props = {
  selectedMonth: Date;
};

/* ---------------- HELPERS ---------------- */

function normalizeDate(date: string | null): string | null {
  if (!date) return null;
  return date.includes("T") ? date.split("T")[0] : date;
}

function pretty(date: string) {
  return new Date(date).toLocaleDateString();
}

/* ---------------- COMPONENT ---------------- */

export default function UpcomingEvents({ selectedMonth }: Props) {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  /* 🔹 Month key (YYYY-MM) */
  const monthKey = useMemo(() => {
    return `${selectedMonth.getFullYear()}-${String(
      selectedMonth.getMonth() + 1
    ).padStart(2, "0")}`;
  }, [selectedMonth]);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name, birthday");

      const { data: hol } = await supabase
        .from("holidays")
        .select("id, holiday, holiday_date, holiday_description");

      setEmployees(emp || []);
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
    const [year, month] = monthKey.split("-");

    /* 🎂 Birthdays */
    employees.forEach((e) => {
      const d = normalizeDate(e.birthday);
      if (!d) return;

      const [, mm, dd] = d.split("-");
      if (mm !== month) return;

      const date = `${year}-${mm}-${dd}`;
      items.push({
        id: `b-${e.id}`,
        date,
        displayDate: pretty(date),
        type: "Birthday",
        title: `${e.name}'s Birthday`,
      });
    });

    /* 🎌 Holidays */
    holidays.forEach((h) => {
      const normalized = normalizeDate(h.holiday_date);
      if (!normalized || !normalized.startsWith(monthKey)) return;

      items.push({
        id: `h-${h.id}`,
        date: normalized,
        displayDate: pretty(normalized),
        type: "Holiday",
        title: h.holiday,
        description: h.holiday_description,
      });
    });

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [employees, holidays, monthKey]);

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={COLORS.primary} />
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
      {/* HEADER – ALWAYS VISIBLE */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      {/* BODY */}
      {events.length === 0 ? (
        <Text style={styles.empty}>No events this month.</Text>
      ) : (
        events.map((e) => (
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
        ))
      )}
    </View>
  )

}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },

  card: {
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 16,
  },

  center: {
    paddingVertical: 20,
    alignItems: "center",
  },

  empty: {
    textAlign: "center",
    color: COLORS.textMuted,
    paddingVertical: 10,
  },

  row: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },

  date: {
    width: 100,
    fontWeight: "700",
    color: COLORS.textDark,
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },

  badgeBirthday: {
    backgroundColor: COLORS.birthday,
  },

  badgeHoliday: {
    backgroundColor: COLORS.accent,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },

  desc: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
