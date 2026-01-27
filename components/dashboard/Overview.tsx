import React from "react"
import { View, StyleSheet, ScrollView } from "react-native"
import Announcements from "../dashboard/Announcement"
import UpcomingEvents from "../dashboard/UpcomingEvents"

type Role = "manager" | "employee"

type Props = {
  role: Role
}

export default function OverviewTab({ role }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        {/* ANNOUNCEMENTS – FLEXIBLE TOP */}
        <View style={styles.announcementsContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <Announcements role={role} />
          </ScrollView>
        </View>

        {/* EVENTS – BOTTOM, CAPPED AT HALF */}
        <View style={styles.eventsContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <UpcomingEvents />
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
    paddingTop: 12,
    paddingBottom: 8,
  },

  card: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 16,
    overflow: "hidden",
    padding: 12,
  },

  /* Announcements grow freely */
  announcementsContainer: {
    flexGrow: 1,     // ⬅️ takes remaining space
    marginBottom: 8,
  },

  /* Events stick to bottom, capped */
  eventsContainer: {
    maxHeight: "50%", // ⬅️ STOP at halfway
  },
})
