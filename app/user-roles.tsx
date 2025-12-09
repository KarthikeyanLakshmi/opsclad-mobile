import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Switch,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/src/lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

// TYPES
interface UserRole {
  id: string;
  user_id: string;
  role: "manager" | "employee" | "viewer";
  permissions: {
    timesheet_tracker: boolean;
    task_tracker: boolean;
    leave_tracker: boolean;
    skill_tracker: boolean;
    user_role_management: boolean;
    settings: boolean;
  };
  created_at: string;
  updated_at: string;
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

// Default permissions
const defaultPermissions = {
  timesheet_tracker: false,
  task_tracker: false,
  leave_tracker: false,
  skill_tracker: false,
  user_role_management: false,
  settings: false,
};

type Role = "manager" | "employee" | "viewer";

const rolePermissionTemplates: Record<Role, typeof defaultPermissions> = {
  manager: {
    timesheet_tracker: true,
    task_tracker: true,
    leave_tracker: true,
    skill_tracker: true,
    user_role_management: true,
    settings: true,
  },
  employee: {
    timesheet_tracker: true,
    task_tracker: true,
    leave_tracker: false,
    skill_tracker: true,
    user_role_management: false,
    settings: false,
  },
  viewer: {
    timesheet_tracker: true,
    task_tracker: true,
    leave_tracker: false,
    skill_tracker: false,
    user_role_management: false,
    settings: false,
  },
};

export default function UserRoleManagement() {
  const router = useRouter();

  const [users, setUsers] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Search + Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Modals
  const [assignModal, setAssignModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRole | null>(null);

  const [assignForm, setAssignForm] = useState<{
    role: Role;
    permissions: typeof defaultPermissions;
  }>({
    role: "employee",
    permissions: rolePermissionTemplates["employee"],
  });

  // Load data
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
      const processed = data.map((u: any) => ({
        ...u,
        email: u.profiles?.email,
        username: u.profiles?.username,
        employee_id: u.profiles?.employee_id,
      }));
      setUsers(processed);
    }
    setLoading(false);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles(data || []);
  };

  const usersWithoutRoles = profiles.filter(
    (p) => !users.some((u) => u.user_id === p.id)
  );

  // Assign Role
  const assignRole = async () => {
    if (!selectedUserId) return;

    await supabase.from("user_roles").insert({
      user_id: selectedUserId,
      role: assignForm.role,
      permissions: assignForm.permissions,
      is_active: true,
    });

    loadUsers();
    setAssignModal(false);
    setSelectedUserId("");
  };

  // Save User (Edit)
  const saveUser = async () => {
    if (!editingUser) return;

    await supabase
      .from("user_roles")
      .update({
        role: editingUser.role,
        permissions: editingUser.permissions,
        is_active: editingUser.is_active,
      })
      .eq("id", editingUser.id);

    loadUsers();
    setEditModal(false);
  };

  // Delete User
  const deleteUser = async () => {
    if (!deletingUser) return;

    await supabase.from("user_roles").delete().eq("id", deletingUser.id);
    loadUsers();
    setDeleteModal(false);
  };

  // Filtering logic
  const filteredUsers = users.filter((u) => {
    const s = searchTerm.toLowerCase();
    const match =
      u.username?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.employee_id?.toLowerCase().includes(s);

    return match && (filterRole === "all" || u.role === filterRole);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View style={{ flex: 1, paddingTop: 10 }}>


        <View style={styles.container}>
        {/* BACK BUTTON */}
        <View style={styles.row}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>User Role Management</Text>
        </View>
          {/* Search + Filter */}
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Search users..."
              placeholderTextColor="#555"
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

          {/* Assign Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => setAssignModal(true)}
          >
            <Text style={styles.buttonText}>
              Assign Role ({usersWithoutRoles.length})
            </Text>
          </TouchableOpacity>

          {/* User List */}
          {loading ? (
            <ActivityIndicator size="large" color="#111" />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              style={{ marginTop: 20 }}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{item.username}</Text>
                  <Text style={styles.cardSub}>{item.email}</Text>
                  <Text style={styles.badge}>{item.role.toUpperCase()}</Text>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingUser({ ...item });
                        setEditModal(true);
                      }}
                    >
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setDeletingUser(item);
                        setDeleteModal(true);
                      }}
                    >
                      <Text style={[styles.actionText, { color: "red" }]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}

