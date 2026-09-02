export type UserRole = 'customer' | 'employee' | 'supervisor' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  customerId?: string;
  employeeId?: string;
}

export interface Customer {
  id: string;
  accountNo: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  storeName: string;
  storeAddress: string;
  yearsOperating: number;
  notes: string;
  loginEmail: string;
  password?: string;
  status: 'active' | 'suspended';
  creditLimit: number;
  usedCredit: number;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'employee' | 'supervisor' | 'admin';
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  categories: string[];
  status: 'active' | 'inactive';
}

export interface ProductCategory {
  id: string;
  name: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplierId: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  status: 'active' | 'inactive';
  imageUrl?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type OrderStatus =
  | 'pending_payment'
  | 'pending_financing'
  | 'approved'
  | 'processing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentType: 'cash' | 'gcash' | 'financing' | 'split';
  paymentStatus: 'pending' | 'paid';
  financingId?: string;
  splitCashAmount?: number;
  splitFinancingAmount?: number;
  splitMethod?: 'cash' | 'gcash';
  confirmedBy?: string;
  channel?: 'online' | 'pos';   // where the order originated
  placedBy?: string;            // staff cashier name for in-store POS orders
  createdAt: string;
  updatedAt: string;
}

export type FinancingStatus = 'pending' | 'approved' | 'active' | 'completed' | 'rejected' | 'overdue';

export interface InstallmentSchedule {
  weekNo: number;
  dueDate: string;
  baseAmount: number;
  penalty: number;
  status: 'upcoming' | 'due' | 'paid' | 'overdue';
  paidAt?: string;
  paidMethod?: 'cash' | 'gcash';
}

export interface Financing {
  id: string;
  financingNo: string;
  customerId: string;
  orderId?: string;
  principal: number;
  chargePercent: number;
  chargeAmount: number;
  totalRepayable: number;
  plan: 1 | 2;
  installmentCount: number;
  weeklyInstallment: number;
  paidPrincipal: number;
  status: FinancingStatus;
  approvedBy?: string;
  rejectedBy?: string;
  schedule: InstallmentSchedule[];
  createdAt: string;
  approvedAt?: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  customerId: string;
  orderId?: string;
  financingId?: string;
  type: 'purchase' | 'installment' | 'full_settlement';
  method: 'cash' | 'gcash';
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  mockTransactionId?: string;
  referenceId?: string;
  confirmedBy?: string;
  createdAt: string;
  paidAt?: string;
}

export interface RestockItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
}

export type RestockStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface RestockOrder {
  id: string;
  restockNo: string;
  supplierId: string;
  supplierName: string;
  items: RestockItem[];
  totalCost: number;
  status: RestockStatus;
  createdAt: string;
  receivedAt?: string;
}

export interface SystemSettings {
  financingCharge: number;
  startingCreditLimit: number;
  limitIncreaseAmount: number;
  maxAutomaticLimit: number;
  weeklyPenalty: number;
  plan1Installments: number;
  plan2Installments: number;
}

export type AuditCategory =
  | 'auth'
  | 'order'
  | 'financing'
  | 'payment'
  | 'inventory'
  | 'restock'
  | 'customer'
  | 'employee'
  | 'supplier'
  | 'settings';

// 'system' covers automated events (GCash auto-confirm, overdue flags, etc.)
export type AuditActorRole = UserRole | 'system';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorName: string;
  actorRole: AuditActorRole;
  category: AuditCategory;
  action: string;          // machine key, e.g. 'financing.approve'
  summary: string;         // human-readable sentence
  targetType?: string;     // 'order' | 'customer' | 'product' | ...
  targetId?: string;       // id of the affected entity
  targetLabel?: string;    // display label, e.g. 'ORD-0001'
  amount?: number;         // peso amount when relevant
}

/** @deprecated superseded by AuditEntry — retained for reference */
export interface ActivityLog {
  id: string;
  message: string;
  userName: string;
  createdAt: string;
}

export interface AppState {
  currentUser: AuthUser | null;
  currentPage: string;
  cart: CartItem[];
  checkoutData: CheckoutData | null;
  customers: Customer[];
  employees: Employee[];
  suppliers: Supplier[];
  products: Product[];
  categories: ProductCategory[];
  orders: Order[];
  financing: Financing[];
  payments: Payment[];
  restockOrders: RestockOrder[];
  settings: SystemSettings;
  auditLog: AuditEntry[];
  toast: ToastMessage | null;
}

export interface CheckoutData {
  mode: 'cash' | 'gcash' | 'financing' | 'split';
  plan?: 1 | 2;
  splitMethod?: 'cash' | 'gcash';
  total: number;
  financingAmount?: number;
  splitRemainder?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
