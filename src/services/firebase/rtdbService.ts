import { ref, onValue, set, update, remove, get, runTransaction } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../firebase';
import type { SystemSettings, AuditEntry, Financing, Order, Payment, Product } from '../../types';
import { DEFAULT_SETTINGS } from '../../data/seed';
import { canTransitionOrder, resolveFinancialOrderStatus } from '../../domain/orderFlow';

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
 * Recursively removes keys with undefined values so Firebase RTDB set/update never throws
 */
export function cleanUndefined<T>(value: T): T {
  if (value === undefined) return null as unknown as T;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(cleanUndefined) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(value as Record<string, any>)) {
    if (v !== undefined) {
      cleaned[k] = cleanUndefined(v);
    }
  }
  return cleaned as T;
}

/**
 * Save or overwrite a record by its `id`
 */
export async function saveRecord<T extends { id: string }>(nodePath: string, item: T): Promise<void> {
  const itemRef = ref(database, `${nodePath}/${item.id}`);
  await set(itemRef, cleanUndefined(item));
}

/**
 * Partially update a record
 */
export async function updateRecord(nodePath: string, id: string, updates: Record<string, any>): Promise<void> {
  const itemRef = ref(database, `${nodePath}/${id}`);
  await update(itemRef, cleanUndefined(updates));
}

/**
 * Delete a record
 */
export async function deleteRecord(nodePath: string, id: string): Promise<void> {
  const itemRef = ref(database, `${nodePath}/${id}`);
  await remove(itemRef);
}

/** Read one record directly when a workflow needs a durable pre-change snapshot. */
export async function getRecord<T>(nodePath: string, id: string): Promise<T | null> {
  const snapshot = await get(ref(database, `${nodePath}/${id}`));
  return snapshot.exists() ? snapshot.val() as T : null;
}

/**
 * Apply a multi-location RTDB update atomically from the database root.
 * A null value removes that path, which makes this useful for all-or-nothing
 * cleanup of temporary workflows such as the guided product tour.
 */
export async function updateRootPaths(paths: Record<string, unknown>): Promise<void> {
  await update(ref(database), cleanUndefined(paths));
}

async function readCollection<T>(nodePath: string): Promise<Record<string, T>> {
  const snapshot = await get(ref(database, nodePath));
  if (!snapshot.exists()) return {};
  const data = snapshot.val();
  if (Array.isArray(data)) {
    return Object.fromEntries(data.map((value, index) => [String(index), value]).filter(([, value]) => Boolean(value)));
  }
  return data && typeof data === 'object' ? data as Record<string, T> : {};
}

/** Atomically creates the order records and reserves inventory exactly once. */
export async function createOrderWithReservation(
  order: Order,
  payment?: Payment,
  financing?: Financing,
): Promise<void> {
  if (await getRecord<Order>('orders', order.id)) return;

  const products = await Promise.all(order.items.map(item => getRecord<Product>('products', item.productId)));
  const supplierIds = new Set<string>();
  const paths: Record<string, unknown> = {};
  order.items.forEach((item, index) => {
    const product = products[index];
    if (!product) throw new Error(`Product ${item.productName} is no longer available.`);
    supplierIds.add(item.supplierId || product.supplierId);
    if (product.stock < item.quantity) throw new Error(`${item.productName} only has ${product.stock} units left.`);
    paths[`products/${product.id}/stock`] = product.stock - item.quantity;
  });
  if (supplierIds.size !== 1) throw new Error('Each order must contain products from one supplier only.');

  paths[`orders/${order.id}`] = cleanUndefined({ ...order, stockReservationStatus: 'reserved' });
  if (payment) paths[`payments/${payment.id}`] = cleanUndefined(payment);
  if (financing) paths[`financing/${financing.id}`] = cleanUndefined(financing);
  await updateRootPaths(paths);
}

/**
 * Cancels a still-pending order and releases its reservation in one multi-path update.
 * Repeated callbacks/retries see `released` and therefore cannot restore stock twice.
 */
export async function cancelOrderFlow(
  orderId: string,
  reason: string,
  rejectedBy?: string,
): Promise<void> {
  const order = await getRecord<Order>('orders', orderId);
  if (!order) throw new Error('Order not found.');
  if (order.status === 'cancelled' && order.stockReservationStatus === 'released') return;
  if (!['pending_payment', 'pending_financing', 'approved'].includes(order.status)) {
    throw new Error('Only an order awaiting payment or financing can be cancelled.');
  }

  const [payments, financing, products] = await Promise.all([
    readCollection<Payment>('payments'),
    readCollection<Financing>('financing'),
    Promise.all((order.items || []).map(item => getRecord<Product>('products', item.productId))),
  ]);
  const now = new Date().toISOString();
  const paths: Record<string, unknown> = {
    [`orders/${orderId}/status`]: 'cancelled',
    [`orders/${orderId}/paymentStatus`]: 'failed',
    [`orders/${orderId}/stockReservationStatus`]: 'released',
    [`orders/${orderId}/cancellationReason`]: reason,
    [`orders/${orderId}/cancelledAt`]: now,
    [`orders/${orderId}/updatedAt`]: now,
  };
  if (order.stockReservationStatus !== 'released') {
    order.items.forEach((item, index) => {
      const product = products[index];
      if (product) paths[`products/${product.id}/stock`] = product.stock + item.quantity;
    });
  }
  Object.entries(payments).forEach(([id, payment]) => {
    if (payment.orderId === orderId && payment.status === 'pending') paths[`payments/${id}/status`] = 'failed';
  });
  Object.entries(financing).forEach(([id, loan]) => {
    if ((loan.orderId === orderId || id === order.financingId) && loan.status === 'pending') {
      paths[`financing/${id}/status`] = 'rejected';
      if (rejectedBy) paths[`financing/${id}/rejectedBy`] = rejectedBy;
    }
  });
  await updateRootPaths(paths);
}

