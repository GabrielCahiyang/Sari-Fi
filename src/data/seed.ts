import type { Customer, Employee, Supplier, Product, Order, Financing, Payment, RestockOrder, SystemSettings, AuditEntry, AuthUser } from '../types';

export const USERS: (AuthUser & { password: string })[] = [
  { id: 'u1', name: 'Admin Rosa', email: 'admin@sarifi.ph', password: 'admin123', role: 'admin', employeeId: 'e1' },
  { id: 'u2', name: 'Supervisor Ben', email: 'ben@sarifi.ph', password: 'super123', role: 'supervisor', employeeId: 'e2' },
  { id: 'u3', name: 'Supervisor Clara', email: 'clara@sarifi.ph', password: 'super123', role: 'supervisor', employeeId: 'e3' },
  { id: 'u4', name: 'Employee Jay', email: 'jay@sarifi.ph', password: 'emp123', role: 'employee', employeeId: 'e4' },
  { id: 'u5', name: 'Employee Mia', email: 'mia@sarifi.ph', password: 'emp123', role: 'employee', employeeId: 'e5' },
  { id: 'u6', name: 'Employee Rex', email: 'rex@sarifi.ph', password: 'emp123', role: 'employee', employeeId: 'e6' },
  // Suppliers
  { id: 's1', name: 'ABC Distributor (Rico)', email: 'abc@supplier.ph', password: 'supplier123', role: 'supplier', supplierId: 'sup1' },
  { id: 's2', name: 'Metro Food Supply (Grace)', email: 'metro@supplier.ph', password: 'supplier123', role: 'supplier', supplierId: 'sup2' },
  { id: 's3', name: 'QuickStore Wholesale (Jerry)', email: 'quickstore@supplier.ph', password: 'supplier123', role: 'supplier', supplierId: 'sup3' },
  { id: 's4', name: 'FreshLine Traders (Elena)', email: 'freshline@supplier.ph', password: 'supplier123', role: 'supplier', supplierId: 'sup4' },
  { id: 's5', name: 'Nationwide Goods (Carlo)', email: 'nationwide@supplier.ph', password: 'supplier123', role: 'supplier', supplierId: 'sup5' },
  // Customers (Store Owners)
  { id: 'c1', name: 'Maria Santos', email: 'maria@store.ph', password: 'maria123', role: 'customer', customerId: 'cust1' },
  { id: 'c2', name: 'Jose Reyes', email: 'jose@store.ph', password: 'jose123', role: 'customer', customerId: 'cust2' },
  { id: 'c3', name: 'Ana Cruz', email: 'ana@store.ph', password: 'ana123', role: 'customer', customerId: 'cust3' },
  { id: 'c4', name: 'Pedro Lim', email: 'pedro@store.ph', password: 'pedro123', role: 'customer', customerId: 'cust4' },
  { id: 'c5', name: 'Luisa Garcia', email: 'luisa@store.ph', password: 'luisa123', role: 'customer', customerId: 'cust5' },
  { id: 'c6', name: 'Roberto Tan', email: 'roberto@store.ph', password: 'rob123', role: 'customer', customerId: 'cust6' },
  { id: 'c7', name: 'Carmen Flores', email: 'carmen@store.ph', password: 'carmen123', role: 'customer', customerId: 'cust7' },
  { id: 'c8', name: 'Eduardo Morales', email: 'ed@store.ph', password: 'ed123', role: 'customer', customerId: 'cust8' },
];

