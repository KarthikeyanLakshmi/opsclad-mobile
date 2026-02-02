import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LoadingOverlay } from "../src/components/loadingOverlay";

const logo = require("../assets/images/opsclad-logo.png");

/* =========================
   THEME COLORS
========================= */
const COLORS = {
  primary: "#1b2a41",   // navy
  accent: "#ff6b6b",    // coral
  white: "#ffffff",
  muted: "#cbd5e1",
};

export default function RegisterScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username || !employeeId || !email || !password) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            employee_id: employeeId,
            email,
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }

      Alert.alert(
        "Success",
        "Account created successfully. Please log in."
      );

      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading && <LoadingOverlay />}

      {/* Logo */}
      <Image source={logo} style={styles.logo} resizeMode="contain" />

      {/* Employee Name */}
      <TextInput
        style={styles.input}
        placeholder="Employee Name"
        placeholderTextColor={COLORS.muted}
        onChangeText={setUsername}
        value={username}
      />

      {/* Employee ID */}
      <TextInput
        style={styles.input}
        placeholder="Employee ID"
        placeholderTextColor={COLORS.muted}
        onChangeText={setEmployeeId}
        value={employeeId}
      />

      {/* Email */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={COLORS.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
      />

      {/* Password */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={COLORS.muted}
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />

      {/* Register Button */}
      <TouchableOpacity
        style={[styles.registerBtn, loading && { opacity: 0.7 }]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.registerText}>Create Account</Text>
        )}
      </TouchableOpacity>

      {/* Back to login */}
      <TouchableOpacity onPress={() => router.replace("/login")}>
        <Text style={styles.backText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 24,
    justifyContent: "center",
  },

  logo: {
    width: "70%",
    height: 120,
    alignSelf: "center",
    marginBottom: 30,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.white,
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
    color: COLORS.white,
  },

  registerBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },

  registerText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  backText: {
    color: COLORS.accent,
    textAlign: "center",
    marginTop: 18,
    fontWeight: "600",
  },
});
