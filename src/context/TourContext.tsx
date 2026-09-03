import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useApp } from './AppContext';
import {
  approveFinancingFlow,
  createOrderWithReservation,
  getRecord,
  saveRecord,
  transitionOrderFlow,
  updateRootPaths,
} from '../services/firebase/rtdbService';
import type { AuthUser, Product, Order, Financing, Payment, Customer, RestockOrder } from '../types';

export type TourPhase = 'focusing' | 'clicking' | 'success';

export interface TourStep {
  id: number;
  stageNumber: string;
  roleName: string;
  roleIcon: string;
  roleBadgeColor: string;
  title: string;
  summary: string;
  detailedInstruction: string;
  targetFocusName: string;
  actionButtonLabel: string;
  targetPage: string;
  targetUser: AuthUser;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 0,
    stageNumber: '01',
    roleName: 'Wholesale Supplier',
    roleIcon: '🏭',
    roleBadgeColor: 'bg-[#FFC107] text-[#0D2B45]',
    title: 'Supplier Publishes Wholesale Products',
    summary: 'Supplier signs in, adds products with direct photo upload, and sets stock count.',
    detailedInstruction:
      'In the live Supplier Portal as "Test Supplier". Watch the system spotlight the catalog and publish "Coca-Cola 1.5L Case" at ₱480 with 50 units warehouse stock.',
    targetFocusName: 'Wholesale Products Catalog & Add Product Button',
    actionButtonLabel: 'Publish Product to Catalog',
    targetPage: 'supplier/products',
    targetUser: {
      id: 'sup1788397726900',
      name: 'Test',
      email: 'test@gmail.com',
      role: 'supplier',
      supplierId: 'sup1788397726900',
    },
  },
  {
    id: 1,
    stageNumber: '02',
    roleName: 'Sari-Sari Store Owner',
    roleIcon: '🏪',
    roleBadgeColor: 'bg-[#1E7D3B] text-white',
    title: 'Store Owner Shops & Selects Credit Financing',
    summary: 'Store owner browses the catalog and checks out with the configured 1-month financing plan.',
    detailedInstruction:
      'Switched to Gabriel Cahiyang (Store Owner) on the live Shop page. Watch the system reserve 3 cases and create a financing request using the current system charge and installment settings.',
    targetFocusName: 'Wholesale Cart & 4-Week Revolving Financing Checkout',
    actionButtonLabel: 'Add to Cart & Place Financed Order',
    targetPage: 'customer/shop',
    targetUser: {
      id: 'cust1788380537668',
      name: 'Gabriel Cahiyang',
      email: 'gabzcah@gmail.com',
      role: 'customer',
      customerId: 'cust1788380537668',
    },
  },
  {
    id: 2,
    stageNumber: '03',
    roleName: 'Credit Supervisor',
    roleIcon: '👔',
    roleBadgeColor: 'bg-indigo-600 text-white',
    title: 'Supervisor Reviews Store Risk & Approves Financing',
    summary: 'Supervisor reviews store operating history and approves the credit application.',
    detailedInstruction:
      'Switched to SuperJeff (Supervisor) in Financing Management! Watch the spotlight focus on Gabriel\'s pending application and click "Approve", activating his credit line.',
    targetFocusName: 'Credit Risk Review & Loan Approval Queue',
    actionButtonLabel: 'Approve Financing FIN-TOUR-001',
    targetPage: 'supervisor/financing',
    targetUser: {
      id: 'e1788382283311',
      name: 'SuperJeff',
      email: 'super@gmail.com',
      role: 'supervisor',
      employeeId: 'e1788382283311',
    },
  },
  {
    id: 3,
    stageNumber: '04',
    roleName: 'Wholesale Supplier',
    roleIcon: '🚚',
    roleBadgeColor: 'bg-[#0D2B45] text-[#FFC107]',
    title: 'Supplier Dispatches Store Delivery',
    summary: 'Supplier marks the packed crates ready, then dispatches them.',
    detailedInstruction:
      'Back in the Supplier Portal under "Orders to Fulfill"! Watch the order move through READY before the supplier dispatches it for delivery.',
    targetFocusName: 'Order Fulfillment & Delivery Dispatch Pipeline',
    actionButtonLabel: 'Prepare & Dispatch Order',
    targetPage: 'supplier/orders',
    targetUser: {
      id: 'sup1788397726900',
      name: 'Test',
      email: 'test@gmail.com',
      role: 'supplier',
      supplierId: 'sup1788397726900',
    },
  },
  {
    id: 4,
    stageNumber: '05',
    roleName: 'Two-Sided Handshake',
    roleIcon: '🤝',
    roleBadgeColor: 'bg-amber-600 text-white',
    title: 'Driver Delivers & Store Owner Confirms Receipt',
    summary: 'Driver marks delivered; store owner clicks "Confirm Order Received" to complete.',
    detailedInstruction:
      'Back on Gabriel\'s Orders page! Watch the driver deliver the crates, and Gabriel click "Confirm Order Received". Both sides confirm, officially transitioning the order to COMPLETED.',
    targetFocusName: 'Delivery Handshake & Customer Order Receipt Confirmation',
    actionButtonLabel: 'Confirm Order Received',
    targetPage: 'customer/orders',
    targetUser: {
      id: 'cust1788380537668',
      name: 'Gabriel Cahiyang',
      email: 'gabzcah@gmail.com',
      role: 'customer',
      customerId: 'cust1788380537668',
    },
  },
  {
    id: 5,
    stageNumber: '06',
    roleName: 'Sari-Sari Store Owner',
    roleIcon: '📲',
    roleBadgeColor: 'bg-[#1E7D3B] text-white',
    title: 'Store Owner Pays an Installment via GCash',
    summary: 'GCash settles instantly and restores only the principal portion of the credit line.',
    detailedInstruction:
      'Viewing Gabriel\'s financing schedule. Watch Week 1 settle instantly through the GCash mock, advance the repayment schedule, and restore the principal portion of his available credit.',
    targetFocusName: 'Weekly Installment Schedule & GCash Payment Mockup',
    actionButtonLabel: 'Pay Week 1 via GCash',
    targetPage: 'customer/financing',
    targetUser: {
      id: 'cust1788380537668',
      name: 'Gabriel Cahiyang',
      email: 'gabzcah@gmail.com',
      role: 'customer',
      customerId: 'cust1788380537668',
    },
  },
  {
    id: 6,
    stageNumber: '07',
    roleName: 'Sari-Sari Store Owner',
    roleIcon: '✅',
    roleBadgeColor: 'bg-[#1E7D3B] text-white',
    title: 'Store Owner Completes the Financing Cycle',
    summary: 'Full GCash settlement completes financing, releases the remaining principal, and grows the limit.',
    detailedInstruction:
      'Still in Gabriel\'s financing account. Watch the remaining balance settle through GCash, the financing status become COMPLETED, used credit return to zero, and the configured automatic limit increase apply.',
    targetFocusName: 'Full Balance Settlement & Automatic Limit Growth',
    actionButtonLabel: 'Settle Remaining Balance',
    targetPage: 'customer/financing',
    targetUser: {
      id: 'cust1788380537668',
      name: 'Gabriel Cahiyang',
      email: 'gabzcah@gmail.com',
      role: 'customer',
      customerId: 'cust1788380537668',
    },
  },
  {
    id: 7,
    stageNumber: '08',
    roleName: 'Wholesale Supplier',
    roleIcon: '🔄',
    roleBadgeColor: 'bg-emerald-800 text-white',
    title: 'Supplier Logs a Warehouse Restock',
    summary: 'Supplier records a received intake batch and replenishes available stock.',
    detailedInstruction:
      'In the Restock Hub, watch the supplier log a received batch of 50 factory cases. The stock count and restock history update together, closing the supply cycle.',
    targetFocusName: 'Factory Restock Intake & Store Credit Limit Growth',
    actionButtonLabel: 'Log +50 Received Cases',
    targetPage: 'supplier/restock',
    targetUser: {
      id: 'sup1788397726900',
      name: 'Test',
      email: 'test@gmail.com',
      role: 'supplier',
      supplierId: 'sup1788397726900',
    },
  },
];