export const CUSTOMERS: Customer[] = [
  {
    id: 'cust1', accountNo: 'SF-0001', fullName: 'Maria Santos',
    phone: '09171234567', email: 'maria@store.ph', address: 'Blk 3 Lot 5, Brgy. Sto. Niño, Caloocan City',
    storeName: "Maria's Sari-Sari Store", storeAddress: 'Blk 3 Lot 5, Brgy. Sto. Niño, Caloocan City',
    yearsOperating: 4, notes: 'Main demo account. Reliable payer.',
    loginEmail: 'maria@store.ph', status: 'active', creditLimit: 5000, usedCredit: 4000, createdAt: '2024-01-15',
  },
  {
    id: 'cust2', accountNo: 'SF-0002', fullName: 'Jose Reyes',
    phone: '09221234567', email: 'jose@store.ph', address: 'Purok 2, Brgy. Bagong Silang, Marikina City',
    storeName: "Reyes General Merchandise", storeAddress: 'Purok 2, Brgy. Bagong Silang, Marikina City',
    yearsOperating: 6, notes: 'Long-term customer.',
    loginEmail: 'jose@store.ph', status: 'active', creditLimit: 8000, usedCredit: 2000, createdAt: '2023-08-10',
  },
  {
    id: 'cust3', accountNo: 'SF-0003', fullName: 'Ana Cruz',
    phone: '09331234567', email: 'ana@store.ph', address: '123 Maharlika St., Brgy. Bagumbayan, Quezon City',
    storeName: "Ana's Corner Store", storeAddress: '123 Maharlika St., Brgy. Bagumbayan, QC',
    yearsOperating: 2, notes: 'New account, building credit history.',
    loginEmail: 'ana@store.ph', status: 'active', creditLimit: 5000, usedCredit: 5000, createdAt: '2024-06-01',
  },
  {
    id: 'cust4', accountNo: 'SF-0004', fullName: 'Pedro Lim',
    phone: '09441234567', email: 'pedro@store.ph', address: '45 Rizal Ave., Brgy. Tondo, Manila',
    storeName: "Lim's Store", storeAddress: '45 Rizal Ave., Brgy. Tondo, Manila',
    yearsOperating: 8, notes: 'Senior account, maximum limit approved.',
    loginEmail: 'pedro@store.ph', status: 'active', creditLimit: 12000, usedCredit: 3000, createdAt: '2023-01-05',
  },
  {
    id: 'cust5', accountNo: 'SF-0005', fullName: 'Luisa Garcia',
    phone: '09551234567', email: 'luisa@store.ph', address: 'Blk 7 Lot 2, Brgy. San Isidro, Parañaque City',
    storeName: "Garcia Mini Mart", storeAddress: 'Blk 7 Lot 2, Brgy. San Isidro, Parañaque',
    yearsOperating: 3, notes: '',
    loginEmail: 'luisa@store.ph', status: 'active', creditLimit: 6000, usedCredit: 0, createdAt: '2024-02-20',
  },
  {
    id: 'cust6', accountNo: 'SF-0006', fullName: 'Roberto Tan',
    phone: '09661234567', email: 'roberto@store.ph', address: '89 Katipunan Rd., Brgy. Loyola Heights, QC',
    storeName: "Tan's Neighborhood Store", storeAddress: '89 Katipunan Rd., QC',
    yearsOperating: 5, notes: 'Has one overdue installment.',
    loginEmail: 'roberto@store.ph', status: 'active', creditLimit: 7000, usedCredit: 5000, createdAt: '2023-05-12',
  },
  {
    id: 'cust7', accountNo: 'SF-0007', fullName: 'Carmen Flores',
    phone: '09771234567', email: 'carmen@store.ph', address: 'Purok 5, Brgy. San Antonio, Pasig City',
    storeName: "Carmen's Tindahan", storeAddress: 'Purok 5, Brgy. San Antonio, Pasig',
    yearsOperating: 1, notes: 'Recently completed first financing cycle.',
    loginEmail: 'carmen@store.ph', status: 'active', creditLimit: 6000, usedCredit: 0, createdAt: '2024-05-10',
  },
  {
    id: 'cust8', accountNo: 'SF-0008', fullName: 'Eduardo Morales',
    phone: '09881234567', email: 'ed@store.ph', address: '12 Mabini St., Brgy. Bagong Pag-Asa, QC',
    storeName: "Ed's Variety Store", storeAddress: '12 Mabini St., QC',
    yearsOperating: 10, notes: 'Suspended due to overdue account.',
    loginEmail: 'ed@store.ph', status: 'suspended', creditLimit: 15000, usedCredit: 8000, createdAt: '2022-11-01',
  },
];

export const EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Admin Rosa', email: 'admin@sarifi.ph', role: 'admin', phone: '09121111111', status: 'active', createdAt: '2022-01-01' },
  { id: 'e2', name: 'Supervisor Ben', email: 'ben@sarifi.ph', role: 'supervisor', phone: '09122222222', status: 'active', createdAt: '2022-03-15' },
  { id: 'e3', name: 'Supervisor Clara', email: 'clara@sarifi.ph', role: 'supervisor', phone: '09123333333', status: 'active', createdAt: '2022-06-10' },
  { id: 'e4', name: 'Employee Jay', email: 'jay@sarifi.ph', role: 'employee', phone: '09124444444', status: 'active', createdAt: '2023-01-08' },
  { id: 'e5', name: 'Employee Mia', email: 'mia@sarifi.ph', role: 'employee', phone: '09125555555', status: 'active', createdAt: '2023-04-20' },
  { id: 'e6', name: 'Employee Rex', email: 'rex@sarifi.ph', role: 'employee', phone: '09126666666', status: 'active', createdAt: '2023-09-05' },
];

export const SUPPLIERS: Supplier[] = [
  { id: 'sup1', name: 'ABC Distributor', contact: 'Rico Santos', phone: '028881234', email: 'rico@abcdist.ph', address: 'Divisoria, Manila', categories: ['Beverages', 'Snacks', 'Canned Goods'], status: 'active', loginEmail: 'abc@supplier.ph', password: 'supplier123' },
  { id: 'sup2', name: 'Metro Food Supply', contact: 'Grace Dela Cruz', phone: '028882345', email: 'grace@metrofood.ph', address: 'Binondo, Manila', categories: ['Instant Noodles', 'Condiments', 'Canned Goods'], status: 'active', loginEmail: 'metro@supplier.ph', password: 'supplier123' },
  { id: 'sup3', name: 'QuickStore Wholesale', contact: 'Jerry Ong', phone: '028883456', email: 'jerry@quickstore.ph', address: 'Quiapo, Manila', categories: ['Household', 'Personal Care'], status: 'active', loginEmail: 'quickstore@supplier.ph', password: 'supplier123' },
  { id: 'sup4', name: 'FreshLine Traders', contact: 'Elena Reyes', phone: '028884567', email: 'elena@freshline.ph', address: 'Pasay City', categories: ['Beverages', 'Snacks'], status: 'active', loginEmail: 'freshline@supplier.ph', password: 'supplier123' },
  { id: 'sup5', name: 'Nationwide Goods Inc.', contact: 'Carlo Bautista', phone: '028885678', email: 'carlo@nationwide.ph', address: 'Makati City', categories: ['All Categories'], status: 'active', loginEmail: 'nationwide@supplier.ph', password: 'supplier123' },
];

