import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge, StockBadge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import type { Product, ProductCategory } from '../../types';
import { saveRecord, deleteRecord, uploadProductImage } from '../../services/firebase/rtdbService';

interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  supplierId: string;
  sellingPrice: string;
  costPrice: string;
  stock: string;
  reorderLevel: string;
}

export function ProductsPage() {
  const { state, dispatch, showToast, formatPHP, logAudit } = useApp();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Category Manager State
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);

  // Form state & validation
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    category: '',
    supplierId: '',
    sellingPrice: '',
    costPrice: '',
    stock: '',
    reorderLevel: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Confirmation dialogs
  const [pendingSave, setPendingSave] = useState<{ isEdit: boolean; data: ProductFormData } | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);

  const isSubmittingRef = useRef(false);

  // Category filter list
  const availableCategoryNames = Array.from(
    new Set([
      ...state.categories.map(c => c.name),
      ...state.products.map(p => p.category).filter(Boolean),
    ])
  );
  const [categoryFilter, setCategoryFilter] = useState('All');

  const products = state.products.filter(p =>
    (categoryFilter === 'All' || p.category === categoryFilter) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  // When opening edit modal, populate form
  useEffect(() => {
    if (editProduct) {
      setFormData({
        name: editProduct.name || '',
        sku: editProduct.sku || '',
        category: editProduct.category || '',
        supplierId: editProduct.supplierId || '',
        sellingPrice: String(editProduct.sellingPrice ?? ''),
        costPrice: String(editProduct.costPrice ?? ''),
        stock: String(editProduct.stock ?? ''),
        reorderLevel: String(editProduct.reorderLevel ?? ''),
      });
      setPreviewUrl(editProduct.imageUrl || null);
      setSelectedFile(null);
      setErrors({});
    }
  }, [editProduct]);

  // When opening add modal, reset form
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      sku: '',
      category: availableCategoryNames[0] || '',
      supplierId: '',
      sellingPrice: '',
      costPrice: '',
      stock: '',
      reorderLevel: '',
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrors({});
    setShowAdd(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(editProduct?.imageUrl || null);
    }
  };

  const validateForm = (data: ProductFormData): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.name.trim()) newErrors.name = 'Product name is required';
    if (!data.sku.trim()) newErrors.sku = 'SKU is required';
    if (!data.category.trim()) newErrors.category = 'Category is required';

    if (!data.sellingPrice.trim()) {
      newErrors.sellingPrice = 'Selling price is required';
    } else if (isNaN(Number(data.sellingPrice)) || Number(data.sellingPrice) <= 0) {
      newErrors.sellingPrice = 'Must be greater than 0';
    }

    if (!data.costPrice.trim()) {
      newErrors.costPrice = 'Cost price is required';
    } else if (isNaN(Number(data.costPrice)) || Number(data.costPrice) < 0) {
      newErrors.costPrice = 'Cannot be negative';
    }

    if (!data.stock.trim()) {
      newErrors.stock = 'Stock is required';
    } else if (isNaN(Number(data.stock)) || Number(data.stock) < 0) {
      newErrors.stock = 'Cannot be negative';
    }

    if (!data.reorderLevel.trim()) {
      newErrors.reorderLevel = 'Reorder level is required';
    } else if (isNaN(Number(data.reorderLevel)) || Number(data.reorderLevel) < 0) {
      newErrors.reorderLevel = 'Cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Pre-submit validation -> Open confirmation modal
  const handleSubmitForm = (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    if (!validateForm(formData)) {
      showToast('error', 'Please fill in all required text boxes.');
      return;
    }
    setPendingSave({ isEdit, data: formData });
  };

  // Confirmed Save Execution
  const executeSaveProduct = async () => {
    if (!pendingSave || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setUploading(true);

    const { isEdit, data } = pendingSave;
    const prodId = isEdit && editProduct ? editProduct.id : `p${Date.now()}`;

    let finalImageUrl = isEdit && editProduct ? editProduct.imageUrl : undefined;
    if (selectedFile) {
      try {
        finalImageUrl = await uploadProductImage(selectedFile, prodId);
      } catch (err: any) {
        console.error('Image upload failed:', err);
        showToast('error', 'Could not upload photo; saving product without new image.');
      }
    }

    const productPayload: Product = {
      id: prodId,
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      category: data.category.trim(),
      supplierId: data.supplierId || '',
      sellingPrice: parseFloat(data.sellingPrice),
      costPrice: parseFloat(data.costPrice),
      stock: parseInt(data.stock),
      reorderLevel: parseInt(data.reorderLevel),
      status: isEdit && editProduct ? editProduct.status : 'active',
      imageUrl: finalImageUrl,
    };

    try {
      await saveRecord('products', productPayload);
      if (isEdit) {
        dispatch({ type: 'UPDATE_PRODUCT', product: productPayload });
        await logAudit({
          category: 'inventory',
          action: 'product.update',
          summary: `Updated product "${productPayload.name}" (${productPayload.sku})`,
          targetType: 'product',
          targetId: productPayload.id,
          targetLabel: productPayload.sku,
        });
        showToast('success', `Product "${productPayload.name}" updated!`);
        setEditProduct(null);
      } else {
        await logAudit({
          category: 'inventory',
          action: 'product.create',
          summary: `Added product "${productPayload.name}" (${productPayload.sku}) to catalog for ${formatPHP(productPayload.sellingPrice)}`,
          targetType: 'product',
          targetId: productPayload.id,
          targetLabel: productPayload.sku,
          amount: productPayload.sellingPrice,
        });
        showToast('success', `Product "${productPayload.name}" added!`);
        setShowAdd(false);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setPendingSave(null);
    } catch (err: any) {
      showToast('error', 'Failed to save product: ' + err.message);
    } finally {
      setUploading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductTarget) return;
    try {
      await deleteRecord('products', deleteProductTarget.id);
      dispatch({ type: 'DELETE_PRODUCT', productId: deleteProductTarget.id });
      await logAudit({
        category: 'inventory',
        action: 'product.delete',
        summary: `Deleted product "${deleteProductTarget.name}" (${deleteProductTarget.sku}) from catalog`,
        targetType: 'product',
        targetId: deleteProductTarget.id,
        targetLabel: deleteProductTarget.sku,
      });
      showToast('info', `Product "${deleteProductTarget.name}" deleted.`);
      setDeleteProductTarget(null);
    } catch (err: any) {
      showToast('error', 'Failed to delete: ' + err.message);
    }
  };

  // Category Management Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) {
      setCategoryError('Category name is required');
      return;
    }
    if (availableCategoryNames.some(c => c.toLowerCase() === clean.toLowerCase())) {
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
      showToast('success', `Category "${clean}" added!`);
      // Select the newly created category in the product form if open
      setFormData(prev => ({ ...prev, category: clean }));
    } catch (err: any) {
      showToast('error', 'Failed to save category: ' + err.message);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await deleteRecord('categories', deletingCategory.id);
      dispatch({ type: 'DELETE_CATEGORY', categoryId: deletingCategory.id });
      await logAudit({
        category: 'inventory',
        action: 'category.delete',
        summary: `Deleted product category "${deletingCategory.name}"`,
        targetType: 'category',
        targetId: deletingCategory.id,
        targetLabel: deletingCategory.name,
      });
      showToast('info', `Category "${deletingCategory.name}" removed.`);
      setDeletingCategory(null);
    } catch (err: any) {
      showToast('error', 'Failed to delete category: ' + err.message);
    }
  };

  const renderFormFields = (isEdit: boolean) => (
    <form onSubmit={e => handleSubmitForm(e, isEdit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-xs font-600 text-[#65727A]">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => {
              setFormData({ ...formData, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            placeholder="e.g. Coca-Cola 1.5L"
            className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
              errors.name ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
            }`}
          />
          {errors.name && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.name}</span>}
        </div>

        <div>
          <label className="text-xs font-600 text-[#65727A]">
            SKU <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.sku}
            onChange={e => {
              setFormData({ ...formData, sku: e.target.value });
              if (errors.sku) setErrors({ ...errors, sku: '' });
            }}
            placeholder="e.g. BEV-001"
            className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
              errors.sku ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
            }`}
          />
          {errors.sku && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.sku}</span>}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-600 text-[#65727A]">
              Category <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowCategoriesModal(true)}
              className="text-[11px] text-[#1E7D3B] font-600 hover:underline cursor-pointer"
            >
              + Manage Categories
            </button>
          </div>
          <select
            value={formData.category}
            onChange={e => {
              setFormData({ ...formData, category: e.target.value });
              if (errors.category) setErrors({ ...errors, category: '' });
            }}
            className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all cursor-pointer ${
              errors.category ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
            }`}
          >
            <option value="">Select Category...</option>
            {availableCategoryNames.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.category}</span>}
        </div>

        <div>
          <label className="text-xs font-600 text-[#65727A]">Supplier</label>
          <select
            value={formData.supplierId}
            onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B] cursor-pointer"
          >
            <option value="">None / General</option>
            {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-600 text-[#65727A]">
            Selling Price (₱) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.sellingPrice}
            onChange={e => {
              setFormData({ ...formData, sellingPrice: e.target.value });
              if (errors.sellingPrice) setErrors({ ...errors, sellingPrice: '' });
            }}
            placeholder="0.00"
            className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
              errors.sellingPrice ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
            }`}
          />
          {errors.sellingPrice && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.sellingPrice}</span>}
        </div>

        <div>
          <label className="text-xs font-600 text-[#65727A]">
            Cost Price (₱) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.costPrice}
            onChange={e => {
              setFormData({ ...formData, costPrice: e.target.value });
              if (errors.costPrice) setErrors({ ...errors, costPrice: '' });
            }}
            placeholder="0.00"
            className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
              errors.costPrice ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
            }`}
          />
          {errors.costPrice && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.costPrice}</span>}
        </div>

        <div>
          <label className="text-xs font-600 text-[#65727A]">
            Current Stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.stock}
            onChange={e => {
              setFormData({ ...formData, stock: e.target.value });
              if (errors.stock) setErrors({ ...errors, stock: '' });
            }}
            placeholder="0"
            className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
              errors.stock ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
            }`}
          />
          {errors.stock && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.stock}</span>}
        </div>

        <div>
          <label className="text-xs font-600 text-[#65727A]">
            Reorder Level <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.reorderLevel}
            onChange={e => {
              setFormData({ ...formData, reorderLevel: e.target.value });
              if (errors.reorderLevel) setErrors({ ...errors, reorderLevel: '' });
            }}
            placeholder="10"
            className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
              errors.reorderLevel ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
            }`}
          />
          {errors.reorderLevel && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.reorderLevel}</span>}
        </div>
      </div>

      {/* Photo Upload Section */}
      <div className="pt-2 border-t border-[#E4E8E6]">
        <label className="text-xs font-600 text-[#65727A] block mb-1">Product Photo (Optional)</label>
        <div className="flex items-center gap-4 bg-[#F7F8F6] p-3 rounded-xl border border-[#E4E8E6]">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-[#E4E8E6] shrink-0 bg-white" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white border border-dashed border-[#C5CBD0] flex items-center justify-center text-[#65727A] text-xs shrink-0">
              📷
            </div>
          )}
          <div className="flex-1 min-w-0">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-xs text-[#65727A] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-600 file:bg-white file:text-[#0D2B45] hover:file:bg-[#E4E8E6] file:cursor-pointer cursor-pointer"
            />
            <p className="text-[11px] text-[#65727A] mt-1">Upload JPEG, PNG or WebP images.</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer disabled:opacity-60 shadow-sm shadow-[#1E7D3B]/20 mt-2"
      >
        {uploading ? 'Saving…' : 'Save'}
      </button>
    </form>
  );

  return (
    <InternalLayout title="Products">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {availableCategoryNames.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCategoriesModal(true)}
              className="px-3.5 py-2.5 bg-white border border-[#E4E8E6] text-[#0D2B45] font-600 text-sm rounded-xl hover:bg-[#F7F8F6] transition-all cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5"
            >
              <span>🏷️</span>
              <span className="hidden sm:inline">Categories</span>
              <span className="text-xs bg-[#E4E8E6] px-1.5 py-0.5 rounded-full text-[#65727A]">
                {availableCategoryNames.length}
              </span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shrink-0 shadow-sm shadow-[#1E7D3B]/20"
            >
              + Add Product
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-[#F7F8F6]">
            {products.map(p => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-[#E4E8E6] shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#F7F8F6] flex items-center justify-center text-sm text-[#65727A] font-700 shrink-0">
                      {p.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-700 text-sm text-[#10212B] truncate">{p.name}</div>
                    <div className="text-xs text-[#65727A]">{p.sku} · {p.category}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-800 text-sm text-[#0D2B45]">{formatPHP(p.sellingPrice)}</span>
                      <span className="text-[11px] text-[#65727A]">Cost: {formatPHP(p.costPrice)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StockBadge stock={p.stock} reorderLevel={p.reorderLevel} />
                    <Badge variant={p.status === 'active' ? 'green' : 'gray'} size="sm">{p.status}</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#F7F8F6]">
                  <span className="text-xs text-[#65727A]">Stock: <b className="text-[#10212B]">{p.stock} units</b></span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditProduct(p)}
                      className="px-2.5 py-1 bg-[#F7F8F6] hover:bg-[#E4E8E6] text-[#1E7D3B] text-xs font-600 rounded-lg cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteProductTarget(p)}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-600 rounded-lg cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="p-8 text-center text-xs text-[#65727A]">
                No products found. Click "+ Add Product" to add one.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider border-b border-[#F7F8F6] bg-[#F7F8F6]">
                  <th className="text-left px-5 py-3">Product</th>
                  <th className="text-left px-5 py-3">SKU</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">Selling Price</th>
                  <th className="text-left px-5 py-3">Cost Price</th>
                  <th className="text-left px-5 py-3">Stock</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Catalog</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-[#F7F8F6]/50 transition-colors">
                    <td className="px-5 py-3 font-600 text-sm text-[#10212B]">
                      <div className="flex items-center gap-2.5">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-[#E4E8E6]" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#F7F8F6] flex items-center justify-center text-xs text-[#65727A] font-700">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#65727A] font-mono">{p.sku}</td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{p.category}</td>
                    <td className="px-5 py-3 font-700 text-sm text-[#10212B]">{formatPHP(p.sellingPrice)}</td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{formatPHP(p.costPrice)}</td>
                    <td className="px-5 py-3 font-800 text-sm text-[#10212B]">{p.stock}</td>
                    <td className="px-5 py-3"><StockBadge stock={p.stock} reorderLevel={p.reorderLevel} /></td>
                    <td className="px-5 py-3"><Badge variant={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditProduct(p)}
                          className="text-xs text-[#1E7D3B] font-600 hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteProductTarget(p)}
                          className="text-xs text-red-600 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <div className="text-[#65727A] text-sm font-600">No products found</div>
                      <p className="text-xs text-[#65727A]/70 mt-1">Click "+ Add Product" to add a product to the catalog.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Product" size="lg">
        {renderFormFields(false)}
      </Modal>

      {/* Edit Modal */}
      <Modal open={editProduct !== null} onClose={() => setEditProduct(null)} title="Edit Product" size="lg">
        {renderFormFields(true)}
      </Modal>

      {/* Category Manager Modal */}
      <Modal open={showCategoriesModal} onClose={() => { setShowCategoriesModal(false); setCategoryError(''); }} title="Manage Product Categories" size="md">
        <div className="space-y-4">
          <form onSubmit={handleAddCategory} className="space-y-2">
            <label className="text-xs font-600 text-[#65727A]">Add New Category</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => {
                  setNewCategoryName(e.target.value);
                  if (categoryError) setCategoryError('');
                }}
                placeholder="e.g. Frozen Goods, Bakery"
                className={`flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  categoryError ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20 shrink-0"
              >
                + Add
              </button>
            </div>
            {categoryError && <span className="text-[11px] text-red-500 font-500 block">{categoryError}</span>}
          </form>

          <div className="pt-2 border-t border-[#E4E8E6]">
            <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider mb-2">Existing Categories</div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {availableCategoryNames.map(catName => {
                const count = state.products.filter(p => p.category === catName).length;
                const matchedCategory = state.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                return (
                  <div key={catName} className="flex items-center justify-between p-2.5 bg-[#F7F8F6] rounded-xl hover:bg-[#ecefed] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-600 text-[#10212B]">{catName}</span>
                      <span className="text-[11px] text-[#65727A] bg-white px-2 py-0.5 rounded-full border border-[#E4E8E6]">
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    {matchedCategory && (
                      <button
                        type="button"
                        onClick={() => setDeletingCategory(matchedCategory)}
                        className="text-xs text-red-600 hover:underline cursor-pointer px-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog for Save */}
      <ConfirmDialog
        open={pendingSave !== null}
        onClose={() => setPendingSave(null)}
        onConfirm={executeSaveProduct}
        title={pendingSave?.isEdit ? 'Confirm Update Product' : 'Confirm Add Product'}
        message={
          pendingSave?.isEdit
            ? `Are you sure you want to save changes to "${pendingSave?.data.name}"?`
            : `Are you sure you want to add "${pendingSave?.data.name}" to the catalog for ${formatPHP(Number(pendingSave?.data.sellingPrice) || 0)}?`
        }
        confirmLabel="Save"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteProductTarget !== null}
        onClose={() => setDeleteProductTarget(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteProductTarget?.name}"? This will permanently remove it from the catalog.`}
        danger
      />

      {/* Delete Category Confirmation Dialog */}
      <ConfirmDialog
        open={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete category "${deletingCategory?.name}"? Existing products under this category will retain their category name.`}
        danger
      />
    </InternalLayout>
  );
}
