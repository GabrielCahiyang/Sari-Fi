import { useState, useMemo } from 'react';
import { SupplierLayout } from '../../components/layout/SupplierLayout';
import { useApp } from '../../context/AppContext';
import { updateRecord } from '../../services/firebase/rtdbService';
import type { Product } from '../../types';

export function SupplierInventoryPage() {
  const { state, dispatch, formatPHP, showToast, navigate } = useApp();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'healthy' | 'low' | 'out'>('all');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

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

  const totalStockUnits = useMemo(() => {
    return myProducts.reduce((sum, p) => sum + p.stock, 0);
  }, [myProducts]);

  const totalInventoryValue = useMemo(() => {
    return myProducts.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
  }, [myProducts]);

  const lowStockCount = useMemo(() => {
    return myProducts.filter(p => p.stock > 0 && p.stock <= p.reorderLevel).length;
  }, [myProducts]);

  const outOfStockCount = useMemo(() => {
    return myProducts.filter(p => p.stock === 0).length;
  }, [myProducts]);

  const healthyStockCount = useMemo(() => {
    return myProducts.filter(p => p.stock > p.reorderLevel).length;
  }, [myProducts]);

  const filtered = useMemo(() => {
    return myProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (filterMode === 'low') return p.stock > 0 && p.stock <= p.reorderLevel;
      if (filterMode === 'out') return p.stock === 0;
      if (filterMode === 'healthy') return p.stock > p.reorderLevel;
      return true;
    });
  }, [myProducts, search, filterMode]);

  const handleAdjustStock = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    if (newStock === product.stock) return;

    setAdjustingId(product.id);
    try {
      await updateRecord('products', product.id, { stock: newStock });
      const updated: Product = { ...product, stock: newStock };
      dispatch({ type: 'UPDATE_PRODUCT', product: updated });
      showToast('success', `Updated "${product.name}" stock to ${newStock} units.`);
    } catch (err: any) {
      showToast('error', 'Failed to update stock: ' + err.message);
    } finally {
      setAdjustingId(null);
    }
  };

  return (
    <SupplierLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45] tracking-tight">
              Warehouse Inventory
            </h1>
            <p className="text-xs sm:text-sm text-[#65727A] mt-1">
              Stock levels of your wholesale products supplied to the Sari-Fi platform.
            </p>
          </div>

          <button
            onClick={() => navigate('supplier/restock')}
            className="px-4 py-2.5 text-xs font-700 bg-[#1E7D3B] text-white hover:bg-[#165f2c] rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restock Shipments →
          </button>
        </div>

        {/* Bento Inventory Health Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
            <div className="text-xs font-600 text-[#65727A]">Total Stock on Hand</div>
            <div className="mt-2 text-xl sm:text-2xl font-800 text-[#0D2B45] tnum">
              {totalStockUnits.toLocaleString()} units
            </div>
            <div className="text-[11px] text-[#65727A] mt-0.5">Across {myProducts.length} active SKUs</div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
            <div className="text-xs font-600 text-[#65727A]">Warehouse Valuation</div>
            <div className="mt-2 text-xl sm:text-2xl font-800 text-[#1E7D3B] tnum">
              {formatPHP(totalInventoryValue)}
            </div>
            <div className="text-[11px] text-[#65727A] mt-0.5">At wholesale cost value</div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs ${lowStockCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-xs font-600 text-[#65727A]">Low Stock Warnings</div>
            <div className={`mt-2 text-xl sm:text-2xl font-800 tnum ${lowStockCount > 0 ? 'text-amber-700' : 'text-[#0D2B45]'}`}>
              {lowStockCount} items
            </div>
            <div className="text-[11px] text-[#65727A] mt-0.5">At or below reorder level</div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs ${outOfStockCount > 0 ? 'bg-red-50/70 border-red-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-xs font-600 text-[#65727A]">Out of Stock</div>
            <div className={`mt-2 text-xl sm:text-2xl font-800 tnum ${outOfStockCount > 0 ? 'text-red-600' : 'text-[#0D2B45]'}`}>
              {outOfStockCount} items
            </div>
            <div className="text-[11px] text-[#65727A] mt-0.5">Stores cannot order these</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-[#65727A] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: 'all', label: `All (${myProducts.length})` },
              { key: 'healthy', label: `Healthy (${healthyStockCount})` },
              { key: 'low', label: `Low Stock (${lowStockCount})` },
              { key: 'out', label: `Out of Stock (${outOfStockCount})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterMode(tab.key as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-700 whitespace-nowrap transition-colors cursor-pointer ${
                  filterMode === tab.key
                    ? 'bg-[#0D2B45] text-white'
                    : 'bg-white text-[#65727A] border border-[#E4E8E6] hover:border-[#1E7D3B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory List / Table */}
        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden shadow-xs">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[#65727A]">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F7F8F6] flex items-center justify-center text-[#A0AEC0]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="font-700 text-sm text-[#0D2B45]">No matching products found</div>
              <div className="text-xs mt-1">Try switching filters or search terms.</div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F6] border-b border-[#E4E8E6] text-[#65727A] font-700 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Product & SKU</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5 text-right">Wholesale Price</th>
                      <th className="px-4 py-3.5 text-right">Cost Price</th>
                      <th className="px-4 py-3.5 text-center">Stock Level</th>
                      <th className="px-4 py-3.5 text-center">Reorder Threshold</th>
                      <th className="px-5 py-3.5 text-right">Quick Stock Adjust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E8E6]">
                    {filtered.map(p => {
                      const isLow = p.stock > 0 && p.stock <= p.reorderLevel;
                      const isOut = p.stock === 0;
                      const isAdjusting = adjustingId === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-700 text-sm text-[#0D2B45]">{p.name}</div>
                            <div className="text-[11px] text-[#65727A] font-mono">SKU: {p.sku}</div>
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
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-3 py-1 rounded-lg font-800 text-sm tnum ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#E8F5E9] text-[#1E7D3B]'
                            }`}>
                              {p.stock} units
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-[#65727A] tnum font-600">
                            {p.reorderLevel} units
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                disabled={p.stock === 0 || isAdjusting}
                                onClick={() => handleAdjustStock(p, -1)}
                                className="w-7 h-7 rounded-lg bg-[#F0F2F1] hover:bg-[#E4E8E6] text-[#0D2B45] font-800 text-xs flex items-center justify-center cursor-pointer disabled:opacity-40"
                                title="Subtract 1 unit"
                              >
                                −
                              </button>
                              <span className="w-10 text-center font-800 text-sm tnum">
                                {p.stock}
                              </span>
                              <button
                                disabled={isAdjusting}
                                onClick={() => handleAdjustStock(p, 1)}
                                className="w-7 h-7 rounded-lg bg-[#F0F2F1] hover:bg-[#E4E8E6] text-[#0D2B45] font-800 text-xs flex items-center justify-center cursor-pointer"
                                title="Add 1 unit"
                              >
                                +
                              </button>
                              <button
                                onClick={() => navigate('supplier/restock')}
                                className="ml-2 px-2 py-1 text-[11px] font-700 text-[#1E7D3B] hover:bg-[#E8F5E9] rounded-md transition-colors cursor-pointer"
                                title="Go to batch restock"
                              >
                                + Batch
                              </button>
                            </div>
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
                  const isLow = p.stock > 0 && p.stock <= p.reorderLevel;
                  const isOut = p.stock === 0;

                  return (
                    <div key={p.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-800 text-sm text-[#0D2B45]">{p.name}</div>
                          <div className="text-[11px] text-[#65727A]">
                            SKU: {p.sku} · {p.category}
                          </div>
                        </div>
                        <span className={`text-[10px] font-700 uppercase px-2 py-0.5 rounded-full ${
                          isOut
                            ? 'bg-red-100 text-red-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#E8F5E9] text-[#1E7D3B]'
                        }`}>
                          {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'Adequate'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-[#F7F8F6] p-2.5 rounded-xl text-center text-xs">
                        <div>
                          <div className="text-[10px] text-[#65727A]">Wholesale</div>
                          <div className="font-800 text-[#1E7D3B] tnum">{formatPHP(p.sellingPrice)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#65727A]">Stock</div>
                          <div className={`font-800 tnum ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-[#0D2B45]'}`}>
                            {p.stock} units
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#65727A]">Reorder At</div>
                          <div className="font-600 text-[#4A5568] tnum">{p.reorderLevel}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={p.stock === 0}
                            onClick={() => handleAdjustStock(p, -1)}
                            className="w-7 h-7 rounded-lg bg-[#F0F2F1] text-[#0D2B45] font-800 text-xs flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="text-xs font-800 px-1">{p.stock}</span>
                          <button
                            onClick={() => handleAdjustStock(p, 1)}
                            className="w-7 h-7 rounded-lg bg-[#F0F2F1] text-[#0D2B45] font-800 text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => navigate('supplier/restock')}
                          className="px-3 py-1.5 text-xs font-700 bg-[#1E7D3B] text-white rounded-lg cursor-pointer"
                        >
                          Restock Batch →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </SupplierLayout>
  );
}
