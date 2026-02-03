import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { supabase } from "../../src/lib/supabase";

// Manager and Employee screens
import ExtractionIndex from "../../components/manager/extraction-index";
import EmployeeTimesheets from "../../components/employee/timesheet-tracker";

/* =========================
   THEME COLORS
========================= */
const COLORS = {
  primary: "#1b2a41",   // deep navy
  accent: "#ff6b6b",    // coral
  bg: "#F3F4F6",
};

export default function TimesheetScreen() {
  const [role, setRole] = useState<"manager" | "employee">("employee");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError || !auth?.user) {
          setRole("employee");
          return;
        }

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", auth.user.id)
          .single();

        setRole(roleData?.role === "manager" ? "manager" : "employee");
      } catch (e) {
        console.log("Role load error:", e);
        setRole("employee");
      } finally {
        setLoading(false);
      }
    }

    loadRole();
  }, []);

  /* -------------------------
     LOADING STATE
  ------------------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  /* -------------------------
     ROLE-BASED VIEW
  ------------------------- */
  if (role === "manager") {
    return <ExtractionIndex />;
  }

  // 👇 EMPLOYEE NOW GETS THE TABBED TIMESHEET VIEW
  return <EmployeeTimesheets />;
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
});
