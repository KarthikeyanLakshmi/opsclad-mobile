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
import { loginEmployee } from "../src/api/auth";
import { LoadingOverlay } from "../src/components/loadingOverlay";

const logo = require("../assets/images/opsclad-logo.png");

/* =========================
   THEME COLORS
========================= */
const COLORS = {
  primary: "#1b2a41",   // deep navy
  accent: "#ff6b6b",    // coral
  white: "#ffffff",
  muted: "#cbd5e1",
};

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      if (!email || !password) {
        Alert.alert("Missing fields", "Please enter both email and password.");
        return;
      }

      setLoading(true);

      await loginEmployee(email, password);

      await new Promise((res) => setTimeout(res, 300));

      router.replace("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading && <LoadingOverlay />}

      {/* Logo */}
      <Image source={logo} style={styles.logo} resizeMode="contain" />

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

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.loginBtn, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.loginText}>Login</Text>
        )}
      </TouchableOpacity>

      {/* Forgot password */}
      <TouchableOpacity onPress={() => router.push("/resetPassword")}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
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

  loginBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },

  loginText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  forgotText: {
    color: COLORS.accent,
    textAlign: "center",
    marginTop: 18,
    fontWeight: "600",
  },
});
