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
import DateTimePicker from "@react-native-community/datetimepicker";

export default function EmployeeReportsScreen() {
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
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
      if (!userSession?.user) return;

      setCurrentUser(userSession.user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, profiles!inner(id, username, email, employee_id)")
        .eq("user_id", userSession.user.id)
        .single();

      setUserProfile(roleData);
      await loadCombinedData(roleData?.profiles?.[0]?.employee_id);
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
      if (filters.client && !item.client?.toLowerCase().includes(filters.client.toLowerCase())) return false;
      if (filters.project && !item.project?.toLowerCase().includes(filters.project.toLowerCase())) return false;

      if (filters.dateFrom && new Date(item.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(item.date) > new Date(filters.dateTo)) return false;

      return true;
    });

    setFilteredData(filtered);
    updateSummary(filtered);

    if (filtered.length === 0) {
      Alert.alert("No results found", "Try adjusting the filters.");
    }
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
    const range = `${dates[dates.length - 1].toLocaleDateString()} - ${dates[0].toLocaleDateString()}`;

    setSummaryStats({
      totalHours,
      clients: clients.size,
      projects: projects.size,
      dateRange: range,
    });
  };

  const exportCSV = async () => {
    if (filteredData.length === 0) return Alert.alert("Nothing to export");

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

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert("Sharing not supported on this device");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#0A1A4F" />
        <Text style={styles.loadingText}>Loading your data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>My Timesheet Reports</Text>

      {/* Filters */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Filters</Text>

        <TextInput
          style={styles.input}
          placeholder="Client"
          value={filters.client}
          placeholderTextColor="#6B7280"
          onChangeText={(t) => setFilters({ ...filters, client: t })}
        />

        <TextInput
          style={styles.input}
          placeholder="Project"
          value={filters.project}
          placeholderTextColor="#6B7280"
          onChangeText={(t) => setFilters({ ...filters, project: t })}
        />

        {/* Date From */}
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowDateFromPicker(true)}>
          <Text style={styles.dateInputText}>{filters.dateFrom || "From Date"}</Text>
        </TouchableOpacity>

        {showDateFromPicker && (
          <DateTimePicker
            value={filters.dateFrom ? new Date(filters.dateFrom) : new Date()}
            mode="date"
            onChange={(event, date) => {
              setShowDateFromPicker(false);
              if (date) setFilters({ ...filters, dateFrom: date.toISOString().split("T")[0] });
            }}
          />
        )}

        {/* Date To */}
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowDateToPicker(true)}>
          <Text style={styles.dateInputText}>{filters.dateTo || "To Date"}</Text>
        </TouchableOpacity>

        {showDateToPicker && (
          <DateTimePicker
            value={filters.dateTo ? new Date(filters.dateTo) : new Date()}
            mode="date"
            onChange={(event, date) => {
              setShowDateToPicker(false);
              if (date) setFilters({ ...filters, dateTo: date.toISOString().split("T")[0] });
            }}
          />
        )}

        <View style={styles.row}>
          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
            <Text style={styles.btnText}>Apply</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.btnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary */}
      {summaryStats && (
        <View style={styles.summaryCard}>
          <Text style={styles.cardHeader}>Summary</Text>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summaryStats.totalHours}</Text>
            <Text style={styles.summaryLabel}>Total Hours</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summaryStats.clients}</Text>
            <Text style={styles.summaryLabel}>Clients</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summaryStats.projects}</Text>
            <Text style={styles.summaryLabel}>Projects</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summaryStats.dateRange}</Text>
            <Text style={styles.summaryLabel}>Date Range</Text>
          </View>
        </View>
      )}

      {/* Results */}
      {filteredData.length > 0 && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardHeader}>Filtered Entries</Text>
            <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>

          {filteredData.map((item, i) => (
            <View key={i} style={styles.entryCard}>
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
  container: { padding: 12, backgroundColor: "#f6f6f6" },

  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0A1A4F",
    textAlign: "center",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: "#0A1A4F",
  },

  cardHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0A1A4F",
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
  },

  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },

  dateInputText: {
    color: "#111",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  applyBtn: {
    backgroundColor: "#0A1A4F",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 6,
  },

  clearBtn: {
    backgroundColor: "#777",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 6,
  },

  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: "#0A1A4F",
  },

  summaryItem: { marginBottom: 12 },

  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0A1A4F",
  },

  summaryLabel: { color: "#666" },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  exportBtn: {
    backgroundColor: "#0A1A4F",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },

  exportBtnText: {
    color: "#fff",
    fontWeight: "600",
  },

  entryCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 12,
  },

  entryDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A1A4F",
    marginBottom: 6,
  },

  entryText: { color: "#444" },

  entryHours: {
    marginTop: 6,
    fontWeight: "700",
    color: "#0A1A4F",
  },

  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6f6f6",
  },

  loadingText: { marginTop: 12, color: "#111" },
});
