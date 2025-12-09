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
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function EmployeeReportsScreen() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    client: "all",
    project: "all",
    dateFrom: "",
    dateTo: "",
  });

  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);

  useEffect(() => {
    loadUserAndData();
  }, []);

  const loadUserAndData = async () => {
    setIsLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      setCurrentUser(authData.user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("profiles(id, username, email, employee_id)")
        .eq("user_id", authData.user.id)
        .single<{
          profiles: {
            id: string;
            username: string;
            email: string;
            employee_id: string | null;
          };
        }>();

      setUserProfile(roleData);

    const employeeId = roleData?.profiles?.employee_id ?? authData.user.email!;

      await loadCombinedData(employeeId);
    } catch (err) {
      console.error(err);
    }

    setIsLoading(false);
  };

  const loadCombinedData = async (employeeId: string) => {
    const { data: timesheets } = await supabase
      .from("timesheets")
      .select("*")
      .eq("employee_id", employeeId)
      .neq("activity", "pto")
      .neq("activity", "PTO");

    const { data: ptoRecords } = await supabase
      .from("pto_records")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_pto", true);

    const mappedPTO =
      ptoRecords?.map((p) => ({
        id: p.id,
        employee_id: p.employee_id,
        employee_name: p.employee_name,
        date: p.date,
        day: p.day,
        hours: p.hours,
        activity: "PTO",
        client: "",
        project: "",
      })) || [];

    const combined = [...(timesheets || []), ...mappedPTO].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setCombinedData(combined);
  };

  const parseDate = (d: string) => {
    if (!d) return null;

    const iso = new Date(d);
    if (!isNaN(iso.getTime())) return iso;

    // Try DD/MM/YYYY or MM/DD/YYYY
    const parts = d.split(/[-/ ]/);
    if (parts.length === 3) {
      let [a, b, c] = parts;

      // If first number > 12 → must be DD/MM/YYYY
      if (parseInt(a) > 12) {
        return new Date(`${c}-${b}-${a}`);
      }

      // Otherwise assume MM/DD/YYYY
      return new Date(`${c}-${a}-${b}`);
    }

    return null;
  };

  const applyFilters = () => {
    const filtered = combinedData.filter((item) => {
      const itemDate = parseDate(item.date);
      if (!itemDate) return false; // strict

      const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

      if (fromDate && itemDate < fromDate) return false;
      if (toDate && itemDate > toDate) return false;

      if (filters.client !== "all" && item.client !== filters.client) return false;
      if (filters.project !== "all" && item.project !== filters.project) return false;

      return true;
    });

    setFilteredData(filtered);

    if (filtered.length === 0) {
      setSummaryStats(null);
      Alert.alert("No data found", "There are no records in this date range.");
      return;
    }

    updateSummary(filtered);
  };


  const clearFilters = () => {
    setFilters({
      client: "all",
      project: "all",
      dateFrom: "",
      dateTo: "",
    });
    setFilteredData([]);
    setSummaryStats(null);
  };

  const updateSummary = (data: any[]) => {
    if (data.length === 0) return null;

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
    if (filteredData.length === 0)
      return Alert.alert("Nothing to export");

    // Use the employee_name from first record (all filtered data belongs to same user)
    const employeeName =
      filteredData[0]?.employee_name?.replace(/\s+/g, "_") || "Employee";

    const fileName = `${employeeName}-Timesheet.csv`;

    let csv = "Employee,Client,Project,Date,Activity,Hours\n";
    filteredData.forEach((item) => {
      csv += `${item.employee_name || ""},${item.client},${item.project},${item.date},${item.activity},${item.hours}\n`;
    });

    const fileUri = FileSystem.cacheDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csv);

    if (!(await Sharing.isAvailableAsync())) {
      return Alert.alert("Sharing not supported.");
    }

    await Sharing.shareAsync(fileUri);
  };


  const clients = [
    "all",
    ...new Set(combinedData.map((i) => i.client).filter(Boolean)),
  ];

  const projects = [
    "all",
    ...new Set(combinedData.map((i) => i.project).filter(Boolean)),
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#0A1A4F" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>My Timesheet Reports</Text>
      </View>

      {/* FILTERS */}
      <View style={styles.filterCard}>
        <Text style={styles.cardHeader}>Filters</Text>

        {/* CLIENT */}
        <Text style={styles.label}>Client</Text>
        <View style={styles.dropdownWrapper}>
          <Picker
            selectedValue={filters.client}
            onValueChange={(v) => setFilters({ ...filters, client: v })}
            style={styles.picker}
          >
            {clients.map((c) => (
              <Picker.Item
                key={c}
                label={c === "all" ? "All Clients" : c}
                value={c}
              />
            ))}
          </Picker>
        </View>

        {/* PROJECT */}
        <Text style={styles.label}>Project</Text>
        <View style={styles.dropdownWrapper}>
          <Picker
            selectedValue={filters.project}
            onValueChange={(v) => setFilters({ ...filters, project: v })}
            style={styles.picker}
          >
            {projects.map((p) => (
              <Picker.Item
                key={p}
                label={p === "all" ? "All Projects" : p}
                value={p}
              />
            ))}
          </Picker>
        </View>

        {/* DATE FROM */}
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowDateFromPicker(true)}
        >
          <Text style={styles.dateText}>
            {filters.dateFrom || "From Date"}
          </Text>
        </TouchableOpacity>

        {showDateFromPicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            onChange={(e, date) => {
              setShowDateFromPicker(false);
              if (date)
                setFilters({
                  ...filters,
                  dateFrom: date.toISOString().split("T")[0],
                });
            }}
          />
        )}

        {/* DATE TO */}
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowDateToPicker(true)}
        >
          <Text style={styles.dateText}>
            {filters.dateTo || "To Date"}
          </Text>
        </TouchableOpacity>

        {showDateToPicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            onChange={(e, date) => {
              setShowDateToPicker(false);
              if (date)
                setFilters({
                  ...filters,
                  dateTo: date.toISOString().split("T")[0],
                });
            }}
          />
        )}

        {/* BUTTONS */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
            <Text style={styles.btnText}>Apply</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.btnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SUMMARY */}
      {summaryStats && (
        <View style={styles.summaryCard}>
          <Text style={styles.cardHeader}>Summary</Text>

          <Text style={styles.summaryText}>Total Hours: {summaryStats.totalHours}</Text>
          <Text style={styles.summaryText}>Clients: {summaryStats.clients}</Text>
          <Text style={styles.summaryText}>Projects: {summaryStats.projects}</Text>
          <Text style={styles.summaryText}>Range: {summaryStats.dateRange}</Text>
        </View>
      )}

      {/* RESULTS */}
      {filteredData.length > 0 && (
        <View style={styles.resultsCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardHeader}>Filtered Results</Text>
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

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    fontSize: 16,
    color: "#0A1A4F",
    marginRight: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0A1A4F",
  },

  /* FILTER CARD — BLUE BORDER TOP LEFT + TOP RIGHT */
  filterCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopColor: "#0A1A4F",
    borderLeftColor: "#0A1A4F",
    borderRightColor: "#0A1A4F",

  },

  cardHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0A1A4F",
    marginBottom: 10,
  },

  label: { color: "#333", fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    marginBottom: 12,
  },

  dropdownWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  picker: { width: "100%" },

  dateInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  dateText: { color: "#333" },

  row: { flexDirection: "row", gap: 10 },

  applyBtn: {
    flex: 1,
    backgroundColor: "#0A1A4F",
    padding: 12,
    borderRadius: 8,
  },
  clearBtn: {
    flex: 1,
    backgroundColor: "#777",
    padding: 12,
    borderRadius: 8,
  },
  btnText: { textAlign: "center", color: "#fff", fontWeight: "700" },

  /* SUMMARY CARD */
  summaryCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderLeftColor: "#0A1A4F",
    borderRightColor: "#0A1A4F",

  },
  summaryText: { fontSize: 14, marginBottom: 4, color: "#333" },

  /* RESULTS CARD — BLUE BORDER BOTTOM LEFT + BOTTOM RIGHT */
  resultsCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomColor: "#0A1A4F",
    borderLeftColor: "#0A1A4F",
    borderRightColor: "#0A1A4F",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exportBtn: {
    backgroundColor: "#0A1A4F",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  exportBtnText: { color: "#fff", fontWeight: "600" },

  entryCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  entryDate: { fontWeight: "700", color: "#0A1A4F", marginBottom: 4 },
  entryText: { color: "#333" },
  entryHours: { color: "#0A1A4F", fontWeight: "700", marginTop: 4 },

  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 10, color: "#111" },
});
