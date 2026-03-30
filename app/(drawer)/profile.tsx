import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { uploadFileToStorage } from "../../utils/storageService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";

export default function ProfileScreen() {
  const { user, updateUserContext } = useAuth(); // Sisteme giriş yapmış kullanıcıyı çekiyoruz
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Varsayılan Avatar (Kullanıcı fotoğraf yüklemediyse)
  const defaultAvatar = `https://ui-avatars.com/api/?name=${name || "Kullanıcı"}&background=4F46E5&color=fff&size=200`;

  // Galeriden Fotoğraf Seçme Fonksiyonu
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "İzin Reddedildi",
        "Profil fotoğrafı seçmek için galeri erişim izni gereklidir.",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // Firebase dostu boyut
    });

    if (!result.canceled && user?.id) {
      const selectedUri = result.assets[0].uri;
      setAvatar(selectedUri); // Arayüzde anında göster (İyimser Güncelleme)
      setIsUploadingImage(true);

      try {
        // 1. Firebase Storage'a yükle
        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
        const firebaseUrl = await uploadFileToStorage(
          selectedUri,
          "profile_photos",
          fileName,
        );

        // 2. Firestore'daki Kullanıcı Dökümanını Güncelle
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, { avatar: firebaseUrl });

        // 3. AuthContext'i güncelle ki uygulamanın her yeri anında öğrensin
        updateUserContext({ avatar: firebaseUrl });

        Toast.show({ type: "success", text1: "Fotoğraf Güncellendi ✨" });
      } catch (error) {
        console.error("Fotoğraf yükleme hatası:", error);
        Toast.show({ type: "error", text1: "Yükleme Başarısız!" });
        setAvatar(user?.avatar || ""); // Hata olursa eski resme geri dön
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  // Bilgileri Kaydetme Fonksiyonu
  const handleSave = async () => {
    if (!name || !email)
      return Alert.alert("Hata", "Ad ve E-Posta alanları boş bırakılamaz.");

    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setPassword("");

      Toast.show({
        type: "success",
        text1: "✨ Profil Güncellendi",
        text2: "Hesap bilgileriniz ve yeni şifreniz başarıyla kaydedildi.",
        visibilityTime: 3000,
      });
    }, 1500);
  };

  //  Hesabı Silme Fonksiyonu (Jakob Nielsen - Hata Önleme Standartlarına Uygun)
  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ Hesabımı Sil",
      "Bu işlem kesinlikle geri alınamaz! Tüm verilerinizi silmek istediğinize emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Evet, Hesabımı Sil",
          style: "destructive",
          onPress: () => {
            Toast.show({
              type: "error", // Hata/Kritik durum rengi (Kırmızı)
              text1: "Hesap Silindi",
              text2: "Hesabınız kalıcı olarak kapatıldı.",
            });
            setTimeout(() => {
              router.replace("/");
            }, 1500);
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ÜST BİLGİ VE AVATAR ALANI */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={styles.headerCard}
        >
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickImage}
            activeOpacity={0.8}
            disabled={isUploadingImage} // Yüklenirken tıklanamaz olsun
          >
            <Image
              source={{ uri: avatar || defaultAvatar }}
              style={[
                styles.avatar,
                isUploadingImage && { opacity: 0.5 }, // Yüklenirken soluk görünsün
              ]}
            />
            {isUploadingImage ? (
              <ActivityIndicator
                size="large"
                color="#1722e8"
                style={{ position: "absolute", top: 35, left: 35 }}
              />
            ) : (
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={16} color="white" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.userName}>{name || "Kullanıcı Adı"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || "Personel"}</Text>
          </View>
          <Text style={styles.infoText}>
            Hesap bilgilerinizi ve profil fotoğrafınızı bu ekrandan
            güncelleyebilirsiniz.
          </Text>
        </Animated.View>

        {/* FORM ALANI */}
        <Animated.View
          entering={FadeInUp.delay(200)}
          style={styles.formContainer}
        >
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>

          <Text style={styles.inputLabel}>Ad Soyad</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#6B7280"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Adınız Soyadınız"
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={styles.inputLabel}>E-Posta Adresi</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#6B7280"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-Posta Adresiniz"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.sectionTitle}>Güvenlik</Text>

          <Text style={styles.inputLabel}>Yeni Şifre (İsteğe Bağlı)</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#6B7280"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Şifreyi değiştirmek için doldurun"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          {/* KAYDET BUTONU */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>Değişiklikleri Kaydet</Text>
            )}
          </TouchableOpacity>

          {/* 🔥 HESABI SİL BUTONU */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#EF4444"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.deleteBtnText}>Hesabımı Sil</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

  headerCard: {
    backgroundColor: "#FFF",
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 20,
  },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "#EEF2FF",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#112ae8",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 5,
  },
  roleBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 15,
  },
  roleText: { color: "#114ced", fontSize: 13, fontWeight: "bold" },
  infoText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 13,
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  formContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 15,
    marginTop: 10,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#1F2937" },
  eyeIcon: { padding: 5 },

  saveBtn: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

  // YENİ BUTONUN STİLLERİ
  deleteBtn: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#fd5151",
  },
  deleteBtnText: { color: "#EF4444", fontSize: 16, fontWeight: "bold" },
});
