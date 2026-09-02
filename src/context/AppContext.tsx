import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  AppState, AuthUser, Customer, Employee, Supplier, Product,
  Order, Financing, Payment, RestockOrder, CartItem, ToastMessage,
  InstallmentSchedule, OrderStatus
} from '../types';
import {
  USERS, CUSTOMERS, EMPLOYEES, SUPPLIERS, PRODUCTS,
  ORDERS, FINANCING, PAYMENTS, RESTOCK_ORDERS, AUDIT_LOG, DEFAULT_SETTINGS
} from '../data/seed';
import { deriveAudit } from '../data/audit';

type Action =
  | { type: 'LOGIN'; user: AuthUser }
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
  | { type: 'UPDATE_EMPLOYEE'; employee: Employee }
  | { type: 'ADD_EMPLOYEE'; employee: Employee }
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'UPDATE_SUPPLIER'; supplier: Supplier }
  | { type: 'ADD_SUPPLIER'; supplier: Supplier }
  | { type: 'ADD_RESTOCK'; restock: RestockOrder }
  | { type: 'UPDATE_RESTOCK_STATUS'; restockId: string; status: RestockOrder['status'] }
  | { type: 'UPDATE_SETTINGS'; settings: AppState['settings'] }
  | { type: 'SET_TOAST'; toast: ToastMessage | null };

const initialState: AppState = {
  currentUser: null,
  currentPage: 'home',
  cart: [],
  checkoutData: null,
  customers: CUSTOMERS,
  employees: EMPLOYEES,
  suppliers: SUPPLIERS,
  products: PRODUCTS,
  orders: ORDERS,
  financing: FINANCING,
  payments: PAYMENTS,
  restockOrders: RESTOCK_ORDERS,
  settings: DEFAULT_SETTINGS,
  auditLog: AUDIT_LOG,
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
      const newOrders = [action.order, ...state.orders];
      const newPayments = action.payment ? [action.payment, ...state.payments] : state.payments;
      const newFinancing = action.financing ? [action.financing, ...state.financing] : state.financing;
      // Reduce stock
      const updatedProducts = state.products.map(p => {
        const item = action.order.items.find(i => i.productId === p.id);
        if (item) return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        return p;
      });
      // Update customer usedCredit for financing
      let updatedCustomers = state.customers;
      if (action.financing) {
        updatedCustomers = state.customers.map(c =>
          c.id === action.financing!.customerId
            ? { ...c, usedCredit: c.usedCredit + action.financing!.principal }
            : c
        );
      }
      return { ...state, orders: newOrders, payments: newPayments, financing: newFinancing, products: updatedProducts, customers: updatedCustomers, cart: [], checkoutData: null };
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
      if (!fin) return state;
      // Set schedule dates from today
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
      // Update order status
      const updatedOrders = state.orders.map(o =>
        o.financingId === action.financingId ? { ...o, status: 'processing' as OrderStatus, updatedAt: new Date().toISOString() } : o
      );
      // Update customer usedCredit
      const updatedCustomers = state.customers.map(c =>
        c.id === fin.customerId ? { ...c, usedCredit: c.usedCredit + fin.principal } : c
      );
      return { ...state, financing: updatedFinancing, orders: updatedOrders, customers: updatedCustomers };
    }
    case 'REJECT_FINANCING': {
      const fin = state.financing.find(f => f.id === action.financingId);
      if (!fin) return state;
      const updatedFinancing = state.financing.map(f =>
        f.id === action.financingId ? { ...f, status: 'rejected' as const, rejectedBy: action.rejectedBy } : f
      );
      const updatedOrders = state.orders.map(o =>
        o.financingId === action.financingId ? { ...o, status: 'cancelled' as OrderStatus, updatedAt: new Date().toISOString() } : o
      );
      return { ...state, financing: updatedFinancing, orders: updatedOrders };
    }
    case 'PAY_INSTALLMENT': {
      const fin = state.financing.find(f => f.id === action.financingId);
      if (!fin) return state;
      const installment = fin.schedule.find(s => s.weekNo === action.weekNo);
      if (!installment) return state;
      const amount = installment.baseAmount + installment.penalty;
      const principalPerInstallment = fin.principal / fin.installmentCount;
      const newPaidPrincipal = fin.paidPrincipal + principalPerInstallment;
      const allPaid = fin.schedule.every(s => s.weekNo === action.weekNo || s.status === 'paid');

      const updatedSchedule = fin.schedule.map((s, i) => {
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

      // Restore credit
      const updatedCustomers = state.customers.map(c =>
        c.id === fin.customerId
          ? { ...c, usedCredit: Math.max(0, c.usedCredit - principalPerInstallment) }
          : c
      );

      // Add payment record
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

      return { ...state, financing: updatedFinancing, customers: updatedCustomers, payments: [newPayment, ...state.payments] };
    }
    case 'PAY_FULL_BALANCE': {
      const fin = state.financing.find(f => f.id === action.financingId);
      if (!fin) return state;
      const remaining = fin.totalRepayable - (fin.paidPrincipal / fin.principal * fin.totalRepayable);
      const updatedSchedule = fin.schedule.map(s =>
        s.status !== 'paid' ? { ...s, status: 'paid' as const, paidAt: new Date().toISOString(), paidMethod: action.method } : s
      );
      const updatedFinancing = state.financing.map(f =>
        f.id === action.financingId
          ? { ...f, paidPrincipal: f.principal, schedule: updatedSchedule, status: 'completed' as const }
          : f
      );
      // Restore all remaining credit
      const remainingPrincipal = fin.principal - fin.paidPrincipal;
      const updatedCustomers = state.customers.map(c =>
        c.id === fin.customerId
          ? { ...c, usedCredit: Math.max(0, c.usedCredit - remainingPrincipal) }
          : c
      );
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
      return { ...state, financing: updatedFinancing, customers: updatedCustomers, payments: [newPayment, ...state.payments] };
    }
    case 'CONFIRM_CASH_PAYMENT': {
      const updatedPayments = state.payments.map(p =>
        p.id === action.paymentId ? { ...p, status: 'paid' as const, confirmedBy: action.confirmedBy, paidAt: new Date().toISOString() } : p
      );
      const payment = state.payments.find(p => p.id === action.paymentId);
      let updatedOrders = state.orders;
      if (payment?.orderId) {
        updatedOrders = state.orders.map(o =>
          o.id === payment.orderId
            ? { ...o, paymentStatus: 'paid' as const, status: 'processing' as OrderStatus, confirmedBy: action.confirmedBy, updatedAt: new Date().toISOString() }
            : o
        );
      }
      return { ...state, payments: updatedPayments, orders: updatedOrders };
    }
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.customer.id ? action.customer : c) };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [action.customer, ...state.customers] };
    case 'UPDATE_EMPLOYEE':
      return { ...state, employees: state.employees.map(e => e.id === action.employee.id ? action.employee : e) };
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [action.employee, ...state.employees] };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.product.id ? action.product : p) };
    case 'ADD_PRODUCT':
      return { ...state, products: [action.product, ...state.products] };
    case 'UPDATE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.map(s => s.id === action.supplier.id ? action.supplier : s) };
    case 'ADD_SUPPLIER':
      return { ...state, suppliers: [action.supplier, ...state.suppliers] };
    case 'ADD_RESTOCK':
      return { ...state, restockOrders: [action.restock, ...state.restockOrders] };
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
    default:
      return state;
  }
}