export const PRODUCTS: Product[] = [
  // Beverages
  { id: 'p1', name: 'Coca-Cola 1.5L', sku: 'BEV-001', category: 'Beverages', supplierId: 'sup1', sellingPrice: 65, costPrice: 48, stock: 48, reorderLevel: 24, status: 'active' },
  { id: 'p2', name: 'Sprite 1.5L', sku: 'BEV-002', category: 'Beverages', supplierId: 'sup1', sellingPrice: 62, costPrice: 46, stock: 36, reorderLevel: 24, status: 'active' },
  { id: 'p3', name: 'Royal Tru-Orange 1.5L', sku: 'BEV-003', category: 'Beverages', supplierId: 'sup1', sellingPrice: 60, costPrice: 44, stock: 30, reorderLevel: 20, status: 'active' },
  { id: 'p4', name: 'Nestea Iced Tea 1L', sku: 'BEV-004', category: 'Beverages', supplierId: 'sup4', sellingPrice: 35, costPrice: 25, stock: 60, reorderLevel: 30, status: 'active' },
  { id: 'p5', name: 'C2 Green Tea 500ml', sku: 'BEV-005', category: 'Beverages', supplierId: 'sup4', sellingPrice: 22, costPrice: 15, stock: 72, reorderLevel: 36, status: 'active' },
  { id: 'p6', name: 'Milo 3-in-1 Box (10s)', sku: 'BEV-006', category: 'Beverages', supplierId: 'sup1', sellingPrice: 95, costPrice: 72, stock: 24, reorderLevel: 12, status: 'active' },
  { id: 'p7', name: 'Nescafé 3-in-1 Box (10s)', sku: 'BEV-007', category: 'Beverages', supplierId: 'sup1', sellingPrice: 85, costPrice: 64, stock: 36, reorderLevel: 18, status: 'active' },
  { id: 'p8', name: 'Red Horse Beer 500ml', sku: 'BEV-008', category: 'Beverages', supplierId: 'sup4', sellingPrice: 68, costPrice: 52, stock: 5, reorderLevel: 24, status: 'active' },
  // Snacks
  { id: 'p9', name: 'Nova Country Cheddar 100g', sku: 'SNK-001', category: 'Snacks', supplierId: 'sup4', sellingPrice: 22, costPrice: 16, stock: 48, reorderLevel: 24, status: 'active' },
  { id: 'p10', name: 'Chippy Barbecue 110g', sku: 'SNK-002', category: 'Snacks', supplierId: 'sup4', sellingPrice: 20, costPrice: 14, stock: 60, reorderLevel: 30, status: 'active' },
  { id: 'p11', name: 'Boy Bawang Cornick 90g', sku: 'SNK-003', category: 'Snacks', supplierId: 'sup4', sellingPrice: 18, costPrice: 12, stock: 72, reorderLevel: 36, status: 'active' },
  { id: 'p12', name: 'Presto Cream-O 330g', sku: 'SNK-004', category: 'Snacks', supplierId: 'sup5', sellingPrice: 45, costPrice: 33, stock: 36, reorderLevel: 18, status: 'active' },
  { id: 'p13', name: 'Rebisco Crackers 10s', sku: 'SNK-005', category: 'Snacks', supplierId: 'sup5', sellingPrice: 38, costPrice: 28, stock: 3, reorderLevel: 20, status: 'active' },
  // Instant Noodles
  { id: 'p14', name: 'Lucky Me Pancit Canton Original', sku: 'NLD-001', category: 'Instant Noodles', supplierId: 'sup2', sellingPrice: 14, costPrice: 9, stock: 120, reorderLevel: 60, status: 'active' },
  { id: 'p15', name: 'Lucky Me Chicken Noodle Soup', sku: 'NLD-002', category: 'Instant Noodles', supplierId: 'sup2', sellingPrice: 14, costPrice: 9, stock: 96, reorderLevel: 48, status: 'active' },
  { id: 'p16', name: 'Payless Pancit Canton 65g', sku: 'NLD-003', category: 'Instant Noodles', supplierId: 'sup2', sellingPrice: 10, costPrice: 7, stock: 144, reorderLevel: 72, status: 'active' },
  { id: 'p17', name: 'Quickchow Chicken 55g', sku: 'NLD-004', category: 'Instant Noodles', supplierId: 'sup2', sellingPrice: 9, costPrice: 6, stock: 8, reorderLevel: 48, status: 'active' },
  // Canned Goods
  { id: 'p18', name: 'Ligo Sardines in Tomato Sauce 155g', sku: 'CAN-001', category: 'Canned Goods', supplierId: 'sup2', sellingPrice: 28, costPrice: 20, stock: 48, reorderLevel: 24, status: 'active' },
  { id: 'p19', name: 'CDO Corned Beef 150g', sku: 'CAN-002', category: 'Canned Goods', supplierId: 'sup2', sellingPrice: 45, costPrice: 33, stock: 36, reorderLevel: 18, status: 'active' },
  { id: 'p20', name: '555 Tuna Flakes 155g', sku: 'CAN-003', category: 'Canned Goods', supplierId: 'sup2', sellingPrice: 32, costPrice: 23, stock: 60, reorderLevel: 24, status: 'active' },
  { id: 'p21', name: 'Mega Sardines Hot & Spicy 155g', sku: 'CAN-004', category: 'Canned Goods', supplierId: 'sup2', sellingPrice: 26, costPrice: 18, stock: 42, reorderLevel: 20, status: 'active' },
  { id: 'p22', name: "Lily's Peanut Butter 320g", sku: 'CAN-005', category: 'Canned Goods', supplierId: 'sup5', sellingPrice: 68, costPrice: 50, stock: 24, reorderLevel: 12, status: 'active' },
  // Condiments
  { id: 'p23', name: 'UFC Banana Catsup 320g', sku: 'CON-001', category: 'Condiments', supplierId: 'sup2', sellingPrice: 42, costPrice: 30, stock: 30, reorderLevel: 15, status: 'active' },
  { id: 'p24', name: 'Datu Puti Vinegar 375ml', sku: 'CON-002', category: 'Condiments', supplierId: 'sup2', sellingPrice: 22, costPrice: 15, stock: 36, reorderLevel: 18, status: 'active' },
  { id: 'p25', name: 'Silver Swan Soy Sauce 385ml', sku: 'CON-003', category: 'Condiments', supplierId: 'sup2', sellingPrice: 25, costPrice: 17, stock: 0, reorderLevel: 18, status: 'active' },
  { id: 'p26', name: "Mama Sita's Oyster Sauce 200ml", sku: 'CON-004', category: 'Condiments', supplierId: 'sup5', sellingPrice: 38, costPrice: 27, stock: 20, reorderLevel: 10, status: 'active' },
  // Household
  { id: 'p27', name: 'Ariel Powder Detergent 1kg', sku: 'HSD-001', category: 'Household', supplierId: 'sup3', sellingPrice: 78, costPrice: 58, stock: 24, reorderLevel: 12, status: 'active' },
  { id: 'p28', name: 'Joy Dishwashing Liquid 250ml', sku: 'HSD-002', category: 'Household', supplierId: 'sup3', sellingPrice: 35, costPrice: 25, stock: 36, reorderLevel: 18, status: 'active' },
  { id: 'p29', name: 'Surf Powder Sachet 25g (6s)', sku: 'HSD-003', category: 'Household', supplierId: 'sup3', sellingPrice: 30, costPrice: 21, stock: 60, reorderLevel: 30, status: 'active' },
  { id: 'p30', name: 'Domex Toilet Bowl Cleaner 500ml', sku: 'HSD-004', category: 'Household', supplierId: 'sup3', sellingPrice: 48, costPrice: 35, stock: 18, reorderLevel: 10, status: 'active' },
  // Personal Care
  { id: 'p31', name: 'Safeguard Soap 135g', sku: 'PC-001', category: 'Personal Care', supplierId: 'sup3', sellingPrice: 38, costPrice: 27, stock: 48, reorderLevel: 24, status: 'active' },
  { id: 'p32', name: 'Head & Shoulders Shampoo 180ml', sku: 'PC-002', category: 'Personal Care', supplierId: 'sup3', sellingPrice: 88, costPrice: 65, stock: 24, reorderLevel: 12, status: 'active' },
  { id: 'p33', name: 'Colgate Toothpaste 100ml', sku: 'PC-003', category: 'Personal Care', supplierId: 'sup3', sellingPrice: 48, costPrice: 35, stock: 36, reorderLevel: 18, status: 'active' },
  { id: 'p34', name: 'Palmolive Shampoo 180ml', sku: 'PC-004', category: 'Personal Care', supplierId: 'sup3', sellingPrice: 82, costPrice: 60, stock: 2, reorderLevel: 12, status: 'active' },
  // Others
  { id: 'p35', name: 'Lucky Me Instant Pancit Canton Chilimansi', sku: 'NLD-005', category: 'Instant Noodles', supplierId: 'sup2', sellingPrice: 14, costPrice: 9, stock: 84, reorderLevel: 42, status: 'active' },
];

