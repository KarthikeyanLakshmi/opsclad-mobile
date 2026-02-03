import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { supabase } from "../../src/lib/supabase";

/* =========================
   THEME COLORS
========================= */
const COLORS = {
  primary: "#1b2a41",   // deep navy
  accent: "#ff6b6b",    // coral
  textLight: "#ffffff",
  textMuted: "#cbd5e1",
  divider: "#2a3c5f",
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function TabsLayout() {
  const router = useRouter();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------
     LOAD PROFILE
  ------------------------- */
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (profileData && roleData) {
      setProfile({
        username: profileData.username,
        role: roleData.role,
      });
    }

    setLoading(false);
  }

  /* -------------------------
     DRAWER ANIMATION
  ------------------------- */
  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setDrawerVisible(false));
  };

  return (
    <View style={{ flex: 1 }}>
      {drawerVisible && (
        <TouchableOpacity style={styles.overlay} onPress={closeDrawer} />
      )}

      {/* ================= DRAWER ================= */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerHeaderText}>Menu</Text>
          <TouchableOpacity onPress={closeDrawer}>
            <Ionicons name="close" size={30} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Profile */}
        <TouchableOpacity
          style={styles.drawerProfile}
          activeOpacity={0.7}
          onPress={() => {
            closeDrawer();
            router.push("/profile");
          }}
        >
          <View style={styles.profileRow}>
            <Ionicons
              name="person-circle-outline"
              size={48}
              color={COLORS.textLight}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.profileName}>
                {profile?.username ?? "User"}
              </Text>
              <Text style={styles.profileRole}>
                {profile?.role ?? "Role"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>


        {/* Drawer Items */}

        {/* Expenses */}
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            closeDrawer();
            router.push("../expense");
          }}
        >
          <View style={styles.drawerRow}>
            <Ionicons
              name="wallet-outline"
              size={22}
              color={COLORS.textLight}
            />
            <Text style={styles.drawerItemText}>Expenses</Text>
          </View>
        </TouchableOpacity>

        {profile?.role === "manager" && (
          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => {
              closeDrawer();
              router.push("../user-roles");
            }}
          >
            <View style={styles.drawerRow}>
              <Ionicons
                name="settings-outline"
                size={22}
                color={COLORS.textLight}
              />
              <Text style={styles.drawerItemText}>User Roles</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            closeDrawer();
            await supabase.auth.signOut();
            router.replace("/login");
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ================= TABS ================= */}
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.primary },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: "#8e8e8e",
          tabBarStyle: {
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
            backgroundColor: "#ffffff",
            elevation: 10,
          },

          headerTitle: () => (
            <View>
              {loading ? (
                <Text style={{ color: COLORS.textLight }}>Loading...</Text>
              ) : (
                <>
                  <Text style={{ color: COLORS.textLight, fontWeight: "600" }}>
                    {profile?.username}
                  </Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    {profile?.role}
                  </Text>
                </>
              )}
            </View>
          ),

          headerRight: () => (
            <TouchableOpacity onPress={openDrawer} style={{ padding: 12 }}>
              <Ionicons name="menu" size={28} color={COLORS.textLight} />
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarLabel: "",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={28} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="task"
          options={{
            tabBarLabel: "",
            tabBarIcon: ({ color }) => (
              <Ionicons name="list-outline" size={28} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="timesheet"
          options={{
            tabBarLabel: "",
            tabBarIcon: ({ color }) => (
              <Ionicons name="document-text-outline" size={28} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="leave"
          options={{
            tabBarLabel: "",
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar-outline" size={28} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 10,
  },

  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    height: "100%",
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: COLORS.primary,
    zIndex: 20,
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  drawerHeaderText: {
    color: COLORS.textLight,
    fontSize: 22,
    fontWeight: "700",
  },

  drawerProfile: {
    marginBottom: 40,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileName: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: "700",
  },

  profileRole: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 4,
  },

  drawerItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  drawerItemText: {
    color: COLORS.textLight,
    fontSize: 16,
  },

  drawerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  logoutBtn: {
    marginTop: 40,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 8,
  },

  logoutText: {
    color: COLORS.textLight,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
});
