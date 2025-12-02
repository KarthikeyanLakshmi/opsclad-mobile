import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function EmployeeReportsScreen() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    client: "",
    project: "",
    dateFrom: "",
    dateTo: "",
  });
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserAndData();
  }, []);

  const loadUserAndData = async () => {
    setIsLoading(true);
    try {
      const { data: userSession } = await supabase.auth.getUser();
      if (!userSession?.user) {
        Alert.alert("Authentication error", "Please log in again.");
        return;
      }

      setCurrentUser(userSession.user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, profiles!inner(id, username, email, employee_id)")
        .eq("user_id", userSession.user.id)
        .single();

      setUserProfile(roleData);
      await loadCombinedData(roleData?.profiles?.[0]?.employee_id);
    } catch {
      Alert.alert("Error", "Unable to load data.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCombinedData = async (employeeId: string) => {
    const { data: timesheets } = await supabase
      .from("timesheets")
      .select("*")
      .eq("employee_id", employeeId)
      .neq("activity", "pto");

    const { data: ptoRecords } = await supabase
      .from("pto_records")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_pto", true);

    const mappedPTO = (ptoRecords || []).map((p) => ({
      ...p,
      client: "",
      project: "",
      activity: "PTO",
    }));

    const combined = [...(timesheets || []), ...mappedPTO].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setCombinedData(combined);
  };

  const applyFilters = () => {
    const filtered = combinedData.filter((item) => {
      if (filters.client && item.client !== filters.client && item.activity !== "PTO")
        return false;
      if (filters.project && item.project !== filters.project && item.activity !== "PTO")
        return false;
      if (filters.dateFrom && new Date(item.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(item.date) > new Date(filters.dateTo)) return false;
      return true;
    });

    setFilteredData(filtered);
    updateSummary(filtered);

    if (filtered.length === 0) Alert.alert("No results found");
  };

  const clearFilters = () => {
    setFilters({ client: "", project: "", dateFrom: "", dateTo: "" });
    setFilteredData([]);
    setSummaryStats(null);
  };

  const updateSummary = (data: any[]) => {
    if (data.length === 0) return;

    const totalHours = data.reduce((sum, x) => sum + (x.hours || 0), 0);
    const clients = new Set(data.map((x) => x.client).filter(Boolean));
    const projects = new Set(data.map((x) => x.project).filter(Boolean));
    const dates = data.map((x) => new Date(x.date));

    setSummaryStats({
      totalHours,
      clients: clients.size,
      projects: projects.size,
      dateRange: `${dates[dates.length - 1].toLocaleDateString()} - ${dates[0].toLocaleDateString()}`,
    });
  };

  const exportCSV = async () => {
    if (filteredData.length === 0) {
      Alert.alert("Nothing to export");
      return;
    }

    let csv = "Employee,Client,Project,Date,Activity,Hours\n";

    filteredData.forEach((item) => {
      csv += `${item.employee_name || ""},${item.client},${item.project},${item.date},${item.activity},${item.hours}\n`;
    });

    const cacheDir = (FileSystem as any).cacheDirectory;

    if (!cacheDir) {
      Alert.alert("Error", "Cache directory not available.");
      return;
    }

    const fileUri = cacheDir + "timesheet_report.csv";

    await FileSystem.writeAsStringAsync(fileUri, csv);

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing not available on this platform");
      return;
    }

    await Sharing.shareAsync(fileUri);
  };

  if (isLoading)
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading your data...</Text>
      </View>
    );

  const clients = [...new Set(combinedData.map((x) => x.client).filter(Boolean))];
  const projects = [...new Set(combinedData.map((x) => x.project).filter(Boolean))];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Timesheet Reports</Text>

      {/* Filters */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Filters</Text>

        <TextInput
          style={styles.input}
          placeholder="Filter by client"
          value={filters.client}
          onChangeText={(t) => setFilters({ ...filters, client: t })}
        />

        <TextInput
          style={styles.input}
          placeholder="Filter by project"
          value={filters.project}
          onChangeText={(t) => setFilters({ ...filters, project: t })}
        />

        <TextInput
          style={styles.input}
          placeholder="From Date (YYYY-MM-DD)"
          value={filters.dateFrom}
          onChangeText={(t) => setFilters({ ...filters, dateFrom: t })}
        />

        <TextInput
          style={styles.input}
          placeholder="To Date (YYYY-MM-DD)"
          value={filters.dateTo}
          onChangeText={(t) => setFilters({ ...filters, dateTo: t })}
        />

        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={applyFilters}>
            <Text style={styles.buttonText}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearFilters}>
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary */}
      {summaryStats && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{summaryStats.totalHours}</Text>
            <Text style={styles.summaryLabel}>Total Hours</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{summaryStats.clients}</Text>
            <Text style={styles.summaryLabel}>Clients</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{summaryStats.projects}</Text>
            <Text style={styles.summaryLabel}>Projects</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{summaryStats.dateRange}</Text>
            <Text style={styles.summaryLabel}>Date Range</Text>
          </View>
        </View>
      )}

      {/* Results */}
      {filteredData.length > 0 && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Filtered Entries</Text>

            <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
              <Text style={{ color: "#fff" }}>Export CSV</Text>
            </TouchableOpacity>
          </View>

          {filteredData.map((item, i) => (
            <View key={i} style={styles.entryBox}>
              <Text style={styles.entryDate}>{item.date}</Text>
              <Text style={styles.entryText}>Client: {item.client || "-"}</Text>
              <Text style={styles.entryText}>Project: {item.project || "-"}</Text>
              <Text style={styles.entryText}>Activity: {item.activity}</Text>
              <Text style={styles.entryHours}>Hours: {item.hours}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f4f4f5",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderColor: "#e5e7eb",
    borderWidth: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f97316",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#ffffff",
    borderColor: "#d1d5db",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    color: "#111827",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  button: {
    backgroundColor: "#f97316",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    marginRight: 6,
  },

  clearButton: {
    backgroundColor: "#6b7280",
    marginLeft: 6,
    marginRight: 0,
  },

  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },

  summaryCard: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    borderColor: "#e5e7eb",
    borderWidth: 1,
    marginBottom: 20,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f97316",
    marginBottom: 16,
  },

  summaryRow: {
    marginBottom: 12,
  },

  summaryValue: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "bold",
  },

  summaryLabel: {
    color: "#6b7280",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  exportBtn: {
    backgroundColor: "#f97316",
    padding: 10,
    borderRadius: 8,
  },

  entryBox: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 8,
    borderColor: "#e5e7eb",
    borderWidth: 1,
    marginBottom: 12,
  },

  entryDate: {
    fontSize: 16,
    color: "#f97316",
    marginBottom: 6,
  },

  entryText: {
    color: "#374151",
  },

  entryHours: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
  },

  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f5",
  },

  loadingText: {
    marginTop: 10,
    color: "#111827",
  },
});
