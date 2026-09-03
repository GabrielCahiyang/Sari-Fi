import { useState, useMemo, useRef } from 'react';
import { SupplierLayout } from '../../components/layout/SupplierLayout';
import { useApp } from '../../context/AppContext';
import { saveRecord, deleteRecord } from '../../services/firebase/rtdbService';
import type { Product } from '../../types';

export function SupplierProductsPage() {
  const { state, dispatch, formatPHP, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const supplier = useMemo(() => {
    return state.suppliers.find(s => s.id === state.currentUser?.supplierId) || {
      id: state.currentUser?.supplierId || 'sup1',
      name: state.currentUser?.name || 'Wholesale Supplier',
      email: state.currentUser?.email || 'supplier@sarifi.ph',
      status: 'active' as const,
    };
  }, [state.suppliers, state.currentUser]);

  // Supplier's own products
  const myProducts = useMemo(() => {
    return state.products.filter(p => p.supplierId === supplier.id);
  }, [state.products, supplier.id]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    state.categories.forEach(c => set.add(c.name));
    myProducts.forEach(p => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [state.categories, myProducts]);

  const filtered = useMemo(() => {
    return myProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [myProducts, search, categoryFilter]);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Beverages',
    sellingPrice: '',
    costPrice: '',
    stock: '',
    reorderLevel: '12',
    imageUrl: '',
    status: 'active' as 'active' | 'inactive',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Image file is too large (max 10MB).');
      return;
    }

    setProcessingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Downscale image to max 800x800 for optimal RTDB storage
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
          showToast('success', 'Product photo uploaded.');
        }
        setProcessingImage(false);
      };
      img.onerror = () => {
        showToast('error', 'Failed to process image file.');
        setProcessingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      showToast('error', 'Failed to read image file.');
      setProcessingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      category: categories.find(c => c !== 'All') || 'Beverages',
      sellingPrice: '',
      costPrice: '',
      stock: '',
      reorderLevel: '12',
      imageUrl: '',
      status: 'active',
    });
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      sellingPrice: String(prod.sellingPrice),
      costPrice: String(prod.costPrice),
      stock: String(prod.stock),
      reorderLevel: String(prod.reorderLevel),
      imageUrl: prod.imageUrl || '',
      status: prod.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('error', 'Please enter a product name.');
      return;
    }

    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const costPrice = parseFloat(formData.costPrice) || 0;
    const stock = parseInt(formData.stock) || 0;
    const reorderLevel = parseInt(formData.reorderLevel) || 10;

    const prodId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
    const productRecord: Product = {
      id: prodId,
      name: formData.name.trim(),
      sku: formData.sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      category: formData.category,
      supplierId: supplier.id,
      sellingPrice,
      costPrice,
      stock,
      reorderLevel,
      status: formData.status,
      imageUrl: formData.imageUrl.trim() || undefined,
    };

    try {
      await saveRecord('products', productRecord);
      if (editingProduct) {
        dispatch({ type: 'UPDATE_PRODUCT', product: productRecord });
        showToast('success', `Product "${productRecord.name}" updated successfully.`);
      } else {
        dispatch({ type: 'ADD_PRODUCT', product: productRecord });
        showToast('success', `Product "${productRecord.name}" added to your catalog.`);
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to save product: ' + err.message);
    }
  };

  const handleDelete = async (prod: Product) => {
    if (!confirm(`Are you sure you want to remove "${prod.name}" from your catalog?`)) return;
    try {
      await deleteRecord('products', prod.id);
      dispatch({ type: 'DELETE_PRODUCT', productId: prod.id });
      showToast('success', `Removed "${prod.name}".`);
    } catch (err: any) {
      showToast('error', 'Failed to delete: ' + err.message);
    }
  };

  return (
    <SupplierLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45] tracking-tight">
              My Wholesale Products
            </h1>
            <p className="text-xs sm:text-sm text-[#65727A] mt-1">
              Products you supply to registered sari-sari stores across the platform.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 text-xs font-700 bg-[#1E7D3B] text-white hover:bg-[#165f2c] rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Product
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-[#65727A] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-700 whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#0D2B45] text-white'
                    : 'bg-white text-[#65727A] border border-[#E4E8E6] hover:border-[#1E7D3B]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products List / Table */}
        <div data-tour-target="0" className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden shadow-xs">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[#65727A]">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F7F8F6] flex items-center justify-center text-[#A0AEC0]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="font-700 text-sm text-[#0D2B45]">No products found</div>
              <div className="text-xs mt-1">Try adjusting your search or add your first product.</div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F6] border-b border-[#E4E8E6] text-[#65727A] font-700 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Product</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5 text-right">Wholesale Price</th>
                      <th className="px-4 py-3.5 text-right">Cost Price</th>
                      <th className="px-4 py-3.5 text-right">Warehouse Stock</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E8E6]">
                    {filtered.map(p => {
                      const isLow = p.stock <= p.reorderLevel;
                      return (
                        <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-[#E4E8E6] shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-[#E8F5E9] text-[#1E7D3B] font-800 flex items-center justify-center shrink-0">
                                  {p.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="font-700 text-sm text-[#0D2B45]">{p.name}</div>
                                <div className="text-[11px] text-[#65727A]">SKU: {p.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-600 bg-[#F0F2F1] text-[#4A5568]">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-800 text-[#1E7D3B] tnum text-sm">
                            {formatPHP(p.sellingPrice)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-[#65727A] tnum">
                            {formatPHP(p.costPrice)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-md font-700 tnum ${
                              p.stock === 0
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#E8F5E9] text-[#1E7D3B]'
                            }`}>
                              {p.stock} units
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block text-[10px] font-700 uppercase px-2 py-0.5 rounded-full ${
                              p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-2">
                            <button
                              onClick={() => openEditModal(p)}
                              className="px-2.5 py-1 text-xs font-700 text-[#0D2B45] hover:bg-[#F0F2F1] rounded-lg transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="px-2.5 py-1 text-xs font-700 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-[#E4E8E6]">
                {filtered.map(p => {
                  const isLow = p.stock <= p.reorderLevel;
                  return (
                    <div key={p.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-[#E4E8E6] shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#E8F5E9] text-[#1E7D3B] font-800 flex items-center justify-center shrink-0">
                              {p.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-700 text-sm text-[#0D2B45]">{p.name}</div>
                            <div className="text-[11px] text-[#65727A]">SKU: {p.sku} · {p.category}</div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-700 uppercase px-2 py-0.5 rounded-full ${
                          p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-[#F7F8F6] p-2.5 rounded-xl text-center text-xs">
                        <div>
                          <div className="text-[10px] text-[#65727A]">Wholesale</div>
                          <div className="font-800 text-[#1E7D3B] tnum">{formatPHP(p.sellingPrice)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#65727A]">Cost</div>
                          <div className="font-700 text-[#4A5568] tnum">{formatPHP(p.costPrice)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#65727A]">Stock</div>
                          <div className={`font-800 tnum ${isLow ? 'text-red-600' : 'text-[#0D2B45]'}`}>
                            {p.stock}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="px-3 py-1.5 text-xs font-700 bg-[#F0F2F1] text-[#0D2B45] hover:bg-[#E4E8E6] rounded-lg transition-colors cursor-pointer"
                        >
                          Edit Details
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="px-3 py-1.5 text-xs font-700 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Add / Edit Product Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#E4E8E6] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 sm:p-5 border-b border-[#E4E8E6] flex items-center justify-between bg-[#F7F8F6]">
                <h3 className="font-800 text-base text-[#0D2B45]">
                  {editingProduct ? 'Edit Wholesale Product' : 'Add New Wholesale Product'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-[#65727A] hover:bg-white cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-700 text-[#0D2B45] mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Coca-Cola 1.5L (Case of 12)"
                    className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-700 text-[#0D2B45] mb-1">SKU / Code</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={e => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="BEV-001"
                      className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-700 text-[#0D2B45] mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                    >
                      {categories.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-700 text-[#0D2B45] mb-1">Wholesale Selling Price (₱) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                      placeholder="Price to sari-sari stores"
                      className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-700 text-[#0D2B45] mb-1">Supplier Cost Price (₱)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                      placeholder="Your production/acquisition cost"
                      className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-700 text-[#0D2B45] mb-1">Current Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={e => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="Units on hand"
                      className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-700 text-[#0D2B45] mb-1">Reorder Alert Level</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.reorderLevel}
                      onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })}
                      placeholder="12"
                      className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                    />
                  </div>
                </div>

                {/* Product Photo Upload Section */}
                <div>
                  <label className="block text-xs font-700 text-[#0D2B45] mb-1.5">
                    Product Photo
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {formData.imageUrl ? (
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#F7F8F6] border border-[#E4E8E6]">
                      <img
                        src={formData.imageUrl}
                        alt="Product preview"
                        className="w-16 h-16 rounded-xl object-cover border border-[#E4E8E6] bg-white shrink-0 shadow-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-700 text-[#10212B] truncate">Photo Attached</div>
                        <div className="text-[11px] text-[#65727A] mt-0.5">Ready for catalog and store owners</div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] font-700 text-[#1E7D3B] hover:underline cursor-pointer"
                          >
                            Change Photo
                          </button>
                          <span className="text-[#C5CBD0]">·</span>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="text-[11px] font-700 text-red-600 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-[#1E7D3B] bg-emerald-50/50'
                          : 'border-[#E4E8E6] hover:border-[#1E7D3B]/50 hover:bg-[#F7F8F6]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1E7D3B] flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-xs font-700 text-[#10212B]">
                        {processingImage ? 'Processing photo…' : 'Click to upload or drag & drop photo'}
                      </div>
                      <p className="text-[11px] text-[#65727A] mt-0.5">
                        PNG, JPG, or WEBP (automatically optimized)
                      </p>
                    </div>
                  )}

                  {/* Optional URL toggle */}
                  <div className="mt-1.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-[11px] font-600 text-[#65727A] hover:text-[#0D2B45] cursor-pointer"
                    >
                      {showUrlInput ? 'Hide web link option' : 'Or paste web link'}
                    </button>
                  </div>

                  {showUrlInput && (
                    <div className="mt-2">
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://example.com/product.jpg"
                        className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8F6] border border-[#E4E8E6]">
                  <div>
                    <div className="text-xs font-700 text-[#0D2B45]">Catalog Status</div>
                    <div className="text-[11px] text-[#65727A]">Active items are visible to sari-sari stores</div>
                  </div>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="px-3 py-1.5 border border-[#E4E8E6] rounded-lg text-xs font-700 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E4E8E6]">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-700 text-[#65727A] hover:bg-[#F7F8F6] rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-700 bg-[#1E7D3B] text-white hover:bg-[#165f2c] rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    {editingProduct ? 'Save Changes' : 'Publish Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SupplierLayout>
  );
}