// Wraps the core reducer so every meaningful state transition is captured in
// the audit trail automatically — no page needs to log anything by hand.
function reducer(state: AppState, action: Action): AppState {
  const next = coreReducer(state, action);
  if (next === state) return state;
  const entry = deriveAudit(action, state, next);
  if (!entry) return next;
  return { ...next, auditLog: [entry, ...next.auditLog] };
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  navigate: (page: string) => void;
  showToast: (type: ToastMessage['type'], message: string) => void;
  getCustomer: (id: string) => Customer | undefined;
  getProduct: (id: string) => Product | undefined;
  getCurrentCustomer: () => Customer | undefined;
  getCustomerFinancing: (customerId: string) => typeof FINANCING;
  getCustomerOrders: (customerId: string) => typeof ORDERS;
  formatPHP: (amount: number) => string;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const login = useCallback((email: string, password: string): boolean => {
    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (user) {
      const { password: _, ...authUser } = user;
      dispatch({ type: 'LOGIN', user: authUser });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => dispatch({ type: 'LOGOUT' }), []);

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
  const formatPHP = useCallback((amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, []);

  return (
    <AppContext.Provider value={{ state, dispatch, login, logout, navigate, showToast, getCustomer, getProduct, getCurrentCustomer, getCustomerFinancing, getCustomerOrders, formatPHP }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
