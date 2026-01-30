import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { supabase } from "../../src/lib/supabase";

import ManagerTasks from "../../components/manager/task-index";
import EmployeeTasks from "../../components/employee/task-tracker";

/* =========================
   THEME COLORS
========================= */
const COLORS = {
  primary: "#1b2a41",   // deep navy
  accent: "#ff6b6b",    // coral
  bg: "#F3F4F6",
};

export default function TaskScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth?.user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .single();

      setRole(roleData?.role || "employee");
      setLoading(false);
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
    return <ManagerTasks />;
  }

  return <EmployeeTasks />;
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
