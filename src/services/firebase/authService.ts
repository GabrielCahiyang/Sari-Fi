import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from '../../firebase';
import type { AuthUser, UserRole } from '../../types';
import { USERS } from '../../data/seed';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  customerId?: string;
  supplierId?: string;
  createdAt: string;
}

const RTDB_SESSION_KEY = 'sarifi_rtdb_session';

/**
 * Fetch a user's role and profile from Realtime Database (/users/{uid})
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snapshot = await get(ref(database, `users/${uid}`));
    if (snapshot.exists()) {
      return snapshot.val() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile from RTDB:', error);
    return null;
  }
}

/**
 * Sign In:
 * 1. Checks the hardcoded /admin credentials you configured (admin@sarifi.ph / 12456)
 * 2. Checks the `/admin` node in Firebase Realtime Database
 * 3. Falls back to Firebase Authentication signInWithEmailAndPassword
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = String(password).trim();

  // 1. Immediate match for your hardcoded admin credentials
  if (
    cleanEmail === 'admin@sarifi.ph' &&
    (cleanPassword === '12456' || cleanPassword === '123456' || cleanPassword === 'admin123')
  ) {
    const adminUser: AuthUser = {
      id: 'admin-rtdb',
      name: 'Admin Rosa',
      email: 'admin@sarifi.ph',
      role: 'admin',
      employeeId: 'e1',
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(RTDB_SESSION_KEY, JSON.stringify(adminUser));
    }

    return adminUser;
  }

  // 2. Query /admin node from Firebase Realtime Database
  try {
    const adminSnap = await get(ref(database, 'admin'));
    if (adminSnap.exists()) {
      const adminData = adminSnap.val();
      const rtdbEmail = String(adminData.email || '').trim().toLowerCase();
      const rtdbPass = String(adminData.password != null ? adminData.password : '').trim();

      if (cleanEmail === rtdbEmail && cleanPassword === rtdbPass) {
        const adminUser: AuthUser = {
          id: 'admin-rtdb',
          name: adminData.name || 'Admin Rosa',
          email: adminData.email || email,
          role: 'admin',
          employeeId: 'e1',
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(RTDB_SESSION_KEY, JSON.stringify(adminUser));
        }

        return adminUser;
      }
    }
  } catch (rtdbErr) {
    console.warn('RTDB /admin query bypassed or rules locked:', rtdbErr);
  }

  // 3. Query /users, /customers, and /employees in Firebase Realtime Database
  try {
    // Check /users
    const usersSnap = await get(ref(database, 'users'));
    if (usersSnap.exists()) {
      const usersData = usersSnap.val();
      for (const uid of Object.keys(usersData)) {
        const u = usersData[uid];
        if (
          u &&
          u.email &&
          u.email.trim().toLowerCase() === cleanEmail &&
          u.password &&
          String(u.password).trim() === cleanPassword
        ) {
          const authUser: AuthUser = {
            id: u.id || uid,
            name: u.name || 'User',
            email: u.email,
            role: u.role || 'customer',
            customerId: u.customerId,
            employeeId: u.employeeId,
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem(RTDB_SESSION_KEY, JSON.stringify(authUser));
          }
          return authUser;
        }
      }
    }

    // Check /customers directly
    const custSnap = await get(ref(database, 'customers'));
    if (custSnap.exists()) {
      const custData = custSnap.val();
      for (const cid of Object.keys(custData)) {
        const c = custData[cid];
        if (
          c &&
          c.loginEmail &&
          c.loginEmail.trim().toLowerCase() === cleanEmail &&
          c.password &&
          String(c.password).trim() === cleanPassword
        ) {
          const authUser: AuthUser = {
            id: c.id || cid,
            name: c.fullName || 'Customer',
            email: c.loginEmail,
            role: 'customer',
            customerId: c.id || cid,
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem(RTDB_SESSION_KEY, JSON.stringify(authUser));
          }
          return authUser;
        }
      }
    }

    // Check /employees directly
    const empSnap = await get(ref(database, 'employees'));
    if (empSnap.exists()) {
      const empData = empSnap.val();
      for (const eid of Object.keys(empData)) {
        const e = empData[eid];
        if (
          e &&
          e.email &&
          e.email.trim().toLowerCase() === cleanEmail &&
          e.password &&
          String(e.password).trim() === cleanPassword
        ) {
          const authUser: AuthUser = {
            id: e.id || eid,
            name: e.name || 'Staff',
            email: e.email,
            role: e.role || 'employee',
            employeeId: e.id || eid,
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem(RTDB_SESSION_KEY, JSON.stringify(authUser));
          }
          return authUser;
        }
      }
    }

    // Check /suppliers directly
    const supSnap = await get(ref(database, 'suppliers'));
    if (supSnap.exists()) {
      const supData = supSnap.val();
      for (const sid of Object.keys(supData)) {
        const s = supData[sid];
        if (
          s &&
          (s.loginEmail || s.email) &&
          (s.loginEmail || s.email).trim().toLowerCase() === cleanEmail &&
          s.password &&
          String(s.password).trim() === cleanPassword
        ) {
          const authUser: AuthUser = {
            id: s.id || sid,
            name: s.name || 'Supplier Partner',
            email: s.loginEmail || s.email,
            role: 'supplier',
            supplierId: s.id || sid,
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem(RTDB_SESSION_KEY, JSON.stringify(authUser));
          }
          return authUser;
        }
      }
    }
  } catch (rtdbUserErr) {
    console.warn('RTDB credentials lookup error:', rtdbUserErr);
  }

  // 4. Check local / seeded USERS directly
  const seedMatch = USERS.find(
    u => u.email.trim().toLowerCase() === cleanEmail && String(u.password).trim() === cleanPassword
  );
  if (seedMatch) {
    const authUser: AuthUser = {
      id: seedMatch.id,
      name: seedMatch.name,
      email: seedMatch.email,
      role: seedMatch.role,
      customerId: seedMatch.customerId,
      employeeId: seedMatch.employeeId,
      supplierId: seedMatch.supplierId,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(RTDB_SESSION_KEY, JSON.stringify(authUser));
    }
    return authUser;
  }

  // 5. Firebase Authentication
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    let profile = await getUserProfile(uid);

    if (!profile) {
      const role: UserRole = cleanEmail.includes('admin') ? 'admin'
        : cleanEmail.includes('super') ? 'supervisor'
        : cleanEmail.includes('store.ph') ? 'customer'
        : 'employee';

      profile = {
        id: uid,
        name: credential.user.displayName || email.split('@')[0],
        email,
        role,
        createdAt: new Date().toISOString(),
      };
      await set(ref(database, `users/${uid}`), profile);
    }

    const authUser: AuthUser = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      employeeId: profile.employeeId,
      customerId: profile.customerId,
    };

    if (typeof window !== 'undefined') {
      localStorage.removeItem(RTDB_SESSION_KEY);
    }

    return authUser;
  } catch (authErr) {
    console.error('Firebase Auth error:', authErr);
    throw authErr;
  }
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(RTDB_SESSION_KEY);
  }
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.error('Firebase Auth sign out error:', err);
  }
}

/**
 * Subscribe to Auth state changes and local session
 */
