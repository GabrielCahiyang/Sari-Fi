import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type {
  AppState, AuthUser, Customer, Employee, Supplier, Product,
  Order, OrderItem, Financing, Payment, RestockOrder, RestockItem, ToastMessage,
  InstallmentSchedule, OrderStatus, SystemSettings, AuditEntry,
  ProductCategory, AuditCategory, AuditActorRole
} from '../types';
import { DEFAULT_SETTINGS } from '../data/seed';
import { deriveAudit } from '../data/audit';
import {
  subscribeToNodeList, subscribeToNodeObject, saveRecord, updateRecord,
  deleteRecord, saveSettings, logAuditEntry, seedDatabaseIfEmpty
} from '../services/firebase/rtdbService';
import {
  loginWithEmail, logoutUser, subscribeToAuth
} from '../services/firebase/authService';

type Action =
  | { type: 'LOGIN'; user: AuthUser }
  | { type: 'SET_CURRENT_USER'; user: AuthUser | null }
  | { type: 'LOGOUT' }
  | { type: 'NAVIGATE'; page: string }
  | { type: 'CART_ADD'; productId: string; quantity: number }
  | { type: 'CART_UPDATE'; productId: string; quantity: number }
  | { type: 'CART_REMOVE'; productId: string }
  | { type: 'CART_CLEAR' }
  | { type: 'SET_CHECKOUT_DATA'; data: AppState['checkoutData'] }
  | { type: 'PLACE_ORDER'; order: Order; payment?: Payment; financing?: Financing }
  | { type: 'UPDATE_ORDER_STATUS'; orderId: string; status: OrderStatus; confirmedBy?: string }
  | { type: 'APPROVE_FINANCING'; financingId: string; approvedBy: string }
  | { type: 'REJECT_FINANCING'; financingId: string; rejectedBy: string }
  | { type: 'PAY_INSTALLMENT'; financingId: string; weekNo: number; method: 'cash' | 'gcash'; confirmedBy?: string }
  | { type: 'PAY_FULL_BALANCE'; financingId: string; method: 'cash' | 'gcash'; confirmedBy?: string }
  | { type: 'CONFIRM_CASH_PAYMENT'; paymentId: string; confirmedBy: string }
  | { type: 'UPDATE_CUSTOMER'; customer: Customer }
  | { type: 'ADD_CUSTOMER'; customer: Customer }
  | { type: 'DELETE_CUSTOMER'; customerId: string }
  | { type: 'UPDATE_EMPLOYEE'; employee: Employee }
  | { type: 'ADD_EMPLOYEE'; employee: Employee }
  | { type: 'DELETE_EMPLOYEE'; employeeId: string }
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'DELETE_PRODUCT'; productId: string }
  | { type: 'UPDATE_SUPPLIER'; supplier: Supplier }
  | { type: 'ADD_SUPPLIER'; supplier: Supplier }
  | { type: 'DELETE_SUPPLIER'; supplierId: string }
  | { type: 'ADD_RESTOCK'; restock: RestockOrder }
  | { type: 'UPDATE_RESTOCK_STATUS'; restockId: string; status: RestockOrder['status'] }
  | { type: 'UPDATE_SETTINGS'; settings: AppState['settings'] }
  | { type: 'SET_TOAST'; toast: ToastMessage | null }
  | { type: 'SYNC_SETTINGS'; settings: SystemSettings }
  | { type: 'SYNC_SUPPLIERS'; suppliers: Supplier[] }
  | { type: 'SYNC_PRODUCTS'; products: Product[] }
  | { type: 'SYNC_EMPLOYEES'; employees: Employee[] }
  | { type: 'SYNC_CUSTOMERS'; customers: Customer[] }
  | { type: 'SYNC_ORDERS'; orders: Order[] }
  | { type: 'SYNC_FINANCING'; financing: Financing[] }
  | { type: 'SYNC_PAYMENTS'; payments: Payment[] }
  | { type: 'SYNC_RESTOCK'; restockOrders: RestockOrder[] }
  | { type: 'SYNC_AUDIT'; auditLog: AuditEntry[] }
  | { type: 'SYNC_CATEGORIES'; categories: ProductCategory[] }
  | { type: 'ADD_CATEGORY'; category: ProductCategory }
  | { type: 'DELETE_CATEGORY'; categoryId: string };

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'cat_beverages', name: 'Beverages' },
  { id: 'cat_canned', name: 'Canned Goods' },
  { id: 'cat_noodles', name: 'Instant Noodles' },
  { id: 'cat_snacks', name: 'Snacks & Sweets' },
  { id: 'cat_rice', name: 'Rice & Grains' },
  { id: 'cat_condiments', name: 'Condiments & Sauces' },
  { id: 'cat_dairy', name: 'Dairy & Eggs' },
  { id: 'cat_personal', name: 'Personal Care' },
  { id: 'cat_household', name: 'Household' },
];

