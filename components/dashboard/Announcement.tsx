import React, { useEffect, useState } from "react"
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
} from "react-native"
import { supabase } from "../../src/lib/supabase"

/* ---------------- TYPES ---------------- */

type Role = "manager" | "employee"

type Announcement = {
  id: string
  title: string
  content: string
  start_date: string
  end_date: string
  created_at: string
}

type Props = {
  role: Role
  selectedMonth: Date   // ✅ NEW
}

/* ---------------- HELPERS ---------------- */

function getStatus(
  start: string,
  end: string
): "active" | "upcoming" | "inactive" {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const s = new Date(start)
  const e = new Date(end)

  if (today < s) return "upcoming"
  if (today > e) return "inactive"
  return "active"
}

/* ✅ Month overlap check (same logic as web) */
function overlapsMonth(
  start: string,
  end: string,
  month: Date
) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)

  return (
    new Date(start) <= monthEnd &&
    new Date(end) >= monthStart
  )
}

/* ---------------- COMPONENT ---------------- */

export default function Announcements({ role, selectedMonth }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    content: "",
    start_date: "",
    end_date: "",
  })

  /* 🔁 Reload when month OR role changes */
  useEffect(() => {
    loadAnnouncements()
  }, [role, selectedMonth])

  async function loadAnnouncements() {
    setLoading(true)

    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, content, start_date, end_date, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      Alert.alert("Error", "Failed to load announcements")
      setLoading(false)
      return
    }

    /* 🔹 Role-based filtering */
    const roleFiltered =
      role === "employee"
        ? data?.filter(
            a => getStatus(a.start_date, a.end_date) !== "upcoming"
          )
        : data

    /* 🔹 Month-based filtering */
    const monthFiltered = roleFiltered?.filter(a =>
      overlapsMonth(a.start_date, a.end_date, selectedMonth)
    )

    setAnnouncements(monthFiltered || [])
    setLoading(false)
  }

  async function saveAnnouncement() {
    if (
      !form.title ||
      !form.content ||
      !form.start_date ||
      !form.end_date
    ) {
      Alert.alert("Missing fields", "All fields are required")
      return
    }

    const query = editingId
      ? supabase
          .from("announcements")
          .update(form)
          .eq("id", editingId)
      : supabase.from("announcements").insert(form)

    const { error } = await query

    if (error) {
      Alert.alert("Error", "Failed to save announcement")
      return
    }

    setModalOpen(false)
    setEditingId(null)
    setForm({ title: "", content: "", start_date: "", end_date: "" })
    loadAnnouncements()
  }

  async function deleteAnnouncement(id: string) {
    Alert.alert("Delete", "Delete this announcement?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("announcements").delete().eq("id", id)
          loadAnnouncements()
        },
      },
    ])
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Announcements</Text>

        {role === "manager" && (
          <TouchableOpacity
            onPress={() => {
              setEditingId(null)
              setForm({
                title: "",
                content: "",
                start_date: "",
                end_date: "",
              })
              setModalOpen(true)
            }}
          >
            <Text style={styles.add}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : announcements.length === 0 ? (
        <Text style={styles.empty}>No announcements for this month</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {announcements.map(a => {
            const status = getStatus(a.start_date, a.end_date)

            return (
              <View key={a.id} style={styles.item}>
                {role === "manager" && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(a.id)
                        setForm({
                          title: a.title,
                          content: a.content,
                          start_date: a.start_date,
                          end_date: a.end_date,
                        })
                        setModalOpen(true)
                      }}
                    >
                      <Text style={styles.edit}>✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => deleteAnnouncement(a.id)}>
                      <Text style={styles.delete}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.itemTitle}>{a.title}</Text>
                <Text style={styles.content}>{a.content}</Text>

                <View style={styles.meta}>
                  <Text style={[styles.badge, styles[status]]}>
                    {status.toUpperCase()}
                  </Text>
                  <Text style={styles.dates}>
                    {a.start_date} → {a.end_date}
                  </Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* ---------------- MODAL ---------------- */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingId ? "Edit Announcement" : "New Announcement"}
            </Text>

            <TextInput
              placeholder="Title"
              value={form.title}
              onChangeText={v => setForm(p => ({ ...p, title: v }))}
              style={styles.input}
            />

            <TextInput
              placeholder="Message"
              multiline
              value={form.content}
              onChangeText={v => setForm(p => ({ ...p, content: v }))}
              style={[styles.input, styles.textarea]}
            />

            <TextInput
              placeholder="Start Date (YYYY-MM-DD)"
              value={form.start_date}
              onChangeText={v => setForm(p => ({ ...p, start_date: v }))}
              style={styles.input}
            />

            <TextInput
              placeholder="End Date (YYYY-MM-DD)"
              value={form.end_date}
              onChangeText={v => setForm(p => ({ ...p, end_date: v }))}
              style={styles.input}
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.cancel}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.btn}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.save} onPress={saveAnnouncement}>
                <Text style={styles.btn}>
                  {editingId ? "Update" : "Post"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#0A1A4F" },
  add: { fontWeight: "700", color: "#2563EB" },
  empty: { textAlign: "center", color: "#6B7280" },

  item: {
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },

  edit: { fontSize: 16 },
  delete: { fontSize: 16 },

  itemTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  content: { color: "#374151", marginTop: 4 },

  meta: { marginTop: 8 },
  dates: { fontSize: 12, color: "#6B7280" },

  badge: {
    alignSelf: "flex-start",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
    color: "#fff",
  },

  active: { backgroundColor: "#2563EB" },
  upcoming: { backgroundColor: "#F97316" },
  inactive: { backgroundColor: "#6B7280" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },

  modal: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },

  textarea: { height: 80 },

  row: { flexDirection: "row", marginTop: 10 },
  cancel: {
    flex: 1,
    backgroundColor: "#9CA3AF",
    padding: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  save: {
    flex: 1,
    backgroundColor: "#0A1A4F",
    padding: 12,
    borderRadius: 6,
    marginLeft: 6,
  },
  btn: { color: "#fff", textAlign: "center", fontWeight: "700" },
})
