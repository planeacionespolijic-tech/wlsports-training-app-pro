import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../types';

export function useAuthSync() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Handle redirect results for Google login
    getRedirectResult(auth)
      .catch((error) => {
        console.error("Error en login redirect:", error);
        setAuthError("Error al iniciar sesión con Google. Por favor, intenta de nuevo.");
      });

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        localStorage.removeItem('wlsports_logged_out');
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

          // 2. Normal Role Fetching & Superadmin check
          let dbRole = role;
          if (userDoc.exists()) {
            dbRole = userDoc.data().role || role;
          }
          
          if (u.email === 'planeacionespolijic@gmail.com') {
            dbRole = 'superadmin';
          }

          // 3. Unauthorized access check
          if (!userDoc.exists() && !u.isAnonymous && u.email !== 'planeacionespolijic@gmail.com') {
            await auth.signOut();
            setAuthError("Usuario no autorizado. Contacta a tu entrenador.");
            setLoading(false);
            return;
          }

          // 4. Update/Create User Document
          const userData: Partial<UserProfile> = {
            uid: u.uid,
            email: u.email || 'invitado@wlsports.com',
            displayName: u.displayName || 'Invitado',
            photoURL: u.photoURL || null,
            lastLogin: serverTimestamp(),
            role: dbRole as UserRole,
            isAnonymous: u.isAnonymous,
            status: userDoc.exists() ? (userDoc.data().status || 'active') : 'active'
          };

          await setDoc(userRef, userData, { merge: true });

          const finalDoc = await getDoc(userRef);
          if (finalDoc.exists()) {
            setUserProfile(finalDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error('Auth sync error:', error);
          setAuthError("Error al sincronizar el perfil. Revisa tu conexión.");
        }
      } else {
        setUserProfile(null);
        
        // Handle guest auto-login
        const params = new URLSearchParams(window.location.search);
        const hasLoggedOut = localStorage.getItem('wlsports_logged_out') === 'true';
        if (params.get('guest') === 'true' && !hasLoggedOut) {
          const { loginAnonymously } = await import('../firebase');
          try {
            await loginAnonymously();
          } catch (err) {
            console.error("Auto-login failed:", err);
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, userProfile, loading, authError, setAuthError };
}
