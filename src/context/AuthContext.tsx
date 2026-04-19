import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  getRedirectResult,
  signInWithPopup,
  signInAnonymously,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { AuthContextType, UserProfile, UserRole, UserStatus } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoized login functions
  const loginWithGoogle = useCallback(async () => {
    localStorage.removeItem('wlsports_logged_out');
    return signInWithPopup(auth, googleProvider);
  }, []);

  const loginAnonymously = useCallback(async () => {
    localStorage.removeItem('wlsports_logged_out');
    return signInAnonymously(auth);
  }, []);

  const logout = useCallback(async () => {
    localStorage.setItem('wlsports_logged_out', 'true');
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  }, []);

  useEffect(() => {
    // Process redirect results if any
    getRedirectResult(auth).catch((error) => {
      console.error("Auth redirect error:", error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          let userDoc = await getDoc(userRef);
          
          let role: UserRole = 'client';

          // 1. Account Claiming Logic (Pre-created accounts by email)
          if (!userDoc.exists() && u.email) {
            const emailRef = doc(db, 'users', u.email.toLowerCase());
            const emailDoc = await getDoc(emailRef);
            
            if (emailDoc.exists()) {
              const preCreatedData = emailDoc.data();
              role = (preCreatedData.role as UserRole) || role;
              
              if (role === 'superadmin' && u.email !== 'planeacionespolijic@gmail.com') {
                role = 'trainer'; // Safety fallback
              }

              // Claim the account: Transfer data to the UID-based document
              await setDoc(userRef, { 
                ...preCreatedData, 
                uid: u.uid,
                lastLogin: serverTimestamp(),
                photoURL: u.photoURL || preCreatedData.photoURL || null,
                displayName: u.displayName || preCreatedData.displayName || 'Usuario',
                role: preCreatedData.role === 'superadmin' ? 'superadmin' : role,
                status: (preCreatedData.status as UserStatus) || 'active'
              }, { merge: true });
              
              userDoc = await getDoc(userRef);
            }
          }

          // 2. Role Determination
          let dbRole: UserRole = 'client';
          if (userDoc.exists()) {
            dbRole = (userDoc.data().role as UserRole) || 'client';
          }
          
          // Superadmin override constant
          if (u.email === 'planeacionespolijic@gmail.com') {
            dbRole = 'superadmin';
          }

          // 3. Security Check: Only allow registered users (except anonymous or superadmin)
          if (!userDoc.exists() && !u.isAnonymous && u.email !== 'planeacionespolijic@gmail.com') {
            console.warn("Unregistered user attempted access:", u.email);
            await signOut(auth);
            setLoading(false);
            return;
          }

          // 4. Update Profile Basic Data
          const profileUpdate: Partial<UserProfile> = {
            uid: u.uid,
            email: u.email || 'invitado@wlsports.app',
            displayName: u.displayName || 'Invitado',
            photoURL: u.photoURL || null,
            lastLogin: serverTimestamp(),
            role: dbRole,
            isAnonymous: u.isAnonymous,
            status: userDoc.exists() ? (userDoc.data().status || 'active') : 'active'
          };

          await setDoc(userRef, profileUpdate, { merge: true });

          // 5. Setup Real-time Profile Listener
          const unsubscribeProfile = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              setUserProfile(doc.data() as UserProfile);
            }
            setLoading(false);
          }, (err) => {
            console.error("Profile sync error:", err);
            setLoading(false);
          });

          return () => unsubscribeProfile();

        } catch (error) {
          console.error('Initial profile setup failed:', error);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const isTrainer = userProfile?.role === 'trainer' || userProfile?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      loginWithGoogle, 
      loginAnonymously,
      logout, 
      isTrainer 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
