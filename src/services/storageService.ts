import { storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Comprime una imagen usando Canvas para asegurar que sea JPG y menor a 1MB.
 */
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          },
          'image/jpeg',
          0.8 // Calidad 80%
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Sube la foto de perfil del usuario a Firebase Storage y actualiza Firestore.
 */
export const uploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  try {
    // 1. Comprimir imagen
    const compressedBlob = await compressImage(file);

    // 2. Subir a Storage (sobrescribe automáticamente en la misma ruta)
    const storageRef = ref(storage, `users/${userId}/profile.jpg`);
    await uploadBytes(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
    });

    // 3. Obtener URL de descarga
    const downloadURL = await getDownloadURL(storageRef);

    // 4. Actualizar Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { 
      photoURL: downloadURL,
      updatedAt: new Date() 
    });

    return downloadURL;
  } catch (error) {
    console.error('Error in uploadProfilePhoto:', error);
    throw error;
  }
};
