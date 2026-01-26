import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { LoadingOverlay } from "../src/components/loadingOverlay";

const logo = require("../assets/images/opsclad-logo.png");

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
        redirectTo: "opsclad://reset-password", 
        // 🔴 IMPORTANT: must match your deep link config
      });

      if (error) {
        throw error;
      }

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

      <Image source={logo} style={styles.logo} resizeMode="contain" />

      <Text style={styles.title}>Reset Password</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#cccccc"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Button
        title={loading ? "Sending..." : "Send Reset Link"}
        onPress={handleResetPassword}
        disabled={loading}
      />

      <TouchableOpacity
        onPress={() => router.replace("/login")}
        style={{ marginTop: 16 }}
      >
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1A4F",
    padding: 24,
    justifyContent: "center",
  },

  logo: {
    width: "70%",
    height: 120,
    alignSelf: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "white",
  },

  input: {
    borderWidth: 1,
    borderColor: "white",
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    color: "white",
  },

  backText: {
    color: "#f97316",
    textAlign: "center",
    fontSize: 14,
  },
});