          {/* ------------------- MODALS ------------------- */}

          {/* Assign Role Modal */}
          <Modal visible={assignModal} transparent animationType="slide">
            <View style={styles.modalWrapper}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Assign Role</Text>

                {/* User Picker */}
                <Picker
                  selectedValue={selectedUserId}
                  onValueChange={setSelectedUserId}
                  style={styles.pickerFull}
                >
                  <Picker.Item label="Select user..." value="" />
                  {usersWithoutRoles.map((u) => (
                    <Picker.Item key={u.id} label={u.username} value={u.id} />
                  ))}
                </Picker>

                {/* Role Picker */}
                <Picker
                  selectedValue={assignForm.role}
                  onValueChange={(value: Role) =>
                    setAssignForm({
                      role: value,
                      permissions: rolePermissionTemplates[value],
                    })
                  }
                  style={styles.pickerFull}
                >
                  <Picker.Item label="Employee" value="employee" />
                  <Picker.Item label="Manager" value="manager" />
                </Picker>

                <TouchableOpacity style={styles.button} onPress={assignRole}>
                  <Text style={styles.buttonText}>Assign</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setAssignModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Edit User Modal */}
          <Modal visible={editModal} transparent animationType="slide">
            <View style={styles.modalWrapper}>
              <ScrollView style={styles.modalBox}>
                <Text style={styles.modalTitle}>Edit User</Text>

                {/* Role Picker */}
                <Picker
                  selectedValue={editingUser?.role}
                  onValueChange={(v) =>
                    setEditingUser((prev) => (prev ? { ...prev, role: v } : prev))
                  }
                  style={styles.pickerFull}
                >
                  <Picker.Item label="Employee" value="employee" />
                  <Picker.Item label="Manager" value="manager" />
                </Picker>

                {/* Permissions */}
                {editingUser &&
                  Object.keys(defaultPermissions).map((p) => (
                    <View key={p} style={styles.permissionRow}>
                      <Text style={styles.permissionText}>
                        {p.replace(/_/g, " ").toUpperCase()}
                      </Text>

                      <Switch
                        value={
                          editingUser.permissions[
                            p as keyof typeof defaultPermissions
                          ]
                        }
                        onValueChange={(val) =>
                          setEditingUser((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  permissions: {
                                    ...prev.permissions,
                                    [p]: val,
                                  },
                                }
                              : prev
                          )
                        }
                      />
                    </View>
                  ))}

                <TouchableOpacity style={styles.button} onPress={saveUser}>
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setEditModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Modal>

          {/* Delete Modal */}
          <Modal visible={deleteModal} transparent animationType="fade">
            <View style={styles.modalWrapper}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>
                  Remove role for {deletingUser?.username}?
                </Text>

                <TouchableOpacity style={styles.button} onPress={deleteUser}>
                  <Text style={styles.buttonText}>Remove</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setDeleteModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------- STYLES ----------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  title: {
    color: "#111",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    color: "#111",
    padding: 10,
    borderRadius: 8,
    borderColor: "#CBD5E1",
    borderWidth: 1,
  },
  picker: {
    width: 130,
    backgroundColor: "#F1F5F9",
    color: "#111",
  },
  pickerFull: {
    width: "100%",
    backgroundColor: "#F1F5F9",
    color: "#111",
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#0A1A4F",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#F8FAFC",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    color: "#111",
    fontSize: 18,
    fontWeight: "600",
  },
  cardSub: {
    color: "#475569",
  },
  badge: {
    marginTop: 10,
    backgroundColor: "#E2E8F0",
    color: "#111",
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    borderRadius: 6,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 20,
  },
  actionText: {
    color: "#2563EB",
    fontWeight: "600",
  },
  modalWrapper: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    color: "#111",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },
  cancelText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 10,
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  permissionText: {
    color: "#111",
    fontSize: 14,
  },
  backButton: {
    marginBottom: 10,
    alignSelf: "flex-start",
    padding: 6,
  },
});