const initialState: AppState = {
  currentUser: null,
  currentPage: 'home',
  cart: [],
  checkoutData: null,
  customers: [],
  employees: [],
  suppliers: [],
  products: [],
  categories: [],
  orders: [],
  financing: [],
  payments: [],
  restockOrders: [],
  settings: DEFAULT_SETTINGS,
  auditLog: [],
  toast: null,
};

function coreReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN': {
      const role = action.user.role;
      const page = role === 'customer' ? 'customer/dashboard'
        : role === 'employee' ? 'employee/dashboard'
        : role === 'supervisor' ? 'supervisor/dashboard'
        : 'admin/dashboard';
      return { ...state, currentUser: action.user, currentPage: page };
    }
    case 'SET_CURRENT_USER': {
      let page = state.currentPage;
      if (action.user && (state.currentPage === 'home' || state.currentPage === 'login' || state.currentPage === 'customer/login')) {
        const role = action.user.role;
        page = role === 'customer' ? 'customer/dashboard'
          : role === 'employee' ? 'employee/dashboard'
          : role === 'supervisor' ? 'supervisor/dashboard'
          : 'admin/dashboard';
      }
      return { ...state, currentUser: action.user, currentPage: page };
    }
    case 'LOGOUT':
      return { ...state, currentUser: null, currentPage: 'home', cart: [], checkoutData: null };
    case 'NAVIGATE':
      return { ...state, currentPage: action.page };
    case 'CART_ADD': {
      const existing = state.cart.find(c => c.productId === action.productId);
      if (existing) {
        return { ...state, cart: state.cart.map(c => c.productId === action.productId ? { ...c, quantity: c.quantity + action.quantity } : c) };
      }
      return { ...state, cart: [...state.cart, { productId: action.productId, quantity: action.quantity }] };
    }
    case 'CART_UPDATE':
      return { ...state, cart: state.cart.map(c => c.productId === action.productId ? { ...c, quantity: action.quantity } : c) };
    case 'CART_REMOVE':
      return { ...state, cart: state.cart.filter(c => c.productId !== action.productId) };
    case 'CART_CLEAR':
      return { ...state, cart: [] };
    case 'SET_CHECKOUT_DATA':
      return { ...state, checkoutData: action.data };
    case 'PLACE_ORDER': {
      const orderMap = new Map<string, Order>();
      orderMap.set(action.order.id, action.order);
      state.orders.forEach(o => { if (!orderMap.has(o.id)) orderMap.set(o.id, o); });
      const newOrders = Array.from(orderMap.values());

      let newPayments = state.payments;
      if (action.payment) {
        const payMap = new Map<string, Payment>();
        payMap.set(action.payment.id, action.payment);
        state.payments.forEach(p => { if (!payMap.has(p.id)) payMap.set(p.id, p); });
        newPayments = Array.from(payMap.values());
      }

      let newFinancing = state.financing;
      if (action.financing) {
        const finMap = new Map<string, Financing>();
        finMap.set(action.financing.id, action.financing);
        state.financing.forEach(f => { if (!finMap.has(f.id)) finMap.set(f.id, f); });
        newFinancing = Array.from(finMap.values());
      }

      const updatedProducts = state.products.map(p => {
        const item = action.order.items.find(i => i.productId === p.id);
        if (item) return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        return p;
      });
      // INVARIANT: Submitting financing must NOT consume customer credit!
      // Customer credit is only consumed once approved by a supervisor/admin.
      return { ...state, orders: newOrders, payments: newPayments, financing: newFinancing, products: updatedProducts, cart: [], checkoutData: null };
    }
    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.orderId
            ? { ...o, status: action.status, confirmedBy: action.confirmedBy, updatedAt: new Date().toISOString() }
            : o
        ),
      };
    case 'APPROVE_FINANCING': {
      const fin = state.financing.find(f => f.id === action.financingId);
      // Defensive Guard / Idempotency: only pending financing can be approved
      if (!fin || fin.status !== 'pending') return state;

      const today = new Date();
      const schedule: InstallmentSchedule[] = fin.schedule.map((s, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + (i + 1) * 7);
        return { ...s, dueDate: d.toISOString().split('T')[0], status: i === 0 ? 'due' : 'upcoming' };
      });
      const updatedFinancing = state.financing.map(f =>
        f.id === action.financingId
          ? { ...f, status: 'active' as const, approvedBy: action.approvedBy, approvedAt: new Date().toISOString(), schedule }
          : f
      );
      const updatedOrders = state.orders.map(o =>
        (o.financingId === action.financingId || o.id === fin.orderId)
          ? { ...o, status: 'completed' as OrderStatus, paymentStatus: 'paid' as const, updatedAt: new Date().toISOString() }
          : o
      );
      // INVARIANT: Approving financing consumes the principal EXACTLY ONCE
      const updatedCustomers = state.customers.map(c =>
        c.id === fin.customerId ? { ...c, usedCredit: c.usedCredit + fin.principal } : c
      );
      return { ...state, financing: updatedFinancing, orders: updatedOrders, customers: updatedCustomers };
    }
    case 'REJECT_FINANCING': {
      const fin = state.financing.find(f => f.id === action.financingId);
      // Defensive Guard / Idempotency: only pending financing can be rejected
      if (!fin || fin.status !== 'pending') return state;

      const updatedFinancing = state.financing.map(f =>
        f.id === action.financingId ? { ...f, status: 'rejected' as const, rejectedBy: action.rejectedBy } : f
      );
      const updatedOrders = state.orders.map(o =>
        (o.financingId === action.financingId || o.id === fin.orderId)
          ? { ...o, status: 'cancelled' as OrderStatus, updatedAt: new Date().toISOString() }
          : o
      );
      // INVARIANT: Rejecting financing consumes ZERO credit
      return { ...state, financing: updatedFinancing, orders: updatedOrders };
    }
    case 'PAY_INSTALLMENT': {
      const fin = state.financing.find(f => f.id === action.financingId);
      if (!fin) return state;
      const installment = fin.schedule.find(s => s.weekNo === action.weekNo);
      // Defensive Guard / Idempotency: cannot pay an already-paid installment
      if (!installment || installment.status === 'paid') return state;

      const amount = installment.baseAmount + installment.penalty;
      const principalPerInstallment = fin.principal / fin.installmentCount;
      const newPaidPrincipal = Math.min(fin.principal, fin.paidPrincipal + principalPerInstallment);
      const allPaid = fin.schedule.every(s => s.weekNo === action.weekNo || s.status === 'paid');

      const updatedSchedule = fin.schedule.map(s => {
        if (s.weekNo === action.weekNo) return { ...s, status: 'paid' as const, paidAt: new Date().toISOString(), paidMethod: action.method };
        if (s.weekNo === action.weekNo + 1 && s.status === 'upcoming') return { ...s, status: 'due' as const };
        return s;
      });

      const newStatus = allPaid ? 'completed' as const : fin.status;
      const updatedFinancing = state.financing.map(f =>
        f.id === action.financingId
          ? { ...f, paidPrincipal: newPaidPrincipal, schedule: updatedSchedule, status: newStatus }
          : f
      );

      // INVARIANT: Paying an installment decreases usedCredit by the principal portion EXACTLY ONCE
      const updatedCustomers = state.customers.map(c =>
        c.id === fin.customerId
          ? { ...c, usedCredit: Math.max(0, c.usedCredit - principalPerInstallment) }
          : c
      );

      const payMap = new Map<string, Payment>();
      const newPayment: Payment = {
        id: `pay${Date.now()}`,
        paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: fin.customerId,
        financingId: fin.id,
        type: 'installment',
        method: action.method,
        amount,
        status: 'paid',
        confirmedBy: action.method === 'cash' ? action.confirmedBy : undefined,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      };
      payMap.set(newPayment.id, newPayment);
      state.payments.forEach(p => { if (!payMap.has(p.id)) payMap.set(p.id, p); });

      return { ...state, financing: updatedFinancing, customers: updatedCustomers, payments: Array.from(payMap.values()) };
    }
    case 'PAY_FULL_BALANCE': {
      const fin = state.financing.find(f => f.id === action.financingId);
      // Defensive Guard / Idempotency: cannot settle already completed financing
      if (!fin || fin.status === 'completed') return state;

      const remainingPrincipal = Math.max(0, fin.principal - fin.paidPrincipal);
      if (remainingPrincipal <= 0) return state;

      const remaining = fin.totalRepayable - (fin.paidPrincipal / fin.principal * fin.totalRepayable);
      const updatedSchedule = fin.schedule.map(s =>
        s.status !== 'paid' ? { ...s, status: 'paid' as const, paidAt: new Date().toISOString(), paidMethod: action.method } : s
      );
      const updatedFinancing = state.financing.map(f =>
        f.id === action.financingId
          ? { ...f, paidPrincipal: f.principal, schedule: updatedSchedule, status: 'completed' as const }
          : f
      );

      // INVARIANT: Full settlement releases remaining principal from usedCredit EXACTLY ONCE
      const updatedCustomers = state.customers.map(c =>
        c.id === fin.customerId
          ? { ...c, usedCredit: Math.max(0, c.usedCredit - remainingPrincipal) }
          : c
      );

      const payMap = new Map<string, Payment>();
      const newPayment: Payment = {
        id: `pay${Date.now()}`,
        paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: fin.customerId,
        financingId: fin.id,
        type: 'full_settlement',
        method: action.method,
        amount: Math.round(remaining * 100) / 100,
        status: 'paid',
        confirmedBy: action.method === 'cash' ? action.confirmedBy : undefined,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      };
      payMap.set(newPayment.id, newPayment);
      state.payments.forEach(p => { if (!payMap.has(p.id)) payMap.set(p.id, p); });

      return { ...state, financing: updatedFinancing, customers: updatedCustomers, payments: Array.from(payMap.values()) };
    }
    case 'CONFIRM_CASH_PAYMENT': {
      const payment = state.payments.find(p => p.id === action.paymentId);
      // Defensive Guard / Idempotency: if payment already marked paid, return state
      if (!payment || payment.status === 'paid') return state;

      const updatedPayments = state.payments.map(p =>
        p.id === action.paymentId ? { ...p, status: 'paid' as const, confirmedBy: action.confirmedBy, paidAt: new Date().toISOString() } : p
      );
      let updatedOrders = state.orders;
      if (payment.orderId) {
        updatedOrders = state.orders.map(o =>
          o.id === payment.orderId
            ? { ...o, paymentStatus: 'paid' as const, status: 'completed' as OrderStatus, confirmedBy: action.confirmedBy, updatedAt: new Date().toISOString() }
            : o
        );
      }
      return { ...state, payments: updatedPayments, orders: updatedOrders };
    }
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.customer.id ? action.customer : c) };
    case 'ADD_CUSTOMER': {
      if (state.customers.some(c => c.id === action.customer.id || (c.loginEmail && action.customer.loginEmail && c.loginEmail.toLowerCase() === action.customer.loginEmail.toLowerCase()))) {
        return state;
      }
      return { ...state, customers: [action.customer, ...state.customers] };
    }
    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.id !== action.customerId) };
    case 'UPDATE_EMPLOYEE':
      return { ...state, employees: state.employees.map(e => e.id === action.employee.id ? action.employee : e) };
    case 'ADD_EMPLOYEE': {
      if (state.employees.some(e => e.id === action.employee.id || (e.email && action.employee.email && e.email.toLowerCase() === action.employee.email.toLowerCase()))) {
        return state;
      }
      return { ...state, employees: [action.employee, ...state.employees] };
    }
    case 'DELETE_EMPLOYEE':
      return { ...state, employees: state.employees.filter(e => e.id !== action.employeeId) };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.product.id ? action.product : p) };
    case 'ADD_PRODUCT': {
      if (state.products.some(p => p.id === action.product.id || (p.sku && action.product.sku && p.sku.toUpperCase() === action.product.sku.toUpperCase()))) {
        return state;
      }
      return { ...state, products: [action.product, ...state.products] };
    }
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.productId) };
    case 'UPDATE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.map(s => s.id === action.supplier.id ? action.supplier : s) };
    case 'ADD_SUPPLIER': {
      if (state.suppliers.some(s => s.id === action.supplier.id)) return state;
      return { ...state, suppliers: [action.supplier, ...state.suppliers] };
    }
    case 'DELETE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.filter(s => s.id !== action.supplierId) };
    case 'ADD_RESTOCK': {
      if (state.restockOrders.some(r => r.id === action.restock.id)) return state;
      return { ...state, restockOrders: [action.restock, ...state.restockOrders] };
    }
    case 'UPDATE_RESTOCK_STATUS': {
      const restock = state.restockOrders.find(r => r.id === action.restockId);
      let updatedProducts = state.products;
      if (action.status === 'received' && restock) {
        updatedProducts = state.products.map(p => {
          const item = restock.items.find(i => i.productId === p.id);
          if (item) return { ...p, stock: p.stock + item.quantity };
          return p;
        });
      }
      return {
        ...state,
        restockOrders: state.restockOrders.map(r =>
          r.id === action.restockId ? { ...r, status: action.status, receivedAt: action.status === 'received' ? new Date().toISOString() : r.receivedAt } : r
        ),
        products: updatedProducts,
      };
    }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.settings };
    case 'SET_TOAST':
      return { ...state, toast: action.toast };

    // Realtime Database sync actions
    case 'SYNC_SETTINGS':
      return { ...state, settings: action.settings };
    case 'SYNC_SUPPLIERS': {
      const map = new Map<string, Supplier>();
      (action.suppliers || []).forEach(s => {
        if (s && s.id) map.set(s.id, s);
      });
      return { ...state, suppliers: Array.from(map.values()) };
    }
    case 'SYNC_PRODUCTS': {
      const map = new Map<string, Product>();
      (action.products || []).forEach(p => {
        if (p && p.id) map.set(p.id, p);
      });
      return { ...state, products: Array.from(map.values()) };
    }
    case 'SYNC_EMPLOYEES': {
      const map = new Map<string, Employee>();
      (action.employees || []).forEach(e => {
        if (e && e.id) map.set(e.id, e);
      });
      return { ...state, employees: Array.from(map.values()) };
    }
    case 'SYNC_CUSTOMERS': {
      const map = new Map<string, Customer>();
      (action.customers || []).forEach(c => {
        if (c && c.id) map.set(c.id, c);
      });
      return { ...state, customers: Array.from(map.values()) };
    }
    case 'SYNC_ORDERS': {
      const map = new Map<string, Order>();
      (action.orders || []).forEach(o => {
        if (o && o.id) map.set(o.id, o);
      });
      const normalized: Order[] = Array.from(map.values()).map(o => {
        const items = (Array.isArray(o?.items) ? o.items : o?.items ? Object.values(o.items) : []) as OrderItem[];
        const calcTotal = items.reduce((sum, it) => sum + (Number(it?.price) || 0) * (Number(it?.quantity) || 0), 0);
        const total = typeof o?.total === 'number' && !isNaN(o.total) ? o.total : calcTotal;
        return {
          ...o,
          id: o.id,
          orderNo: o.orderNo || `ORD-${String(o.id).slice(-4)}`,
          total,
          items,
          status: o.status || 'pending_payment',
          paymentType: o.paymentType || 'cash',
          paymentStatus: o.paymentStatus || 'pending',
          createdAt: o.createdAt || new Date().toISOString(),
          updatedAt: o.updatedAt || new Date().toISOString(),
        } as Order;
      });
      return { ...state, orders: normalized };
    }
    case 'SYNC_FINANCING': {
      const map = new Map<string, Financing>();
      (action.financing || []).forEach(f => {
        if (f && f.id) map.set(f.id, f);
      });
      return { ...state, financing: Array.from(map.values()) };
    }
    case 'SYNC_PAYMENTS': {
      const map = new Map<string, Payment>();
      (action.payments || []).forEach(p => {
        if (p && p.id) map.set(p.id, p);
      });
      return { ...state, payments: Array.from(map.values()) };
    }
    case 'SYNC_RESTOCK': {
      const map = new Map<string, RestockOrder>();
      (action.restockOrders || []).forEach(r => {
        if (r && r.id) map.set(r.id, r);
      });
      const normalized: RestockOrder[] = Array.from(map.values()).map(r => ({
        ...r,
        items: (Array.isArray(r?.items) ? r.items : r?.items ? Object.values(r.items) : []) as RestockItem[],
      }));
      return { ...state, restockOrders: normalized };
    }
    case 'SYNC_AUDIT': {
      const map = new Map<string, AuditEntry>();
      (action.auditLog || []).forEach(a => {
        if (a && a.id) map.set(a.id, a);
      });
      const list = Array.from(map.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return { ...state, auditLog: list };
    }
    case 'ADD_CATEGORY': {
      if (state.categories.some(c => c.id === action.category.id || c.name.toLowerCase() === action.category.name.toLowerCase())) {
        return state;
      }
      return { ...state, categories: [...state.categories, action.category] };
    }
    case 'DELETE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.categoryId) };
    case 'SYNC_CATEGORIES': {
      const map = new Map<string, ProductCategory>();
      (action.categories || []).forEach(c => {
        if (c && c.name) {
          const id = c.id || `cat_${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          map.set(id, { id, name: c.name, createdAt: c.createdAt });
        }
      });
      return { ...state, categories: Array.from(map.values()) };
    }

    default:
      return state;
  }
}

// Tracks recent audit event signatures to guarantee exactly one audit log per business action
const recentAuditSignatures = new Map<string, number>();

function shouldLogAudit(actionName: string, targetKey: string): boolean {
  const sig = `${actionName}_${targetKey}`;
  const now = Date.now();
  const lastTime = recentAuditSignatures.get(sig) || 0;
  if (now - lastTime < 3000) {
    return false; // Suppress duplicate audit within 3 seconds
  }
  recentAuditSignatures.set(sig, now);
  if (recentAuditSignatures.size > 250) {
    const oldest = recentAuditSignatures.keys().next().value;
    if (oldest) recentAuditSignatures.delete(oldest);
  }
  return true;
}

// Wraps the core reducer and derives audit trail entries
function reducer(state: AppState, action: Action): AppState {
  const next = coreReducer(state, action);
  if (next === state) return state;
  
  // Skip audit generation on passive background sync actions
  if (action.type.startsWith('SYNC_') || action.type === 'SET_CURRENT_USER') {
    return next;
  }

  const entry = deriveAudit(action, state, next);
  if (!entry) return next;

  const targetKey = entry.targetId || entry.targetLabel || entry.summary;
  if (!shouldLogAudit(entry.action, targetKey)) {
    return next;
  }

  // Persist audit log entry to Firebase RTDB asynchronously
  logAuditEntry(entry).catch(err => console.error('Failed to log audit entry to RTDB:', err));

  return { ...next, auditLog: [entry, ...next.auditLog] };
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  navigate: (page: string) => void;
  showToast: (type: ToastMessage['type'], message: string) => void;
  getCustomer: (id: string) => Customer | undefined;
  getProduct: (id: string) => Product | undefined;
  getCurrentCustomer: () => Customer | undefined;
  getCustomerFinancing: (customerId: string) => Financing[];
  getCustomerOrders: (customerId: string) => Order[];
  formatPHP: (amount?: number | null) => string;
  logAudit: (data: {
    category: AuditCategory;
    action: string;
    summary: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    amount?: number;
  }) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Initialize and bind Realtime Database listeners
  useEffect(() => {
    // Seed initial data if Firebase RTDB is fresh/empty
    seedDatabaseIfEmpty();

    // Subscribe to Firebase Auth
    const unsubAuth = subscribeToAuth((authUser) => {
      if (authUser) {
        dispatch({ type: 'SET_CURRENT_USER', user: authUser });
      } else {
        dispatch({ type: 'SET_CURRENT_USER', user: null });
      }
    });

    // Subscribe to RTDB collections
    const unsubSettings = subscribeToNodeObject<SystemSettings>('settings', (s) => {
      if (s) dispatch({ type: 'SYNC_SETTINGS', settings: s });
    });
    const unsubSuppliers = subscribeToNodeList<Supplier>('suppliers', (list) => {
      dispatch({ type: 'SYNC_SUPPLIERS', suppliers: list || [] });
    });
    const unsubProducts = subscribeToNodeList<Product>('products', (list) => {
      dispatch({ type: 'SYNC_PRODUCTS', products: list || [] });
    });
    const unsubEmployees = subscribeToNodeList<Employee>('employees', (list) => {
      dispatch({ type: 'SYNC_EMPLOYEES', employees: list || [] });
    });
    const unsubCustomers = subscribeToNodeList<Customer>('customers', (list) => {
      dispatch({ type: 'SYNC_CUSTOMERS', customers: list || [] });
    });
    const unsubOrders = subscribeToNodeList<Order>('orders', (list) => {
      dispatch({ type: 'SYNC_ORDERS', orders: list || [] });
    });
    const unsubFinancing = subscribeToNodeList<Financing>('financing', (list) => {
      dispatch({ type: 'SYNC_FINANCING', financing: list || [] });
    });
    const unsubPayments = subscribeToNodeList<Payment>('payments', (list) => {
      dispatch({ type: 'SYNC_PAYMENTS', payments: list || [] });
    });
    const unsubRestock = subscribeToNodeList<RestockOrder>('restockOrders', (list) => {
      dispatch({ type: 'SYNC_RESTOCK', restockOrders: list || [] });
    });
    const unsubCategories = subscribeToNodeList<ProductCategory>('categories', (list) => {
      dispatch({ type: 'SYNC_CATEGORIES', categories: list || [] });
    });
    const unsubAudit = subscribeToNodeList<AuditEntry>('auditLog', (list) => {
      dispatch({ type: 'SYNC_AUDIT', auditLog: (list || []).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) });
    });

    return () => {
      unsubAuth();
      unsubSettings();
      unsubSuppliers();
      unsubCategories();
      unsubProducts();
      unsubEmployees();
      unsubCustomers();
      unsubOrders();
      unsubFinancing();
      unsubPayments();
      unsubRestock();
      unsubAudit();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await loginWithEmail(email, password);
      dispatch({ type: 'LOGIN', user });
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
    dispatch({ type: 'LOGOUT' });
  }, []);

  const navigate = useCallback((page: string) => dispatch({ type: 'NAVIGATE', page }), []);

  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const toast = { id: Date.now().toString(), type, message };
    dispatch({ type: 'SET_TOAST', toast });
    setTimeout(() => dispatch({ type: 'SET_TOAST', toast: null }), 3500);
  }, []);

  const getCustomer = useCallback((id: string) => state.customers.find(c => c.id === id), [state.customers]);
  const getProduct = useCallback((id: string) => state.products.find(p => p.id === id), [state.products]);
  const getCurrentCustomer = useCallback(() => {
    if (!state.currentUser?.customerId) return undefined;
    return state.customers.find(c => c.id === state.currentUser!.customerId);
  }, [state.currentUser, state.customers]);
  const getCustomerFinancing = useCallback((customerId: string) => state.financing.filter(f => f.customerId === customerId), [state.financing]);
  const getCustomerOrders = useCallback((customerId: string) => state.orders.filter(o => o.customerId === customerId), [state.orders]);
  const formatPHP = useCallback((amount?: number | null) => {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : Number(amount) || 0;
    return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }, []);

  const logAudit = useCallback(async (data: {
    category: AuditCategory;
    action: string;
    summary: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    amount?: number;
  }) => {
    const targetKey = data.targetId || data.targetLabel || data.summary;
    if (!shouldLogAudit(data.action, targetKey)) {
      return; // Duplicate manual audit suppressed!
    }

    const actor = state.currentUser
      ? {
          actorId: state.currentUser.id,
          actorName: state.currentUser.name,
          actorRole: state.currentUser.role as AuditActorRole,
        }
      : {
          actorId: 'admin',
          actorName: 'Admin',
          actorRole: 'admin' as AuditActorRole,
        };

    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorId: actor.actorId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      category: data.category,
      action: data.action,
      summary: data.summary,
      targetType: data.targetType,
      targetId: data.targetId,
      targetLabel: data.targetLabel,
      amount: data.amount,
    };

    try {
      await logAuditEntry(entry);
    } catch (err) {
      console.warn('Failed to save audit entry to RTDB:', err);
    }
    dispatch({ type: 'SYNC_AUDIT', auditLog: [entry, ...state.auditLog] });
  }, [state.currentUser, state.auditLog]);

  return (
    <AppContext.Provider value={{ state, dispatch, login, logout, navigate, showToast, getCustomer, getProduct, getCurrentCustomer, getCustomerFinancing, getCustomerOrders, formatPHP, logAudit }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
