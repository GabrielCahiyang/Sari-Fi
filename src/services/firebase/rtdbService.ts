import { ref, onValue, set, update, remove, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../firebase';
import type { SystemSettings, AuditEntry } from '../../types';
import { DEFAULT_SETTINGS } from '../../data/seed';

/**
 * Generic Realtime Database List Subscriber
 */
export function subscribeToNodeList<T extends { id: string }>(
  nodePath: string,
  callback: (items: T[]) => void
): () => void {
  const nodeRef = ref(database, nodePath);
  return onValue(
    nodeRef,
    snapshot => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const data = snapshot.val();
      const map = new Map<string, T>();
      if (Array.isArray(data)) {
        data.filter(Boolean).forEach((it: any, idx) => {
          const id = it.id || String(idx);
          map.set(id, { ...it, id });
        });
      } else if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([key, value]) => {
          if (value && typeof value === 'object') {
            const item = value as T;
            const id = item.id || key;
            map.set(id, { ...item, id });
          }
        });
      }
      callback(Array.from(map.values()));
    },
    error => {
      console.warn(`RTDB subscribe error on /${nodePath}:`, error.message);
    }
  );
}

/**
 * Generic Realtime Database Object Subscriber
 */
export function subscribeToNodeObject<T>(
  nodePath: string,
  callback: (data: T | null) => void
): () => void {
  const nodeRef = ref(database, nodePath);
  return onValue(
    nodeRef,
    snapshot => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(snapshot.val() as T);
    },
    error => {
      console.warn(`RTDB subscribe error on /${nodePath}:`, error.message);
    }
  );
}

/**
 * Save or overwrite a record by its `id`
 */
export async function saveRecord<T extends { id: string }>(nodePath: string, item: T): Promise<void> {
  const itemRef = ref(database, `${nodePath}/${item.id}`);
  await set(itemRef, item);
}

/**
 * Partially update a record
 */
export async function updateRecord(nodePath: string, id: string, updates: Record<string, any>): Promise<void> {
  const itemRef = ref(database, `${nodePath}/${id}`);
  await update(itemRef, updates);
}

/**
 * Delete a record
 */
export async function deleteRecord(nodePath: string, id: string): Promise<void> {
  const itemRef = ref(database, `${nodePath}/${id}`);
  await remove(itemRef);
}

/**
 * Save System Settings
 */
export async function saveSettings(settings: SystemSettings): Promise<void> {
  const settingsRef = ref(database, 'settings');
  await set(settingsRef, settings);
}

/**
 * Log an audit entry into /auditLog
 */
export async function logAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    const logRef = ref(database, `auditLog/${entry.id}`);
    await set(logRef, entry);
  } catch (err) {
    console.error('Failed to log audit entry to RTDB:', err);
  }
}

/**
 * Upload a product image to Firebase Storage, with seamless Base64 data URL fallback
 */
export async function uploadProductImage(file: File, productId: string): Promise<string> {
  // Generate Base64 as guaranteed fallback in case Firebase Storage rules are locked
  const base64Promise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `products/${productId}_${Date.now()}.${fileExt}`;
    const fileRef = storageRef(storage, filePath);

    await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage upload blocked or failed, using local Base64 image:', err);
    const base64 = await base64Promise;
    if (base64) return base64;
    throw err;
  }
}

export const DEFAULT_CATEGORIES_RECORD: Record<string, { id: string; name: string; createdAt: string }> = {
  cat_beverages: { id: 'cat_beverages', name: 'Beverages', createdAt: new Date().toISOString() },
  cat_canned: { id: 'cat_canned', name: 'Canned Goods', createdAt: new Date().toISOString() },
  cat_noodles: { id: 'cat_noodles', name: 'Instant Noodles', createdAt: new Date().toISOString() },
  cat_snacks: { id: 'cat_snacks', name: 'Snacks & Sweets', createdAt: new Date().toISOString() },
  cat_rice: { id: 'cat_rice', name: 'Rice & Grains', createdAt: new Date().toISOString() },
  cat_condiments: { id: 'cat_condiments', name: 'Condiments & Sauces', createdAt: new Date().toISOString() },
  cat_dairy: { id: 'cat_dairy', name: 'Dairy & Eggs', createdAt: new Date().toISOString() },
  cat_personal: { id: 'cat_personal', name: 'Personal Care', createdAt: new Date().toISOString() },
  cat_household: { id: 'cat_household', name: 'Household', createdAt: new Date().toISOString() },
};

/**
 * Ensures system configuration (/settings) and base product categories (/categories) exist in Firebase Realtime Database.
 * Does NOT seed demo products or fake mock orders/customers.
 */
export async function seedDatabaseIfEmpty(): Promise<boolean> {
  try {
    const settingsSnapshot = await get(ref(database, 'settings'));
    if (!settingsSnapshot.exists()) {
      console.log('Initializing system settings in Firebase Realtime Database...');
      await set(ref(database, 'settings'), DEFAULT_SETTINGS);
    }

    const categoriesSnapshot = await get(ref(database, 'categories'));
    if (!categoriesSnapshot.exists()) {
      console.log('Initializing product categories in Firebase Realtime Database at /categories...');
      await set(ref(database, 'categories'), DEFAULT_CATEGORIES_RECORD);
    }

    return true;
  } catch (err) {
    console.warn('Could not initialize /settings or /categories in RTDB:', err);
    return false;
  }
}
