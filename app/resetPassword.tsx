import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "expo-router";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [isVerifying, setIsVerifying] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // -------------------------------------------------------
  // VERIFY RESET LINK
  // -------------------------------------------------------
  useEffect(() => {
    verifyResetToken();
  }, []);

  const verifyResetToken = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data?.session) {
        Alert.alert("Invalid or expired link", "Please request a new reset link.");
        router.replace("/login");
        return;
      }

      setHasValidToken(true);
    } catch (e) {
      Alert.alert("Error", "Unable to verify reset link.");
      router.replace("/login");
    } finally {
      setIsVerifying(false);
    }
  };

  // -------------------------------------------------------
  // PASSWORD STRENGTH CHECK
  // -------------------------------------------------------
  const checkStrength = (pwd: string) => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[a-z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    setPasswordStrength(s);
  };

  const strengthColor = () => {
    if (passwordStrength <= 2) return "#ef4444"; // red
    if (passwordStrength === 3) return "#eab308"; // yellow
    return "#22c55e"; // green
  };

  const strengthText = () => {
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength === 3) return "Medium";
    return "Strong";
  };

  // -------------------------------------------------------
  // SUBMIT NEW PASSWORD
  // -------------------------------------------------------
  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Password too short", "Minimum 8 characters required.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      Alert.alert("Success", "Password updated successfully!", [
        {
          text: "OK",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------
  // LOADING SCREEN
  // -------------------------------------------------------
  if (isVerifying) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={{ marginTop: 16, color: "#fff" }}>
          Verifying reset link...
        </Text>
      </View>
    );
  }

  if (!hasValidToken) return null;

  // -------------------------------------------------------
  // MAIN UI
  // -------------------------------------------------------
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require("@/assets/images/opsclad-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password</Text>

        {/* Password */}
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="New password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            checkStrength(t);
          }}
        />

        {/* Strength Meter */}
        {password.length > 0 && (
          <>
            <View style={styles.strengthRow}>
              <Text style={styles.strengthLabel}>Strength:</Text>
              <Text style={[styles.strengthValue, { color: strengthColor() }]}>
                {strengthText()}
              </Text>
            </View>

            <View style={styles.strengthBar}>
              <View
                style={[
                  styles.strengthIndicator,
                  {
                    width: `${(passwordStrength / 5) * 100}%`,
                    backgroundColor: strengthColor(),
                  },
                ]}
              />
            </View>
          </>
        )}

        {/* Confirm Password */}
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Confirm password"
          placeholderTextColor="#9ca3af"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.button,
            password !== confirmPassword ||
            password.length < 8 ||
            isLoading
              ? { opacity: 0.5 }
              : {},
          ]}
          disabled={
            password !== confirmPassword ||
            password.length < 8 ||
            isLoading
          }
          onPress={handleSubmit}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Resetting..." : "Reset Password"}
          </Text>
        </TouchableOpacity>

        {/* Back to login */}
        <TouchableOpacity
          onPress={() => router.replace("/login")}
          style={{ marginTop: 14 }}
        >
          <Text style={{ textAlign: "center", color: "#f97316" }}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111827",
    minHeight: "100%",
    alignItems: "center",
    padding: 20,
    paddingTop: 70,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 240,
    height: 150,
    marginBottom: 30,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    elevation: 4,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#6b7280",
  },
  input: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 12,
  },
  strengthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  strengthLabel: { color: "#6b7280" },
  strengthValue: { fontWeight: "700" },
  strengthBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 14,
    overflow: "hidden",
  },
  strengthIndicator: {
    height: "100%",
    borderRadius: 6,
  },
  button: {
    backgroundColor: "#f97316",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
});
