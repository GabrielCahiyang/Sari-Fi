import type { Payment, Order } from '../../types';

export interface MockGcashWebhookPayload {
  event: 'payment.success' | 'payment.failed';
  transactionId: string;
  referenceId: string;
  paymentId: string;
  orderId?: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
}

export interface WebhookValidationResult {
  success: boolean;
  alreadyProcessed?: boolean;
  error?: string;
  updatedPayment?: Payment;
  updatedOrder?: Order;
}

/**
 * Creates a unique mock GCash transaction reference for a pending checkout payment.
 */
export function generateMockGcashReference(): { transactionId: string; referenceId: string } {
  const seed = Math.random().toString(36).substring(2, 9).toUpperCase();
  const numSeed = Math.floor(100000 + Math.random() * 900000);
  return {
    transactionId: `GCASH-TXN-${Date.now().toString(36).toUpperCase()}-${seed}`,
    referenceId: `REF-${numSeed}`,
  };
}

/**
 * Validates and processes a simulated incoming GCash webhook event.
 * Enforces strict idempotency and validation rules:
 * - Payment must exist
 * - Payment method must be GCash
 * - Amount must match
 * - If already paid, returns alreadyProcessed = true without applying duplicate state mutations
 */
export function processMockGcashWebhook(
  payload: MockGcashWebhookPayload,
  payment: Payment,
  order?: Order
): WebhookValidationResult {
  if (!payment) {
    return { success: false, error: 'Payment record not found.' };
  }

  if (payment.id !== payload.paymentId) {
    return { success: false, error: 'Payment ID mismatch.' };
  }

  if (payment.method !== 'gcash') {
    return { success: false, error: 'Payment method is not GCash.' };
  }

  if (payment.amount !== payload.amount) {
    return {
      success: false,
      error: `Amount mismatch: Expected ₱${payment.amount}, received ₱${payload.amount}.`,
    };
  }

  // Idempotency Check: if already processed and paid, do not re-apply mutations
  if (payment.status === 'paid') {
    return {
      success: true,
      alreadyProcessed: true,
      updatedPayment: payment,
      updatedOrder: order,
    };
  }

  if (payload.status !== 'SUCCESS' || payload.event !== 'payment.success') {
    const failedPayment: Payment = {
      ...payment,
      status: 'failed',
    };
    return {
      success: false,
      error: 'GCash payment was rejected or failed.',
      updatedPayment: failedPayment,
    };
  }

  const now = new Date().toISOString();
  const updatedPayment: Payment = {
    ...payment,
    status: 'paid',
    mockTransactionId: payload.transactionId,
    referenceId: payload.referenceId,
    paidAt: now,
  };

  let updatedOrder: Order | undefined = undefined;
  if (order) {
    updatedOrder = {
      ...order,
      status: 'completed',
      paymentStatus: 'paid',
      updatedAt: now,
    };
  }

  return {
    success: true,
    alreadyProcessed: false,
    updatedPayment,
    updatedOrder,
  };
}