export const ORDERS: Order[] = [
  {
    id: 'ord1', orderNo: 'ORD-0001', customerId: 'cust1',
    items: [
      { productId: 'p14', productName: 'Lucky Me Pancit Canton Original', quantity: 24, price: 14 },
      { productId: 'p1', productName: 'Coca-Cola 1.5L', quantity: 6, price: 65 },
    ],
    total: 726, status: 'completed', paymentType: 'cash', paymentStatus: 'paid',
    confirmedBy: 'Employee Jay', createdAt: '2025-08-10T09:00:00', updatedAt: '2025-08-10T10:30:00',
  },
  {
    id: 'ord2', orderNo: 'ORD-0002', customerId: 'cust2',
    items: [
      { productId: 'p18', productName: 'Ligo Sardines in Tomato Sauce 155g', quantity: 12, price: 28 },
      { productId: 'p19', productName: 'CDO Corned Beef 150g', quantity: 6, price: 45 },
      { productId: 'p27', productName: 'Ariel Powder Detergent 1kg', quantity: 2, price: 78 },
    ],
    total: 792, status: 'delivered', paymentType: 'gcash', paymentStatus: 'paid',
    createdAt: '2025-08-12T11:00:00', updatedAt: '2025-08-13T14:00:00',
  },
  {
    id: 'ord3', orderNo: 'ORD-0003', customerId: 'cust1',
    items: [
      { productId: 'p14', productName: 'Lucky Me Pancit Canton Original', quantity: 48, price: 14 },
      { productId: 'p15', productName: 'Lucky Me Chicken Noodle Soup', quantity: 24, price: 14 },
      { productId: 'p1', productName: 'Coca-Cola 1.5L', quantity: 12, price: 65 },
      { productId: 'p9', productName: 'Nova Country Cheddar 100g', quantity: 24, price: 22 },
    ],
    total: 3300, status: 'processing' as const, paymentType: 'split', paymentStatus: 'paid',
    financingId: 'fin1', splitCashAmount: 0, splitFinancingAmount: 3300,
    createdAt: '2025-08-20T10:00:00', updatedAt: '2025-08-20T11:00:00',
  },
  {
    id: 'ord4', orderNo: 'ORD-0004', customerId: 'cust3',
    items: [
      { productId: 'p14', productName: 'Lucky Me Pancit Canton Original', quantity: 48, price: 14 },
      { productId: 'p16', productName: 'Payless Pancit Canton 65g', quantity: 48, price: 10 },
      { productId: 'p31', productName: 'Safeguard Soap 135g', quantity: 12, price: 38 },
    ],
    total: 1608, status: 'pending_financing', paymentType: 'financing', paymentStatus: 'pending',
    financingId: 'fin3',
    createdAt: '2025-08-28T09:30:00', updatedAt: '2025-08-28T09:30:00',
  },
  {
    id: 'ord5', orderNo: 'ORD-0005', customerId: 'cust4',
    items: [
      { productId: 'p1', productName: 'Coca-Cola 1.5L', quantity: 24, price: 65 },
      { productId: 'p2', productName: 'Sprite 1.5L', quantity: 24, price: 62 },
    ],
    total: 3048, status: 'processing', paymentType: 'cash', paymentStatus: 'paid',
    confirmedBy: 'Employee Mia',
    createdAt: '2025-08-25T14:00:00', updatedAt: '2025-08-25T15:00:00',
  },
  {
    id: 'ord6', orderNo: 'ORD-0006', customerId: 'cust5',
    items: [
      { productId: 'p27', productName: 'Ariel Powder Detergent 1kg', quantity: 6, price: 78 },
      { productId: 'p28', productName: 'Joy Dishwashing Liquid 250ml', quantity: 6, price: 35 },
      { productId: 'p31', productName: 'Safeguard Soap 135g', quantity: 12, price: 38 },
    ],
    total: 924, status: 'pending_payment', paymentType: 'cash', paymentStatus: 'pending',
    createdAt: '2025-08-30T08:00:00', updatedAt: '2025-08-30T08:00:00',
  },
  {
    id: 'ord7', orderNo: 'ORD-0007', customerId: 'cust6',
    items: [
      { productId: 'p14', productName: 'Lucky Me Pancit Canton Original', quantity: 60, price: 14 },
      { productId: 'p4', productName: 'Nestea Iced Tea 1L', quantity: 24, price: 35 },
    ],
    total: 1680, status: 'completed', paymentType: 'financing', paymentStatus: 'paid',
    financingId: 'fin5',
    createdAt: '2025-07-15T10:00:00', updatedAt: '2025-07-15T11:00:00',
  },
];

