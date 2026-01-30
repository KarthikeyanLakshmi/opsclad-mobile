/** FULL FILE — LIGHT MODE CLEAN UI **/

import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import { FontAwesome, Feather } from "@expo/vector-icons";

export default function EmployeeSkillTracker() {
  const [employeeSkills, setEmployeeSkills] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [processingSkills, setProcessingSkills] = useState(new Set<string>());

  const [skillFormData, setSkillFormData] = useState({
    skill_name: "",
    skill_category: "",
    skill_description: "",
    proficiency_level: 1,
    years_experience: "",
    notes: "",
    last_used: "",
  });

  const router = useRouter();

  // ------------------- LOAD PROFILE -------------------
  const loadUserProfile = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle()
      setUserProfile(profileData);
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------- LOAD SKILLS -------------------
  const loadEmployeeSkills = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data } = await supabase
        .from("employee_skills_detailed_view")
        .select("*")
        .eq("employee_id", userData.user.id)
        .order("skill_category", { ascending: true })
        .order("skill_name", { ascending: true });

      setEmployeeSkills(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------- ADD SKILL -------------------
  const addSkillToEmployee = async () => {
    if (!skillFormData.skill_name.trim() || !skillFormData.skill_category.trim()) {
      Alert.alert("Missing Fields", "Please provide skill name & category.");
      return;
    }

    setProcessingSkills((prev) => new Set(prev).add("new"));

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      let skillId;
      const { data: existingSkill } = await supabase
        .from("skills")
        .select("id")
        .eq("name", skillFormData.skill_name)
        .single();

      if (existingSkill) {
        skillId = existingSkill.id;
      } else {
        const { data: newSkill, error: skillError } = await supabase
          .from("skills")
          .insert([
            {
              name: skillFormData.skill_name,
              category: skillFormData.skill_category,
              description: skillFormData.skill_description || null,
              created_by: userData.user.id,
            },
          ])
          .select("id")
          .single();

        if (skillError) return;
        if (!newSkill) throw new Error("Skill creation returned null");

        skillId = newSkill.id;
      }

      await supabase.from("employee_skills").insert([
        {
          employee_id: userData.user.id,
          skill_id: skillId,
          proficiency_level: skillFormData.proficiency_level,
          years_experience: Number(skillFormData.years_experience) || 0,
          notes: skillFormData.notes || null,
          last_used: skillFormData.last_used || null,
        },
      ]);

      Alert.alert("Success", "Skill added!");
      loadEmployeeSkills();
      setIsAddSkillOpen(false);

      setSkillFormData({
        skill_name: "",
        skill_category: "",
        skill_description: "",
        proficiency_level: 1,
        years_experience: "",
        notes: "",
        last_used: "",
      });
    } catch (error) {
      Alert.alert("Error", "Unable to add skill.");
    }

    setProcessingSkills((prev) => {
      const newSet = new Set(prev);
      newSet.delete("new");
      return newSet;
    });
  };

  // ------------------- REMOVE SKILL -------------------
  const removeEmployeeSkill = async (skillId: string) => {
    setProcessingSkills((prev) => new Set(prev).add(skillId));

    try {
      await supabase.from("employee_skills").delete().eq("id", skillId);
      loadEmployeeSkills();
    } catch (err) {
      Alert.alert("Error", "Failed to remove skill.");
    }

    setProcessingSkills((prev) => {
      const newSet = new Set(prev);
      newSet.delete(skillId);
      return newSet;
    });
  };

  const confirmDelete = (skillId: string, skillName: string) => {
    Alert.alert(
      "Remove Skill",
      `Are you sure you want to delete "${skillName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeEmployeeSkill(skillId),
        },
      ]
    );
  };

  // ------------------- FILTER -------------------
  const filteredSkills = employeeSkills.filter(
    (skill) =>
      skill.skill_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.skill_category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ------------------- INIT -------------------
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadUserProfile(), loadEmployeeSkills()]);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  const renderStars = (level: number) => {
    return [...Array(5)].map((_, i) => (
      <FontAwesome
        key={i}
        name={i < level ? "star" : "star-o"}
        size={18}
        color={i < level ? "#facc15" : "#d1d5db"}
        style={{ marginRight: 2 }}
      />
    ));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
    <View style={{ flex: 1, paddingTop: 50 , backgroundColor: "#f4f4f5"}}>
      {/* BACK */}
      <View style={styles.row}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/home")}>
        <Feather name="arrow-left" size={22} color="#4b5563" />
      </TouchableOpacity>
      {/* HEADER */}
      <Text style={styles.title}>Skills Tracker</Text>
      </View>

      {/* ADD SKILL BUTTON */}
      <TouchableOpacity style={styles.addButton} onPress={() => setIsAddSkillOpen(true)}>
        <Feather name="plus" size={18} color="#fff" />
        <Text style={styles.addButtonText}>Add Skill</Text>
      </TouchableOpacity>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <TextInput
          placeholder="Search skills..."
          placeholderTextColor="#9ca3af"
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.searchInput}
        />
      </View>

      {/* SKILLS */}
      <View style={styles.grid}>
        {filteredSkills.length === 0 ? (
          <Text style={styles.noSkillsText}>No matching skills.</Text>
        ) : (
          filteredSkills.map((skill) => (
            <View key={skill.id} style={styles.skillCard}>
              <View style={styles.skillHeader}>
                <View>
                  <Text style={styles.skillName}>{skill.skill_name}</Text>
                  <Text style={styles.skillCategory}>{skill.skill_category}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => confirmDelete(skill.id, skill.skill_name)}
                  disabled={processingSkills.has(skill.id)}
                >
                  {processingSkills.has(skill.id) ? (
                    <ActivityIndicator size="small" color="red" />
                  ) : (
                    <Feather name="trash-2" size={18} color="red" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.starsRow}>{renderStars(skill.proficiency_level)}</View>

              {skill.years_experience > 0 && (
                <Text style={styles.experienceText}>{skill.years_experience} years experience</Text>
              )}

              {skill.notes && <Text style={styles.notesText}>{`"${skill.notes}"`}</Text>}

              {skill.last_used && (
                <Text style={styles.lastUsedText}>
                  Last used: {new Date(skill.last_used).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* MODAL */}
      <Modal visible={isAddSkillOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Skill</Text>

            <TextInput
              placeholder="Skill Name"
              style={styles.modalInput}
              value={skillFormData.skill_name}
              onChangeText={(t) => setSkillFormData({ ...skillFormData, skill_name: t })}
            />

            <TextInput
              placeholder="Skill Category"
              style={styles.modalInput}
              value={skillFormData.skill_category}
              onChangeText={(t) => setSkillFormData({ ...skillFormData, skill_category: t })}
            />

            <Text style={styles.label}>Proficiency</Text>
            <View style={styles.starSelectorRow}>
              {[1, 2, 3, 4, 5].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => setSkillFormData({ ...skillFormData, proficiency_level: lvl })}
                >
                  <FontAwesome
                    name={skillFormData.proficiency_level >= lvl ? "star" : "star-o"}
                    size={28}
                    color={skillFormData.proficiency_level >= lvl ? "#facc15" : "#d1d5db"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              keyboardType="numeric"
              placeholder="Years of Experience"
              style={styles.modalInput}
              value={skillFormData.years_experience}
              onChangeText={(t) =>
                setSkillFormData({
                  ...skillFormData,
                  years_experience: t.replace(/[^0-9]/g, ""), // only numbers
                })
              }
            />

            <TouchableOpacity style={styles.saveButton} onPress={addSkillToEmployee}>
              {processingSkills.has("new") ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Add Skill</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAddSkillOpen(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
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
  danger: "#dc2626",
  star: "#facc15",
};

const styles = StyleSheet.create({
  /* ---------- Layout ---------- */
  container: {
    backgroundColor: COLORS.bg,
    padding: 16,
    minHeight: "100%",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },

  backButton: {
    padding: 6,
    borderRadius: 20,
  },

  /* ---------- Header ---------- */
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
  },

  /* ---------- Add Button ---------- */
  addButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
    gap: 6,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  /* ---------- Search ---------- */
  searchBox: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: COLORS.primary,
  },

  /* ---------- Grid ---------- */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  /* ---------- Skill Card ---------- */
  skillCard: {
    backgroundColor: COLORS.card,
    width: "48%",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },

  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  skillName: {
    fontWeight: "700",
    color: COLORS.primary,
  },

  skillCategory: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },

  /* ---------- Stars ---------- */
  starsRow: {
    flexDirection: "row",
    marginTop: 6,
  },

  experienceText: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 6,
  },

  notesText: {
    fontStyle: "italic",
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  lastUsedText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  noSkillsText: {
    textAlign: "center",
    color: COLORS.muted,
    marginTop: 20,
  },

  /* ---------- Modal ---------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 12,
  },

  modalInput: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: COLORS.primary,
    marginBottom: 12,
  },

  label: {
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 6,
  },

  starSelectorRow: {
    flexDirection: "row",
    marginBottom: 16,
  },

  /* ---------- Modal Buttons ---------- */
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  cancelButton: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
