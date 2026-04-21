import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import Toast from "react-native-toast-message";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const { resetPassword } = useAuth();
  const router = useRouter();

  const handleReset = async () => {
    // Boş alan kontrolü
    if (!email || !newPassword) {
      return Toast.show({
        type: "error",
        text1: "Eksik Bilgi",
        text2: "Lütfen e-posta adresinizi ve yeni şifrenizi giriniz.",
      });
    }

    try {
      await resetPassword(email, newPassword);

      // BAŞARILI SIFIRLAMA TOAST BİLDİRİMİ
      Toast.show({
        type: "success",
        text1: "✨ Başarılı!",
        text2: "Şifreniz güncellendi. Giriş ekranına yönlendiriliyorsunuz.",
        visibilityTime: 2500,
      });

      // Toast'un kayarak gelme animasyonunu görebilmek için ufak bir gecikme
      setTimeout(() => {
        router.push("/(auth)/login" as any);
      }, 1500);
    } catch (error: any) {
      // HATALI SIFIRLAMA TOAST BİLDİRİMİ
      Toast.show({
        type: "error",
        text1: "Sıfırlama Hatası",
        text2: error.message || "Şifre güncellenirken bir sorun oluştu.",
      });
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Şifremi Sıfırla</Text>
      <Text style={styles.infoText}>
        Güvenlik nedeniyle kilitlenen hesabınızı açmak veya şifrenizi
        değiştirmek için aşağıdaki bilgileri doldurun.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Kayıtlı E-Posta Adresiniz"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Yeni Şifre (1 Büyük, 1 Küçük, 1 Rakam)"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />

      <Pressable style={styles.resetBtn} onPress={handleReset}>
        <Text style={styles.resetText}>Şifreyi Güncelle</Text>
      </Pressable>

      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>Geri Dön</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f0f2f5",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  resetBtn: {
    backgroundColor: "#FF9500",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  resetText: { color: "white", fontWeight: "bold", fontSize: 16 },
  backBtn: { marginTop: 20, alignItems: "center", padding: 10 },
  backText: { color: "#007AFF", fontWeight: "bold", fontSize: 16 },
});