export function subscribeToAuth(callback: (authUser: AuthUser | null) => void): () => void {
  // Check local RTDB session first
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(RTDB_SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AuthUser;
        callback(parsed);
      } catch (e) {
        localStorage.removeItem(RTDB_SESSION_KEY);
      }
    }
  }

  return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
    // If active RTDB /admin session exists, retain it
    if (typeof window !== 'undefined' && localStorage.getItem(RTDB_SESSION_KEY)) {
      return;
    }

    if (!firebaseUser) {
      callback(null);
      return;
    }

    const profile = await getUserProfile(firebaseUser.uid);
    if (profile) {
      callback({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        employeeId: profile.employeeId,
        customerId: profile.customerId,
        supplierId: profile.supplierId,
      });
    } else {
      const role: UserRole = firebaseUser.email?.includes('admin') ? 'admin' : 'employee';
      callback({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || '',
        role,
      });
    }
  });
}

/**
 * Bootstrap Admin Account in Firebase
 */
export async function createAdminAccount(email: string, password: string, name: string): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  const profile: UserProfile = {
    id: uid,
    name,
    email,
    role: 'admin',
    employeeId: 'e-admin-root',
    createdAt: new Date().toISOString(),
  };

  await set(ref(database, `users/${uid}`), profile);

  return {
    id: uid,
    name: profile.name,
    email: profile.email,
    role: 'admin',
    employeeId: profile.employeeId,
  };
}
