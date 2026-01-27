// app/home/index.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "../../src/lib/supabase";
import ManagerHome from "../../components/manager/HomeTabs";
import EmployeeHome from "../../components/employee/HomeTabs";

export default function HomeScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setRole("employee");
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .single();

      setRole(data?.role || "employee");
      setLoading(false);
    }

    loadRole();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0A1A4F" />
      </View>
    );
  }

  return role === "manager" ? <ManagerHome /> : <EmployeeHome />;
}
