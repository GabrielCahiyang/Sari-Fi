import type { Payment } from '../../types';

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
}

export function generateMockGcashReference(): { transactionId: string; referenceId: string } {
  const seed = Math.random().toString(36).substring(2, 9).toUpperCase();
  const numSeed = Math.floor(100000 + Math.random() * 900000);
  return {
    transactionId: `GCASH-TXN-${Date.now().toString(36).toUpperCase()}-${seed}`,
    referenceId: `REF-${numSeed}`,
  };
}

/**
 * Validates a simulated incoming GCash webhook. This deliberately only resolves
 * payment state; inventory and fulfillment are owned by the order-flow service.
 */
export function processMockGcashWebhook(
  payload: MockGcashWebhookPayload,
  payment: Payment,
): WebhookValidationResult {
  if (!payment) return { success: false, error: 'Payment record not found.' };
  if (payment.id !== payload.paymentId) return { success: false, error: 'Payment ID mismatch.' };
  if (payment.method !== 'gcash') return { success: false, error: 'Payment method is not GCash.' };
  if (payment.amount !== payload.amount) {
    return { success: false, error: `Amount mismatch: Expected ₱${payment.amount}, received ₱${payload.amount}.` };
  }
  if (payment.status === 'paid') {
    return { success: true, alreadyProcessed: true, updatedPayment: payment };
  }
  if (payload.status !== 'SUCCESS' || payload.event !== 'payment.success') {
    return {
      success: false,
      error: 'GCash payment was rejected or failed.',
      updatedPayment: { ...payment, status: 'failed' },
    };
  }
  return {
    success: true,
    alreadyProcessed: false,
    updatedPayment: {
      ...payment,
      status: 'paid',
      mockTransactionId: payload.transactionId,
      referenceId: payload.referenceId,
      paidAt: new Date().toISOString(),
    },
  };
}
