// components/home/tabs/OverviewTab.tsx
import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Announcements from "./Announcement";
import UpcomingEvents from "./UpcomingEvents";

export default function OverviewTab() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* TOP HALF */}
      <View style={styles.section}>
        <Announcements />
      </View>

      {/* BOTTOM HALF */}
      <View style={styles.section}>
        <UpcomingEvents />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});
