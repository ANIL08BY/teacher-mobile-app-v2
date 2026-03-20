import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseApp } from "./firebaseConfig";

const storage = getStorage(firebaseApp);

/**
 * @param uri - Cihazdaki dosya yolu (ImagePicker'dan gelen)
 * @param folder - Hangi klasöre yüklenecek? (örn: 'profile_photos' veya 'certificates')
 * @param fileName - Dosyanın adı
 */
export const uploadFileToStorage = async (uri: string, folder: string, fileName: string) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob(); // Dosyayı binary formata çeviriyoruz

    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    // Dosyayı yükle
    await uploadBytes(storageRef, blob);
    
    // Yüklenen dosyanın internet üzerindeki linkini al
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Storage yükleme hatası: ", error);
    throw error;
  }
};