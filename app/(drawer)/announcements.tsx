import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Dimensions } from "react-native";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";

interface Announcement {
  id: string;
  title: string;
  content: string;
  senderName: string;
  date: string;
  importance: string; // Yeni alan eklendi
}

export default function AnnouncementScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Announcement,
      );
      setAnnouncements(data);
    });
    return () => unsubscribe();
  }, []);

  const getImportanceDetails = (importance: string) => {
    switch (importance) {
      case "Acil":
        return { bg: "#fee2e2", text: "#ef4444", label: "🚨 ACİL" };
      case "Etkinlik":
        return { bg: "#f5f3ff", text: "#38f013", label: "📅 ETKİNLİK" };
      default:
        return { bg: "#eff6ff", text: "#3b82f6", label: "ℹ️ BİLGİ" };
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Henüz bir duyuru bulunmuyor.</Text>
        }
        renderItem={({ item }) => {
          const details = getImportanceDetails(item.importance);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: details.bg }]}>
                  <Text style={[styles.badgeText, { color: details.text }]}>
                    {details.label}
                  </Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(item.date).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>

              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.content}>{item.content}</Text>

              <View style={styles.divider} />

              <View style={styles.cardFooter}>
                <Text style={styles.senderText}>✍️ {item.senderName}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  card: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "bold" },
  dateText: { fontSize: 12, color: "#999" },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 6,
  },
  content: { fontSize: 14, color: "#4a5568", lineHeight: 20 },
  divider: { height: 1, backgroundColor: "#edf2f7", marginVertical: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end" },
  senderText: { fontSize: 12, color: "#718096", fontWeight: "500" },
  emptyText: { textAlign: "center", marginTop: 50, color: "#a0aec0" },
});
