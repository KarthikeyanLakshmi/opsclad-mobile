import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

export default function ReportsScreen() {
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

  const [filters, setFilters] = useState({
    employee: "",
    client: "",
    project: "",
    dateFrom: "",
    dateTo: "",
  });

  const [employees, setEmployees] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);

  useEffect(() => {
    loadCombinedData();
  }, []);

  async function loadCombinedData() {
    setLoading(true);

    const { data: timesheets } = await supabase
      .from("timesheets")
      .select("*")
      .neq("activity", "PTO")
      .neq("activity", "pto");

    const { data: pto } = await supabase
      .from("pto_records")
      .select("*")
      .eq("is_pto", true);

    const transformedPTO = (pto || []).map((p) => ({
      ...p,
      activity: "PTO",
      client: "",
      project: "",
      required_hours: p.hours,
    }));

    const combined = [...(timesheets || []), ...transformedPTO].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setCombinedData(combined);

    setEmployees([...new Set(combined.map((d) => d.employee_name))]);
    setClients([...new Set(combined.map((d) => d.client).filter(Boolean))]);
    setProjects([...new Set(combined.map((d) => d.project).filter(Boolean))]);

    setLoading(false);
  }

  function filterData() {
    let data = combinedData;

    if (filters.employee) {
      data = data.filter((d) => d.employee_name === filters.employee);
    }
    if (filters.client) {
      data = data.filter((d) => d.client === filters.client);
    }
    if (filters.project) {
      data = data.filter((d) => d.project === filters.project);
    }
    if (filters.dateFrom) {
      data = data.filter(
        (d) => new Date(d.date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      data = data.filter((d) => new Date(d.date) <= new Date(filters.dateTo));
    }

    setFilteredData(data);
    generateSummary(data);
  }

  function generateSummary(data: any[]) {
    if (data.length === 0) return setSummary(null);

    const totalHours = data.reduce((sum, d) => sum + d.hours, 0);
    const uniqueEmp = new Set(data.map((d) => d.employee_name));
    const uniqueClients = new Set(data.map((d) => d.client).filter(Boolean));
    const uniqueProjects = new Set(data.map((d) => d.project).filter(Boolean));

    const dates = data.map((d) => new Date(d.date));
    const minTimestamp = Math.min(...dates.map((d) => d.getTime()));
    const maxTimestamp = Math.max(...dates.map((d) => d.getTime()));

    const minDate = new Date(minTimestamp).toDateString();
    const maxDate = new Date(maxTimestamp).toDateString();

    const uniqueDates = new Set(dates.map((d) => d.toDateString()));
    const avgHours = totalHours / uniqueDates.size;

    setSummary({
      totalHours,
      employees: uniqueEmp.size,
      clients: uniqueClients.size,
      projects: uniqueProjects.size,
      avgHours,
      dateRange: `${minDate} - ${maxDate}`,
    });
  }

  async function exportCSV() {
    if (filteredData.length === 0) {
      return Alert.alert("No data", "Please filter data first.");
    }

    let csv = "Employee,Client,Project,Date,Activity,Hours\n";

    filteredData.forEach((d) => {
      csv += `${d.employee_name},${d.client || "-"},${d.project || "-"},${
        d.date
      },${d.activity},${d.hours}\n`;
    });

    await Share.share({ message: csv });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* FILTERS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Filters</Text>

        <Text style={styles.label}>Employee</Text>
        <View style={styles.dropdown}>
          <Picker
            selectedValue={filters.employee}
            onValueChange={(v) => setFilters({ ...filters, employee: v })}
          >
            <Picker.Item label="All" value="" />
            {employees.map((emp) => (
              <Picker.Item key={emp} label={emp} value={emp} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Client</Text>
        <View style={styles.dropdown}>
          <Picker
            selectedValue={filters.client}
            onValueChange={(v) => setFilters({ ...filters, client: v })}
          >
            <Picker.Item label="All" value="" />
            {clients.map((c) => (
              <Picker.Item key={c} label={c} value={c} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Project</Text>
        <View style={styles.dropdown}>
          <Picker
            selectedValue={filters.project}
            onValueChange={(v) => setFilters({ ...filters, project: v })}
          >
            <Picker.Item label="All" value="" />
            {projects.map((p) => (
              <Picker.Item key={p} label={p} value={p} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>From Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDateFrom(true)}
        >
          <Text>{filters.dateFrom || "Select Date"}</Text>
        </TouchableOpacity>

        {showDateFrom && (
          <DateTimePicker
            mode="date"
            value={new Date()}
            onChange={(e, date) => {
              setShowDateFrom(false);
              if (date) {
                setFilters({
                  ...filters,
                  dateFrom: date.toISOString().split("T")[0],
                });
              }
            }}
          />
        )}

        <Text style={styles.label}>To Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDateTo(true)}
        >
          <Text>{filters.dateTo || "Select Date"}</Text>
        </TouchableOpacity>

        {showDateTo && (
          <DateTimePicker
            mode="date"
            value={new Date()}
            onChange={(e, date) => {
              setShowDateTo(false);
              if (date) {
                setFilters({
                  ...filters,
                  dateTo: date.toISOString().split("T")[0],
                });
              }
            }}
          />
        )}

        <View style={styles.row}>
          <TouchableOpacity style={styles.applyBtn} onPress={filterData}>
            <Text style={styles.btnText}>Apply</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setFilters({
                employee: "",
                client: "",
                project: "",
                dateFrom: "",
                dateTo: "",
              });
              setFilteredData([]);
              setSummary(null);
            }}
          >
            <Text style={styles.btnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SUMMARY */}
      {summary && (
        <View style={styles.cardSummary}>
          <Text style={styles.sectionTitle}>Summary</Text>

          <View style={styles.grid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {summary.totalHours.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{summary.employees}</Text>
              <Text style={styles.statLabel}>Employees</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{summary.clients}</Text>
              <Text style={styles.statLabel}>Clients</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{summary.projects}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
          </View>
        </View>
      )}

    {/* RESULTS */}
    {filteredData.length > 0 && (
      <View style={styles.cardResult}>
        <Text style={styles.sectionTitle}>Filtered Results</Text>

        {/* Group by month */}
        {Object.entries(
          filteredData.reduce((groups: Record<string, any[]>, item: any) => {
            const month = new Date(item.date).toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            });

            if (!groups[month]) groups[month] = [];
            groups[month].push(item);

            return groups;
          }, {})
        ).map(([month, items]: [string, any[]]) => (
          <View key={month} style={{ marginBottom: 16 }}>
            <Text style={styles.monthHeader}>{month}</Text>

            {items.map((d: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.resultCard,
                  index % 2 === 1 && styles.resultCardAlt,
                ]}
              >
                {/* HEADER ROW */}
                <View style={styles.resultHeaderRow}>
                  <Text style={styles.resultHeaderDate}>{d.date}</Text>

                  <View
                    style={[
                      styles.activityBadge,
                      d.activity === "WORK" && { backgroundColor: "#d1e7ff" },
                      d.activity === "PTO" && { backgroundColor: "#ffe0e0" },
                    ]}
                  >
                    <Text style={styles.activityText}>{d.activity}</Text>
                  </View>
                </View>

                {/* DETAILS — ICON ONLY */}

                <View style={styles.resultRow}>
                  <Text style={styles.iconOnly}>👤</Text>
                  <Text style={styles.resultValue}>{d.employee_name}</Text>
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
        ))}


    <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
      <Text style={styles.exportText}>Export CSV</Text>
    </TouchableOpacity>
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
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  soft: "#f8fafc",
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: COLORS.bg,
  },

  /* ---------------- CARDS ---------------- */
  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: COLORS.primary,
  },

  cardSummary: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderColor: COLORS.primary,
  },

  cardResult: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: COLORS.primary,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 8,
  },

  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: "600",
    color: COLORS.text,
  },

  /* ---------------- INPUTS ---------------- */
  dropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.soft,
    marginBottom: 8,
    overflow: "hidden",
  },

  dateButton: {
    backgroundColor: COLORS.soft,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
  },

  /* ---------------- BUTTONS ---------------- */
  row: {
    flexDirection: "row",
    marginTop: 10,
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
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  /* ---------------- SUMMARY ---------------- */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },

  statBox: {
    backgroundColor: COLORS.soft,
    padding: 14,
    borderRadius: 12,
    width: "48%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },

  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },

  /* ---------------- RESULTS ---------------- */
  monthHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 6,
    marginTop: 12,
  },

  resultCard: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  resultCardAlt: {
    backgroundColor: "#f7faff",
  },

  resultHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  resultHeaderDate: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },

  activityBadge: {
    backgroundColor: COLORS.soft,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  activityText: {
    fontSize: 12,
    fontWeight: "800",
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

  /* ---------------- EXPORT ---------------- */
  exportBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    marginTop: 14,
  },

  exportText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  /* ---------------- LOADING ---------------- */
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
});
