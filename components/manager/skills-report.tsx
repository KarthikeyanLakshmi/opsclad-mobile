import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";

interface EmployeeSkillData {
  employee_id: string;
  employee_name: string;
  emp_id: string;
  department: string;
  position: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: number;
  years_experience: number;
  notes?: string;
}

export default function SkillTrackerScreen() {
  const router = useRouter();

  const [skills, setSkills] = useState<EmployeeSkillData[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<EmployeeSkillData[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const loadSkills = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("employee_skills_view")
      .select("*")
      .order("employee_name", { ascending: true });

    if (!error && data) {
      setSkills(data);
      setFilteredSkills(data);
    }

    setLoading(false);
  };

  const filterSkills = () => {
    let result = skills;

    if (search.trim() !== "") {
      result = result.filter(
        (s) =>
          s.employee_name.toLowerCase().includes(search.toLowerCase()) ||
          s.skill_name.toLowerCase().includes(search.toLowerCase()) ||
          s.skill_category.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (selectedEmployee) {
      result = result.filter((s) => s.employee_name === selectedEmployee);
    }

    if (selectedSkill) {
      result = result.filter((s) => s.skill_name === selectedSkill);
    }

    setFilteredSkills(result);
  };

  useEffect(filterSkills, [search, selectedEmployee, selectedSkill]);
  useEffect(() => {
    loadSkills();
  }, []);

  const employees = [...new Set(skills.map((s) => s.employee_name))];
  const skillNames = [...new Set(skills.map((s) => s.skill_name))];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
    <View style={{ flex: 1, paddingTop: 10 }}>
      
      {/* HEADER (User Roles Style) */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#111" />
        </TouchableOpacity>

        <Text style={styles.header}>Skills Report</Text>
      </View>

      {/* Search Input */}
      <TextInput
        style={styles.input}
        placeholder="Search employee or skill..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />

      {/* Employee Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Filter by Employee:</Text>
        <FlatList
          data={employees}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 0 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedEmployee === item && styles.filterButtonActive,
              ]}
              onPress={() =>
                setSelectedEmployee(selectedEmployee === item ? null : item)
              }
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedEmployee === item && { color: "#fff" },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Skill Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Filter by Skill:</Text>
        <FlatList
          data={skillNames}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 0 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedSkill === item && styles.filterButtonActive,
              ]}
              onPress={() =>
                setSelectedSkill(selectedSkill === item ? null : item)
              }
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedSkill === item && { color: "#fff" },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Skills List */}
      <FlatList
        data={filteredSkills}
        keyExtractor={(item, index) => item.employee_id + item.skill_name + index}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.employee_name}</Text>
            <Text style={styles.skill}>{item.skill_name}</Text>
            <Text style={styles.category}>{item.skill_category}</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Proficiency: </Text>
              <Text style={styles.value}>{item.proficiency_level}/5</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Experience: </Text>
              <Text style={styles.value}>{item.years_experience} years</Text>
            </View>

            {item.notes ? (
              <Text style={styles.notes}>“{item.notes}”</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: "#555" }}>No skills found.</Text>
          </View>
        }
      />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },

  backButton: {
    padding: 6,
  },

  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },

  input: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    color: "#111827",
    marginBottom: 16,
  },

  filterContainer: {
    marginBottom: 16,
  },

  filterTitle: {
    color: "#444",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
  },

  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    marginRight: 8,
    height: 28,
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: "#4A90E2",
  },
  filterButtonText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  name: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  skill: {
    color: "#2563eb",
    fontSize: 14,
    marginTop: 2,
    fontWeight: "600",
  },
  category: {
    color: "#6b7280",
    fontSize: 12,
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    marginTop: 4,
  },
  label: {
    color: "#444",
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    color: "#111827",
    fontSize: 12,
  },

  notes: {
    color: "#6b7280",
    marginTop: 8,
    fontStyle: "italic",
  },

  center: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
});
