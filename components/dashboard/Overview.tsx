import React, { useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Announcements from "./Announcement"
import UpcomingEvents from "./UpcomingEvents"

type Role = "manager" | "employee"

type Props = {
  role: Role
}

const COLORS = {
  primary: "#1b2a41",
  accent: "#ff6b6b",
  bg: "#F3F4F6",
  card: "#FFFFFF",
}

export default function OverviewTab({ role }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  )

  const changeMonth = (dir: "prev" | "next") => {
    setSelectedMonth(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + (dir === "prev" ? -1 : 1))
      return d
    })
  }

  const monthLabel = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <View style={styles.screen}>
      {/* MONTH HEADER */}
      <LinearGradient
        colors={[COLORS.accent, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.monthGradient}
      >
        <TouchableOpacity onPress={() => changeMonth("prev")}>
          <Text style={styles.arrow}>◀</Text>
        </TouchableOpacity>

        <View style={styles.monthCenter}>
          <Text style={styles.overviewLabel}>Overview</Text>
          <Text style={styles.monthText}>{monthLabel}</Text>
        </View>

        <TouchableOpacity onPress={() => changeMonth("next")}>
          <Text style={styles.arrow}>▶</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* MAIN CARD */}
      <View style={styles.card}>
        <View style={styles.section}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Announcements role={role} selectedMonth={selectedMonth} />
          </ScrollView>
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        <View style={styles.section}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <UpcomingEvents selectedMonth={selectedMonth} />
          </ScrollView>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },

  monthGradient: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
  },

  arrow: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  monthCenter: {
    alignItems: "center",
  },

  overviewLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
  },

  monthText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },

  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    overflow: "hidden",
  },

  section: {
    padding: 12,
    maxHeight: "50%",
  },

  divider: {
      height: 2,                 // 👈 thickness
    backgroundColor: "#CBD5E1",
    marginHorizontal: 16,
  }
})
