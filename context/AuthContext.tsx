import React, { createContext, useState, useContext, useEffect } from "react";
import Toast from "react-native-toast-message";

// FIREBASE İMPORTLARI
import { auth, db } from "../utils/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (
    email: string,
    pass: string,
    name: string,
    role: string,
  ) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string, newPass: string) => Promise<void>;
  deleteMyAccount: () => Promise<void>;
  isLoading: boolean;
  updateUserContext: (updates: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const updateUserContext = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. SİHİR: FIREBASE OTOMATİK OTURUM DİNLEYİCİSİ
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: userData.name,
            role: userData.role,
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. GİRİŞ YAPMA (Firebase Auth)
  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        throw new Error(
          "Çok fazla hatalı deneme! Güvenlik gereği hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin veya şifrenizi sıfırlayın.",
        );
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        throw new Error("Hatalı e-posta veya şifre girdiniz.");
      }
      throw new Error("Giriş başarısız: " + error.message);
    }
  };

  // 3. KAYIT OLMA (Firebase Auth + Firestore)
  const register = async (
    email: string,
    pass: string,
    name: string,
    role: string,
  ) => {
    if (!name.trim() || !role.trim())
      throw new Error("İsim ve Rol alanı boş bırakılamaz.");

    // Müdür Yetkisi Kontrolü (Sadece 1 Müdür olabilir)
    if (role === "Müdür") {
      const q = query(collection(db, "users"), where("role", "==", "Müdür"));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        throw new Error(
          "Güvenlik İhlali: Sistemde zaten bir Müdür mevcut! İkinci bir Müdür kayıt olamaz.",
        );
      }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        pass,
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: name.trim(),
        role: role,
        email: email.trim().toLowerCase(),
      });
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use")
        throw new Error("Bu e-posta adresi zaten sisteme kayıtlı!");
      if (error.code === "auth/weak-password")
        throw new Error("Şifre en az 6 karakter olmalıdır.");
      throw new Error("Kayıt başarısız: " + error.message);
    }
  };

  // 4. ÇIKIŞ YAPMA
  const logout = async () => {
    await signOut(auth);
    // 🔥 YENİ: ÇIKIŞ YAPILDI TOAST BİLDİRİMİ
    Toast.show({
      type: "info",
      text1: "👋 Çıkış Yapıldı",
      text2: "Hesabınızdan güvenli bir şekilde çıkış yaptınız.",
    });
  };

  // 5. ŞİFRE SIFIRLAMA
  const resetPassword = async (email: string, newPass: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      // Başarı Toast'u UI (forgot-password.tsx) tarafında gösterildiği için buradaki Alert silindi.
    } catch (error: any) {
      if (error.code === "auth/user-not-found")
        throw new Error("Bu e-posta adresine ait bir hesap bulunamadı.");
      throw new Error("Sıfırlama hatası: " + error.message);
    }
  };

  // 6. HESABI TAMAMEN SİLME
  const deleteMyAccount = async () => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, "users", auth.currentUser.uid));
      await deleteUser(auth.currentUser);
      // Başarı Toast'u UI (profile.tsx) tarafında gösteriliyor.
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        // 🔥 YENİ: GÜVENLİK GEREĞİ SİLİNEMEME DURUMU TOAST BİLDİRİMİ
        Toast.show({
          type: "error",
          text1: "Güvenlik Uyarısı",
          text2: "Hesabınızı silebilmek için çıkış yapıp tekrar girmelisiniz.",
          visibilityTime: 4000,
        });
        throw new Error("requires-recent-login");
      } else {
        console.error("Hesap silinirken hata:", error);
        Toast.show({
          type: "error",
          text1: "Silme Hatası",
          text2: "Hesap silinirken bir sorun oluştu.",
        });
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        resetPassword,
        deleteMyAccount,
        isLoading,
        updateUserContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
