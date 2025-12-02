import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "../../src/lib/supabase";
import ManagerTasks from "../../components/manager/task-index"; 
import EmployeeTasks from "../../components/employee/task-tracker";

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size={30} color="#0A1A4F" />
      </View>
    );
  }

  // MANAGER
  if (role === "manager") {
    return <ManagerTasks />;
  }

  // EMPLOYEE
  return <EmployeeTasks />;
}
