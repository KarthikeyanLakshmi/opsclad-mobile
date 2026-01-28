import React, { useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Announcements from "../dashboard/Announcement"
import UpcomingEvents from "../dashboard/UpcomingEvents"

type Role = "manager" | "employee"

type Props = {
  role: Role
}

export default function OverviewTab({ role }: Props) {
  /* ---------------- MONTH STATE ---------------- */
  const [selectedMonth, setSelectedMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  )

  const changeMonth = (direction: "prev" | "next") => {
    setSelectedMonth(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + (direction === "prev" ? -1 : 1))
      return d
    })
  }

  const monthLabel = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.screen}>
      {/* 🌈 GRADIENT MONTH HEADER */}
      <LinearGradient
        colors={["#ff6b6b", "#1b2a41"]}
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
        {/* 🔒 ANNOUNCEMENTS — MAX 50% */}
        <View style={styles.topHalf}>
          <ScrollView showsVerticalScrollIndicator>
            <Announcements
              role={role}
              selectedMonth={selectedMonth}
            />
          </ScrollView>
        </View>

        {/* 🔒 EVENTS — MAX 50% */}
        <View style={styles.bottomHalf}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <UpcomingEvents selectedMonth={selectedMonth} />
          </ScrollView>
        </View>
      </View>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  /* 🌈 Gradient month header */
  monthGradient: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  arrow: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    paddingHorizontal: 6,
  },

  monthCenter: {
    alignItems: "center",
  },

  overviewLabel: {
    fontSize: 12,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  monthText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
  },

  /* Card container */
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 30,
    overflow: "hidden",
  },

  /* 🔒 Hard 50% caps */
  topHalf: {
    maxHeight: "50%",
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  bottomHalf: {
    maxHeight: "50%",
    paddingHorizontal: 12,
    paddingTop: 6,
  },
})
