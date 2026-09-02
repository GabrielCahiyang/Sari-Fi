import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { StockBadge } from '../../components/ui/Badge';

export function InventoryManagementPage() {
  const { state, formatPHP } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(state.products.map(p => p.category)))];
  const products = state.products.filter(p =>
    (category === 'All' || p.category === category) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const totalProducts = state.products.length;
  const lowStock = state.products.filter(p => p.stock > 0 && p.stock <= p.reorderLevel).length;
  const outOfStock = state.products.filter(p => p.stock === 0).length;
  const goodStock = state.products.filter(p => p.stock > p.reorderLevel).length;

  return (
    <InternalLayout title="Inventory">
      <div className="space-y-5">
        {/* Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Total Products</div>
            <div className="text-[#0D2B45] font-800 text-2xl mt-1">{totalProducts}</div>
          </div>
          <div className="bg-[#1E7D3B] rounded-2xl p-4">
            <div className="text-white/70 text-xs font-600 uppercase tracking-wider">Good Stock</div>
            <div className="text-white font-800 text-2xl mt-1">{goodStock}</div>
          </div>
          <div className="bg-[#FFF8E1] rounded-2xl border border-[#FFC107]/30 p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Low Stock</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{lowStock}</div>
          </div>
          <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Out of Stock</div>
            <div className="text-red-600 font-800 text-2xl mt-1">{outOfStock}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or SKU…" className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="px-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider border-b border-[#F7F8F6] bg-[#F7F8F6]">
                  <th className="text-left px-5 py-3">Product</th>
                  <th className="text-left px-5 py-3">SKU</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">Price</th>
                  <th className="text-left px-5 py-3">Stock</th>
                  <th className="text-left px-5 py-3">Reorder At</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {products.map(p => (
                  <tr key={p.id} className={`hover:bg-[#F7F8F6]/50 transition-colors ${p.stock === 0 ? 'bg-red-50/30' : p.stock <= p.reorderLevel ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-5 py-3 font-600 text-sm text-[#10212B]">{p.name}</td>
                    <td className="px-5 py-3 text-xs text-[#65727A] font-mono">{p.sku}</td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{p.category}</td>
                    <td className="px-5 py-3 font-700 text-sm text-[#10212B]">{formatPHP(p.sellingPrice)}</td>
                    <td className="px-5 py-3">
                      <span className={`font-800 text-lg ${p.stock === 0 ? 'text-red-500' : p.stock <= p.reorderLevel ? 'text-amber-500' : 'text-[#10212B]'}`}>{p.stock}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{p.reorderLevel}</td>
                    <td className="px-5 py-3"><StockBadge stock={p.stock} reorderLevel={p.reorderLevel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="text-center py-12 text-[#65727A] text-sm">No products found</div>
            )}
          </div>
        </div>
      </div>
    </InternalLayout>
  );
}
