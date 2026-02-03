import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Switch,
  ActivityIndicator,
  Alert,
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
  role: "manager" | "employee";
  permissions: any;
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

const defaultPermissions = {
  timesheet_tracker: false,
  task_tracker: false,
  leave_tracker: false,
  expenses_tracker: false,
  user_role_management: false,
  settings: false,
};

/* =========================
   ROLE SELECTOR
========================= */
function RoleSelector({
  value,
  onChange,
}: {
  value: "manager" | "employee";
  onChange: (v: "manager" | "employee") => void;
}) {
  return (
    <View style={{ marginVertical: 10 }}>
      <Text style={styles.label}>Role</Text>

      <View style={styles.roleRow}>
        {/* EMPLOYEE */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            value === "employee" && styles.roleActiveEmployee,
          ]}
          onPress={() => onChange("employee")}
        >
          <Feather
            name="user"
            size={18}
            color={value === "employee" ? "#fff" : "#f97316"}
          />
          <Text
            style={[
              styles.roleText,
              value === "employee" && { color: "#fff" },
            ]}
          >
            Employee
          </Text>
        </TouchableOpacity>

        {/* MANAGER */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            value === "manager" && styles.roleActiveManager,
          ]}
          onPress={() => onChange("manager")}
        >
          <Feather
            name="shield"
            size={18}
            color={value === "manager" ? "#fff" : "#dc2626"}
          />
          <Text
            style={[
              styles.roleText,
              value === "manager" && { color: "#fff" },
            ]}
          >
            Manager
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =========================
   COMPONENT
========================= */
export default function UserRoleManagement() {
  const router = useRouter();

  const [users, setUsers] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const [assignOpen, setAssignOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRole | null>(null);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<"manager" | "employee">("employee");
  const [permissions, setPermissions] = useState({ ...defaultPermissions });

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    loadUsers();
    loadProfiles();
  }, []);

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

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles(data || []);
  };

  /* ================= FILTER ================= */

  const filteredUsers = users.filter((u) => {
    const s = searchTerm.toLowerCase();
    const match =
      u.username?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.employee_id?.toLowerCase().includes(s);

    return match && (filterRole === "all" || u.role === filterRole);
  });

  const usersWithoutRoles = profiles.filter(
    (p) => !users.some((u) => u.user_id === p.id)
  );

  /* ================= ACTIONS ================= */

  const togglePermission = (key: keyof typeof defaultPermissions) => {
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  };

  const assignRole = async () => {
    if (!selectedUserId) return;

    const { error } = await supabase.from("user_roles").insert({
      user_id: selectedUserId,
      role,
      permissions,
      is_active: true,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setAssignOpen(false);
    setSelectedUserId("");
    loadUsers();
  };

  const updateUser = async () => {
    if (!editUser) return;

    const { error } = await supabase
      .from("user_roles")
      .update({
        role: editUser.role,
        permissions: editUser.permissions,
      })
      .eq("id", editUser.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setEditUser(null);
    loadUsers();
  };

  /* ================= UI ================= */

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

        {/* ASSIGN BUTTON */}
        <TouchableOpacity
          style={styles.assignBtn}
          onPress={() => setAssignOpen(true)}
          disabled={usersWithoutRoles.length === 0}
        >
          <Text style={styles.assignText}>
            Assign Role ({usersWithoutRoles.length})
          </Text>
        </TouchableOpacity>

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

                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>{item.role.toUpperCase()}</Text>
                  <TouchableOpacity onPress={() => setEditUser(item)}>
                    <Feather name="edit" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {/* ASSIGN MODAL */}
        <Modal visible={assignOpen} animationType="slide">
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Assign Role</Text>

            <Picker
              selectedValue={selectedUserId}
              onValueChange={setSelectedUserId}
            >
              <Picker.Item label="Select user" value="" />
              {usersWithoutRoles.map((u) => (
                <Picker.Item key={u.id} label={u.username} value={u.id} />
              ))}
            </Picker>

            <RoleSelector
              value={role}
              onChange={(v) => {
                setRole(v);
                setPermissions({ ...defaultPermissions });
              }}
            />

            {Object.keys(defaultPermissions).map((key) => (
              <View key={key} style={styles.permissionRow}>
                <Text>{key.replace(/_/g, " ")}</Text>
                <Switch
                  value={permissions[key as keyof typeof defaultPermissions]}
                  onValueChange={() =>
                    togglePermission(key as keyof typeof defaultPermissions)
                  }
                />
              </View>
            ))}

            <TouchableOpacity style={styles.assignBtn} onPress={assignRole}>
              <Text style={styles.assignText}>Assign</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAssignOpen(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* EDIT MODAL */}
        <Modal visible={!!editUser} animationType="slide">
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit User</Text>

            {editUser && (
              <RoleSelector
                value={editUser.role}
                onChange={(v) =>
                  setEditUser((p) => p && { ...p, role: v })
                }
              />
            )}

            {editUser &&
              Object.keys(defaultPermissions).map((key) => (
                <View key={key} style={styles.permissionRow}>
                  <Text>{key.replace(/_/g, " ")}</Text>
                  <Switch
                    value={editUser.permissions[key]}
                    onValueChange={() =>
                      setEditUser((p) =>
                        p
                          ? {
                              ...p,
                              permissions: {
                                ...p.permissions,
                                [key]: !p.permissions[key],
                              },
                            }
                          : p
                      )
                    }
                  />
                </View>
              ))}

            <TouchableOpacity style={styles.assignBtn} onPress={updateUser}>
              <Text style={styles.assignText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEditUser(null)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.primary },

  row: { flexDirection: "row", gap: 10, marginVertical: 10 },

  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  picker: { width: 140, backgroundColor: "#F1F5F9" },

  assignBtn: {
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },

  assignText: { color: "#fff", fontWeight: "700" },

  card: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardTitle: { fontSize: 18, fontWeight: "600", color: COLORS.textDark },
  cardSub: { color: COLORS.textMuted },

  badgeRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  badge: {
    backgroundColor: "#E2E8F0",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    fontWeight: "600",
  },

  modal: { flex: 1, padding: 20, backgroundColor: COLORS.bg },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },

  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },

  cancel: {
    textAlign: "center",
    marginTop: 10,
    color: COLORS.textMuted,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 6,
  },

  roleRow: {
    flexDirection: "row",
    gap: 10,
  },

  roleCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
  },

  roleActiveEmployee: {
    backgroundColor: "#f97316",
    borderColor: "#f97316",
  },

  roleActiveManager: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },

  roleText: {
    fontWeight: "600",
    color: COLORS.textDark,
  },
});
