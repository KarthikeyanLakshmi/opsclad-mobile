import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { supabase } from "../../../src/lib/supabase";

type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  created_by: string;
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  // modal + form
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (user) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setIsManager(roleRow?.role === "manager");
    }

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      Alert.alert("Error", "Failed to load announcements");
    } else {
      setAnnouncements(data || []);
    }

    setLoading(false);
  }

  async function postAnnouncement() {
    if (!title || !message) {
      Alert.alert("Missing fields", "Title and message are required.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) return;

    const { error } = await supabase.from("announcements").insert({
      title,
      message,
      created_by: user.email,
    });

    if (error) {
      Alert.alert("Error", "Failed to post announcement");
      return;
    }

    setTitle("");
    setMessage("");
    setShowModal(false);
    loadAnnouncements();
  }

  // --------------------
  // UI
  // --------------------
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Announcements</Text>

        {isManager && (
          <TouchableOpacity onPress={() => setShowModal(true)}>
            <Text style={styles.addBtn}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#0A1A4F" />
      ) : announcements.length === 0 ? (
        <Text style={styles.emptyText}>No announcements yet.</Text>
      ) : (
        <ScrollView>
          {announcements.map((a) => (
            <View key={a.id} style={styles.item}>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.message}>{a.message}</Text>
              <Text style={styles.meta}>
                {new Date(a.created_at).toLocaleDateString()} · {a.created_by}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ---------------- MODAL ---------------- */}
      <Modal transparent animationType="slide" visible={showModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Announcement</Text>

            <TextInput
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />

            <TextInput
              placeholder="Message"
              value={message}
              onChangeText={setMessage}
              style={[styles.input, styles.textarea]}
              multiline
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={postAnnouncement}
              >
                <Text style={styles.btnText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0A1A4F",
  },

  addBtn: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },

  emptyText: {
    textAlign: "center",
    paddingVertical: 20,
    color: "#6B7280",
  },

  item: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  message: {
    fontSize: 14,
    color: "#374151",
  },

  meta: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },

  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },

  textarea: {
    height: 80,
    textAlignVertical: "top",
  },

  row: {
    flexDirection: "row",
    marginTop: 10,
  },

  saveBtn: {
    flex: 1,
    backgroundColor: "#0A1A4F",
    padding: 12,
    borderRadius: 6,
    marginLeft: 6,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "gray",
    padding: 12,
    borderRadius: 6,
    marginRight: 6,
  },

  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
});
