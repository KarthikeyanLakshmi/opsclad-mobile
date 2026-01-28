import React, { useEffect, useMemo, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native"
import { supabase } from "../../src/lib/supabase"

/* ---------------- TYPES ---------------- */

type Employee = {
  id: string
  name: string
  birthday: string | null
}

type Holiday = {
  id: string
  holiday: string
  holiday_date: string
  holiday_description?: string
}

type EventType = "Birthday" | "Holiday"

type EventItem = {
  id: string
  date: string
  displayDate: string
  type: EventType
  title: string
  description?: string
}

type Props = {
  selectedMonth: Date   // ✅ NEW
}

/* ---------------- HELPERS ---------------- */

function normalizeDate(date: string | null): string | null {
  if (!date) return null
  if (date.includes("T")) return date.split("T")[0]
  return date
}

function pretty(date: string) {
  return new Date(date).toLocaleDateString()
}

/* ---------------- COMPONENT ---------------- */

export default function UpcomingEvents({ selectedMonth }: Props) {
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])

  /* 🔹 Month key (YYYY-MM) */
  const monthKey = useMemo(() => {
    return `${selectedMonth.getFullYear()}-${String(
      selectedMonth.getMonth() + 1
    ).padStart(2, "0")}`
  }, [selectedMonth])

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    setLoading(true)

    try {
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name, birthday")

      setEmployees(emp || [])

      const { data: hol } = await supabase
        .from("holidays")
        .select("id, holiday, holiday_date, holiday_description")

      setHolidays(hol || [])
    } catch (e: any) {
      Alert.alert("Error", e.message)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- BUILD EVENTS ---------------- */

  const events = useMemo<EventItem[]>(() => {
    const items: EventItem[] = []
    const [year, month] = monthKey.split("-")

    /* 🎂 Birthdays (month-based) */
    employees.forEach(e => {
      const d = normalizeDate(e.birthday)
      if (!d) return

      const [, mm, dd] = d.split("-")
      if (mm !== month) return

      const date = `${year}-${mm}-${dd}`
      items.push({
        id: `b-${e.id}`,
        date,
        displayDate: pretty(date),
        type: "Birthday",
        title: `${e.name}'s Birthday`,
      })
    })

    /* 🎌 Holidays (full date-based) */
    holidays.forEach(h => {
      const normalized = normalizeDate(h.holiday_date)
      if (!normalized) return

      if (!normalized.startsWith(monthKey)) return

      items.push({
        id: `h-${h.id}`,
        date: normalized,
        displayDate: pretty(normalized),
        type: "Holiday",
        title: h.holiday,
        description: h.holiday_description,
      })
    })

    return items.sort((a, b) => a.date.localeCompare(b.date))
  }, [employees, holidays, monthKey])

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#0A1A4F" />
      </View>
    )
  }

  if (events.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>No upcoming events this month.</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      {/* HEADER – same as Announcements */}
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming Events</Text>
      </View>

      {events.length === 0 ? (
        <Text style={styles.empty}>No upcoming events this month.</Text>
      ) : (
        events.map(e => (
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

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
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
})
