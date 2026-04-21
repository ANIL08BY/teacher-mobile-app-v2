import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Teacher, Lesson } from "../constants/types";
import { INITIAL_TEACHERS } from "../constants/data";
import {
  generateExamScheduleAI,
  selectDepartmentHeadAI,
} from "../utils/aiService";
import Toast from "react-native-toast-message"; // 🔥 TOAST IMPORT EDİLDİ (Alert yerine)

// FIREBASE İMPORTLARI
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "../utils/firebaseConfig";

interface TeacherContextType {
  teachers: Teacher[];
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;
  addLesson: (teacherId: string, lesson: Lesson) => void;
  updateLesson: (teacherId: string, lesson: Lesson) => void;
  deleteLesson: (teacherId: string, lessonId: string) => void;
  isLoading: boolean;
  resetDatabase: () => Promise<void>;
  updateThemeSetting: () => Promise<void>;
  clearCache: () => Promise<void>;
  generateExamSchedule: (examList: string[]) => Promise<any[]>;
  selectDepartmentHead: (
    branch: string,
  ) => Promise<{ selectedTeacher: string; reason: string } | null>;
  assignDepartmentHead: (branch: string, newHeadId: string) => Promise<void>;
  updateStepCount: (teacherId: string, steps: number) => Promise<void>;
  logEmergency: (teacherId: string, details: string) => Promise<void>;
}

export const TeacherContext = createContext<TeacherContextType | undefined>(
  undefined,
);

