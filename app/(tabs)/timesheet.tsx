import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "../../src/lib/supabase";

import TimesheetTracker from "../../components/employee/timesheet-tracker"; 
import TsExtraction from "../../components/manager/ts-extraction"; 

export default function TimesheetScreen() {
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size={30} color="#0A1A4F" />
      </View>
    );
  }

  // MANAGER VIEW
  if (role === "manager") {
    return <TsExtraction />;
  }

  // EMPLOYEE VIEW
  return <TimesheetTracker />;
}