/** Approves financing once, consumes credit once, then applies the financial gate to its order. */
export async function approveFinancingFlow(financingId: string, approvedBy: string): Promise<void> {
  const loan = await getRecord<Financing>('financing', financingId);
  if (!loan) throw new Error('Financing record not found.');
  if (loan.status !== 'pending') return;

  const [orders, payments, customer] = await Promise.all([
    readCollection<Order>('orders'),
    readCollection<Payment>('payments'),
    getRecord<any>('customers', loan.customerId),
  ]);
  const now = new Date().toISOString();
  const today = new Date();
  const activeLoan: Financing = {
    ...loan,
    status: 'active',
    approvedBy,
    approvedAt: now,
    schedule: loan.schedule.map((entry, index) => {
      const due = new Date(today);
      due.setDate(due.getDate() + (index + 1) * 7);
      return { ...entry, dueDate: due.toISOString().split('T')[0], status: index === 0 ? 'due' : 'upcoming' };
    }),
  };
  const paths: Record<string, unknown> = { [`financing/${financingId}`]: cleanUndefined(activeLoan) };
  const order = Object.values(orders).find(item => item.financingId === financingId || item.id === loan.orderId);
  if (order) {
    paths[`orders/${order.id}/status`] = resolveFinancialOrderStatus(order, Object.values(payments), [activeLoan]);
    paths[`orders/${order.id}/updatedAt`] = now;
  }
  if (customer) paths[`customers/${loan.customerId}/usedCredit`] = (customer.usedCredit || 0) + loan.principal;
  await updateRootPaths(paths);
}

/** Marks a purchase payment paid and advances the order only when every financial requirement is clear. */
export async function settleOrderPayment(paymentId: string, confirmedBy?: string): Promise<void> {
  const payment = await getRecord<Payment>('payments', paymentId);
  if (!payment) throw new Error('Payment record not found.');
  if (payment.status === 'paid') return;
  if (payment.status === 'failed') throw new Error('A failed payment cannot be confirmed.');

  const now = new Date().toISOString();
  const paidPayment: Payment = cleanUndefined({ ...payment, status: 'paid', paidAt: now, confirmedBy });
  const paths: Record<string, unknown> = { [`payments/${paymentId}`]: paidPayment };
  if (payment.orderId) {
    const [order, financing] = await Promise.all([
      getRecord<Order>('orders', payment.orderId),
      readCollection<Financing>('financing'),
    ]);
    if (order) {
      paths[`orders/${order.id}/paymentStatus`] = 'paid';
      paths[`orders/${order.id}/status`] = resolveFinancialOrderStatus(order, [paidPayment], Object.values(financing));
      paths[`orders/${order.id}/updatedAt`] = now;
      if (confirmedBy) paths[`orders/${order.id}/confirmedBy`] = confirmedBy;
    }
  }
  await updateRootPaths(paths);
}

/** Enforces actor-specific fulfillment transitions at the durable write boundary. */
export async function transitionOrderFlow(
  orderId: string,
  nextStatus: Order['status'],
  actor: 'supplier' | 'customer',
): Promise<void> {
  let failure: string | null = null;
  const result = await runTransaction(ref(database, `orders/${orderId}`), current => {
    failure = null;
    const order = current as Order | null;
    if (!order) {
      failure = 'Order not found.';
      return;
    }
    const actorAllows = actor === 'supplier'
      ? nextStatus === 'ready' || nextStatus === 'out_for_delivery' || nextStatus === 'delivered'
      : nextStatus === 'completed';
    if (!actorAllows || !canTransitionOrder(order.status, nextStatus)) {
      failure = `Cannot move this order from ${order.status} to ${nextStatus}.`;
      return;
    }
    return {
      ...order,
      status: nextStatus,
      stockReservationStatus: nextStatus === 'ready' ? 'committed' : order.stockReservationStatus,
      updatedAt: new Date().toISOString(),
    };
  });

  if (failure) throw new Error(failure);
  if (!result.committed) throw new Error('Order status update was not committed.');
}

/**
 * Save System Settings
 */
export async function saveSettings(settings: SystemSettings): Promise<void> {
  const settingsRef = ref(database, 'settings');
  await set(settingsRef, cleanUndefined(settings));
}

/**
 * Log an audit entry into /auditLog
 */
export async function logAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    const logRef = ref(database, `auditLog/${entry.id}`);
    await set(logRef, cleanUndefined(entry));
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
