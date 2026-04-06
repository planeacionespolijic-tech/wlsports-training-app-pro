import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, 
  signOut, 
  onAuthStateChanged, 
  User, 
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  getRedirectResult
} from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Helper to convert username to a simulated email
const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@wlsports.local`;

// Auth helpers
export const loginWithGoogle = () => signInWithRedirect(auth, googleProvider);

export const registerWithUsername = async (username: string, password: string) => {
  if (username.length < 3) throw new Error("El nombre de usuario debe tener al menos 3 caracteres.");
  if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
  
  const email = usernameToEmail(username);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });
    return userCredential;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("El nombre de usuario ya está en uso.");
    }
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error("El inicio de sesión con correo/contraseña no está habilitado. Actívalo en la consola de Firebase (Authentication > Sign-in method > Email/Password).");
    }
    throw error;
  }
};

export const loginWithUsername = async (username: string, password: string) => {
  const email = usernameToEmail(username);
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email') {
      throw new Error("Usuario o contraseña incorrectos.");
    }
    throw error;
  }
};

export const loginAnonymously = async () => {
  try {
    return await signInAnonymously(auth);
  } catch (error: any) {
    if (error.code === 'auth/admin-restricted-operation') {
      console.error("ERROR: Debes habilitar 'Anonymous Auth' en la consola de Firebase.");
      throw new Error("El acceso como invitado no está habilitado. Debes activar 'Anonymous Auth' en tu consola de Firebase para que este botón funcione.");
    }
    throw error;
  }
};
export const logout = () => signOut(auth);

// Error handler for Firestore
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  
  // Log to console for the agent to see
  console.error(`[FIRESTORE_ERROR] Op: ${operationType}, Path: ${path}, Error: ${message}`);
  console.error('Full Error Info:', JSON.stringify(errInfo, null, 2));
  
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
