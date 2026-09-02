import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import type { RestockOrder } from '../../types';
import { saveRecord, updateRecord } from '../../services/firebase/rtdbService';

export function RestockPage() {
  const { state, dispatch, showToast, formatPHP, logAudit } = useApp();
  const [tab, setTab] = useState<'needs-restock' | 'restock-orders'>('needs-restock');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [orderLines, setOrderLines] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);

  const needsRestock = state.products.filter(p => p.stock <= p.reorderLevel);
  const lowStock = state.products.filter(p => p.stock > 0 && p.stock <= p.reorderLevel).length;
  const outOfStock = state.products.filter(p => p.stock === 0).length;

  const getSupplier = (id: string) => state.suppliers.find(s => s.id === id);

  const updateRestockStatus = async (restockId: string, status: 'ordered' | 'received' | 'cancelled') => {
    const receivedAt = status === 'received' ? new Date().toISOString() : undefined;
    try {
      await updateRecord('restockOrders', restockId, {
        status,
        ...(receivedAt ? { receivedAt } : {})
      });

      // If received, update product stock in Firebase RTDB
      if (status === 'received') {
        const restock = state.restockOrders.find(r => r.id === restockId);
        if (restock) {
          for (const item of restock.items) {
            const prod = state.products.find(p => p.id === item.productId);
            if (prod) {
              const updated = { ...prod, stock: prod.stock + item.quantity };
              await saveRecord('products', updated);
            }
          }
        }
      }

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
    const supplier = getSupplier(selectedSupplierId);
    if (!supplier) return;

    const items = Object.entries(orderLines)
      .filter(([, q]) => q > 0)
      .map(([prodId, qty]) => {
        const p = state.products.find(x => x.id === prodId)!;
        return {
          productId: prodId,
          productName: p.name,
          quantity: qty,
          costPrice: p.costPrice,
        };
      });

    if (items.length === 0) {
      showToast('error', 'Select at least one product with quantity > 0.');
      return;
    }

    setCreating(true);
    const totalCost = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);
    const newRestock: RestockOrder = {
      id: `rst${Date.now()}`,
      restockNo: `RST-${String(state.restockOrders.length + 1).padStart(4, '0')}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      items,
      totalCost,
      status: 'ordered',
      createdAt: new Date().toISOString(),
    };

    try {
      await saveRecord('restockOrders', newRestock);
      dispatch({ type: 'ADD_RESTOCK', restock: newRestock });
      await logAudit({
        category: 'restock',
        action: 'restock.create',
        summary: `Created purchase order ${newRestock.restockNo} for ${supplier.name} (${formatPHP(totalCost)})`,
        targetType: 'restock',
        targetId: newRestock.id,
        targetLabel: newRestock.restockNo,
        amount: totalCost,
      });
      showToast('success', `Purchase order ${newRestock.restockNo} created!`);
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

  const supplierProducts = state.products.filter(p => !selectedSupplierId || p.supplierId === selectedSupplierId);

  return (
    <InternalLayout title="Restock Center">
      <div className="space-y-5">
        {/* Bento */}
        <div className="grid grid-cols-3 gap-4">
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
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[
              { key: 'needs-restock', label: 'Products Needing Restock' },
              { key: 'restock-orders', label: 'Restock Orders' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)} className={`px-4 py-2 rounded-xl text-sm font-600 transition-all border ${tab === t.key ? 'bg-[#0D2B45] text-white border-[#0D2B45]' : 'bg-white text-[#65727A] border-[#E4E8E6] hover:border-[#0D2B45]/30'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#1E7D3B] text-white text-xs font-700 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20"
          >
            + Create Restock Order
          </button>
        </div>

        {tab === 'needs-restock' && (
          <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
            <div className="overflow-x-auto">
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
                        <td className="px-5 py-3 font-700 text-sm text-[#10212B]">{suggested} units</td>
                        <td className="px-5 py-3 text-sm text-[#65727A]">{supplier?.name || '—'}</td>
                        <td className="px-5 py-3 font-600 text-sm text-[#10212B]">{formatPHP(p.costPrice)}</td>
                      </tr>
                    );
                  })}
                  {needsRestock.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-[#65727A] text-sm">All stock levels are good!</td></tr>
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
              return (
                <div key={rst.id} className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-800 text-base text-[#10212B]">{rst.restockNo}</div>
                      <div className="text-xs text-[#65727A]">{supplier?.name || rst.supplierName} · {new Date(rst.createdAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <Badge variant={statusBadgeVariant(rst.status)}>{rst.status}</Badge>
                  </div>
                  <div className="space-y-2 mb-4">
                    {rst.items.map(item => (
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
                    <div className="flex gap-2">
                      {rst.status === 'draft' && (
                        <>
                          <button onClick={() => updateRestockStatus(rst.id, 'cancelled')} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-600 rounded-xl hover:bg-red-50 transition-all cursor-pointer">Cancel</button>
                          <button onClick={() => updateRestockStatus(rst.id, 'ordered')} className="px-3 py-1.5 bg-[#0D2B45] text-white text-xs font-600 rounded-xl hover:bg-[#1a3d5c] transition-all cursor-pointer">Mark Ordered</button>
                        </>
                      )}
                      {rst.status === 'ordered' && (
                        <button onClick={() => updateRestockStatus(rst.id, 'received')} className="px-3 py-1.5 bg-[#1E7D3B] text-white text-xs font-600 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer">Mark Received</button>
                      )}
                      {rst.receivedAt && <div className="text-xs text-[#65727A]">Received {new Date(rst.receivedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Restock Order (Firebase)" size="lg">
        <form onSubmit={handleCreateRestock} className="space-y-4">
          <div>
            <label className="text-xs font-600 text-[#65727A]">Select Supplier</label>
            <select
              value={selectedSupplierId}
              onChange={e => { setSelectedSupplierId(e.target.value); setOrderLines({}); }}
              className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm"
            >
              {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.contact})</option>)}
            </select>
          </div>

          <div>
            <div className="text-xs font-700 text-[#10212B] mb-2">Select Items & Quantities to Order</div>
            <div className="max-h-60 overflow-y-auto divide-y divide-[#F7F8F6] border border-[#E4E8E6] rounded-xl">
              {supplierProducts.map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-600 text-[#10212B]">{p.name}</div>
                    <div className="text-[#65727A]">Current stock: {p.stock} · Cost: {formatPHP(p.costPrice)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#65727A]">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      value={orderLines[p.id] || 0}
                      onChange={e => setOrderLines(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                      className="w-16 px-2 py-1 border border-[#E4E8E6] rounded-lg text-center font-600"
                    />
                  </div>
                </div>
              ))}
              {supplierProducts.length === 0 && (
                <div className="p-4 text-center text-xs text-[#65727A]">No products mapped to this supplier.</div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer disabled:opacity-60"
          >
            {creating ? 'Saving Purchase Order to Firebase…' : 'Submit Restock Order to Firebase'}
          </button>
        </form>
      </Modal>
    </InternalLayout>
  );
}
