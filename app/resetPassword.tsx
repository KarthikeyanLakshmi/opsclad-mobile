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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
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

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    if (!email) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "opsclad://reset-password", // must match deep link config
      });

      if (error) throw error;

      Alert.alert(
        "Email Sent",
        "A password reset link has been sent to your email.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/login"),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Reset Failed", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading && <LoadingOverlay />}

      {/* HEADER WITH BACK */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Logo */}
      <Image source={logo} style={styles.logo} resizeMode="contain" />

      {/* Email input */}
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor={COLORS.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      {/* Send button */}
      <TouchableOpacity
        style={[styles.resetBtn, loading && { opacity: 0.7 }]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.resetText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>

      {/* Back to login */}
      <TouchableOpacity onPress={() => router.replace("/login")}>
        <Text style={styles.backText}>Back to Login</Text>
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

  header: {
    position: "absolute",
    top: 50,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
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
    marginBottom: 20,
    color: COLORS.white,
  },

  resetBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  resetText: {
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
