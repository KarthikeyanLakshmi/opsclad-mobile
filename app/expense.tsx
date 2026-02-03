import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { supabase } from "../src/lib/supabase";

/* -------------------------
   IMPORT BOTH SCREENS
------------------------- */
import EmployeeExpenses from "../components/employee/expenses-tracker";
import ManagerExpensesTracker from "../components/manager/expenses-report";

/* =========================
   THEME COLORS
========================= */
const COLORS = {
  primary: "#1b2a41",   // deep navy
  accent: "#ff6b6b",    // coral
  bg: "#F3F4F6",
};

export default function ExpensesScreen() {
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

      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .single();

      // default to employee if role missing
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
    return <ManagerExpensesTracker />;
  }

  return <EmployeeExpenses />;
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
