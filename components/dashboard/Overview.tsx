import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Announcements from "../dashboard/Announcement";
import UpcomingEvents from "../dashboard/UpcomingEvents";

/* ---------------- TYPES ---------------- */

type Role = "manager" | "employee";

type Props = {
  role: Role;
};

/* ---------------- COMPONENT ---------------- */

export default function OverviewTab({ role }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* TOP HALF – ANNOUNCEMENTS */}
      <View style={styles.section}>
        <Announcements role={role} />
      </View>

      {/* BOTTOM HALF – UPCOMING EVENTS */}
      <View style={styles.section}>
        <UpcomingEvents />
      </View>
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});
