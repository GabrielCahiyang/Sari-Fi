import { useState, useMemo } from 'react';
import { SupplierLayout } from '../../components/layout/SupplierLayout';
import { useApp } from '../../context/AppContext';
import { updateRootPaths } from '../../services/firebase/rtdbService';
import type { RestockOrder, RestockItem } from '../../types';

export function SupplierRestockPage() {
  const { state, dispatch, formatPHP, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');
  const [addQty, setAddQty] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  // Restock orders for this supplier
  const myRestockOrders = useMemo(() => {
    return state.restockOrders.filter(r => r.supplierId === supplier.id);
  }, [state.restockOrders, supplier.id]);

  const filtered = useMemo(() => {
    return myProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const isLow = p.stock <= p.reorderLevel;
      const matchFilter = filterMode === 'all' || (filterMode === 'low' && isLow);
      return matchSearch && matchFilter;
    });
  }, [myProducts, search, filterMode]);

  const handleQtyChange = (prodId: string, val: string) => {
    const clean = val.replace(/^0+(?=\d)/, '');
    if (clean === '' || /^\d+$/.test(clean)) {
      setAddQty(prev => ({ ...prev, [prodId]: clean }));
    }
  };

  const handleQuickAdd = (prodId: string, delta: number) => {
    const curr = parseInt(addQty[prodId] || '0', 10);
    const next = Math.max(0, curr + delta);
    setAddQty(prev => ({ ...prev, [prodId]: next > 0 ? String(next) : '' }));
  };

  const hasItemsToReplenish = useMemo(() => {
    return Object.values(addQty).some(val => parseInt(val, 10) > 0);
  }, [addQty]);

  const totalAddedUnits = useMemo(() => {
    return Object.values(addQty).reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);
  }, [addQty]);

  const totalCostValue = useMemo(() => {
    return Object.entries(addQty).reduce((sum, [prodId, qtyStr]) => {
      const p = myProducts.find(x => x.id === prodId);
      const q = parseInt(qtyStr, 10) || 0;
      return sum + (p ? p.costPrice * q : 0);
    }, 0);
  }, [addQty, myProducts]);

  const handleCommitResupply = async () => {
    if (submitting) return;
    if (supplier.status !== 'active') {
      showToast('error', 'This supplier account is inactive and cannot replenish inventory.');
      return;
    }
    const invalidQuantity = Object.values(addQty).find(val => {
      if (!val) return false;
      const parsed = Number(val);
      return !/^\d+$/.test(val) || !Number.isSafeInteger(parsed) || parsed < 0 || parsed > 1_000_000;
    });
    if (invalidQuantity !== undefined) {
      showToast('error', 'Replenishment quantities must be whole numbers between 0 and 1,000,000.');
      return;
    }
    const entries = Object.entries(addQty).filter(([prodId, val]) => {
      const product = myProducts.find(p => p.id === prodId);
      return !!product && product.status === 'active' && Number(val) > 0;
    });
    if (entries.length === 0) {
      showToast('error', 'Please enter replenishment quantities for at least one item.');
      return;
    }

    setSubmitting(true);
    try {
      const restockItems: RestockItem[] = [];
      const paths: Record<string, unknown> = {};

      for (const [prodId, qtyStr] of entries) {
        const added = parseInt(qtyStr, 10);
        const prod = myProducts.find(p => p.id === prodId);
        if (!prod) continue;

        const newStock = prod.stock + added;
        paths[`products/${prodId}/stock`] = newStock;

        restockItems.push({
          productId: prod.id,
          productName: prod.name,
          quantity: added,
          costPrice: prod.costPrice,
        });
      }

      // Record a supplier restock audit record
      const restockOrder: RestockOrder = {
        id: `sup_restock_${Date.now()}`,
        restockNo: `RO-${Date.now().toString().slice(-4)}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: restockItems,
        totalCost: restockItems.reduce((s, it) => s + (it.costPrice * it.quantity), 0),
        status: 'received',
        createdAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      };

      paths[`restockOrders/${restockOrder.id}`] = restockOrder;
      await updateRootPaths(paths);
      dispatch({ type: 'ADD_RESTOCK', restock: restockOrder });

      showToast('success', `Restock confirmed! Added ${totalAddedUnits} units across ${entries.length} items.`);
      setAddQty({});
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to update stock: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SupplierLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45] tracking-tight">
              Wholesale Restock Hub
            </h1>
            <p className="text-xs sm:text-sm text-[#65727A] mt-1">
              Log arriving wholesale factory batches and resupply your warehouse inventory for sari-sari store fulfillment.
            </p>
          </div>

          {hasItemsToReplenish && (
            <button
              onClick={handleCommitResupply}
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-700 bg-[#1E7D3B] text-white hover:bg-[#165f2c] rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs shrink-0 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {submitting ? 'Applying Updates...' : `Confirm Restock (+${totalAddedUnits} units)`}
            </button>
          )}
        </div>

        {/* Search & Filter Pills */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-[#65727A] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product name or SKU to restock..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-2 rounded-xl text-xs font-700 transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#0D2B45] text-white'
                  : 'bg-white text-[#65727A] border border-[#E4E8E6]'
              }`}
            >
              All Products ({myProducts.length})
            </button>
            <button
              onClick={() => setFilterMode('low')}
              className={`px-3 py-2 rounded-xl text-xs font-700 transition-colors cursor-pointer ${
                filterMode === 'low'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
              }`}
            >
              Low Stock ({myProducts.filter(p => p.stock <= p.reorderLevel).length})
            </button>
          </div>
        </div>

        {/* Restock Batch Entry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const isLow = p.stock <= p.reorderLevel;
            const addedVal = addQty[p.id] || '';
            const addedNum = parseInt(addedVal, 10) || 0;
            const projectedStock = p.stock + addedNum;

            return (
              <div
                key={p.id}
                data-tour-target={p.id === 'prod_tour_coke' ? '7' : undefined}
                className={`bg-white rounded-2xl border p-4 transition-all shadow-xs flex flex-col justify-between ${
                  addedNum > 0 ? 'border-[#1E7D3B] ring-1 ring-[#1E7D3B]/20' : 'border-[#E4E8E6]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="overflow-hidden">
                      <div className="font-800 text-sm text-[#0D2B45] truncate">{p.name}</div>
                      <div className="text-[11px] text-[#65727A]">
                        SKU: {p.sku} · {p.category}
                      </div>
                    </div>
                    <span className={`text-[10px] font-700 uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      p.stock === 0
                        ? 'bg-red-100 text-red-800'
                        : isLow
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[#E8F5E9] text-[#1E7D3B]'
                    }`}>
                      {p.stock === 0 ? 'Out of stock' : isLow ? 'Low stock' : 'Adequate'}
                    </span>
                  </div>

                  {/* Current vs Projected Stock */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-[#F7F8F6] text-xs">
                    <div>
                      <div className="text-[10px] text-[#65727A]">Current Warehouse</div>
                      <div className={`font-800 text-sm tnum ${isLow ? 'text-red-600' : 'text-[#0D2B45]'}`}>
                        {p.stock} units
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#65727A]">After Restock</div>
                      <div className="font-800 text-sm text-[#1E7D3B] tnum">
                        {projectedStock} units
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Input & Steppers */}
                <div>
                  <label className="block text-[11px] font-700 text-[#0D2B45] mb-1.5">
                    Units Arriving from Shipment
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(p.id, -10)}
                      className="w-8 h-8 rounded-lg bg-[#F0F2F1] hover:bg-[#E4E8E6] text-[#0D2B45] font-800 text-xs flex items-center justify-center cursor-pointer"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(p.id, -1)}
                      className="w-8 h-8 rounded-lg bg-[#F0F2F1] hover:bg-[#E4E8E6] text-[#0D2B45] font-800 text-xs flex items-center justify-center cursor-pointer"
                    >
                      -1
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={addedVal}
                      onChange={e => handleQtyChange(p.id, e.target.value)}
                      placeholder="0"
                      className="flex-1 min-w-0 text-center py-1.5 border border-[#E4E8E6] rounded-lg text-sm font-800 focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(p.id, 1)}
                      className="w-8 h-8 rounded-lg bg-[#F0F2F1] hover:bg-[#E4E8E6] text-[#0D2B45] font-800 text-xs flex items-center justify-center cursor-pointer"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(p.id, 10)}
                      className="w-8 h-8 rounded-lg bg-[#F0F2F1] hover:bg-[#E4E8E6] text-[#0D2B45] font-800 text-xs flex items-center justify-center cursor-pointer"
                    >
                      +10
                    </button>
                  </div>

                  {/* Batch Shortcuts */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[12, 24, 50, 100].map(batch => (
                      <button
                        key={batch}
                        type="button"
                        onClick={() => handleQuickAdd(p.id, batch)}
                        className="flex-1 py-1 text-[10px] font-700 bg-white border border-[#E4E8E6] hover:border-[#1E7D3B] hover:text-[#1E7D3B] rounded-md text-[#65727A] transition-colors cursor-pointer"
                      >
                        +{batch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Restock History Log */}
        <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-800 text-[#0D2B45]">
                Recent Restock Intake History
              </h2>
              <p className="text-xs text-[#65727A]">
                Historical records of incoming stock shipments logged into the platform.
              </p>
            </div>
            <span className="text-xs font-700 text-[#65727A] bg-[#F7F8F6] px-3 py-1 rounded-lg border border-[#E4E8E6]">
              {myRestockOrders.length} Shipments Logged
            </span>
          </div>

          {myRestockOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#65727A]">
              No restock shipments recorded yet. Use the restock cards above when your shipments arrive.
            </div>
          ) : (
            <div className="divide-y divide-[#E4E8E6] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#65727A] font-700 uppercase tracking-wider text-[11px] pb-2">
                    <th className="py-2.5">Reference No.</th>
                    <th className="py-2.5">Date & Time</th>
                    <th className="py-2.5">Items Received</th>
                    <th className="py-2.5 text-right">Total Cost Value</th>
                    <th className="py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E8E6]">
                  {myRestockOrders.slice(0, 10).map(r => (
                    <tr key={r.id} className="hover:bg-[#FAFAFA]">
                      <td className="py-3 font-800 text-[#0D2B45] font-mono">{r.restockNo}</td>
                      <td className="py-3 text-[#65727A]">
                        {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 font-600 text-[#10212B]">
                        {r.items.map(it => `${it.quantity}x ${it.productName}`).join(', ')}
                      </td>
                      <td className="py-3 text-right font-800 text-[#1E7D3B] tnum">
                        {formatPHP(r.totalCost)}
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-block text-[10px] font-700 uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SupplierLayout>
  );
}
