import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import type { RestockOrder, RestockItem } from '../../types';
import { saveRecord, updateRecord } from '../../services/firebase/rtdbService';

export function RestockPage() {
  const { state, dispatch, showToast, formatPHP, logAudit } = useApp();
  const [tab, setTab] = useState<'needs-restock' | 'restock-orders'>('needs-restock');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [orderLines, setOrderLines] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const needsRestock = state.products.filter(p => p.status === 'active' && p.stock <= p.reorderLevel);
  const lowStock = state.products.filter(p => p.status === 'active' && p.stock > 0 && p.stock <= p.reorderLevel).length;
  const outOfStock = state.products.filter(p => p.status === 'active' && p.stock === 0).length;

  const getSupplier = (id?: string) => state.suppliers.find(s => s.id === id);

  const openCreateModal = (supplierId: string = 'all', prefilledLines: Record<string, string> = {}) => {
    setSelectedSupplierId(supplierId);
    setOrderLines(prefilledLines);
    setShowCreateModal(true);
  };

  const handleQtyChange = (productId: string, val: string) => {
    // If empty string, delete from state so placeholder "0" shows
    const trimmed = val.trim();
    if (trimmed === '') {
      setOrderLines(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }

    // Number validation: allow only digits 0-9
    if (!/^\d+$/.test(trimmed)) {
      return;
    }

    // Strip leading zeros so "05" immediately normalizes to "5"
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 0) return;

    if (parsed === 0) {
      setOrderLines(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }

    setOrderLines(prev => ({ ...prev, [productId]: String(parsed) }));
  };

  const handleStepQty = (productId: string, delta: number) => {
    const current = parseInt(orderLines[productId] || '0', 10);
    const next = Math.max(0, current + delta);
    if (next === 0) {
      setOrderLines(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } else {
      setOrderLines(prev => ({ ...prev, [productId]: String(next) }));
    }
  };

  const updateRestockStatus = async (restockId: string, status: 'ordered' | 'received' | 'cancelled') => {
    const receivedAt = status === 'received' ? new Date().toISOString() : undefined;
    try {
      // If received, update product stock in Firebase RTDB
      if (status === 'received') {
        const restock = state.restockOrders.find(r => r.id === restockId);
        if (restock && restock.status !== 'received') {
          const items: RestockItem[] = (Array.isArray(restock.items)
            ? restock.items
            : Object.values(restock.items || {})) as RestockItem[];
          for (const item of items) {
            const prod = state.products.find(p => p.id === item.productId);
            if (prod) {
              const updated = { ...prod, stock: prod.stock + item.quantity };
              await saveRecord('products', updated);
            }
          }
        }
      }

      await updateRecord('restockOrders', restockId, {
        status,
        ...(receivedAt ? { receivedAt } : {})
      });

      dispatch({ type: 'UPDATE_RESTOCK_STATUS', restockId, status });
      const r = state.restockOrders.find(x => x.id === restockId);
      await logAudit({
        category: 'restock',
        action: 'restock.status',
        summary: `Restock order ${r?.restockNo ?? restockId} marked ${status}`,
        targetType: 'restock',
        targetId: restockId,
        targetLabel: r?.restockNo,
      });

      if (status === 'received') {
        showToast('success', 'Restock marked received. Stock levels updated.');
      } else {
        showToast('success', `Restock order marked ${status}.`);
      }
    } catch (err: any) {
      showToast('error', 'Failed to update restock status: ' + err.message);
    }
  };

  const handleCreateRestock = async (e: React.FormEvent) => {
    e.preventDefault();

    // Map order lines into items
    const items = Object.entries(orderLines)
      .map(([prodId, qtyStr]) => {
        const qty = parseInt(qtyStr, 10);
        return { prodId, qty };
      })
      .filter(({ qty }) => !isNaN(qty) && qty > 0)
      .map(({ prodId, qty }) => {
        const p = state.products.find(x => x.id === prodId);
        if (!p) return null;
        return {
          productId: prodId,
          productName: p.name,
          quantity: qty,
          costPrice: p.costPrice,
        };
      })
      .filter(Boolean) as { productId: string; productName: string; quantity: number; costPrice: number }[];

    if (items.length === 0) {
      showToast('error', 'Please enter a quantity greater than 0 for at least one product.');
      return;
    }

    setCreating(true);

    // Resolve supplier name and ID safely
    const explicitSupplier = selectedSupplierId !== 'all' ? getSupplier(selectedSupplierId) : undefined;
    const fallbackSupplier = explicitSupplier || state.suppliers[0];
    const supplierId = fallbackSupplier?.id || 'sup_general';
    const supplierName = fallbackSupplier?.name || 'Direct Wholesale Supplier';

    const totalCost = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);

    // Auto-accept: status is set directly to 'received'
    const newRestock: RestockOrder = {
      id: `rst${Date.now()}`,
      restockNo: `RST-${String(state.restockOrders.length + 1).padStart(4, '0')}`,
      supplierId,
      supplierName,
      items,
      totalCost,
      status: 'received', // Auto-accepted on the supplier side!
      createdAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    };

    try {
      // 1. Immediately update each product's stock in Firebase RTDB
      for (const item of items) {
        const prod = state.products.find(p => p.id === item.productId);
        if (prod) {
          const updated = { ...prod, stock: prod.stock + item.quantity };
          await saveRecord('products', updated);
        }
      }

      // 2. Save restock order to Firebase RTDB
      await saveRecord('restockOrders', newRestock);

      // 3. Dispatch to local state (ADD_RESTOCK updates both restockOrders and products)
      dispatch({ type: 'ADD_RESTOCK', restock: newRestock });

      // 4. Audit logging
      await logAudit({
        category: 'restock',
        action: 'restock.create',
        summary: `Restock order ${newRestock.restockNo} auto-accepted from ${supplierName} (${items.length} products, ${formatPHP(totalCost)})`,
        targetType: 'restock',
        targetId: newRestock.id,
        targetLabel: newRestock.restockNo,
        amount: totalCost,
      });

      showToast('success', `Restock order ${newRestock.restockNo} auto-accepted! Inventory stock updated.`);
      setShowCreateModal(false);
      setOrderLines({});
      setTab('restock-orders');
    } catch (err: any) {
      showToast('error', 'Failed to create restock order: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const statusBadgeVariant = (s: string) => {
    if (s === 'received') return 'green' as const;
    if (s === 'ordered') return 'blue' as const;
    if (s === 'cancelled') return 'red' as const;
    return 'gray' as const;
  };

  const supplierProducts = state.products.filter(p =>
    p.status === 'active' &&
    (!selectedSupplierId || selectedSupplierId === 'all' || p.supplierId === selectedSupplierId)
  );

  const selectedItemsCount = Object.values(orderLines).filter(v => (parseInt(v, 10) || 0) > 0).length;
  const calculatedTotalCost = Object.entries(orderLines).reduce((sum, [prodId, qtyStr]) => {
    const qty = parseInt(qtyStr, 10) || 0;
    const prod = state.products.find(p => p.id === prodId);
    return sum + (prod ? prod.costPrice * qty : 0);
  }, 0);

  return (
    <InternalLayout title="Restock Center">
      <div className="space-y-5">
        {/* Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className={`rounded-2xl p-4 border ${needsRestock.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Needs Restock</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{needsRestock.length}</div>
          </div>
          <div className={`rounded-2xl p-4 border ${lowStock > 0 ? 'bg-[#FFF8E1] border-[#FFC107]/30' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Low Stock</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{lowStock}</div>
          </div>
          <div className={`rounded-2xl p-4 border ${outOfStock > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Out of Stock</div>
            <div className="text-red-600 font-800 text-2xl mt-1">{outOfStock}</div>
          </div>
        </div>

        {/* Tabs and Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: 'needs-restock', label: 'Needing Restock' },
              { key: 'restock-orders', label: 'Restock Orders' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-600 transition-all border whitespace-nowrap cursor-pointer ${
                  tab === t.key
                    ? 'bg-[#0D2B45] text-white border-[#0D2B45]'
                    : 'bg-white text-[#65727A] border-[#E4E8E6] hover:border-[#0D2B45]/30'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => openCreateModal('all')}
            className="px-4 py-2 bg-[#1E7D3B] text-white text-xs font-700 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20 self-start sm:self-auto shrink-0 flex items-center gap-1.5"
          >
            <span>+ Create Restock Order</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-600">Auto-Accept</span>
          </button>
        </div>

        {tab === 'needs-restock' && (
          <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-[#F7F8F6]">
              {needsRestock.map(p => {
                const supplier = getSupplier(p.supplierId);
                const suggested = Math.max(p.reorderLevel * 2 - p.stock, p.reorderLevel);
                return (
                  <div key={p.id} className={`p-4 space-y-2.5 ${p.stock === 0 ? 'bg-red-50/20' : 'bg-amber-50/20'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-700 text-sm text-[#10212B]">{p.name}</div>
                        <div className="text-xs text-[#65727A]">{p.category} · Supplier: {supplier?.name || '—'}</div>
                      </div>
                      <span className={`font-800 text-lg ${p.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                        {p.stock} in stock
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-white p-2.5 rounded-xl border border-[#E4E8E6]">
                      <div>
                        <span className="text-[#65727A] block text-[10px]">Reorder</span>
                        <span className="font-600 text-[#10212B]">{p.reorderLevel}</span>
                      </div>
                      <div>
                        <span className="text-[#65727A] block text-[10px]">Suggested</span>
                        <span className="font-700 text-[#1E7D3B]">{suggested} units</span>
                      </div>
                      <div>
                        <span className="text-[#65727A] block text-[10px]">Unit Cost</span>
                        <span className="font-600 text-[#10212B]">{formatPHP(p.costPrice)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#65727A]">Supplier: {supplier?.name || '—'}</span>
                      <button
                        onClick={() => openCreateModal(p.supplierId || 'all', { [p.id]: String(suggested) })}
                        className="px-3 py-1.5 bg-[#1E7D3B] text-white text-xs font-700 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-xs"
                      >
                        + Restock ({suggested})
                      </button>
                    </div>
                  </div>
                );
              })}
              {needsRestock.length === 0 && (
                <div className="text-center py-12 text-[#65727A] text-sm">All stock levels are good!</div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider border-b border-[#F7F8F6] bg-[#F7F8F6]">
                    <th className="text-left px-5 py-3">Product</th>
                    <th className="text-left px-5 py-3">Category</th>
                    <th className="text-left px-5 py-3">Current Stock</th>
                    <th className="text-left px-5 py-3">Reorder Level</th>
                    <th className="text-left px-5 py-3">Suggested Restock</th>
                    <th className="text-left px-5 py-3">Supplier</th>
                    <th className="text-left px-5 py-3">Cost/unit</th>
                    <th className="text-right px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F7F8F6]">
                  {needsRestock.map(p => {
                    const supplier = getSupplier(p.supplierId);
                    const suggested = Math.max(p.reorderLevel * 2 - p.stock, p.reorderLevel);
                    return (
                      <tr key={p.id} className={`hover:bg-[#F7F8F6]/50 transition-colors ${p.stock === 0 ? 'bg-red-50/30' : 'bg-amber-50/30'}`}>
                        <td className="px-5 py-3 font-600 text-sm text-[#10212B]">{p.name}</td>
                        <td className="px-5 py-3 text-sm text-[#65727A]">{p.category}</td>
                        <td className="px-5 py-3">
                          <span className={`font-800 text-lg ${p.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}>{p.stock}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-[#65727A]">{p.reorderLevel}</td>
                        <td className="px-5 py-3 font-700 text-sm text-[#1E7D3B]">{suggested} units</td>
                        <td className="px-5 py-3 text-sm text-[#65727A]">{supplier?.name || '—'}</td>
                        <td className="px-5 py-3 font-600 text-sm text-[#10212B]">{formatPHP(p.costPrice)}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => openCreateModal(p.supplierId || 'all', { [p.id]: String(suggested) })}
                            className="px-3 py-1.5 bg-[#1E7D3B] text-white text-xs font-700 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-xs"
                          >
                            + Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {needsRestock.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12 text-[#65727A] text-sm">All stock levels are good!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'restock-orders' && (
          <div className="space-y-4">
            {state.restockOrders.map(rst => {
              const supplier = getSupplier(rst.supplierId);
              const items: RestockItem[] = (Array.isArray(rst.items) ? rst.items : Object.values(rst.items || {})) as RestockItem[];
              return (
                <div key={rst.id} className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-800 text-base text-[#10212B]">{rst.restockNo}</div>
                      <div className="text-xs text-[#65727A]">{supplier?.name || rst.supplierName} · {new Date(rst.createdAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <Badge variant={statusBadgeVariant(rst.status)}>
                      {rst.status === 'received' ? 'Auto-Accepted / Received' : rst.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 mb-4">
                    {items.map(item => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span className="text-[#65727A]">{item.productName} ×{item.quantity}</span>
                        <span className="font-600 text-[#10212B]">{formatPHP(item.quantity * item.costPrice)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-[#F7F8F6] pt-3">
                    <div>
                      <span className="text-xs text-[#65727A]">Total Cost: </span>
                      <span className="font-800 text-[#0D2B45]">{formatPHP(rst.totalCost)}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      {rst.status === 'draft' && (
                        <>
                          <button onClick={() => updateRestockStatus(rst.id, 'cancelled')} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-600 rounded-xl hover:bg-red-50 transition-all cursor-pointer">Cancel</button>
                          <button onClick={() => updateRestockStatus(rst.id, 'ordered')} className="px-3 py-1.5 bg-[#0D2B45] text-white text-xs font-600 rounded-xl hover:bg-[#1a3d5c] transition-all cursor-pointer">Mark Ordered</button>
                        </>
                      )}
                      {rst.status === 'ordered' && (
                        <button onClick={() => updateRestockStatus(rst.id, 'received')} className="px-3 py-1.5 bg-[#1E7D3B] text-white text-xs font-600 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer">Auto-Accept & Mark Received</button>
                      )}
                      {rst.receivedAt && (
                        <div className="text-xs text-[#1E7D3B] font-600 flex items-center gap-1 bg-[#F0FAF4] px-2.5 py-1 rounded-lg border border-[#1E7D3B]/20">
                          ✓ Auto-Accepted & Stock Added ({new Date(rst.receivedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {state.restockOrders.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-[#E4E8E6] text-sm text-[#65727A]">
                No restock orders created yet.
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Restock Order" size="lg">
        <form onSubmit={handleCreateRestock} className="space-y-4">
          <div className="bg-[#F0FAF4] p-3 rounded-xl border border-[#1E7D3B]/20 text-xs text-[#10212B] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#1E7D3B] text-white flex items-center justify-center font-bold shrink-0 text-[10px]">⚡</span>
            <span><strong>Instant Auto-Accept:</strong> Restock orders are automatically confirmed and stock is immediately added to your store inventory upon submission.</span>
          </div>

          <div>
            <label className="text-xs font-600 text-[#65727A]">Select Supplier</label>
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
            >
              <option value="all">All Suppliers (Show All Products)</option>
              {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.contact})</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-700 text-[#10212B]">Select Items & Quantities to Order</div>
              {selectedItemsCount > 0 && (
                <div className="text-xs font-700 text-[#1E7D3B]">
                  {selectedItemsCount} {selectedItemsCount === 1 ? 'item' : 'items'} · Total Cost: {formatPHP(calculatedTotalCost)}
                </div>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#F7F8F6] border border-[#E4E8E6] rounded-xl bg-white">
              {supplierProducts.map(p => {
                const currentVal = orderLines[p.id] ?? '';
                const numVal = parseInt(currentVal, 10) || 0;
                const lineCost = numVal * p.costPrice;

                return (
                  <div
                    key={p.id}
                    className={`p-3 flex items-center justify-between text-xs transition-colors ${
                      numVal > 0 ? 'bg-[#F0FAF4]' : 'hover:bg-[#F7F8F6]/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-700 text-[#10212B] truncate">{p.name}</div>
                      <div className="text-[#65727A] text-[11px] mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>Current stock: <strong className={p.stock <= p.reorderLevel ? 'text-amber-600' : 'text-[#10212B]'}>{p.stock}</strong></span>
                        <span>·</span>
                        <span>Cost: {formatPHP(p.costPrice)}</span>
                        {numVal > 0 && (
                          <>
                            <span>·</span>
                            <span className="font-700 text-[#1E7D3B]">Subtotal: {formatPHP(lineCost)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[#65727A] text-xs font-600 hidden sm:inline">Qty:</span>
                      <button
                        type="button"
                        onClick={() => handleStepQty(p.id, -1)}
                        className="w-7 h-7 rounded-lg border border-[#E4E8E6] bg-white text-[#65727A] hover:text-[#0D2B45] hover:border-[#0D2B45] font-700 flex items-center justify-center transition-all cursor-pointer text-sm shadow-2xs"
                        title="Decrease"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={currentVal}
                        onChange={e => handleQtyChange(p.id, e.target.value)}
                        className="w-14 px-2 py-1.5 border border-[#E4E8E6] rounded-lg text-center font-700 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepQty(p.id, 1)}
                        className="w-7 h-7 rounded-lg border border-[#E4E8E6] bg-white text-[#65727A] hover:text-[#0D2B45] hover:border-[#0D2B45] font-700 flex items-center justify-center transition-all cursor-pointer text-sm shadow-2xs"
                        title="Increase"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              {supplierProducts.length === 0 && (
                <div className="p-6 text-center text-xs text-[#65727A]">No products mapped to this supplier.</div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={creating || selectedItemsCount === 0}
              className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#1E7D3B]/20 flex items-center justify-center gap-2"
            >
              {creating
                ? 'Updating Inventory & Fulfilling Order…'
                : selectedItemsCount > 0
                ? `Submit & Auto-Accept Restock (${selectedItemsCount} ${selectedItemsCount === 1 ? 'product' : 'products'} · ${formatPHP(calculatedTotalCost)})`
                : 'Enter quantities above to order'}
            </button>
          </div>
        </form>
      </Modal>
    </InternalLayout>
  );
}
