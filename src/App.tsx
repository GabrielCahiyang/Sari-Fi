import { AppProvider, useApp } from './context/AppContext';
import { TourProvider } from './context/TourContext';
import { Toast } from './components/ui/Toast';
import { GuidedTourBar } from './components/GuidedTourBar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { CustomerLoginPage } from './pages/customer/CustomerLoginPage';
import { SupplierLoginPage } from './pages/supplier/SupplierLoginPage';
import { SupplierDashboard } from './pages/supplier/SupplierDashboard';
import { SupplierProductsPage } from './pages/supplier/SupplierProductsPage';
import { SupplierInventoryPage } from './pages/supplier/SupplierInventoryPage';
import { SupplierRestockPage } from './pages/supplier/SupplierRestockPage';
import { SupplierOrdersPage } from './pages/supplier/SupplierOrdersPage';
import { SupplierAccountPage } from './pages/supplier/SupplierAccountPage';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { ShopPage } from './pages/customer/ShopPage';
import { CartPage } from './pages/customer/CartPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { OrdersPage } from './pages/customer/OrdersPage';
import { FinancingPage } from './pages/customer/FinancingPage';
import { PaymentsPage } from './pages/customer/PaymentsPage';
import { AccountPage } from './pages/customer/AccountPage';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { SupervisorDashboard } from './pages/supervisor/SupervisorDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProductsPage } from './pages/admin/ProductsPage';
import { RestockPage } from './pages/admin/RestockPage';
import { SuppliersPage } from './pages/admin/SuppliersPage';
import { EmployeesPage } from './pages/admin/EmployeesPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { OrdersManagementPage } from './pages/shared/OrdersManagementPage';
import { FinancingManagementPage } from './pages/shared/FinancingManagementPage';
import { PaymentsManagementPage } from './pages/shared/PaymentsManagementPage';
import { CustomersManagementPage } from './pages/shared/CustomersManagementPage';
import { InventoryManagementPage } from './pages/shared/InventoryManagementPage';
import { AuditTrailPage } from './pages/shared/AuditTrailPage';
import { POSPage } from './pages/shared/POSPage';

function AppRouter() {
  const { state } = useApp();
  const page = state.currentPage;

  if (page === 'home') return <HomePage />;
  if (page === 'login') return <LoginPage />;
  if (page === 'customer/login') return <CustomerLoginPage />;
  if (page === 'supplier/login') return <SupplierLoginPage />;

  // Supplier routes
  if (page === 'supplier/dashboard') return <SupplierDashboard />;
  if (page === 'supplier/products') return <SupplierProductsPage />;
  if (page === 'supplier/inventory') return <SupplierInventoryPage />;
  if (page === 'supplier/restock') return <SupplierRestockPage />;
  if (page === 'supplier/orders') return <SupplierOrdersPage />;
  if (page === 'supplier/account') return <SupplierAccountPage />;

  // Customer routes
  if (page === 'customer/dashboard') return <CustomerDashboard />;
  if (page === 'customer/shop') return <ShopPage />;
  if (page === 'customer/cart') return <CartPage />;
  if (page === 'customer/checkout') return <CheckoutPage />;
  if (page === 'customer/orders') return <OrdersPage />;
  if (page === 'customer/financing') return <FinancingPage />;
  if (page === 'customer/payments') return <PaymentsPage />;
  if (page === 'customer/account') return <AccountPage />;

  // Employee routes
  if (page === 'employee/dashboard') return <EmployeeDashboard />;
  if (page === 'employee/pos') return <POSPage />;
  if (page === 'employee/orders') return <OrdersManagementPage />;
  if (page === 'employee/payments') return <PaymentsManagementPage />;
  if (page === 'employee/customers') return <CustomersManagementPage />;
  if (page === 'employee/inventory') return <InventoryManagementPage />;

  // Supervisor routes
  if (page === 'supervisor/dashboard') return <SupervisorDashboard />;
  if (page === 'supervisor/pos') return <POSPage />;
  if (page === 'supervisor/orders') return <OrdersManagementPage />;
  if (page === 'supervisor/payments') return <PaymentsManagementPage />;
  if (page === 'supervisor/financing') return <FinancingManagementPage />;
  if (page === 'supervisor/customers') return <CustomersManagementPage />;
  if (page === 'supervisor/inventory') return <InventoryManagementPage />;
  if (page === 'supervisor/products') return <ProductsPage />;
  if (page === 'supervisor/restock') return <RestockPage />;
  if (page === 'supervisor/audit') return <AuditTrailPage />;

  // Admin routes
  if (page === 'admin/dashboard') return <AdminDashboard />;
  if (page === 'admin/orders') return <OrdersManagementPage />;
  if (page === 'admin/payments') return <PaymentsManagementPage />;
  if (page === 'admin/financing') return <FinancingManagementPage />;
  if (page === 'admin/customers') return <CustomersManagementPage />;
  if (page === 'admin/suppliers' || page === 'admin/products' || page === 'admin/inventory' || page === 'admin/restock') return <SuppliersPage />;
  if (page === 'admin/employees') return <EmployeesPage />;
  if (page === 'admin/reports') return <ReportsPage />;
  if (page === 'admin/audit') return <AuditTrailPage />;
  if (page === 'admin/settings') return <SettingsPage />;

  return <HomePage />;
}

export default function App() {
  return (
    <AppProvider>
      <TourProvider>
        <div className="h-full">
          <AppRouter />
          <Toast />
          <GuidedTourBar />
        </div>
      </TourProvider>
    </AppProvider>
  );
}
