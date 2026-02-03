import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";

/* =========================
   THEME COLORS
========================= */
const COLORS = {
  primary: "#1b2a41",
  accent: "#ff6b6b",
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textDark: "#111827",
  textMuted: "#475569",
};

/* =========================
   TYPES
========================= */
interface UserRole {
  id: string;
  user_id: string;
  role: "manager" | "employee" | "viewer";
  is_active: boolean;
  email?: string;
  username?: string;
  employee_id?: string;
}

interface Profile {
  id: string;
  username: string;
  email: string;
  employee_id: string;
}

export default function UserRoleManagement() {
  const router = useRouter();

  const [users, setUsers] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    loadUsers();
    loadProfiles();
  }, []);

  /* ---------------- LOAD USERS ---------------- */
  const loadUsers = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("user_roles")
      .select("*, profiles(email, username, employee_id)");

    if (data) {
      setUsers(
        data.map((u: any) => ({
          ...u,
          email: u.profiles?.email,
          username: u.profiles?.username,
          employee_id: u.profiles?.employee_id,
        }))
      );
    }

    setLoading(false);
  };

  /* ---------------- LOAD PROFILES ---------------- */
  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles(data || []);
  };

  /* ---------------- FILTER ---------------- */
  const filteredUsers = users.filter((u) => {
    const s = searchTerm.toLowerCase();
    const match =
      u.username?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.employee_id?.toLowerCase().includes(s);

    return match && (filterRole === "all" || u.role === filterRole);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>User Roles</Text>
        </View>

        {/* SEARCH + FILTER */}
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />

          <Picker
            selectedValue={filterRole}
            onValueChange={setFilterRole}
            style={styles.picker}
          >
            <Picker.Item label="All" value="all" />
            <Picker.Item label="Manager" value="manager" />
            <Picker.Item label="Employee" value="employee" />
          </Picker>
        </View>

        {/* USER LIST */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.accent} />
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.username}</Text>
                <Text style={styles.cardSub}>{item.email}</Text>
                <Text style={styles.badge}>{item.role.toUpperCase()}</Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },

  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textDark,
  },

  picker: {
    width: 140,
    backgroundColor: "#F1F5F9",
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textDark,
  },

  cardSub: {
    color: COLORS.textMuted,
  },

  badge: {
    marginTop: 8,
    backgroundColor: "#E2E8F0",
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    borderRadius: 6,
    fontWeight: "600",
  },
});
