import React, { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import CustomDropdown from "../../components/CustomDropdown";
import Toast from "react-native-toast-message";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState("");
  const roleOptions = [
    "Müdür",
    "Müdür Baş Yardımcısı",
    "Müdür Yardımcısı",
    "Memur",
    "Öğretmen",
  ];

  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    // Boş alan kontrolü (Eksik bilgi girilirse Toast ile uyar)
    if (!name || !email || !password || !role) {
      return Toast.show({
        type: "error",
        text1: "Eksik Bilgi",
        text2: "Lütfen tüm alanları (Ad, E-Posta, Şifre ve Rol) doldurunuz.",
      });
    }

    try {
      await register(email, password, name, role);

      // BAŞARILI KAYIT TOAST BİLDİRİMİ
      Toast.show({
        type: "success",
        text1: "🎉 Kayıt Başarılı",
        text2: "Hesabınız oluşturuldu, giriş sayfasına yönlendiriliyorsunuz.",
        visibilityTime: 2500,
      });

      // Toast'un kayarak gelme animasyonunu görebilmek için ufak bir gecikme
      setTimeout(() => {
        router.push("/(auth)/login" as any);
      }, 1500);
    } catch (error: any) {
      // HATALI KAYIT TOAST BİLDİRİMİ (Örn: Bu e-posta zaten kullanımda)
      Toast.show({
        type: "error",
        text1: "Kayıt Hatası",
        text2: error.message || "Kayıt işlemi sırasında bir sorun oluştu.",
      });
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Sisteme Kayıt Ol</Text>

      <TextInput
        style={styles.input}
        placeholder="Adınız Soyadınız"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="E-Posta Adresiniz"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Şifreniz (1 Büyük, 1 Küçük, 1 Rakam)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={{ zIndex: 1000, elevation: 1000 }}>
        <CustomDropdown
          placeholder="Sistemdeki Rolünüzü Seçin"
          options={roleOptions}
          value={role}
          onSelect={setRole}
        />
      </View>

      <Pressable style={styles.registerBtn} onPress={handleRegister}>
        <Text style={styles.registerText}>Kayıt Ol</Text>
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
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  registerBtn: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  registerText: { color: "white", fontWeight: "bold", fontSize: 16 },
  backBtn: { marginTop: 20, alignItems: "center", padding: 10 },
  backText: { color: "#007AFF", fontWeight: "bold", fontSize: 16 },
});