export const TeacherProvider = ({ children }: { children: ReactNode }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // FIREBASE REALTIME LISTENER (Canlı Dinleme)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "teachers"),
      (snapshot) => {
        const loadedTeachers: Teacher[] = [];
        snapshot.forEach((doc) => {
          loadedTeachers.push(doc.data() as Teacher);
        });
        setTeachers(loadedTeachers);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase canlı dinleme hatası:", error);
        // 🔥 BAĞLANTI KOPARSA TOAST İLE UYAR
        Toast.show({
          type: "error",
          text1: "Bağlantı Hatası",
          text2: "Sunucu ile bağlantı koptu. Veriler güncellenemiyor.",
        });
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // 2. ÖĞRETMEN EKLEME/GÜNCELLEME/SİLME (Bulut İşlemleri)
  const addTeacher = async (teacher: Teacher) => {
    try {
      await setDoc(doc(db, "teachers", teacher.id), teacher);
    } catch (error) {
      console.error("Öğretmen eklenirken hata:", error);
      // 🔥 KABA ALERT YERİNE ŞIK HATA TOAST'I
      Toast.show({
        type: "error",
        text1: "Eşitleme Hatası",
        text2:
          "Öğretmen buluta eklenemedi. İnternet bağlantınızı kontrol edin.",
      });
    }
  };

  const updateTeacher = async (updatedTeacher: Teacher) => {
    try {
      await updateDoc(
        doc(db, "teachers", updatedTeacher.id),
        updatedTeacher as any,
      );
    } catch (error) {
      console.error("Öğretmen güncellenirken hata:", error);
      Toast.show({
        type: "error",
        text1: "Güncelleme Hatası",
        text2: "Değişiklikler buluta kaydedilemedi.",
      });
    }
  };

  const deleteTeacher = async (id: string) => {
    try {
      await deleteDoc(doc(db, "teachers", id));
    } catch (error) {
      console.error("Öğretmen silinirken hata:", error);
      Toast.show({
        type: "error",
        text1: "Silme Hatası",
        text2: "Öğretmen buluttan silinemedi.",
      });
    }
  };

  // 3. DERS (NÖBET) İŞLEMLERİ
  const addLesson = async (teacherId: string, lesson: Lesson) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher) {
      const updatedLessons = [...teacher.lessons, lesson];
      await updateDoc(doc(db, "teachers", teacherId), {
        lessons: updatedLessons,
      });
    }
  };

  const updateLesson = async (teacherId: string, updatedLesson: Lesson) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher) {
      const updatedLessons = teacher.lessons.map((l) =>
        l.id === updatedLesson.id ? updatedLesson : l,
      );
      await updateDoc(doc(db, "teachers", teacherId), {
        lessons: updatedLessons,
      });
    }
  };

  const deleteLesson = async (teacherId: string, lessonId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher) {
      const updatedLessons = teacher.lessons.filter((l) => l.id !== lessonId);
      await updateDoc(doc(db, "teachers", teacherId), {
        lessons: updatedLessons,
      });
    }
  };

  // YEREL AYARLAR (Telefona Özel - AsyncStorage'da Kalıyor)
  const updateThemeSetting = async () => {
    try {
      const newSetting = JSON.stringify({ theme: "dark" });
      await AsyncStorage.mergeItem("@appSettings", newSetting);
      // Başarı Toast'ı UI (settings.tsx) sayfasında gösterildiği için buradaki Alert kaldırıldı.
    } catch (error) {
      console.error(error);
    }
  };

  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem("@lastUpdate");
      // Başarı Toast'ı UI (settings.tsx) sayfasında gösterildiği için buradaki Alert kaldırıldı.
    } catch (error) {
      console.error(error);
    }
  };

  // TOPLU SIFIRLAMA (Batch Write - Performanslı Çoklu Veri Yazma)
  const resetDatabase = async () => {
    try {
      setIsLoading(true);
      const batch = writeBatch(db);

      teachers.forEach((t) => {
        batch.delete(doc(db, "teachers", t.id));
      });

      INITIAL_TEACHERS.forEach((t) => {
        batch.set(doc(db, "teachers", t.id), t);
      });

      await batch.commit();
      // Başarı Toast'ı UI (settings.tsx) sayfasında gösterildiği için buradaki Alert kaldırıldı.
    } catch (error) {
      console.error("Sıfırlama hatası:", error);
      Toast.show({
        type: "error",
        text1: "Sıfırlama Hatası",
        text2: "Bulut veritabanı sıfırlanırken kritik bir sorun oluştu.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // YAPAY ZEKA SINAV VE GÖZETMEN DAĞITIM FONKSİYONU
  const generateExamSchedule = async (examList: string[]) => {
    try {
      const schedule = await generateExamScheduleAI(teachers, examList);
      return schedule;
    } catch (error) {
      console.error("Sınav dağıtımı sırasında hata:", error);
      throw error;
    }
  };

  const selectDepartmentHead = async (branch: string) => {
    try {
      return await selectDepartmentHeadAI(teachers, branch);
    } catch (error) {
      console.error("Zümre başkanı seçilirken hata:", error);
      throw error;
    }
  };

  // Gerçek Atama ve Tacı Devretme İşlemi
  const assignDepartmentHead = async (branch: string, newHeadId: string) => {
    try {
      setIsLoading(true);
      const batch = writeBatch(db);

      const branchTeachers = teachers.filter((t) => t.branch === branch);
      branchTeachers.forEach((t) => {
        if (t.isDepartmentHead) {
          batch.update(doc(db, "teachers", t.id), { isDepartmentHead: false });
        }
      });

      batch.update(doc(db, "teachers", newHeadId), { isDepartmentHead: true });

      await batch.commit();
      // Başarı Toast'ı UI (department-head.tsx) sayfasında gösterildiği için buradaki Alert kaldırıldı.
    } catch (error) {
      console.error("Atama sırasında hata:", error);
      Toast.show({
        type: "error",
        text1: "Atama Hatası",
        text2: "Zümre başkanı atama işlemi gerçekleştirilemedi.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 YENİ: SENSÖR BİLGİLERİNİ FİREBASE'E YAZMA FONKSİYONLARI
  const updateStepCount = async (teacherId: string, steps: number) => {
    try {
      await updateDoc(doc(db, "teachers", teacherId), { stepCount: steps });
    } catch (error) {
      console.error("Adım sayısı güncellenemedi", error);
    }
  };

  const logEmergency = async (teacherId: string, details: string) => {
    try {
      await updateDoc(doc(db, "teachers", teacherId), {
        lastEmergency: details,
      });
    } catch (error) {
      console.error("Acil durum loglanamadı", error);
    }
  };

  return (
    <TeacherContext.Provider
      value={{
        teachers,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addLesson,
        updateLesson,
        deleteLesson,
        isLoading,
        resetDatabase,
        updateThemeSetting,
        clearCache,
        generateExamSchedule,
        selectDepartmentHead,
        assignDepartmentHead,
        updateStepCount,
        logEmergency,
      }}
    >
      {children}
    </TeacherContext.Provider>
  );
};

export const useTeachers = () => {
  const context = useContext(TeacherContext);
  if (!context)
    throw new Error("useTeachers must be used within a TeacherProvider");
  return context;
};
