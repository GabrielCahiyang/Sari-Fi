import type { Financing, Order, OrderStatus, Payment } from '../types';

const financingClearedStatuses = new Set<Financing['status']>(['approved', 'active', 'completed']);

export function isPaymentRequired(order: Order): boolean {
  return order.paymentType === 'cash' || order.paymentType === 'gcash' || order.paymentType === 'split';
}

export function isFinancingRequired(order: Order): boolean {
  return order.paymentType === 'financing' || order.paymentType === 'split';
}

export function resolveFinancialOrderStatus(
  order: Order,
  payments: Payment[],
  financing: Financing[],
): OrderStatus {
  const payment = payments.find(p => p.orderId === order.id && p.type === 'purchase');
  const loan = financing.find(f => f.id === order.financingId || f.orderId === order.id);
  const paymentCleared = !isPaymentRequired(order) || payment?.status === 'paid';
  const financingCleared = !isFinancingRequired(order) || Boolean(loan && financingClearedStatuses.has(loan.status));

  if (paymentCleared && financingCleared) return 'processing';
  if (!financingCleared) return 'pending_financing';
  return 'pending_payment';
}

export function canTransitionOrder(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  if ((current === 'pending_payment' || current === 'pending_financing' || current === 'approved') && next === 'cancelled') return true;
  if (current === 'approved' && next === 'processing') return true;

  const nextByStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    processing: 'ready',
    ready: 'out_for_delivery',
    out_for_delivery: 'delivered',
    delivered: 'completed',
  };
  return nextByStatus[current] === next;
}

export function isSupplierFulfillable(order: Order): boolean {
  return order.status === 'processing' || order.status === 'ready' || order.status === 'out_for_delivery';
}

export function getSingleSupplierId(order: Pick<Order, 'items'>): string | null {
  const ids = new Set(order.items.map(item => item.supplierId).filter(Boolean));
  return ids.size === 1 ? Array.from(ids)[0]! : null;
}
