import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import type { Supplier, ProductCategory } from '../../types';
import { saveRecord, deleteRecord } from '../../services/firebase/rtdbService';
import { isValidEmail, isValidPhone } from '../../utils/validation';

export function SuppliersPage() {
  const { state, dispatch, showToast, logAudit, navigate } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Category Manager State
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<{ id?: string; name: string } | null>(null);

  // Form states for Add / Edit
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearFormError = (field: string) => {
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const fieldClass = (field: string) =>
    `mt-1.5 w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 ${
      formErrors[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
        : 'border-[#E4E8E6] focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]'
    }`;

  // Dynamically collect all categories available across the system
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    state.categories.forEach(c => {
      if (c && c.name) set.add(c.name.trim());
    });
    state.products.forEach(p => {
      if (p && p.category) set.add(p.category.trim());
    });
    state.suppliers.forEach(s => {
      if (s && Array.isArray(s.categories)) {
        s.categories.forEach(cat => {
          if (cat) set.add(cat.trim());
        });
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [state.categories, state.products, state.suppliers]);

  // Filtered suppliers
  const suppliers = useMemo(() => {
    return state.suppliers.filter(s => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        s.name.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (Array.isArray(s.categories) && s.categories.some(c => c.toLowerCase().includes(q)));

      const matchesCategory =
        categoryFilter === 'All' ||
        (Array.isArray(s.categories) && s.categories.includes(categoryFilter));

      const matchesStatus =
        statusFilter === 'all' || s.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [state.suppliers, search, categoryFilter, statusFilter]);

  // Summary counts
  const totalSuppliers = state.suppliers.length;
  const activeSuppliers = state.suppliers.filter(s => s.status === 'active').length;
  const productsWithSupplier = state.products.filter(p => p.supplierId).length;
  const supplierItemsNeedingRestock = state.products.filter(p => p.supplierId && p.stock <= p.reorderLevel).length;

  const openAddModal = () => {
    setName('');
    setContact('');
    setPhone('');
    setEmail('');
    setLoginEmail('');
    setPassword('supplier123');
    setAddress('');
    setStatus('active');
    setSelectedCategories([]);
    setNewCategoryInput('');
    setFormErrors({});
    setShowAddModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setContact(supplier.contact || '');
    setPhone(supplier.phone || '');
    setEmail(supplier.email || '');
    setLoginEmail(supplier.loginEmail || supplier.email || '');
    setPassword(supplier.password || 'supplier123');
    setAddress(supplier.address || '');
    setStatus(supplier.status || 'active');
    setSelectedCategories(Array.isArray(supplier.categories) ? [...supplier.categories] : []);
    setNewCategoryInput('');
    setFormErrors({});
  };

  const toggleCategory = (catName: string) => {
    clearFormError('categories');
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!selectedCategories.includes(trimmed)) {
      setSelectedCategories(prev => [...prev, trimmed]);
    }
    setNewCategoryInput('');
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanContact = contact.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanLoginEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanAddress = address.trim();
    const errors: Record<string, string> = {};

    if (!cleanName) errors.name = 'Supplier / company name is required';
    else if (cleanName.length < 2) errors.name = 'Enter at least 2 characters';
    else if (state.suppliers.some(s => s.id !== editingSupplier?.id && s.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      errors.name = 'A supplier with this name already exists';
    }
    if (!cleanContact) errors.contact = 'Contact person is required';
    if (!cleanPhone) errors.phone = 'Contact phone is required';
    else if (!isValidPhone(cleanPhone)) errors.phone = 'Enter a valid phone number (7–15 digits)';
    if (!cleanEmail) errors.email = 'Business email is required';
    else if (!isValidEmail(cleanEmail)) errors.email = 'Enter a valid email address';
    if (!cleanAddress) errors.address = 'Warehouse / office address is required';
    if (!cleanLoginEmail) errors.loginEmail = 'Portal login email is required';
    else if (!isValidEmail(cleanLoginEmail)) errors.loginEmail = 'Enter a valid login email';
    else {
      const emailTaken = state.suppliers.some(s => s.id !== editingSupplier?.id && s.loginEmail?.trim().toLowerCase() === cleanLoginEmail)
        || state.employees.some(emp => emp.email?.trim().toLowerCase() === cleanLoginEmail)
        || state.customers.some(customer => customer.loginEmail?.trim().toLowerCase() === cleanLoginEmail);
      if (emailTaken) errors.loginEmail = 'This login email is already used by another account';
    }
    if (!cleanPassword) errors.password = 'Portal password is required';
    else if (cleanPassword.length < 6) errors.password = 'Use at least 6 characters';
    if (selectedCategories.length === 0) errors.categories = 'Select at least one supplied category';

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast('error', 'Please resolve the highlighted supplier fields.');
      return;
    }

    setSubmitting(true);
    const isEdit = !!editingSupplier;
    const supplierId = isEdit ? editingSupplier.id : `sup${Date.now()}`;

    const supplierData: Supplier = {
      id: supplierId,
      name: cleanName,
      contact: cleanContact,
      phone: cleanPhone,
      email: cleanEmail,
      address: cleanAddress,
      categories: selectedCategories,
      status,
      loginEmail: cleanLoginEmail,
      password: cleanPassword,
    };

    try {
      await saveRecord('suppliers', supplierData);

      if (supplierData.loginEmail) {
        await saveRecord('users', {
          id: supplierId,
          name: supplierData.name,
          email: supplierData.loginEmail,
          password: supplierData.password || 'supplier123',
          role: 'supplier',
          supplierId: supplierId,
          createdAt: new Date().toISOString(),
        });
      }

      if (isEdit) {
        dispatch({ type: 'UPDATE_SUPPLIER', supplier: supplierData });
        await logAudit({
          category: 'supplier',
          action: 'supplier.update',
          summary: `Updated supplier details for "${supplierData.name}"`,
          targetType: 'supplier',
          targetId: supplierData.id,
          targetLabel: supplierData.name,
        });
        showToast('success', `Supplier "${supplierData.name}" updated successfully.`);
        setEditingSupplier(null);
      } else {
        dispatch({ type: 'ADD_SUPPLIER', supplier: supplierData });
        await logAudit({
          category: 'supplier',
          action: 'supplier.create',
          summary: `Added new supplier partner "${supplierData.name}"`,
          targetType: 'supplier',
          targetId: supplierData.id,
          targetLabel: supplierData.name,
        });
        showToast('success', `Supplier "${supplierData.name}" registered.`);
        setShowAddModal(false);
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to save supplier: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    const nextStatus: 'active' | 'inactive' = supplier.status === 'active' ? 'inactive' : 'active';
    const updated: Supplier = { ...supplier, status: nextStatus };
    try {
      await saveRecord('suppliers', updated);
      dispatch({ type: 'UPDATE_SUPPLIER', supplier: updated });
      await logAudit({
        category: 'supplier',
        action: 'supplier.update',
        summary: `Supplier "${supplier.name}" marked ${nextStatus}`,
        targetType: 'supplier',
        targetId: supplier.id,
        targetLabel: supplier.name,
      });
      showToast('info', `Supplier marked ${nextStatus}.`);
    } catch (err: any) {
      showToast('error', 'Failed to update: ' + err.message);
    }
  };

  const handleDelete = async (id: string, supplierName: string) => {
    const mappedCount = state.products.filter(p => p.supplierId === id).length;
    if (mappedCount > 0) {
      showToast('error', `Reassign or delete ${mappedCount} mapped product${mappedCount === 1 ? '' : 's'} before removing this supplier.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete supplier "${supplierName}"?`)) return;

    try {
      await deleteRecord('suppliers', id);
      await deleteRecord('users', id);
      dispatch({ type: 'DELETE_SUPPLIER', supplierId: id });
      await logAudit({
        category: 'supplier',
        action: 'supplier.delete',
        summary: `Deleted supplier partner "${supplierName}"`,
        targetType: 'supplier',
        targetId: id,
        targetLabel: supplierName,
      });
      showToast('info', `Supplier "${supplierName}" deleted.`);
    } catch (err: any) {
      showToast('error', 'Failed to delete: ' + err.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) {
      setCategoryError('Category name is required');
      return;
    }
    if (availableCategories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      setCategoryError('Category already exists');
      return;
    }

    const catId = `cat_${Date.now()}`;
    const newCat: ProductCategory = {
      id: catId,
      name: clean,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveRecord('categories', newCat);
      dispatch({ type: 'ADD_CATEGORY', category: newCat });
      await logAudit({
        category: 'inventory',
        action: 'category.create',
        summary: `Created product category "${clean}"`,
        targetType: 'category',
        targetId: catId,
        targetLabel: clean,
      });
      setNewCategoryName('');
      setCategoryError('');
      showToast('success', `Category "${clean}" added to catalog.`);
    } catch (err: any) {
      showToast('error', 'Failed to save category: ' + err.message);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      const catName = deletingCategory.name;
      const matched = state.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      if (matched) {
        await deleteRecord('categories', matched.id);
        dispatch({ type: 'DELETE_CATEGORY', categoryId: matched.id });
      }

      // Also clean up this category from any suppliers that have it tagged
      for (const s of state.suppliers) {
        if (s.categories && s.categories.some(c => c.toLowerCase() === catName.toLowerCase())) {
          const updatedCategories = s.categories.filter(c => c.toLowerCase() !== catName.toLowerCase());
          await saveRecord('suppliers', { ...s, categories: updatedCategories });
          dispatch({ type: 'UPDATE_SUPPLIER', supplier: { ...s, categories: updatedCategories } });
        }
      }

      await logAudit({
        category: 'inventory',
        action: 'category.delete',
        summary: `Deleted product category "${catName}" from marketplace and supplier profiles`,
        targetType: 'category',
        targetId: matched?.id || catName,
        targetLabel: catName,
      });

      showToast('info', `Category "${catName}" deleted.`);
      setDeletingCategory(null);
    } catch (err: any) {
      showToast('error', 'Failed to delete category: ' + err.message);
    }
  };

  return (
    <InternalLayout title="Suppliers">
      <div className="space-y-5">
        {/* KPI Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Total Suppliers</span>
              <span className="w-8 h-8 rounded-xl bg-slate-100 text-[#0D2B45] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
            </div>
            <div>
              <div className="text-[#0D2B45] font-800 text-2xl mt-1">{totalSuppliers}</div>
              <div className="text-[#65727A] text-[11px] mt-0.5">Wholesale partner accounts</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Active Partners</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1E7D3B] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div>
              <div className="text-[#1E7D3B] font-800 text-2xl mt-1">{activeSuppliers}</div>
              <div className="text-[#65727A] text-[11px] mt-0.5">Currently supplying goods</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Products Supplied</span>
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </span>
            </div>
            <div>
              <div className="text-[#10212B] font-800 text-2xl mt-1">{productsWithSupplier}</div>
              <div className="text-[#65727A] text-[11px] mt-0.5">Catalog products linked</div>
            </div>
          </div>

          <div className={`rounded-2xl p-4 border shadow-xs flex flex-col justify-between ${
            supplierItemsNeedingRestock > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-[#E4E8E6]'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Needs Restock</span>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                supplierItemsNeedingRestock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-[#65727A]'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
            </div>
            <div>
              <div className={`font-800 text-2xl mt-1 ${supplierItemsNeedingRestock > 0 ? 'text-amber-700' : 'text-[#10212B]'}`}>
                {supplierItemsNeedingRestock} items
              </div>
              <div className="text-[#65727A] text-[11px] mt-0.5">
                {supplierItemsNeedingRestock > 0 ? 'Below reorder threshold' : 'Stock levels healthy'}
              </div>
            </div>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by supplier, contact person, phone, or category…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-xs sm:text-sm font-600 text-[#10212B] focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories ({availableCategories.length})</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3.5 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-xs sm:text-sm font-600 text-[#10212B] focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              onClick={() => setShowCategoriesModal(true)}
              className="px-3.5 py-2.5 bg-[#0D2B45] text-white font-700 text-xs sm:text-sm rounded-xl hover:bg-[#1a3d5c] transition-all cursor-pointer shadow-sm shrink-0 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Manage Categories</span>
            </button>

            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-[#1E7D3B] text-white font-700 text-xs sm:text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20 shrink-0 flex items-center gap-1.5"
            >
              <span>+ Add Supplier</span>
            </button>
          </div>
        </div>

        {/* Suppliers Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => {
            const mappedProducts = state.products.filter(p => p.supplierId === s.id);
            const needsRestockCount = mappedProducts.filter(p => p.stock <= p.reorderLevel).length;
            const categoriesList = Array.isArray(s.categories) ? s.categories : [];

            return (
              <div key={s.id} className="bg-white rounded-2xl border border-[#E4E8E6] p-5 flex flex-col justify-between hover:shadow-xs transition-shadow">
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0D2B45] text-white flex items-center justify-center font-800 text-sm shrink-0 uppercase">
                        {s.name.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-700 text-sm sm:text-base text-[#10212B] truncate">{s.name}</div>
                        <div className="text-xs text-[#65727A] truncate">Contact: {s.contact || 'Direct Sales'}</div>
                      </div>
                    </div>
                    <button onClick={() => handleToggleStatus(s)} className="cursor-pointer shrink-0" title="Click to toggle status">
                      <Badge variant={s.status === 'active' ? 'green' : 'gray'}>
                        {s.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </div>

                  {/* Supplier Details */}
                  <div className="space-y-1.5 text-xs text-[#65727A] bg-[#F7F8F6] p-3 rounded-xl mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-600 text-[#10212B] w-14 shrink-0">Phone:</span>
                      <span className="truncate">{s.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-600 text-[#10212B] w-14 shrink-0">Email:</span>
                      <span className="truncate">{s.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-600 text-[#10212B] w-14 shrink-0">Address:</span>
                      <span className="truncate">{s.address || '—'}</span>
                    </div>
                    {s.loginEmail && (
                      <div className="flex items-center gap-2 pt-1 border-t border-[#E4E8E6]/60">
                        <span className="font-700 text-[#1E7D3B] w-14 shrink-0">Portal:</span>
                        <span className="font-mono text-xs text-[#0D2B45] truncate font-600">{s.loginEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Inventory Link Badge */}
                  <div className="flex items-center justify-between text-xs mb-3 px-1">
                    <span className="text-[#65727A]">Products Supplied:</span>
                    <div className="flex items-center gap-1.5 font-700">
                      <span className="text-[#0D2B45]">{mappedProducts.length} items</span>
                      {needsRestockCount > 0 && (
                        <span className="text-amber-600 text-[11px] bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                          {needsRestockCount} low
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Categories Pills */}
                  <div>
                    <div className="text-[10px] font-700 uppercase tracking-wider text-[#65727A] mb-1.5">
                      Supplied Categories ({categoriesList.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {categoriesList.map(cat => (
                        <span
                          key={cat}
                          className="text-[11px] font-600 bg-[#E8F5E9] text-[#1E7D3B] border border-[#C8E6C9] px-2 py-0.5 rounded-lg"
                        >
                          {cat}
                        </span>
                      ))}
                      {categoriesList.length === 0 && (
                        <span className="text-[11px] text-[#65727A]/70 italic">No categories assigned</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-3 border-t border-[#F7F8F6] flex items-center justify-between">
                  <button
                    onClick={() => openEditModal(s)}
                    className="px-3 py-1.5 bg-[#F7F8F6] text-[#0D2B45] hover:bg-[#E4E8E6] text-xs font-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Edit Details
                  </button>

                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {suppliers.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-[#E4E8E6] p-12 text-center">
              <div className="text-[#65727A] text-sm font-600">No suppliers found</div>
              <p className="text-xs text-[#65727A]/70 mt-1">
                {search || categoryFilter !== 'All' || statusFilter !== 'all'
                  ? 'Try adjusting your search query or filters.'
                  : 'Click "+ Add Supplier" above to register your first supplier partner.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        open={showAddModal || !!editingSupplier}
        onClose={() => {
          setShowAddModal(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Register New Supplier'}
        size="lg"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-700 text-[#10212B] uppercase tracking-wider">
                Supplier / Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => { setName(e.target.value); clearFormError('name'); }}
                placeholder="e.g. ABC Wholesale Distributor"
                aria-invalid={!!formErrors.name}
                className={fieldClass('name')}
              />
              {formErrors.name && <p className="mt-1 text-[11px] font-600 text-red-600">{formErrors.name}</p>}
            </div>

            <div>
              <label className="text-xs font-700 text-[#10212B] uppercase tracking-wider">
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={e => { setContact(e.target.value); clearFormError('contact'); }}
                placeholder="e.g. Rico Santos (Account Rep)"
                aria-invalid={!!formErrors.contact}
                className={fieldClass('contact')}
              />
              {formErrors.contact && <p className="mt-1 text-[11px] font-600 text-red-600">{formErrors.contact}</p>}
            </div>

            <div>
              <label className="text-xs font-700 text-[#10212B] uppercase tracking-wider">
                Contact Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => { setPhone(e.target.value); clearFormError('phone'); }}
                placeholder="e.g. 0917-123-4567 or 02-888-1234"
                aria-invalid={!!formErrors.phone}
                className={fieldClass('phone')}
              />
              {formErrors.phone && <p className="mt-1 text-[11px] font-600 text-red-600">{formErrors.phone}</p>}
            </div>

            <div>
              <label className="text-xs font-700 text-[#10212B] uppercase tracking-wider">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearFormError('email'); }}
                placeholder="e.g. orders@distributor.ph"
                aria-invalid={!!formErrors.email}
                className={fieldClass('email')}
              />
              {formErrors.email && <p className="mt-1 text-[11px] font-600 text-red-600">{formErrors.email}</p>}
            </div>

            <div>
              <label className="text-xs font-700 text-[#10212B] uppercase tracking-wider">
                Warehouse / Office Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={e => { setAddress(e.target.value); clearFormError('address'); }}
                placeholder="e.g. Divisoria, Manila"
                aria-invalid={!!formErrors.address}
                className={fieldClass('address')}
              />
              {formErrors.address && <p className="mt-1 text-[11px] font-600 text-red-600">{formErrors.address}</p>}
            </div>

            <div>
              <label className="text-xs font-700 text-[#10212B] uppercase tracking-wider">
                Partner Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="mt-1.5 w-full px-3 py-2 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] cursor-pointer"
              >
                <option value="active">Active (Available for Restock)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Supplier Partner Portal Credentials */}
          <div className="p-3.5 bg-[#E8F5E9]/50 border border-[#1E7D3B]/20 rounded-xl space-y-3">
            <div>
              <div className="text-xs font-800 text-[#0D2B45] uppercase tracking-wider">
                Partner Portal Login Access
              </div>
              <p className="text-[11px] text-[#65727A] mt-0.5">
                Suppliers use these credentials to log in at the Supplier Portal (<span className="font-mono text-[#1E7D3B]">/supplier/login</span>) to manage their inventory and fulfill orders.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-700 text-[#10212B]">Portal Login Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); clearFormError('loginEmail'); }}
                  placeholder="e.g. partner@supplier.ph"
                  aria-invalid={!!formErrors.loginEmail}
                  className={`${fieldClass('loginEmail')} mt-1 text-xs sm:text-sm`}
                />
                {formErrors.loginEmail && <p className="mt-1 text-[11px] font-600 text-red-600">{formErrors.loginEmail}</p>}
              </div>

              <div>
                <label className="text-xs font-700 text-[#10212B]">Portal Password <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearFormError('password'); }}
                  placeholder="supplier123"
                  aria-invalid={!!formErrors.password}
                  className={`${fieldClass('password')} mt-1 text-xs sm:text-sm font-mono`}
                />
                {formErrors.password && <p className="mt-1 text-[11px] font-600 text-red-600">{formErrors.password}</p>}
              </div>
            </div>
          </div>

          {/* Dynamic Categories Multi-Select (No comma-separated text) */}
          <div className="pt-2 border-t border-[#F7F8F6]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-700 text-[#10212B] uppercase tracking-wider">
                Select Supplied Categories ({selectedCategories.length} selected) <span className="text-red-500">*</span>
              </label>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="text-[11px] text-[#65727A] hover:text-red-600 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>
            {formErrors.categories && <p className="mt-1.5 text-[11px] font-600 text-red-600">{formErrors.categories}</p>}
            <p className="text-xs text-[#65727A] mb-2.5">
              Tap categories from your store catalog provided by this supplier:
            </p>

            <div className="flex flex-wrap gap-2 p-3 bg-[#F7F8F6] border border-[#E4E8E6] rounded-xl max-h-48 overflow-y-auto">
              {availableCategories.map(cat => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[#1E7D3B] text-white border-[#1E7D3B] shadow-2xs'
                        : 'bg-white text-[#4A5568] border-[#E4E8E6] hover:border-[#1E7D3B]/40 hover:text-[#10212B]'
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <span className="text-[10px]">✓</span>}
                  </button>
                );
              })}

              {availableCategories.length === 0 && (
                <div className="text-xs text-[#65727A] py-2">No categories found in store inventory.</div>
              )}
            </div>

            {/* Quick add custom category */}
            <div className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                placeholder="Or add custom category (e.g. Frozen Foods, Dairy)…"
                value={newCategoryInput}
                onChange={e => setNewCategoryInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
                className="flex-1 px-3 py-2 bg-white border border-[#E4E8E6] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#1E7D3B] focus:border-[#1E7D3B]"
              />
              <button
                type="button"
                onClick={handleAddCustomCategory}
                className="px-3.5 py-2 bg-[#0D2B45] text-white text-xs font-700 rounded-xl hover:bg-[#1a3d5c] transition-all cursor-pointer shrink-0"
              >
                + Add Category
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer disabled:opacity-60 shadow-md shadow-[#1E7D3B]/20"
            >
              {submitting
                ? 'Saving Supplier Partner…'
                : editingSupplier
                ? 'Update Supplier'
                : 'Save Supplier Partner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Manager Modal */}
      <Modal
        open={showCategoriesModal}
        onClose={() => {
          setShowCategoriesModal(false);
          setCategoryError('');
        }}
        title="Manage Marketplace Categories"
        size="md"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddCategory} className="space-y-2">
            <label className="text-xs font-700 text-[#0D2B45] uppercase tracking-wider">
              Add New Product Category
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => {
                  setNewCategoryName(e.target.value);
                  if (categoryError) setCategoryError('');
                }}
                placeholder="e.g. Frozen Goods, Bakery, Dairy"
                className={`flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  categoryError ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#165f2c] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20 shrink-0"
              >
                + Add
              </button>
            </div>
            {categoryError && <span className="text-[11px] text-red-500 font-600 block">{categoryError}</span>}
          </form>

          <div className="pt-2 border-t border-[#E4E8E6]">
            <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider mb-2">
              Existing Marketplace Categories ({availableCategories.length})
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {availableCategories.map(catName => {
                const count = state.products.filter(p => p.category === catName).length;
                const matchedCategory = state.categories.find(
                  c => c.name.toLowerCase() === catName.toLowerCase()
                );
                return (
                  <div
                    key={catName}
                    className="flex items-center justify-between p-2.5 bg-[#F7F8F6] rounded-xl hover:bg-[#ecefed] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-700 text-[#10212B]">{catName}</span>
                      <span className="text-[11px] text-[#65727A] bg-white px-2 py-0.5 rounded-full border border-[#E4E8E6]">
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeletingCategory(matchedCategory || { name: catName })}
                      className="text-xs text-red-600 hover:underline cursor-pointer px-1 font-600"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Category Confirmation Dialog */}
      <ConfirmDialog
        open={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete category "${deletingCategory?.name}"? Any existing supplier products under this category will retain their category name.`}
        danger
      />
    </InternalLayout>
  );
}
