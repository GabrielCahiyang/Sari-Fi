import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge, StockBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import type { Product } from '../../types';

export function ProductsPage() {
  const { state, dispatch, showToast, formatPHP } = useApp();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const categories = ['All', ...Array.from(new Set(state.products.map(p => p.category)))];
  const [category, setCategory] = useState('All');

  const products = state.products.filter(p =>
    (category === 'All' || p.category === category) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const newProduct: Product = {
      id: `p${Date.now()}`,
      name: data.name as string,
      sku: data.sku as string,
      category: data.category as string,
      supplierId: data.supplierId as string,
      sellingPrice: parseFloat(data.sellingPrice as string),
      costPrice: parseFloat(data.costPrice as string),
      stock: parseInt(data.stock as string),
      reorderLevel: parseInt(data.reorderLevel as string),
      status: 'active',
    };
    dispatch({ type: 'ADD_PRODUCT', product: newProduct });
    showToast('success', `Product "${newProduct.name}" added.`);
    setShowAdd(false);
  };

  const handleEditProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editProduct) return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const updated: Product = {
      ...editProduct,
      name: data.name as string,
      sellingPrice: parseFloat(data.sellingPrice as string),
      costPrice: parseFloat(data.costPrice as string),
      stock: parseInt(data.stock as string),
      reorderLevel: parseInt(data.reorderLevel as string),
    };
    dispatch({ type: 'UPDATE_PRODUCT', product: updated });
    showToast('success', 'Product updated.');
    setEditProduct(null);
  };

  const ProductForm = ({ product, onSubmit }: { product?: Product; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[
          { name: 'name', label: 'Product Name', defaultValue: product?.name, required: true },
          { name: 'sku', label: 'SKU', defaultValue: product?.sku, required: true },
          { name: 'category', label: 'Category', defaultValue: product?.category },
          { name: 'sellingPrice', label: 'Selling Price (₱)', defaultValue: product?.sellingPrice, type: 'number' },
          { name: 'costPrice', label: 'Cost Price (₱)', defaultValue: product?.costPrice, type: 'number' },
          { name: 'stock', label: 'Stock', defaultValue: product?.stock, type: 'number' },
          { name: 'reorderLevel', label: 'Reorder Level', defaultValue: product?.reorderLevel, type: 'number' },
        ].map(f => (
          <div key={f.name}>
            <label className="text-xs font-600 text-[#65727A]">{f.label}</label>
            <input
              name={f.name}
              type={f.type || 'text'}
              defaultValue={f.defaultValue as any}
              required={f.required}
              className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]"
            />
          </div>
        ))}
        <div>
          <label className="text-xs font-600 text-[#65727A]">Supplier</label>
          <select name="supplierId" defaultValue={product?.supplierId} className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]">
            {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <button type="submit" className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all">
        {product ? 'Update Product' : 'Add Product'}
      </button>
    </form>
  );

  return (
    <InternalLayout title="Products">
      <div className="space-y-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="px-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all">+ Add Product</button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider border-b border-[#F7F8F6] bg-[#F7F8F6]">
                  <th className="text-left px-5 py-3">Product</th>
                  <th className="text-left px-5 py-3">SKU</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">Sell Price</th>
                  <th className="text-left px-5 py-3">Cost</th>
                  <th className="text-left px-5 py-3">Stock</th>
                  <th className="text-left px-5 py-3">Stock Status</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-[#F7F8F6]/50 transition-colors">
                    <td className="px-5 py-3 font-600 text-sm text-[#10212B]">{p.name}</td>
                    <td className="px-5 py-3 text-xs text-[#65727A] font-mono">{p.sku}</td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{p.category}</td>
                    <td className="px-5 py-3 font-700 text-sm text-[#10212B]">{formatPHP(p.sellingPrice)}</td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{formatPHP(p.costPrice)}</td>
                    <td className="px-5 py-3 font-800 text-sm text-[#10212B]">{p.stock}</td>
                    <td className="px-5 py-3"><StockBadge stock={p.stock} reorderLevel={p.reorderLevel} /></td>
                    <td className="px-5 py-3"><Badge variant={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge></td>
                    <td className="px-5 py-3">
                      <button onClick={() => setEditProduct(p)} className="text-xs text-[#1E7D3B] font-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Product" size="lg">
        <ProductForm onSubmit={handleAddProduct} />
      </Modal>
      <Modal open={editProduct !== null} onClose={() => setEditProduct(null)} title="Edit Product" size="lg">
        {editProduct && <ProductForm product={editProduct} onSubmit={handleEditProduct} />}
      </Modal>
    </InternalLayout>
  );
}