// Generate weekly dates
const addWeeks = (dateStr: string, weeks: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
};

export const FINANCING: Financing[] = [
  // fin1: Maria's active financing, 2-month plan, partially paid (1 of 8 installments paid)
  {
    id: 'fin1', financingNo: 'FIN-0001', customerId: 'cust1', orderId: 'ord3',
    principal: 3300, chargePercent: 20, chargeAmount: 660, totalRepayable: 3960,
    plan: 2, installmentCount: 8, weeklyInstallment: 495, paidPrincipal: 412.5,
    status: 'active', approvedBy: 'Supervisor Ben',
    schedule: [
      { weekNo: 1, dueDate: '2025-08-27', baseAmount: 495, penalty: 0, status: 'paid', paidAt: '2025-08-27', paidMethod: 'gcash' },
      { weekNo: 2, dueDate: '2025-09-03', baseAmount: 495, penalty: 0, status: 'due' },
      { weekNo: 3, dueDate: '2025-09-10', baseAmount: 495, penalty: 0, status: 'upcoming' },
      { weekNo: 4, dueDate: '2025-09-17', baseAmount: 495, penalty: 0, status: 'upcoming' },
      { weekNo: 5, dueDate: '2025-09-24', baseAmount: 495, penalty: 0, status: 'upcoming' },
      { weekNo: 6, dueDate: '2025-10-01', baseAmount: 495, penalty: 0, status: 'upcoming' },
      { weekNo: 7, dueDate: '2025-10-08', baseAmount: 495, penalty: 0, status: 'upcoming' },
      { weekNo: 8, dueDate: '2025-10-15', baseAmount: 495, penalty: 0, status: 'upcoming' },
    ],
    createdAt: '2025-08-20T11:00:00', approvedAt: '2025-08-20T11:30:00',
  },
  // fin2: Jose's active financing
  {
    id: 'fin2', financingNo: 'FIN-0002', customerId: 'cust2', orderId: undefined,
    principal: 2000, chargePercent: 20, chargeAmount: 400, totalRepayable: 2400,
    plan: 1, installmentCount: 4, weeklyInstallment: 600, paidPrincipal: 1000,
    status: 'active', approvedBy: 'Supervisor Clara',
    schedule: [
      { weekNo: 1, dueDate: '2025-08-05', baseAmount: 600, penalty: 0, status: 'paid', paidAt: '2025-08-05', paidMethod: 'cash' },
      { weekNo: 2, dueDate: '2025-08-12', baseAmount: 600, penalty: 0, status: 'paid', paidAt: '2025-08-12', paidMethod: 'cash' },
      { weekNo: 3, dueDate: '2025-08-19', baseAmount: 600, penalty: 0, status: 'due' },
      { weekNo: 4, dueDate: '2025-08-26', baseAmount: 600, penalty: 0, status: 'upcoming' },
    ],
    createdAt: '2025-08-01T10:00:00', approvedAt: '2025-08-01T10:30:00',
  },
  // fin3: Ana's pending financing
  {
    id: 'fin3', financingNo: 'FIN-0003', customerId: 'cust3', orderId: 'ord4',
    principal: 1608, chargePercent: 20, chargeAmount: 321.6, totalRepayable: 1929.6,
    plan: 1, installmentCount: 4, weeklyInstallment: 482.4, paidPrincipal: 0,
    status: 'pending', approvedBy: undefined,
    schedule: [
      { weekNo: 1, dueDate: addWeeks('2025-09-01', 1), baseAmount: 482.4, penalty: 0, status: 'upcoming' },
      { weekNo: 2, dueDate: addWeeks('2025-09-01', 2), baseAmount: 482.4, penalty: 0, status: 'upcoming' },
      { weekNo: 3, dueDate: addWeeks('2025-09-01', 3), baseAmount: 482.4, penalty: 0, status: 'upcoming' },
      { weekNo: 4, dueDate: addWeeks('2025-09-01', 4), baseAmount: 482.4, penalty: 0, status: 'upcoming' },
    ],
    createdAt: '2025-08-28T09:30:00',
  },
  // fin4: Pedro's active financing
  {
    id: 'fin4', financingNo: 'FIN-0004', customerId: 'cust4',
    principal: 3000, chargePercent: 20, chargeAmount: 600, totalRepayable: 3600,
    plan: 1, installmentCount: 4, weeklyInstallment: 900, paidPrincipal: 750,
    status: 'active', approvedBy: 'Supervisor Ben',
    schedule: [
      { weekNo: 1, dueDate: '2025-08-10', baseAmount: 900, penalty: 0, status: 'paid', paidAt: '2025-08-10', paidMethod: 'gcash' },
      { weekNo: 2, dueDate: '2025-08-17', baseAmount: 900, penalty: 0, status: 'due' },
      { weekNo: 3, dueDate: '2025-08-24', baseAmount: 900, penalty: 0, status: 'upcoming' },
      { weekNo: 4, dueDate: '2025-08-31', baseAmount: 900, penalty: 0, status: 'upcoming' },
    ],
    createdAt: '2025-08-07T09:00:00', approvedAt: '2025-08-07T09:30:00',
  },
  // fin5: Roberto's completed financing
  {
    id: 'fin5', financingNo: 'FIN-0005', customerId: 'cust6', orderId: 'ord7',
    principal: 1680, chargePercent: 20, chargeAmount: 336, totalRepayable: 2016,
    plan: 1, installmentCount: 4, weeklyInstallment: 504, paidPrincipal: 1680,
    status: 'completed', approvedBy: 'Supervisor Ben',
    schedule: [
      { weekNo: 1, dueDate: '2025-07-22', baseAmount: 504, penalty: 0, status: 'paid', paidAt: '2025-07-22', paidMethod: 'cash' },
      { weekNo: 2, dueDate: '2025-07-29', baseAmount: 504, penalty: 0, status: 'paid', paidAt: '2025-07-29', paidMethod: 'cash' },
      { weekNo: 3, dueDate: '2025-08-05', baseAmount: 504, penalty: 0, status: 'paid', paidAt: '2025-08-05', paidMethod: 'cash' },
      { weekNo: 4, dueDate: '2025-08-12', baseAmount: 504, penalty: 0, status: 'paid', paidAt: '2025-08-12', paidMethod: 'cash' },
    ],
    createdAt: '2025-07-15T11:00:00', approvedAt: '2025-07-15T11:30:00',
  },
  // fin6: Carmen's completed financing (triggered limit increase)
  {
    id: 'fin6', financingNo: 'FIN-0006', customerId: 'cust7',
    principal: 4000, chargePercent: 20, chargeAmount: 800, totalRepayable: 4800,
    plan: 2, installmentCount: 8, weeklyInstallment: 600, paidPrincipal: 4000,
    status: 'completed', approvedBy: 'Supervisor Clara',
    schedule: Array.from({ length: 8 }, (_, i) => ({
      weekNo: i + 1, dueDate: addWeeks('2025-06-01', i + 1),
      baseAmount: 600, penalty: 0, status: 'paid' as const,
      paidAt: addWeeks('2025-06-01', i + 1), paidMethod: 'gcash' as const,
    })),
    createdAt: '2025-06-01T10:00:00', approvedAt: '2025-06-01T10:30:00',
  },
  // fin7: Roberto's overdue financing
  {
    id: 'fin7', financingNo: 'FIN-0007', customerId: 'cust6',
    principal: 5000, chargePercent: 20, chargeAmount: 1000, totalRepayable: 6000,
    plan: 2, installmentCount: 8, weeklyInstallment: 750, paidPrincipal: 0,
    status: 'overdue', approvedBy: 'Supervisor Ben',
    schedule: [
      { weekNo: 1, dueDate: '2025-08-05', baseAmount: 750, penalty: 75, status: 'overdue' },
      { weekNo: 2, dueDate: '2025-08-12', baseAmount: 750, penalty: 75, status: 'overdue' },
      ...Array.from({ length: 6 }, (_, i) => ({
        weekNo: i + 3, dueDate: addWeeks('2025-08-12', i + 1),
        baseAmount: 750, penalty: 0, status: 'upcoming' as const,
      })),
    ],
    createdAt: '2025-08-01T10:00:00', approvedAt: '2025-08-01T10:30:00',
  },
];

