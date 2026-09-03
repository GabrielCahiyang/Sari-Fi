import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { AuditTrail } from '../../components/AuditTrail';
import type { Customer } from '../../types';
import { saveRecord, updateRecord, deleteRecord } from '../../services/firebase/rtdbService';

interface CustomerFormData {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  loginEmail: string;
  password: string;
  creditLimit: string;
  storeName: string;
  storeAddress: string;
  yearsOperating: string;
  notes: string;
}

export function CustomersManagementPage() {
  const { state, dispatch, getCustomerOrders, getCustomerFinancing, showToast, formatPHP, logAudit } = useApp();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [isStoreOwner, setIsStoreOwner] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const isSubmittingRef = useRef(false);

  // Form State & Validation for Create
  const [formData, setFormData] = useState<CustomerFormData>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    loginEmail: '',
    password: '',
    creditLimit: String(state.settings.startingCreditLimit || 5000),
    storeName: '',
    storeAddress: '',
    yearsOperating: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingCustomer, setPendingCustomer] = useState<Customer | null>(null);

  // Form State for Edit Customer
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    loginEmail: '',
    password: '',
    creditLimit: '',
    storeName: '',
    storeAddress: '',
    yearsOperating: '',
    notes: '',
    status: 'active' as 'active' | 'suspended',
    isStoreOwner: false,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [showEditPass, setShowEditPass] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const role = state.currentUser?.role || 'employee';
  const canCreate = role === 'supervisor' || role === 'admin';

  const scopedActivity = (cust: Customer) => {
    const orderIds = new Set(getCustomerOrders(cust.id).map(o => o.id));
    const finIds = new Set(getCustomerFinancing(cust.id).map(f => f.id));
    const payIds = new Set(state.payments.filter(p => p.customerId === cust.id).map(p => p.id));
    return state.auditLog.filter(e =>
      e.targetId === cust.id ||
      e.actorName === cust.fullName ||
      (e.targetId != null && (orderIds.has(e.targetId) || finIds.has(e.targetId) || payIds.has(e.targetId)))
    );
  };

  const customers = state.customers.filter(c =>
    search === '' ||
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (c.storeName && c.storeName.toLowerCase().includes(search.toLowerCase())) ||
    c.accountNo.includes(search)
  );

  const handleOpenCreate = () => {
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      address: '',
      loginEmail: '',
      password: '',
      creditLimit: String(state.settings.startingCreditLimit || 5000),
      storeName: '',
      storeAddress: '',
      yearsOperating: '',
      notes: '',
    });
    setErrors({});
    setIsStoreOwner(false);
    setShowCreatePass(false);
    setShowCreate(true);
  };

  const validateCustomerForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Valid email is required';
    }

    if (!formData.address.trim()) newErrors.address = 'Address is required';

    if (!formData.loginEmail.trim()) {
      newErrors.loginEmail = 'Login email is required';
    } else if (!formData.loginEmail.includes('@')) {
      newErrors.loginEmail = 'Valid login email is required';
    } else if (state.customers.some(c => c.loginEmail?.toLowerCase() === formData.loginEmail.trim().toLowerCase())) {
      newErrors.loginEmail = 'An account with this login email already exists';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.trim().length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    if (!formData.creditLimit.trim() || isNaN(Number(formData.creditLimit)) || Number(formData.creditLimit) < 0) {
      newErrors.creditLimit = 'Valid credit limit (₱) is required';
    }

    if (isStoreOwner) {
      if (!formData.storeName.trim()) newErrors.storeName = 'Store name is required';
      if (!formData.storeAddress.trim()) newErrors.storeAddress = 'Store address is required';
      if (!formData.yearsOperating.trim() || isNaN(Number(formData.yearsOperating)) || Number(formData.yearsOperating) < 0) {
        newErrors.yearsOperating = 'Valid years operating is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCustomerForm()) {
      showToast('error', 'Please fill in all required text boxes.');
      return;
    }

    const custId = `cust${Date.now()}`;
    const prepared: Customer = {
      id: custId,
      accountNo: `SF-${String(state.customers.length + 1).padStart(4, '0')}`,
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      storeName: isStoreOwner ? (formData.storeName.trim() || 'Sari-Sari Store') : 'Individual Buyer',
      storeAddress: isStoreOwner ? formData.storeAddress.trim() : '',
      yearsOperating: isStoreOwner ? parseInt(formData.yearsOperating) || 0 : 0,
      notes: isStoreOwner ? formData.notes.trim() : '',
      loginEmail: formData.loginEmail.trim().toLowerCase(),
      password: formData.password.trim(),
      status: 'active',
      creditLimit: parseInt(formData.creditLimit) || state.settings.startingCreditLimit,
      usedCredit: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setPendingCustomer(prepared);
  };

  const executeSaveCustomer = async () => {
    if (!pendingCustomer || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);

    try {
      await saveRecord('customers', pendingCustomer);
      await saveRecord('users', {
        id: pendingCustomer.id,
        name: pendingCustomer.fullName,
        email: pendingCustomer.loginEmail,
        password: pendingCustomer.password,
        role: 'customer',
        customerId: pendingCustomer.id,
        createdAt: new Date().toISOString(),
      });

      await logAudit({
        category: 'customer',
        action: 'customer.create',
        summary: `Created customer account for ${pendingCustomer.fullName} (${pendingCustomer.accountNo})`,
        targetType: 'customer',
        targetId: pendingCustomer.id,
        targetLabel: pendingCustomer.accountNo,
        amount: pendingCustomer.creditLimit,
      });

      showToast('success', `Customer account for ${pendingCustomer.fullName} created!`);
      setShowCreate(false);
      setPendingCustomer(null);
      setIsStoreOwner(false);
    } catch (err: any) {
      showToast('error', 'Failed to save customer: ' + err.message);
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  // Edit Customer Handlers
  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    const isOwner = !!(cust.storeName && cust.storeName !== 'Individual Buyer');
    setEditFormData({
      fullName: cust.fullName,
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      loginEmail: cust.loginEmail,
      password: cust.password || '',
      creditLimit: String(cust.creditLimit || 5000),
      storeName: isOwner ? cust.storeName : '',
      storeAddress: cust.storeAddress || '',
      yearsOperating: String(cust.yearsOperating || ''),
      notes: cust.notes || '',
      status: cust.status,
      isStoreOwner: isOwner,
    });
    setEditErrors({});
    setShowEditPass(false);
  };

  const validateEditCustomerForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!editFormData.fullName.trim()) errs.fullName = 'Full name is required';
    if (!editFormData.phone.trim()) errs.phone = 'Phone number is required';
    if (!editFormData.email.trim()) {
      errs.email = 'Email is required';
    } else if (!editFormData.email.includes('@')) {
      errs.email = 'Valid email is required';
    }

    if (!editFormData.address.trim()) errs.address = 'Address is required';

    if (!editFormData.loginEmail.trim()) {
      errs.loginEmail = 'Login email is required';
    } else if (!editFormData.loginEmail.includes('@')) {
      errs.loginEmail = 'Valid login email is required';
    } else if (
      state.customers.some(
        c => c.id !== editingCustomer?.id && c.loginEmail?.toLowerCase() === editFormData.loginEmail.trim().toLowerCase()
      )
    ) {
      errs.loginEmail = 'Another account already uses this login email';
    }

    if (!editFormData.password.trim()) {
      errs.password = 'Password is required';
    } else if (editFormData.password.trim().length < 4) {
      errs.password = 'Password must be at least 4 characters';
    }

    if (!editFormData.creditLimit.trim() || isNaN(Number(editFormData.creditLimit)) || Number(editFormData.creditLimit) < 0) {
      errs.creditLimit = 'Valid credit limit (₱) is required';
    }

    if (editFormData.isStoreOwner) {
      if (!editFormData.storeName.trim()) errs.storeName = 'Store name is required';
      if (!editFormData.storeAddress.trim()) errs.storeAddress = 'Store address is required';
      if (!editFormData.yearsOperating.trim() || isNaN(Number(editFormData.yearsOperating)) || Number(editFormData.yearsOperating) < 0) {
        errs.yearsOperating = 'Valid years operating is required';
      }
    }

    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !validateEditCustomerForm()) {
      showToast('error', 'Please resolve the highlighted fields.');
      return;
    }

    setSavingEdit(true);
    const updatedCust: Customer = {
      ...editingCustomer,
      fullName: editFormData.fullName.trim(),
      phone: editFormData.phone.trim(),
      email: editFormData.email.trim(),
      address: editFormData.address.trim(),
      loginEmail: editFormData.loginEmail.trim().toLowerCase(),
      password: editFormData.password.trim(),
      creditLimit: parseInt(editFormData.creditLimit) || editingCustomer.creditLimit,
      storeName: editFormData.isStoreOwner ? (editFormData.storeName.trim() || 'Sari-Sari Store') : 'Individual Buyer',
      storeAddress: editFormData.isStoreOwner ? editFormData.storeAddress.trim() : '',
      yearsOperating: editFormData.isStoreOwner ? parseInt(editFormData.yearsOperating) || 0 : 0,
      notes: editFormData.isStoreOwner ? editFormData.notes.trim() : '',
      status: editFormData.status,
    };

    try {
      await saveRecord('customers', updatedCust);
      await updateRecord('users', updatedCust.id, {
        name: updatedCust.fullName,
        email: updatedCust.loginEmail,
        password: updatedCust.password,
        role: 'customer',
      });

      dispatch({ type: 'UPDATE_CUSTOMER', customer: updatedCust });

      await logAudit({
        category: 'customer',
        action: 'customer.update',
        summary: `Updated customer details and credentials for ${updatedCust.fullName} (${updatedCust.accountNo})`,
        targetType: 'customer',
        targetId: updatedCust.id,
        targetLabel: updatedCust.accountNo,
      });

      showToast('success', `Customer ${updatedCust.fullName} updated successfully!`);
      setEditingCustomer(null);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to update customer: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const adjustLimit = async () => {
    if (!selectedCustomer || !newLimit) return;
    const limitNum = parseInt(newLimit);
    if (isNaN(limitNum)) return;

    try {
      await updateRecord('customers', selectedCustomer.id, { creditLimit: limitNum });
      const updated = { ...selectedCustomer, creditLimit: limitNum };
      dispatch({ type: 'UPDATE_CUSTOMER', customer: updated });
      await logAudit({
        category: 'customer',
        action: 'customer.limit',
        summary: `Adjusted credit limit for ${selectedCustomer.fullName} (${selectedCustomer.accountNo}) to ${formatPHP(limitNum)}`,
        targetType: 'customer',
        targetId: selectedCustomer.id,
        targetLabel: selectedCustomer.accountNo,
        amount: limitNum,
      });
      showToast('success', 'Credit limit updated.');
      setSelectedCustomer(null);
      setNewLimit('');
    } catch (err: any) {
      showToast('error', 'Failed to update credit limit: ' + err.message);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteRecord('customers', deleteConfirm.id);
      await deleteRecord('users', deleteConfirm.id);
      dispatch({ type: 'DELETE_CUSTOMER', customerId: deleteConfirm.id });
      await logAudit({
        category: 'customer',
        action: 'customer.delete',
        summary: `Deleted customer account ${deleteConfirm.fullName} (${deleteConfirm.accountNo})`,
        targetType: 'customer',
        targetId: deleteConfirm.id,
        targetLabel: deleteConfirm.accountNo,
      });
      showToast('info', `Customer ${deleteConfirm.fullName} removed.`);
      setDeleteConfirm(null);
    } catch (err: any) {
      showToast('error', 'Failed to delete customer: ' + err.message);
    }
  };

  return (
    <InternalLayout title="Customers">
      <div className="space-y-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Total Accounts</div>
            <div className="text-[#0D2B45] font-800 text-2xl mt-1">{state.customers.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Active Lines</div>
            <div className="text-[#1E7D3B] font-800 text-2xl mt-1">{state.customers.filter(c => c.usedCredit > 0).length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Total Credit Extended</div>
            <div className="text-[#0D2B45] font-800 text-2xl mt-1">{formatPHP(state.customers.reduce((s, c) => s + c.creditLimit, 0))}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Outstanding Balance</div>
            <div className="text-amber-600 font-800 text-2xl mt-1">{formatPHP(state.customers.reduce((s, c) => s + c.usedCredit, 0))}</div>
          </div>
        </div>

        {/* Table & Controls */}
        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          <div className="p-5 border-b border-[#E4E8E6]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-700 text-[#10212B]">Customers ({customers.length})</div>
                <p className="text-xs text-[#65727A]">Borrower accounts registered in Firebase</p>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search account, name, store…"
                  className="px-3.5 py-2 border border-[#E4E8E6] rounded-xl text-xs focus:outline-none focus:border-[#1E7D3B] w-full sm:w-64"
                />
                {canCreate && (
                  <button
                    onClick={handleOpenCreate}
                    className="px-4 py-2 bg-[#1E7D3B] hover:bg-[#22913f] text-white text-xs font-700 rounded-xl transition-all shadow-sm shadow-[#1E7D3B]/20 whitespace-nowrap cursor-pointer shrink-0"
                  >
                    + Create Customer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-[#F7F8F6]">
            {customers.map(cust => {
              const usedPct = cust.creditLimit > 0 ? (cust.usedCredit / cust.creditLimit) * 100 : 0;
              return (
                <div key={cust.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-700 text-xs text-[#0D2B45]">{cust.accountNo}</div>
                      <div className="font-700 text-sm text-[#10212B]">{cust.fullName}</div>
                      <div className="text-xs text-[#65727A]">{cust.storeName}</div>
                      {cust.password && (
                        <span className="text-[10px] text-[#65727A]/70 flex items-center gap-1 mt-0.5">
                          <span>PW:</span>
                          <span className="font-mono">••••••••</span>
                        </span>
                      )}
                    </div>
                    <div>
                      {cust.status === 'suspended'
                        ? <Badge variant="red" size="sm">Suspended</Badge>
                        : usedPct >= 90
                        ? <Badge variant="orange" size="sm">Near Limit</Badge>
                        : <Badge variant="green" size="sm">Good</Badge>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F7F8F6] p-2.5 rounded-xl">
                    <div>
                      <span className="text-[#65727A] block text-[10px]">Phone</span>
                      <span className="font-600 text-[#10212B]">{cust.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[#65727A] block text-[10px]">Email</span>
                      <span className="font-600 text-[#10212B] truncate block">{cust.loginEmail || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[#65727A] block text-[10px]">Credit Limit</span>
                      <span className="font-700 text-[#0D2B45]">{formatPHP(cust.creditLimit)}</span>
                    </div>
                    <div>
                      <span className="text-[#65727A] block text-[10px]">Used ({usedPct.toFixed(0)}%)</span>
                      <span className="font-700 text-[#10212B]">{formatPHP(cust.usedCredit)}</span>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-[#F7F8F6]">
                    {canCreate && (
                      <button
                        onClick={() => handleOpenEdit(cust)}
                        className="px-2.5 py-1.5 bg-[#F7F8F6] hover:bg-[#E4E8E6] text-[#1E7D3B] text-xs font-600 rounded-lg cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => setHistoryCustomer(cust)}
                      className="px-2.5 py-1.5 bg-[#F7F8F6] hover:bg-[#E4E8E6] text-[#65727A] text-xs font-600 rounded-lg cursor-pointer"
                    >
                      History
                    </button>
                    {canCreate && (
                      <>
                        <button
                          onClick={() => { setSelectedCustomer(cust); setNewLimit(String(cust.creditLimit)); }}
                          className="px-2.5 py-1.5 bg-[#F7F8F6] hover:bg-[#E4E8E6] text-[#1E7D3B] text-xs font-600 rounded-lg cursor-pointer"
                        >
                          Adjust Limit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(cust)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-600 rounded-lg cursor-pointer ml-auto"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {customers.length === 0 && (
              <div className="p-8 text-center text-xs text-[#65727A]">
                No customers registered yet. Click "+ Create Customer" to register an account.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-xs">
              <thead className="bg-[#F7F8F6] border-b border-[#E4E8E6] text-[#65727A] font-600">
                <tr>
                  <th className="text-left px-5 py-3">Account</th>
                  <th className="text-left px-5 py-3">Customer / Store</th>
                  <th className="text-left px-5 py-3">Contact</th>
                  <th className="text-right px-5 py-3">Credit Limit</th>
                  <th className="text-right px-5 py-3">Used Credit</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {customers.map(cust => {
                  const usedPct = cust.creditLimit > 0 ? (cust.usedCredit / cust.creditLimit) * 100 : 0;
                  return (
                    <tr key={cust.id} className="hover:bg-[#F7F8F6]/50 transition-colors">
                      <td className="px-5 py-3 font-mono font-700 text-[#0D2B45]">{cust.accountNo}</td>
                      <td className="px-5 py-3">
                        <div className="font-600 text-sm text-[#10212B]">{cust.fullName}</div>
                        <div className="text-[#65727A] text-xs">{cust.storeName}</div>
                        {cust.password && (
                          <span className="text-[10px] text-[#65727A]/70 flex items-center gap-1 mt-0.5">
                            <span>PW:</span>
                            <span className="font-mono">••••••••</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs text-[#10212B]">{cust.phone}</div>
                        <div className="text-xs text-[#65727A]">{cust.loginEmail}</div>
                      </td>
                      <td className="px-5 py-3 text-right font-700 text-[#0D2B45]">{formatPHP(cust.creditLimit)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="font-700 text-[#10212B]">{formatPHP(cust.usedCredit)}</div>
                        <div className="text-[10px] text-[#65727A]">{usedPct.toFixed(0)}% used</div>
                      </td>
                      <td className="px-5 py-3">
                        {cust.status === 'suspended'
                          ? <Badge variant="red">Suspended</Badge>
                          : usedPct >= 90
                          ? <Badge variant="orange">Near Limit</Badge>
                          : <Badge variant="green">Good</Badge>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {canCreate && (
                            <button
                              onClick={() => handleOpenEdit(cust)}
                              className="text-xs text-[#1E7D3B] font-600 hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => setHistoryCustomer(cust)}
                            className="text-xs text-[#65727A] font-600 hover:text-[#0D2B45] hover:underline cursor-pointer"
                          >
                            History
                          </button>
                          {canCreate && (
                            <>
                              <button
                                onClick={() => { setSelectedCustomer(cust); setNewLimit(String(cust.creditLimit)); }}
                                className="text-xs text-[#1E7D3B] font-600 hover:underline cursor-pointer"
                              >
                                Adjust Limit
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(cust)}
                                className="text-xs text-red-600 hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="text-[#65727A] text-sm font-600">No customers registered yet</div>
                      <p className="text-xs text-[#65727A]/70 mt-1">Click "+ Create Customer" to register an account.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Customer Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Customer Account" size="lg">
        <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
          <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider mb-3">Personal Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={e => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (errors.fullName) setErrors({ ...errors, fullName: '' });
                }}
                placeholder="e.g. Gabriel Cahiyang"
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  errors.fullName ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {errors.fullName && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.fullName}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                placeholder="e.g. 09383309742"
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  errors.phone ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {errors.phone && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.phone}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                placeholder="e.g. gabzcah@gmail.com"
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  errors.email ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {errors.email && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.email}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => {
                  setFormData({ ...formData, address: e.target.value });
                  if (errors.address) setErrors({ ...errors, address: '' });
                }}
                placeholder="e.g. Ormoc City, Leyte"
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  errors.address ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {errors.address && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.address}</span>}
            </div>
          </div>

          {/* Store Owner Checkbox */}
          <div className="pt-3 pb-2 border-t border-[#E4E8E6]">
            <label className="flex items-center gap-3 cursor-pointer select-none bg-[#F7F8F6] p-3 rounded-xl hover:bg-[#ecefed] transition-colors">
              <input
                type="checkbox"
                checked={isStoreOwner}
                onChange={e => setIsStoreOwner(e.target.checked)}
                className="w-4 h-4 rounded text-[#1E7D3B] focus:ring-[#1E7D3B] border-[#E4E8E6] accent-[#1E7D3B] cursor-pointer"
              />
              <div>
                <span className="text-sm font-700 text-[#10212B]">Register as Store Owner</span>
                <p className="text-[11px] text-[#65727A]">
                  Default account is a regular buyer. Check this to reveal sari-sari store details.
                </p>
              </div>
            </label>
          </div>

          {/* Store Information (Only visible if isStoreOwner is checked) */}
          {isStoreOwner && (
            <div className="space-y-3 bg-[#F7F8F6] p-4 rounded-xl border border-[#E4E8E6] animate-fade-in">
              <div className="text-xs font-700 text-[#10212B] uppercase tracking-wider">Store Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs font-600 text-[#65727A]">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={e => {
                      setFormData({ ...formData, storeName: e.target.value });
                      if (errors.storeName) setErrors({ ...errors, storeName: '' });
                    }}
                    placeholder="e.g. Aling Nena Tindahan"
                    className={`mt-1 w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none transition-all ${
                      errors.storeName ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                    }`}
                  />
                  {errors.storeName && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.storeName}</span>}
                </div>

                <div>
                  <label className="text-xs font-600 text-[#65727A]">
                    Store Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.storeAddress}
                    onChange={e => {
                      setFormData({ ...formData, storeAddress: e.target.value });
                      if (errors.storeAddress) setErrors({ ...errors, storeAddress: '' });
                    }}
                    placeholder="Barangay, City, Province"
                    className={`mt-1 w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none transition-all ${
                      errors.storeAddress ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                    }`}
                  />
                  {errors.storeAddress && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.storeAddress}</span>}
                </div>

                <div>
                  <label className="text-xs font-600 text-[#65727A]">
                    Years Operating <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.yearsOperating}
                    onChange={e => {
                      setFormData({ ...formData, yearsOperating: e.target.value });
                      if (errors.yearsOperating) setErrors({ ...errors, yearsOperating: '' });
                    }}
                    placeholder="0"
                    className={`mt-1 w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none transition-all ${
                      errors.yearsOperating ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                    }`}
                  />
                  {errors.yearsOperating && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.yearsOperating}</span>}
                </div>

                <div>
                  <label className="text-xs font-600 text-[#65727A]">Notes / Landmarks</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Near barangay hall, etc."
                    className="mt-1 w-full px-3 py-2 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider pt-2 mb-3">Account Credentials & Financing</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Login Email (Username) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.loginEmail}
                onChange={e => {
                  setFormData({ ...formData, loginEmail: e.target.value });
                  if (errors.loginEmail) setErrors({ ...errors, loginEmail: '' });
                }}
                placeholder="e.g. gabriel@buyer.ph"
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  errors.loginEmail ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {errors.loginEmail && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.loginEmail}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showCreatePass ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="At least 4 characters"
                  className={`w-full px-3 py-2 pr-10 border rounded-xl text-sm focus:outline-none transition-all ${
                    errors.password ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePass(!showCreatePass)}
                  className="absolute right-3 top-2.5 text-[#65727A] hover:text-[#10212B] text-xs font-600 cursor-pointer"
                >
                  {showCreatePass ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.password}</span>}
            </div>

            <div className="col-span-2">
              <label className="text-xs font-600 text-[#65727A]">
                Initial Credit Limit (₱) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.creditLimit}
                onChange={e => {
                  setFormData({ ...formData, creditLimit: e.target.value });
                  if (errors.creditLimit) setErrors({ ...errors, creditLimit: '' });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  errors.creditLimit ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {errors.creditLimit && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.creditLimit}</span>}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all mt-2 cursor-pointer disabled:opacity-60 shadow-sm shadow-[#1E7D3B]/20"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        open={editingCustomer !== null}
        onClose={() => setEditingCustomer(null)}
        title={editingCustomer ? `Edit Customer — ${editingCustomer.fullName}` : 'Edit Customer'}
        size="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4" noValidate>
          <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider mb-2">Personal Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.fullName}
                onChange={e => {
                  setEditFormData({ ...editFormData, fullName: e.target.value });
                  if (editErrors.fullName) setEditErrors({ ...editErrors, fullName: '' });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  editErrors.fullName ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {editErrors.fullName && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.fullName}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.phone}
                onChange={e => {
                  setEditFormData({ ...editFormData, phone: e.target.value });
                  if (editErrors.phone) setEditErrors({ ...editErrors, phone: '' });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  editErrors.phone ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {editErrors.phone && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.phone}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={editFormData.email}
                onChange={e => {
                  setEditFormData({ ...editFormData, email: e.target.value });
                  if (editErrors.email) setEditErrors({ ...editErrors, email: '' });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  editErrors.email ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {editErrors.email && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.email}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.address}
                onChange={e => {
                  setEditFormData({ ...editFormData, address: e.target.value });
                  if (editErrors.address) setEditErrors({ ...editErrors, address: '' });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  editErrors.address ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {editErrors.address && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.address}</span>}
            </div>
          </div>

          {/* Store Owner Toggle in Edit */}
          <div className="pt-2 pb-1 border-t border-[#E4E8E6]">
            <label className="flex items-center gap-3 cursor-pointer select-none bg-[#F7F8F6] p-3 rounded-xl hover:bg-[#ecefed] transition-colors">
              <input
                type="checkbox"
                checked={editFormData.isStoreOwner}
                onChange={e => setEditFormData({ ...editFormData, isStoreOwner: e.target.checked })}
                className="w-4 h-4 rounded text-[#1E7D3B] focus:ring-[#1E7D3B] border-[#E4E8E6] accent-[#1E7D3B] cursor-pointer"
              />
              <div>
                <span className="text-sm font-700 text-[#10212B]">Store Owner Account</span>
                <p className="text-[11px] text-[#65727A]">
                  Check to enable and edit sari-sari store details for this account.
                </p>
              </div>
            </label>
          </div>

          {editFormData.isStoreOwner && (
            <div className="space-y-3 bg-[#F7F8F6] p-4 rounded-xl border border-[#E4E8E6]">
              <div className="text-xs font-700 text-[#10212B] uppercase tracking-wider">Store Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs font-600 text-[#65727A]">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.storeName}
                    onChange={e => {
                      setEditFormData({ ...editFormData, storeName: e.target.value });
                      if (editErrors.storeName) setEditErrors({ ...editErrors, storeName: '' });
                    }}
                    className={`mt-1 w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none transition-all ${
                      editErrors.storeName ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                    }`}
                  />
                  {editErrors.storeName && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.storeName}</span>}
                </div>

                <div>
                  <label className="text-xs font-600 text-[#65727A]">
                    Store Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.storeAddress}
                    onChange={e => {
                      setEditFormData({ ...editFormData, storeAddress: e.target.value });
                      if (editErrors.storeAddress) setEditErrors({ ...editErrors, storeAddress: '' });
                    }}
                    className={`mt-1 w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none transition-all ${
                      editErrors.storeAddress ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                    }`}
                  />
                  {editErrors.storeAddress && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.storeAddress}</span>}
                </div>

                <div>
                  <label className="text-xs font-600 text-[#65727A]">
                    Years Operating <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editFormData.yearsOperating}
                    onChange={e => {
                      setEditFormData({ ...editFormData, yearsOperating: e.target.value });
                      if (editErrors.yearsOperating) setEditErrors({ ...editErrors, yearsOperating: '' });
                    }}
                    className={`mt-1 w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none transition-all ${
                      editErrors.yearsOperating ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                    }`}
                  />
                  {editErrors.yearsOperating && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.yearsOperating}</span>}
                </div>

                <div>
                  <label className="text-xs font-600 text-[#65727A]">Notes / Landmarks</label>
                  <input
                    type="text"
                    value={editFormData.notes}
                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider pt-2 mb-2">
            Credentials & Account Settings
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Login Email (Username) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={editFormData.loginEmail}
                onChange={e => {
                  setEditFormData({ ...editFormData, loginEmail: e.target.value });
                  if (editErrors.loginEmail) setEditErrors({ ...editErrors, loginEmail: '' });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  editErrors.loginEmail ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {editErrors.loginEmail && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.loginEmail}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showEditPass ? 'text' : 'password'}
                  value={editFormData.password}
                  onChange={e => {
                    setEditFormData({ ...editFormData, password: e.target.value });
                    if (editErrors.password) setEditErrors({ ...editErrors, password: '' });
                  }}
                  placeholder="Enter new password"
                  className={`w-full px-3 py-2 pr-10 border rounded-xl text-sm focus:outline-none transition-all ${
                    editErrors.password ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPass(!showEditPass)}
                  className="absolute right-3 top-2.5 text-[#65727A] hover:text-[#10212B] text-xs font-600 cursor-pointer"
                >
                  {showEditPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <span className="text-[10px] text-[#65727A] mt-1 block">
                Admin can edit password anytime. Customer can immediately log in with this password.
              </span>
              {editErrors.password && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.password}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">
                Credit Limit (₱) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={editFormData.creditLimit}
                onChange={e => {
                  setEditFormData({ ...editFormData, creditLimit: e.target.value });
                  if (editErrors.creditLimit) setEditErrors({ ...editErrors, creditLimit: '' });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  editErrors.creditLimit ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {editErrors.creditLimit && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.creditLimit}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">Account Status</label>
              <select
                value={editFormData.status}
                onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}
                className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B] cursor-pointer"
              >
                <option value="active">Active (Good Standing)</option>
                <option value="suspended">Suspended (Locked)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingEdit}
            className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all mt-2 cursor-pointer disabled:opacity-60 shadow-sm shadow-[#1E7D3B]/20"
          >
            {savingEdit ? 'Saving Changes…' : 'Save Changes'}
          </button>
        </form>
      </Modal>

      {/* Confirmation Dialog for Creating Customer */}
      <ConfirmDialog
        open={pendingCustomer !== null}
        onClose={() => setPendingCustomer(null)}
        onConfirm={executeSaveCustomer}
        title="Confirm Add Customer"
        message={`Are you sure you want to register ${isStoreOwner ? 'store owner' : 'customer'} "${pendingCustomer?.fullName}"?`}
        confirmLabel="Save"
      />

      {/* Customer History Modal */}
      <Modal open={historyCustomer !== null} onClose={() => setHistoryCustomer(null)} title={historyCustomer ? `Activity — ${historyCustomer.fullName}` : 'Activity'} size="lg">
        {historyCustomer && (
          <div className="max-h-[65vh] overflow-y-auto -mx-1 px-1">
            <div className="flex items-center gap-3 bg-[#F7F8F6] rounded-xl p-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-[#1a3d5c] to-[#0D2B45] rounded-xl flex items-center justify-center text-white font-700 text-sm">{historyCustomer.fullName.charAt(0)}</div>
              <div>
                <div className="font-700 text-sm text-[#10212B]">{historyCustomer.fullName}</div>
                <div className="text-xs text-[#65727A]">{historyCustomer.accountNo} · {historyCustomer.storeName}</div>
              </div>
            </div>
            <AuditTrail entries={scopedActivity(historyCustomer)} showFilters={false} pageSize={20} emptyLabel="No recorded activity for this customer yet." />
          </div>
        )}
      </Modal>

      {/* Adjust Limit Modal */}
      <Modal open={selectedCustomer !== null} onClose={() => setSelectedCustomer(null)} title="Adjust Credit Limit" size="sm">
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="bg-[#F7F8F6] rounded-xl p-4">
              <div className="font-700 text-sm text-[#10212B]">{selectedCustomer.fullName}</div>
              <div className="text-xs text-[#65727A]">Current limit: {formatPHP(selectedCustomer.creditLimit)}</div>
            </div>
            <div>
              <label className="text-xs font-600 text-[#65727A]">New Credit Limit (₱)</label>
              <input type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
            </div>
            <button onClick={adjustLimit} className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer">Update Limit</button>
          </div>
        )}
      </Modal>

      {/* Delete Customer Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer Account"
        message={`Are you sure you want to delete ${deleteConfirm?.fullName}? This will permanently remove the account from Firebase.`}
        danger
      />
    </InternalLayout>
  );
}
