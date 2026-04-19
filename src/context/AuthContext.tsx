import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, loginWithGoogle as fbLoginWithGoogle, loginAnonymously as fbLoginAnonymously, logout as fbLogout } from '../firebase';
import { AuthContextType, UserProfile, UserRole } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result
    getRedirectResult(auth).catch((error) => {
      console.error("Error in login redirect:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          let userDoc = await getDoc(userRef);
          
          let role: UserRole = 'client';

          // 1. Account Claiming Logic (for Trainers created by email)
          if (!userDoc.exists() && u.email) {
            const emailRef = doc(db, 'users', u.email.toLowerCase());
            const emailDoc = await getDoc(emailRef);
            if (emailDoc.exists()) {
              const data = emailDoc.data();
              let dbRole = data.role || role;
              if (dbRole === 'superadmin') {
                role = 'trainer';
              } else {
                role = dbRole as UserRole;
              }
              // Link the pre-created account to the real UID
              await setDoc(userRef, { 
                ...data, 
                uid: u.uid,
                lastLogin: serverTimestamp(),
                photoURL: u.photoURL || data.photoURL || null,
                displayName: u.displayName || data.displayName || 'Usuario',
                role: dbRole
              }, { merge: true });
              userDoc = await getDoc(userRef);
            }
          }

          // 3. Normal Role Fetching
          let dbRole = role;
          if (userDoc.exists()) {
            dbRole = (userDoc.data().role as UserRole) || role;
          }
          
          // Superadmin override
          if (u.email === 'planeacionespolijic@gmail.com') {
            dbRole = 'superadmin';
          }

          // Check for unauthorized access (only for non-anonymous accounts)
          if (!userDoc.exists() && !u.isAnonymous && u.email !== 'planeacionespolijic@gmail.com') {
            await auth.signOut();
            setLoading(false);
            return;
          }

          // 4. Update/Create User Document
          const profileData: Partial<UserProfile> = {
            uid: u.uid,
            email: u.email || 'invitado@wlsports.com',
            displayName: u.displayName || 'Invitado',
            photoURL: u.photoURL || null,
            lastLogin: serverTimestamp(),
            role: dbRole as UserRole,
            isAnonymous: u.isAnonymous,
            status: userDoc.exists() ? (userDoc.data().status || 'active') : 'active'
          };

          await setDoc(userRef, profileData, { merge: true });

          const finalDoc = await getDoc(userRef);
          if (finalDoc.exists()) {
            setUserProfile(finalDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error('Auth Context error:', error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    localStorage.removeItem('wlsports_logged_out');
    return fbLoginWithGoogle();
  };

  const loginAnonymously = async () => {
    localStorage.removeItem('wlsports_logged_out');
    return fbLoginAnonymously();
  };

  const logout = async () => {
    localStorage.setItem('wlsports_logged_out', 'true');
    await fbLogout();
    setUser(null);
    setUserProfile(null);
  };

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