export const PAYMENTS: Payment[] = [
  { id: 'pay1', paymentNo: 'PAY-0001', customerId: 'cust1', orderId: 'ord1', type: 'purchase', method: 'cash', amount: 726, status: 'paid', confirmedBy: 'Employee Jay', createdAt: '2025-08-10T09:00:00', paidAt: '2025-08-10T10:30:00' },
  { id: 'pay2', paymentNo: 'PAY-0002', customerId: 'cust2', orderId: 'ord2', type: 'purchase', method: 'gcash', amount: 792, status: 'paid', createdAt: '2025-08-12T11:00:00', paidAt: '2025-08-12T11:02:00' },
  { id: 'pay3', paymentNo: 'PAY-0003', customerId: 'cust1', financingId: 'fin1', type: 'installment', method: 'gcash', amount: 495, status: 'paid', createdAt: '2025-08-27T10:00:00', paidAt: '2025-08-27T10:01:00' },
  { id: 'pay4', paymentNo: 'PAY-0004', customerId: 'cust2', financingId: 'fin2', type: 'installment', method: 'cash', amount: 600, status: 'paid', confirmedBy: 'Employee Mia', createdAt: '2025-08-05T09:00:00', paidAt: '2025-08-05T09:30:00' },
  { id: 'pay5', paymentNo: 'PAY-0005', customerId: 'cust2', financingId: 'fin2', type: 'installment', method: 'cash', amount: 600, status: 'paid', confirmedBy: 'Employee Jay', createdAt: '2025-08-12T09:00:00', paidAt: '2025-08-12T09:30:00' },
  { id: 'pay6', paymentNo: 'PAY-0006', customerId: 'cust4', financingId: 'fin4', type: 'installment', method: 'gcash', amount: 900, status: 'paid', createdAt: '2025-08-10T08:00:00', paidAt: '2025-08-10T08:01:00' },
  { id: 'pay7', paymentNo: 'PAY-0007', customerId: 'cust5', orderId: 'ord6', type: 'purchase', method: 'cash', amount: 924, status: 'pending', createdAt: '2025-08-30T08:00:00' },
];