interface TourContextType {
  isTourActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep;
  tourPhase: TourPhase;
  isPaused: boolean;
  isEnding: boolean;
  tourError: string | null;
  stepProgress: number; // 0 to 100
  setIsPaused: (v: boolean) => void;
  startTour: () => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  endTour: () => Promise<void>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch, showToast } = useApp();

  // Keep a stable ref to state so callbacks never trigger re-renders or get stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tourPhase, setTourPhase] = useState<TourPhase>('focusing');
  const [isPaused, setIsPaused] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [tourError, setTourError] = useState<string | null>(null);
  const [stepProgress, setStepProgress] = useState(0);

  const customerSnapshotRef = useRef<Customer | null>(null);
  const elapsedRef = useRef(0);
  const actionStartedRef = useRef(new Set<number>());
  const actionCompletedRef = useRef(new Set<number>());
  const activeActionPromiseRef = useRef<Promise<void> | null>(null);
  const transitionLockedRef = useRef(false);
  const startLockedRef = useRef(false);
  const initialSessionRef = useRef<{ user: AuthUser | null; page: string } | null>(null);

  const tourDispatch = useCallback((action: Parameters<typeof dispatch>[0]) => {
    dispatch({
      ...action,
      meta: { ...action.meta, suppressAudit: true },
    } as Parameters<typeof dispatch>[0]);
  }, [dispatch]);

  // Atomically remove every temporary record and restore the exact customer
  // values captured before the tour began. If this write fails, none of the
  // paths are partially reset and the tour remains open so it can be retried.
  const cleanupDatabaseData = useCallback(async () => {
    const currentState = stateRef.current;
    const paths: Record<string, unknown> = {
      'products/prod_tour_coke': null,
      'orders/ord_tour_001': null,
      'financing/fin_tour_001': null,
      'payments/pay_tour_001': null,
      'payments/pay_tour_settle': null,
      'restockOrders/restock_tour_001': null,
    };

    if (customerSnapshotRef.current) {
      paths['customers/cust1788380537668'] = customerSnapshotRef.current;
    } else {
      paths['customers/cust1788380537668'] = null;
    }

    await updateRootPaths(paths);

    tourDispatch({
      type: 'SYNC_PRODUCTS',
      products: currentState.products.filter(p => p.id !== 'prod_tour_coke'),
    });
    tourDispatch({
      type: 'SYNC_ORDERS',
      orders: currentState.orders.filter(o => o.id !== 'ord_tour_001'),
    });
    tourDispatch({
      type: 'SYNC_FINANCING',
      financing: currentState.financing.filter(f => f.id !== 'fin_tour_001'),
    });
    tourDispatch({
      type: 'SYNC_PAYMENTS',
      payments: currentState.payments.filter(p => p.id !== 'pay_tour_001' && p.id !== 'pay_tour_settle'),
    });
    tourDispatch({
      type: 'SYNC_RESTOCK',
      restockOrders: currentState.restockOrders.filter(order => order.id !== 'restock_tour_001'),
    });

    if (customerSnapshotRef.current) {
      const restoredCustomer = customerSnapshotRef.current;
      tourDispatch({
        type: 'SYNC_CUSTOMERS',
        customers: currentState.customers.map(c => c.id === restoredCustomer.id ? restoredCustomer : c),
      });
    }
  }, [tourDispatch]);

  // Execute the real state/RTDB action for the current step (reads from stateRef)
  const executeStepLiveAction = useCallback(async (stepIdx: number) => {
    try {
      const currentState = stateRef.current;

      switch (stepIdx) {
        case 0: {
          // STEP 1: Supplier Adds Product
          const demoProduct: Product = {
            id: 'prod_tour_coke',
            name: 'Coca-Cola 1.5L (Case of 12)',
            sku: 'COKE-1.5L-CS12',
            category: 'Beverages',
            supplierId: 'sup1788397726900',
            sellingPrice: 480,
            costPrice: 420,
            stock: 50,
            reorderLevel: 10,
            status: 'active',
            imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
          };
          await saveRecord('products', demoProduct);
          tourDispatch({ type: 'ADD_PRODUCT', product: demoProduct });
          showToast('success', '✓ Product "Coca-Cola 1.5L (Case of 12)" published with 50 units stock!');
          break;
        }

        case 1: {
          // STEP 2: Store Owner Cart & Financed Order Placement
          const orderId = 'ord_tour_001';
          const finId = 'fin_tour_001';
          const chargePercent = currentState.settings?.financingCharge ?? 20;
          const installmentCount = currentState.settings?.plan1Installments ?? 4;
          const principal = 1440;
          const chargeAmount = Math.round(principal * chargePercent / 100);
          const totalRepayable = principal + chargeAmount;
          const weeklyInstallment = Math.round((totalRepayable / installmentCount) * 100) / 100;
          const order: Order = {
            id: orderId,
            orderNo: 'ORD-TOUR-001',
            customerId: 'cust1788380537668',
            items: [
              {
                productId: 'prod_tour_coke',
                productName: 'Coca-Cola 1.5L (Case of 12)',
                quantity: 3,
                price: 480,
                supplierId: 'sup1788397726900',
              },
            ],
            total: 1440,
            status: 'pending_financing',
            paymentType: 'financing',
            paymentStatus: 'pending',
            stockReservationStatus: 'reserved',
            financingId: finId,
            channel: 'online',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const financing: Financing = {
            id: finId,
            financingNo: 'FIN-TOUR-001',
            orderId,
            customerId: 'cust1788380537668',
            principal,
            chargePercent,
            chargeAmount,
            totalRepayable,
            plan: 1,
            installmentCount,
            weeklyInstallment,
            status: 'pending',
            paidPrincipal: 0,
            schedule: Array.from({ length: installmentCount }, (_, index) => ({
              weekNo: index + 1,
              dueDate: new Date(Date.now() + (index + 1) * 7 * 86400000).toISOString().split('T')[0],
              baseAmount: weeklyInstallment,
              penalty: 0,
              status: index === 0 ? 'due' as const : 'upcoming' as const,
            })),
            createdAt: new Date().toISOString(),
          };

          // Ensure Gabriel exists as a valid Sari-Sari Store customer in the database
          const existingCust = currentState.customers.find(c => c.id === 'cust1788380537668');
          if (!existingCust) {
            const tourCustomer: Customer = {
              id: 'cust1788380537668',
              accountNo: 'SF-0001',
              fullName: 'Gabriel Cahiyang',
              storeName: "Gabriel's Sari-Sari Store",
              storeAddress: 'Poblacion, Ormoc City',
              yearsOperating: 3,
              phone: '09383309742',
              email: 'gabzcah@gmail.com',
              loginEmail: 'gabzcah@gmail.com',
              address: 'Ormoc City, Leyte',
              creditLimit: 6000,
              usedCredit: 0,
              notes: 'Tour demo store owner account',
              status: 'active',
              createdAt: '2026-09-02',
            };
            await saveRecord('customers', tourCustomer);
            tourDispatch({ type: 'SYNC_CUSTOMERS', customers: [...currentState.customers, tourCustomer] });
          } else if (existingCust.storeName?.toLowerCase() === 'individual buyer') {
            const fixedCust = { ...existingCust, storeName: "Gabriel's Sari-Sari Store" };
            await saveRecord('customers', fixedCust);
            tourDispatch({ type: 'UPDATE_CUSTOMER', customer: fixedCust });
          }

          await createOrderWithReservation(order, undefined, financing);
          tourDispatch({ type: 'PLACE_ORDER', order, financing });
          showToast('success', `✓ Order #ORD-TOUR-001 reserved with ${installmentCount} installments at ${chargePercent}% financing charge.`);
          break;
        }

        case 2: {
          // STEP 3: Supervisor Approves Financing
          const fallbackChargePercent = currentState.settings?.financingCharge ?? 20;
          const fallbackInstallments = currentState.settings?.plan1Installments ?? 4;
          const fallbackCharge = Math.round(1440 * fallbackChargePercent / 100);
          const fallbackRepayable = 1440 + fallbackCharge;
          const fallbackInstallment = Math.round((fallbackRepayable / fallbackInstallments) * 100) / 100;
          const fin = currentState.financing.find(f => f.id === 'fin_tour_001') || {
            id: 'fin_tour_001',
            financingNo: 'FIN-TOUR-001',
            orderId: 'ord_tour_001',
            customerId: 'cust1788380537668',
            principal: 1440,
            chargePercent: fallbackChargePercent,
            chargeAmount: fallbackCharge,
            totalRepayable: fallbackRepayable,
            plan: 1 as const,
            installmentCount: fallbackInstallments,
            weeklyInstallment: fallbackInstallment,
            status: 'active' as const,
            paidPrincipal: 0,
            approvedBy: 'SuperJeff',
            approvedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            schedule: Array.from({ length: fallbackInstallments }, (_, index) => ({
              weekNo: index + 1,
              dueDate: new Date(Date.now() + (index + 1) * 7 * 86400000).toISOString().split('T')[0],
              baseAmount: fallbackInstallment,
              penalty: 0,
              status: index === 0 ? 'due' as const : 'upcoming' as const,
            })),
          };

          await approveFinancingFlow(fin.id, 'SuperJeff');
          tourDispatch({ type: 'APPROVE_FINANCING', financingId: 'fin_tour_001', approvedBy: 'SuperJeff' });

          showToast('success', '✓ Supervisor approved FIN-TOUR-001. The order is now PROCESSING.');
          break;
        }

        case 3: {
          // STEP 4: Supplier follows the guarded READY -> OUT_FOR_DELIVERY flow.
          const ord = currentState.orders.find(o => o.id === 'ord_tour_001');
          if (!ord) throw new Error('Tour order is not available.');
          await transitionOrderFlow(ord.id, 'ready', 'supplier');
          tourDispatch({ type: 'UPDATE_ORDER_STATUS', orderId: 'ord_tour_001', status: 'ready' });
          await new Promise(resolve => setTimeout(resolve, 650));
          await transitionOrderFlow(ord.id, 'out_for_delivery', 'supplier');
          tourDispatch({ type: 'UPDATE_ORDER_STATUS', orderId: 'ord_tour_001', status: 'out_for_delivery' });
          showToast('success', '✓ Supplier marked the order READY, then dispatched it.');
          break;
        }

        case 4: {
          // STEP 5: Supplier stops at DELIVERED; only the customer can complete.
          const ord = currentState.orders.find(o => o.id === 'ord_tour_001');
          if (!ord) throw new Error('Tour order is not available.');
          await transitionOrderFlow(ord.id, 'delivered', 'supplier');
          tourDispatch({ type: 'UPDATE_ORDER_STATUS', orderId: 'ord_tour_001', status: 'delivered' });
          await new Promise(resolve => setTimeout(resolve, 650));
          await transitionOrderFlow(ord.id, 'completed', 'customer');
          tourDispatch({ type: 'UPDATE_ORDER_STATUS', orderId: 'ord_tour_001', status: 'completed' });
          showToast('success', '✓ Store Owner Gabriel confirmed receipt! Order marked COMPLETED.');
          break;
        }

        case 5: {
          // STEP 6: GCash settles immediately and releases principal, not fees.
          const fin = currentState.financing.find(f => f.id === 'fin_tour_001');
          const cust = currentState.customers.find(c => c.id === 'cust1788380537668');
          if (!fin || !cust) throw new Error('Tour financing account is not available.');
          const firstInstallment = fin.schedule.find(entry => entry.weekNo === 1);
          if (!firstInstallment) throw new Error('Tour installment schedule is not available.');
          const paidAt = new Date().toISOString();
          const principalReleased = fin.principal / fin.installmentCount;
          const payment: Payment = {
            id: 'pay_tour_001',
            paymentNo: 'PAY-TOUR-001',
            customerId: 'cust1788380537668',
            financingId: 'fin_tour_001',
            amount: firstInstallment.baseAmount + firstInstallment.penalty,
            method: 'gcash',
            type: 'installment',
            status: 'paid',
            referenceId: 'GCASH-98314',
            confirmedBy: 'Auto (GCash)',
            createdAt: paidAt,
            paidAt,
          };
          const updatedFinancing: Financing = {
            ...fin,
            paidPrincipal: Math.min(fin.principal, fin.paidPrincipal + principalReleased),
            schedule: fin.schedule.map(entry => {
              if (entry.weekNo === 1) return { ...entry, status: 'paid' as const, paidAt, paidMethod: 'gcash' as const };
              if (entry.weekNo === 2 && entry.status === 'upcoming') return { ...entry, status: 'due' as const };
              return entry;
            }),
          };
          const updatedCustomer = { ...cust, usedCredit: Math.max(0, cust.usedCredit - principalReleased) };
          await updateRootPaths({
            [`payments/${payment.id}`]: payment,
            [`financing/${fin.id}`]: updatedFinancing,
            [`customers/${cust.id}`]: updatedCustomer,
          });
          tourDispatch({ type: 'SYNC_PAYMENTS', payments: [payment, ...currentState.payments] });
          tourDispatch({ type: 'SYNC_FINANCING', financing: currentState.financing.map(item => item.id === fin.id ? updatedFinancing : item) });
          tourDispatch({ type: 'UPDATE_CUSTOMER', customer: updatedCustomer });
          showToast('success', `✓ GCash settled instantly. ₱${principalReleased.toLocaleString('en-PH')} principal restored to available credit.`);
          break;
        }

        case 6: {
          // STEP 7: Full GCash settlement completes financing and grows the limit once.
          const fin = currentState.financing.find(f => f.id === 'fin_tour_001');
          const cust = currentState.customers.find(c => c.id === 'cust1788380537668');
          if (!fin || !cust) throw new Error('Tour financing account is not available.');
          const paidAt = new Date().toISOString();
          const remainingPrincipal = Math.max(0, fin.principal - fin.paidPrincipal);
          const remainingBalance = Math.max(0, fin.totalRepayable - (fin.paidPrincipal / fin.principal * fin.totalRepayable));
          const limitIncrease = currentState.settings?.limitIncreaseAmount ?? 1000;
          const maxLimit = currentState.settings?.maxAutomaticLimit ?? 20000;
          const newLimit = Math.min(maxLimit, cust.creditLimit + limitIncrease);
          const settlement: Payment = {
            id: 'pay_tour_settle',
            paymentNo: 'PAY-TOUR-SETTLE',
            customerId: cust.id,
            financingId: fin.id,
            amount: Math.round(remainingBalance * 100) / 100,
            method: 'gcash',
            type: 'full_settlement',
            status: 'paid',
            confirmedBy: 'Auto (GCash)',
            referenceId: 'GCASH-98315',
            createdAt: paidAt,
            paidAt,
          };
          const completedFinancing: Financing = {
            ...fin,
            status: 'completed',
            paidPrincipal: fin.principal,
            schedule: fin.schedule.map(entry => entry.status === 'paid' ? entry : { ...entry, status: 'paid' as const, paidAt, paidMethod: 'gcash' as const }),
          };
          const updatedCustomer: Customer = {
            ...cust,
            usedCredit: Math.max(0, cust.usedCredit - remainingPrincipal),
            creditLimit: newLimit,
          };
          await updateRootPaths({
            [`payments/${settlement.id}`]: settlement,
            [`financing/${fin.id}`]: completedFinancing,
            [`customers/${cust.id}`]: updatedCustomer,
          });
          tourDispatch({ type: 'SYNC_PAYMENTS', payments: [settlement, ...currentState.payments] });
          tourDispatch({ type: 'SYNC_FINANCING', financing: currentState.financing.map(item => item.id === fin.id ? completedFinancing : item) });
          tourDispatch({ type: 'UPDATE_CUSTOMER', customer: updatedCustomer });
          showToast('success', `✓ Financing completed. Remaining principal restored and credit limit is now ₱${newLimit.toLocaleString('en-PH')}.`);
          break;
        }

        case 7: {
          // STEP 8: Supplier records the received stock batch.
          const prod = currentState.products.find(p => p.id === 'prod_tour_coke');
          if (!prod) throw new Error('Tour product is not available.');
          const receivedAt = new Date().toISOString();
          const updatedProduct = { ...prod, stock: prod.stock + 50 };
          const restock: RestockOrder = {
            id: 'restock_tour_001',
            restockNo: 'RO-TOUR-001',
            supplierId: 'sup1788397726900',
            supplierName: 'Test',
            items: [{ productId: prod.id, productName: prod.name, quantity: 50, costPrice: prod.costPrice }],
            totalCost: prod.costPrice * 50,
            status: 'received',
            createdAt: receivedAt,
            receivedAt,
          };
          await updateRootPaths({
            [`products/${prod.id}`]: updatedProduct,
            [`restockOrders/${restock.id}`]: restock,
          });
          tourDispatch({ type: 'UPDATE_PRODUCT', product: updatedProduct });
          tourDispatch({ type: 'SYNC_RESTOCK', restockOrders: [restock, ...currentState.restockOrders] });
          showToast('success', '✓ Received restock recorded. 50 cases added to supplier inventory.');
          break;
        }
      }
    } catch (err) {
      console.error('Error executing step action:', err);
      showToast('error', 'The walkthrough action could not be saved. Pause and retry this step.');
      throw err;
    }
  }, [showToast, tourDispatch]);

  // Apply step page and persona atomically
  const applyStep = useCallback((stepIdx: number) => {
    const step = TOUR_STEPS[stepIdx];
    // Atomic user & page switch
    tourDispatch({ type: 'LOGIN_AND_NAVIGATE', user: step.targetUser, page: step.targetPage });
    setTourPhase('focusing');
    setStepProgress(0);
    setTourError(null);
    elapsedRef.current = 0;
    transitionLockedRef.current = false;
  }, [tourDispatch]);

  const startTour = useCallback(async () => {
    if (startLockedRef.current) return;
    startLockedRef.current = true;

    try {
      initialSessionRef.current = {
        user: stateRef.current.currentUser,
        page: stateRef.current.currentPage,
      };
      const liveCustomer = await getRecord<Customer>('customers', 'cust1788380537668').catch(() => null);
      customerSnapshotRef.current = liveCustomer ?? stateRef.current.customers.find(
        customer => customer.id === 'cust1788380537668'
      ) ?? null;
      actionStartedRef.current.clear();
      actionCompletedRef.current.clear();
      setTourError(null);
      setIsEnding(false);
      setIsTourActive(true);
      setCurrentStepIndex(0);
      setIsPaused(false);
      applyStep(0);
    } finally {
      startLockedRef.current = false;
    }
  }, [applyStep]);

  const nextStep = useCallback(() => {
    setCurrentStepIndex(prev => {
      const nextIdx = Math.min(TOUR_STEPS.length - 1, prev + 1);
      applyStep(nextIdx);
      return nextIdx;
    });
  }, [applyStep]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex(prev => {
      const prevIdx = Math.max(0, prev - 1);
      applyStep(prevIdx);
      return prevIdx;
    });
  }, [applyStep]);

  const goToStep = useCallback((idx: number) => {
    if (idx >= 0 && idx < TOUR_STEPS.length) {
      setCurrentStepIndex(idx);
      applyStep(idx);
    }
  }, [applyStep]);

  const endTour = useCallback(async () => {
    if (isEnding) return;

    setIsEnding(true);
    setIsPaused(true);
    setTourError(null);

    try {
      await activeActionPromiseRef.current?.catch(() => undefined);
      await cleanupDatabaseData();
      if (initialSessionRef.current?.user) {
        tourDispatch({
          type: 'LOGIN_AND_NAVIGATE',
          user: initialSessionRef.current.user,
          page: initialSessionRef.current.page,
        });
      } else {
        tourDispatch({ type: 'SET_CURRENT_USER', user: null });
        tourDispatch({ type: 'NAVIGATE', page: 'home' });
      }
      setIsTourActive(false);
      setCurrentStepIndex(0);
      setTourPhase('focusing');
      setStepProgress(0);
      elapsedRef.current = 0;
      customerSnapshotRef.current = null;
      showToast('success', 'Tour complete. All temporary database changes were restored.');
    } catch (err) {
      console.error('Walkthrough cleanup failed:', err);
      setTourError('Database reset failed. Your tour is paused so you can retry safely.');
      showToast('error', 'Could not reset the walkthrough data. Please retry Exit Tour.');
    } finally {
      setIsEnding(false);
    }
  }, [cleanupDatabaseData, isEnding, showToast, tourDispatch]);

  // A deliberately relaxed timeline gives users enough time to locate the
  // spotlight, understand the action, and observe the result on the real page.
  const STEP_DURATION_MS = 13000;
  const INTERACTION_START_MS = 4400;
  const ACTION_START_MS = 6200;

  useEffect(() => {
    if (!isTourActive || isPaused || isEnding) return;

    let animationFrame = 0;
    let lastFrame = performance.now();

    const tick = (now: number) => {
      elapsedRef.current = Math.min(
        STEP_DURATION_MS,
        elapsedRef.current + (now - lastFrame)
      );
      lastFrame = now;

      const elapsed = elapsedRef.current;
      setStepProgress((elapsed / STEP_DURATION_MS) * 100);

      if (elapsed < INTERACTION_START_MS) {
        setTourPhase('focusing');
      } else if (actionCompletedRef.current.has(currentStepIndex)) {
        setTourPhase('success');
      } else {
        setTourPhase('clicking');
      }

      if (elapsed >= ACTION_START_MS && !actionStartedRef.current.has(currentStepIndex)) {
        actionStartedRef.current.add(currentStepIndex);
        setTourError(null);
        const actionPromise = executeStepLiveAction(currentStepIndex);
        activeActionPromiseRef.current = actionPromise;
        void actionPromise
          .then(() => {
            actionCompletedRef.current.add(currentStepIndex);
            setTourError(null);
            setTourPhase('success');
          })
          .catch(() => {
            actionStartedRef.current.delete(currentStepIndex);
            setTourError('This step could not be saved. Resume to retry it.');
            setIsPaused(true);
          })
          .finally(() => {
            if (activeActionPromiseRef.current === actionPromise) {
              activeActionPromiseRef.current = null;
            }
          });
      }

      if (
        elapsed >= STEP_DURATION_MS &&
        actionCompletedRef.current.has(currentStepIndex) &&
        !transitionLockedRef.current
      ) {
        transitionLockedRef.current = true;
        if (currentStepIndex < TOUR_STEPS.length - 1) {
          nextStep();
        } else {
          void endTour();
        }
        return;
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isTourActive, isPaused, isEnding, currentStepIndex, executeStepLiveAction, nextStep, endTour]);

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStepIndex,
        currentStep: TOUR_STEPS[currentStepIndex],
        tourPhase,
        isPaused,
        isEnding,
        tourError,
        stepProgress,
        setIsPaused,
        startTour,
        nextStep,
        prevStep,
        goToStep,
        endTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return ctx;
}
