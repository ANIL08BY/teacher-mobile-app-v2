import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";
import Toast from "react-native-toast-message";
import { sendPushNotification } from "../../utils/pushService";
import { useAuth } from "../../context/AuthContext";

export default function AddAnnouncement() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [importance, setImportance] = useState("Bilgi"); // Varsayılan değer
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const importanceOptions = [
    { label: "Acil", color: "#ef4444" },
    { label: "Bilgi", color: "#3b82f6" },
    { label: "Etkinlik", color: "#2be812" },
  ];

  const handleSend = async () => {
    if (!title || !content) {
      Toast.show({ type: "error", text1: "Lütfen tüm alanları doldurun!" });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title,
        content,
        importance, // Önem derecesi eklendi
        senderName: user?.name || "Yönetim",
        date: new Date().toISOString(),
      });

      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);

      querySnapshot.forEach(async (userDoc) => {
        const token = userDoc.data().pushToken;
        if (token) {
          await sendPushNotification(
            token,
            importance === "Acil" ? "🚨 KRİTİK DUYURU!" : "📢 Okul Duyurusu!",
            `${title}: ${content.substring(0, 50)}...`,
          );
        }
      });

      Toast.show({ type: "success", text1: "Duyuru Yayınlandı ✨" });
      setTitle("");
      setContent("");
      setImportance("Bilgi");
    } catch (error) {
      console.error("Duyuru hatası:", error);
      Toast.show({ type: "error", text1: "Duyuru gönderilemedi!" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Duyuru Başlığı</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Örn: Yarınki Toplantı Hakkında"
      />

      <Text style={styles.label}>Önem Derecesi</Text>
      <View style={styles.importanceContainer}>
        {importanceOptions.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => setImportance(option.label)}
            style={[
              styles.importanceBadge,
              importance === option.label && {
                backgroundColor: option.color,
                borderColor: option.color,
              },
            ]}
          >
            <Text
              style={[
                styles.importanceText,
                importance === option.label && { color: "#fff" },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Duyuru İçeriği</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={content}
        onChangeText={setContent}
        placeholder="Mesajınızı buraya yazın..."
        multiline
        numberOfLines={5}
      />

      <Pressable
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleSend}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Gönderiliyor..." : "Yayınla ve Bildirim Gönder"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1 },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: { height: 120, textAlignVertical: "top" },
  importanceContainer: { flexDirection: "row", marginBottom: 25, gap: 10 },
  importanceBadge: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  importanceText: { fontWeight: "bold", color: "#666" },
  button: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