export const RESTOCK_ORDERS: RestockOrder[] = [
  {
    id: 'rst1', restockNo: 'RST-0001', supplierId: 'sup1', supplierName: 'ABC Distributor',
    items: [
      { productId: 'p8', productName: 'Red Horse Beer 500ml', quantity: 48, costPrice: 52 },
      { productId: 'p6', productName: 'Milo 3-in-1 Box (10s)', quantity: 24, costPrice: 72 },
    ],
    totalCost: 4224, status: 'ordered', createdAt: '2025-08-28T09:00:00',
  },
  {
    id: 'rst2', restockNo: 'RST-0002', supplierId: 'sup2', supplierName: 'Metro Food Supply',
    items: [
      { productId: 'p25', productName: 'Silver Swan Soy Sauce 385ml', quantity: 36, costPrice: 17 },
      { productId: 'p17', productName: 'Quickchow Chicken 55g', quantity: 96, costPrice: 6 },
      { productId: 'p13', productName: 'Rebisco Crackers 10s', quantity: 48, costPrice: 28 },
    ],
    totalCost: 2562, status: 'draft', createdAt: '2025-08-30T10:00:00',
  },
  {
    id: 'rst3', restockNo: 'RST-0003', supplierId: 'sup3', supplierName: 'QuickStore Wholesale',
    items: [
      { productId: 'p34', productName: 'Palmolive Shampoo 180ml', quantity: 24, costPrice: 60 },
    ],
    totalCost: 1440, status: 'received', createdAt: '2025-08-15T11:00:00', receivedAt: '2025-08-18T14:00:00',
  },
];

