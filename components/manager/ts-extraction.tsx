import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------- TYPES ----------
export type TimesheetEntry = {
  employee_id: string | null;
  employee_name: string | null;
  client: string | null;
  project: string | null;
  date: string | null;
  day?: string;
  activity?: string;
  hours?: number;
  required_hours?: number;
};

export type ExtractionStatus = {
  is_processing: boolean;
  progress: number;
  message: string;
  error: string | null;
  result: any | null;
};

export type CurrentUser = {
  user_id: string;
  email?: string;
  username?: string;
};
// ---------------------------------------

export default function ExtractionScreen() {
  const [isExtracting, setIsExtracting] = useState(false);

  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>({
    is_processing: false,
    progress: 0,
    message: "",
    error: null,
    result: null,
  });

  const [extractedData, setExtractedData] = useState<TimesheetEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [currentExtractionId, setCurrentExtractionId] = useState<string | null>(
    null
  );

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isExtractingRef = useRef(false);

  // Default date range
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(
    sevenDaysAgo.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  // Load user from AsyncStorage (React Native compatible)
  useEffect(() => {
    async function loadUser() {
      const stored = await AsyncStorage.getItem("currentUser");
      if (!stored) return;

      const usr: CurrentUser = JSON.parse(stored);
      setCurrentUser(usr);

      await checkPrerequisites(usr.user_id);
      await checkStatus(usr.user_id);
    }

    loadUser();
  }, []);

  // Polling extractor
  useEffect(() => {
    isExtractingRef.current = isExtracting;
    if (isExtracting) startPolling();
    else stopPolling();

    return () => stopPolling();
  }, [isExtracting]);

  const startPolling = () => {
    stopPolling();
    if (currentUser) checkStatus(currentUser.user_id);

    pollingRef.current = setInterval(() => {
      if (isExtractingRef.current && currentUser) {
        checkStatus(currentUser.user_id);
      } else {
        stopPolling();
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Check prerequisites
  async function checkPrerequisites(userId: string) {
    try {
      const gmailRes = await fetch(`/api/gmail-settings?userId=${userId}`);
      const gmail = await gmailRes.json();

      if (gmail.success && gmail.connected) {
        setGmailConnected(true);
        setGmailEmail(gmail.email);
      }

      const csvRes = await fetch("/api/csv-status");
      const csv = await csvRes.json();
      setCsvUploaded(csv.uploaded);
    } catch (e) {
      console.log("prereq error:", e);
    }
  }

  // Check extraction status
  async function checkStatus(userId: string) {
    try {
      const params = new URLSearchParams({ userId });

      if (currentExtractionId) {
        params.append("extractionId", currentExtractionId);
      }

      const res = await fetch(`/api/extract-timesheet?${params}`);
      const json = await res.json();

      // Error case
      if (json.error) {
        setIsExtracting(false);
        setExtractionStatus((p) => ({
          ...p,
          error: json.error,
          is_processing: false,
        }));
        return;
      }

      // Still processing
      if (json.is_processing) {
        const prog = json.progress || extractionStatus.progress || 10;
        setExtractionStatus((p) => ({
          ...p,
          is_processing: true,
          progress: prog,
          message: json.message || "Processing...",
        }));
        return;
      }

      // Extraction completed
      if (json.data && Array.isArray(json.data)) {
        setExtractedData(json.data);
      }

      setExtractionStatus((p) => ({
        ...p,
        is_processing: false,
        progress: 100,
        message: "Extraction Completed",
      }));

      setIsExtracting(false);
    } catch (e) {
      console.log("check error:", e);
    }
  }

  // Start extraction
  const startExtraction = async () => {
    if (!currentUser) return Alert.alert("User not logged in.");
    if (!gmailConnected) return Alert.alert("Connect Gmail first.");
    if (!csvUploaded) return Alert.alert("Upload CSV files first.");

    setIsExtracting(true);
    setExtractionStatus({
      is_processing: true,
      progress: 5,
      message: "Starting extraction...",
      error: null,
      result: null,
    });

    setExtractedData([]);

    try {
      const res = await fetch("/api/extract-timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.user_id,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setCurrentExtractionId(json.extractionId);
      } else {
        Alert.alert("Failed to start", json.message);
        setIsExtracting(false);
      }
    } catch (e) {
      Alert.alert("Error", "Could not start extraction.");
      setIsExtracting(false);
    }
  };

  // UI
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Timesheet Extraction</Text>

      {/* Gmail Status */}
      <View style={styles.box}>
        <Text style={styles.title}>Gmail Connection</Text>
        <Text style={{ color: gmailConnected ? "green" : "red" }}>
          {gmailConnected ? `Connected: ${gmailEmail}` : "Not Connected"}
        </Text>
      </View>

      {/* CSV Status */}
      <View style={styles.box}>
        <Text style={styles.title}>Employee Database</Text>
        <Text style={{ color: csvUploaded ? "green" : "red" }}>
          {csvUploaded ? "CSV Uploaded" : "Upload Required"}
        </Text>
      </View>

      {/* Date Range */}
      <View style={styles.box}>
        <Text style={styles.title}>Date Range</Text>

        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
        />

        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!gmailConnected || !csvUploaded || isExtracting) &&
              styles.buttonDisabled,
          ]}
          disabled={!gmailConnected || !csvUploaded || isExtracting}
          onPress={startExtraction}
        >
          {isExtracting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start Extraction</Text>
          )}
        </TouchableOpacity>

        {/* Progress Bar */}
        {isExtracting && (
          <View style={{ marginTop: 15 }}>
            <Text style={{ fontWeight: "bold" }}>
              {extractionStatus.progress}%
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${extractionStatus.progress}%` },
                ]}
              />
            </View>
            <Text>{extractionStatus.message}</Text>
          </View>
        )}
      </View>

      {/* Results */}
      {extractedData.length > 0 && (
        <View style={styles.box}>
          <Text style={styles.title}>Extracted Timesheets</Text>

          {extractedData.map((entry, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowText}>
                {entry.date} — {entry.employee_name} — {entry.project}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Error */}
      {extractionStatus.error && (
        <Text style={{ color: "red", marginTop: 20 }}>
          {extractionStatus.error}
        </Text>
      )}
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  box: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 20,
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#bbb",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  button: {
    marginTop: 12,
    backgroundColor: "red",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700" },
  progressBar: {
    width: "100%",
    backgroundColor: "#ddd",
    height: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "red",
    borderRadius: 6,
  },
  row: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  rowText: { fontSize: 14 },
});
