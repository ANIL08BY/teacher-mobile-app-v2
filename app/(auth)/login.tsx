import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  ZoomIn,
} from "react-native-reanimated";
import Toast from "react-native-toast-message"; // 🔥 TOAST IMPORT EDİLDİ

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Açılış Ekranı (Splash Screen) Zamanlayıcısı
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2.5 saniye sonra Splash kaybolur
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      return Toast.show({
        type: "error",
        text1: "Eksik Bilgi",
        text2: "Lütfen e-posta ve şifrenizi giriniz.",
      });
    }

    setLoading(true);
    try {
      await login(email, password);

      // 🔥 BAŞARILI GİRİŞ TOAST BİLDİRİMİ
      Toast.show({
        type: "success",
        text1: "Hoş Geldiniz",
        text2: "Sisteme başarıyla giriş yapıldı.",
      });

      router.replace("/(drawer)");
    } catch (error: any) {
      // 🔥 HATALI GİRİŞ TOAST BİLDİRİMİ (Kaba alert yerine)
      Toast.show({
        type: "error",
        text1: "Giriş Başarısız",
        text2:
          error.message || "Lütfen bilgilerinizi kontrol edip tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 1. AŞAMA: KARŞILAMA EKRANI (SPLASH SCREEN)
  if (showSplash) {
    return (
      <Animated.View
        exiting={FadeOut.duration(500)}
        style={styles.splashContainer}
      >
        <Animated.View
          entering={ZoomIn.duration(1000)}
          style={styles.logoContainer}
        >
          <Ionicons name="school" size={100} color="#FFF" />
        </Animated.View>
        <Animated.Text
          entering={FadeIn.delay(500).duration(1000)}
          style={styles.splashTitle}
        >
          Okul<Text style={{ color: "#FCD34D" }}>+</Text>
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.delay(1000).duration(1000)}
          style={styles.splashSubtitle}
        >
          Akıllı Eğitim Otomasyonu
        </Animated.Text>
      </Animated.View>
    );
  }

  // 🔥 2. AŞAMA: YENİ GİRİŞ EKRANI (LOGIN)
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.loginContainer}
    >
      <Animated.View
        entering={FadeInDown.duration(800)}
        style={styles.loginBox}
      >
        {/* YENİ LOGO VE İSİM */}
        <View style={styles.loginHeader}>
          <View style={styles.smallLogoContainer}>
            <Ionicons name="school" size={50} color="#1a0ce8" />
          </View>
          <Text style={styles.loginTitle}>
            Okul<Text style={{ color: "#F59E0B" }}>+</Text>
          </Text>
          <Text style={styles.loginSubtitle}>
            Sisteme giriş yapmak için bilgilerinizi giriniz.
          </Text>
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#6B7280"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="E-Posta Adresi"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#6B7280"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>

        {/* ALT LİNKLER */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.linkTextBlue}>Hesabın yok mu? Kayıt Ol</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/forgot-password")}>
            <Text style={styles.linkTextRed}>Şifremi Unuttum</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // SPLASH EKRANI STİLLERİ
  splashContainer: {
    flex: 1,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: 160,
    height: 160,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  splashSubtitle: {
    fontSize: 16,
    color: "#E0E7FF",
    marginTop: 10,
    fontStyle: "italic",
  },

  // LOGIN EKRANI STİLLERİ
  loginContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loginBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  loginHeader: { alignItems: "center", marginBottom: 30 },
  smallLogoContainer: {
    backgroundColor: "#EEF2FF",
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
  },
  loginTitle: { fontSize: 32, fontWeight: "900", color: "#1F2937" },
  loginSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: "#1F2937" },

  button: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },

  footerLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    paddingHorizontal: 5,
  },
  linkTextBlue: { color: "#4F46E5", fontSize: 13, fontWeight: "bold" },
  linkTextRed: { color: "#EF4444", fontSize: 13, fontWeight: "bold" },
});