export const AUDIT_LOG: AuditEntry[] = [
  { id: 'aud1', timestamp: '2025-08-10T10:30:00', actorId: 'e2', actorName: 'Employee Jay', actorRole: 'employee', category: 'payment', action: 'payment.confirm_cash', summary: 'Confirmed ₱726 cash payment PAY-0001 for Maria Santos', targetType: 'payment', targetId: 'pay1', targetLabel: 'PAY-0001', amount: 726 },
  { id: 'aud2', timestamp: '2025-08-12T11:02:00', actorId: null, actorName: 'System', actorRole: 'system', category: 'payment', action: 'payment.installment', summary: 'Jose Reyes paid order ORD-0002 via GCASH (auto-confirmed)', targetType: 'order', targetId: 'ord2', targetLabel: 'ORD-0002', amount: 792 },
  { id: 'aud3', timestamp: '2025-08-20T11:30:00', actorId: 'e3', actorName: 'Supervisor Ben', actorRole: 'supervisor', category: 'financing', action: 'financing.approve', summary: 'Approved FIN-0001 for Maria Santos (₱3,300 principal)', targetType: 'financing', targetId: 'fin1', targetLabel: 'FIN-0001', amount: 3300 },
  { id: 'aud4', timestamp: '2025-08-27T10:01:00', actorId: 'u1', actorName: 'Maria Santos', actorRole: 'customer', category: 'payment', action: 'payment.installment', summary: 'Maria Santos paid installment #1 on FIN-0001 via GCASH (auto-confirmed)', targetType: 'financing', targetId: 'fin1', targetLabel: 'FIN-0001', amount: 495 },
  { id: 'aud5', timestamp: '2025-08-01T10:30:00', actorId: 'e4', actorName: 'Supervisor Clara', actorRole: 'supervisor', category: 'financing', action: 'financing.approve', summary: 'Approved FIN-0002 for Jose Reyes (₱2,000 principal)', targetType: 'financing', targetId: 'fin2', targetLabel: 'FIN-0002', amount: 2000 },
  { id: 'aud6', timestamp: '2025-08-05T09:30:00', actorId: 'e5', actorName: 'Employee Mia', actorRole: 'employee', category: 'payment', action: 'payment.confirm_cash', summary: 'Confirmed ₱600 cash installment PAY-0006 for Jose Reyes', targetType: 'payment', targetId: 'pay6', targetLabel: 'PAY-0006', amount: 600 },
  { id: 'aud7', timestamp: '2025-08-01T08:00:00', actorId: 'e1', actorName: 'Admin Rosa', actorRole: 'admin', category: 'settings', action: 'settings.update', summary: 'Updated system settings — financing charge (25% → 20%)' },
  { id: 'aud8', timestamp: '2025-07-29T12:00:00', actorId: null, actorName: 'System', actorRole: 'system', category: 'customer', action: 'customer.update', summary: 'Carmen Flores completed FIN-0006 — credit limit increased to ₱6,000', targetType: 'customer', targetId: 'cust5', targetLabel: 'Carmen Flores', amount: 6000 },
  { id: 'aud9', timestamp: '2025-08-13T14:00:00', actorId: 'e6', actorName: 'Employee Rex', actorRole: 'employee', category: 'order', action: 'order.status', summary: 'Order ORD-0002 marked delivered', targetType: 'order', targetId: 'ord2', targetLabel: 'ORD-0002' },
  { id: 'aud10', timestamp: '2025-08-19T00:00:00', actorId: null, actorName: 'System', actorRole: 'system', category: 'financing', action: 'financing.overdue', summary: 'FIN-0007 (Roberto Tan) flagged overdue — 2 missed installments', targetType: 'financing', targetId: 'fin7', targetLabel: 'FIN-0007' },
  { id: 'aud11', timestamp: '2025-08-28T09:15:00', actorId: 'e1', actorName: 'Admin Rosa', actorRole: 'admin', category: 'employee', action: 'employee.create', summary: 'Created staff account for Employee Mia (employee)', targetType: 'employee', targetId: 'e5', targetLabel: 'Employee Mia' },
  { id: 'aud12', timestamp: '2025-08-30T15:40:00', actorId: 'e3', actorName: 'Supervisor Ben', actorRole: 'supervisor', category: 'inventory', action: 'product.update', summary: 'Adjusted stock for Lucky Me Pancit Canton (120 → 96)', targetType: 'product', targetId: 'p1', targetLabel: 'p1' },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  financingCharge: 20,
  startingCreditLimit: 5000,
  limitIncreaseAmount: 1000,
  maxAutomaticLimit: 20000,
  weeklyPenalty: 10,
  plan1Installments: 4,
  plan2Installments: 8,
};
