import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "../src/lib/supabase";

// Import the two UI components
import SkillsTracker from "../components/employee/skills-tracker";
import SkillsReport from "../components/manager/skills-report";

export default function SkillsScreen() {
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

      setRole(roleData?.role || "employee"); // Default employee
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

  // Manager view
  if (role === "manager") {
    return <SkillsReport />;
  }

  // Employee view
  return <SkillsTracker />;
}
