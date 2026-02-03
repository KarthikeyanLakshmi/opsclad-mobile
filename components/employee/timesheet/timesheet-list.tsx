import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  const [userProfile, setUserProfile] = useState<{
    profiles: {
      id: string;
      username: string;
      email: string;
      employee_id: string | null;
    };
  } | null>(null);  
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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

      const employeeId =
        roleData?.profiles?.employee_id ?? authData.user.email!;
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

  const parseDate = (dateString: string) => {
    if (!dateString) return null;

    // Handle ISO direct
    if (dateString.includes("T")) {
      const iso = new Date(dateString);
      if (!isNaN(iso.getTime())) return iso;
    }

    // Force MM/DD/YYYY parsing
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const [MM, DD, YYYY] = parts.map((x) => x.trim());
      const final = new Date(`${YYYY}-${MM}-${DD}`);
      return isNaN(final.getTime()) ? null : final;
    }

    return null;
  };


  const applyFilters = () => {
    if (!filters.dateFrom || !filters.dateTo) {
      Alert.alert("Missing Dates", "Please select both From and To dates.");
      return;
    }

    const fromDate = new Date(filters.dateFrom);
    const toDate = new Date(filters.dateTo);

    const filtered = combinedData.filter((item) => {
      const itemDate = parseDate(item.date);

      if (!itemDate) return false;

      // STRICT: only include records between these dates
      if (itemDate < fromDate) return false;
      if (itemDate > toDate) return false;

      if (filters.client !== "all" && item.client !== filters.client)
        return false;

      if (filters.project !== "all" && item.project !== filters.project)
        return false;

      return true;
    });

    if (filtered.length === 0) {
      setFilteredData([]);
      setSummaryStats(null);
      Alert.alert("No Records", "No timesheet entries match your selected dates.");
      return;
    }

    setFilteredData(filtered);
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

    const employeeName =
      filteredData[0]?.employee_name?.replace(/\s+/g, "_") ||
      "Employee";

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

      {/* FILTER CARD */}
      <View style={styles.filterCard}>
        <Text style={styles.cardHeader}>Filters</Text>

        {/* CLIENT */}
        <View style={styles.dropdownWrapper}>
          <Picker
            selectedValue={filters.client}
            onValueChange={(v) => setFilters({ ...filters, client: v })}
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
        <View style={styles.dropdownWrapper}>
          <Picker
            selectedValue={filters.project}
            onValueChange={(v) => setFilters({ ...filters, project: v })}
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

      {/* SUMMARY CARD */}
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

          {filteredData.map((d, index) => (
            <View
              key={index}
              style={[
                styles.resultCard,
                index % 2 === 1 && styles.resultCardAlt,
              ]}
            >
              {/* HEADER */}
              <View style={styles.resultHeaderRow}>
                <Text style={styles.resultHeaderDate}>{d.date}</Text>

                <View
                  style={[
                    styles.activityBadge,
                    d.activity === "WORK" && { backgroundColor: COLORS.workBg },
                    d.activity === "PTO" && { backgroundColor: COLORS.ptoBg },
                  ]}
                >
                  <Text style={styles.activityText}>{d.activity}</Text>
                </View>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.iconOnly}>🏢</Text>
                <Text style={styles.resultValue}>{d.client || "-"}</Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.iconOnly}>📁</Text>
                <Text style={styles.resultValue}>{d.project || "-"}</Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.iconOnly}>⏱</Text>
                <Text style={styles.resultValue}>{d.hours}</Text>
              </View>

            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const COLORS = {
  primary: "#1b2a41", // navy
  accent: "#ff6b6b",  // coral
  bg: "#f4f4f5",
  card: "#ffffff",
  muted: "#6b7280",
  border: "#e5e7eb",
  workBg: "#e6f0ff",
  ptoBg: "#ffecec",
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: COLORS.bg,
  },

  /* ---------- Header ---------- */
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },

  /* ---------- Filter Card ---------- */
  filterCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
  },

  cardHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
  },

  dropdownWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    overflow: "hidden",
  },

  dateInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: COLORS.card,
  },

  dateText: {
    color: COLORS.primary,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  applyBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
  },

  clearBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 10,
  },

  btnText: {
    textAlign: "center",
    color: "#ffffff",
    fontWeight: "700",
  },

  /* ---------- Summary ---------- */
  summaryCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
  },

  summaryText: {
    fontSize: 14,
    marginBottom: 4,
    color: COLORS.primary,
  },

  /* ---------- Results ---------- */
  resultsCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: COLORS.primary,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  exportBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  exportBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  /* ---------- Result Card ---------- */
  resultCard: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  resultCardAlt: {
    backgroundColor: "#f8fafc",
  },

  resultHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  resultHeaderDate: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },

  activityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
  },

  activityText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  resultValue: {
    fontWeight: "500",
    color: COLORS.primary,
    fontSize: 13,
  },

  iconOnly: {
    fontSize: 16,
    marginRight: 6,
  },

  /* ---------- Loading ---------- */
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  loadingText: {
    marginTop: 10,
    color: COLORS.primary,
  },
});
