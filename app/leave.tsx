import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "../src/lib/supabase";

// IMPORT THE TWO COMPONENTS
import LeaveTracker from "../components/employee/leave-tracker";
import LeaveReport from "../components/manager/leave-report";

export default function LeaveScreen() {
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

      // default to employee if no role found
      setRole(roleData?.role || "employee");
      setLoading(false);
    }

    loadRole();
  }, []);

  // Loading UI
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size={30} color="#0A1A4F" />
      </View>
    );
  }

  // MANAGER VIEW
  if (role === "manager") {
    return <LeaveReport />;
  }

  // EMPLOYEE VIEW
  return <LeaveTracker />;
}
