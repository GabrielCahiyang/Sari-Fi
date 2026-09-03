import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';

const CATEGORIES = ['All', 'Beverages', 'Snacks', 'Instant Noodles', 'Canned Goods', 'Condiments', 'Household', 'Personal Care'];

export function ShopPage() {
  const { state, dispatch, navigate, formatPHP } = useApp();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const products = state.products.filter(p => p.status === 'active' && p.stock > 0);
  const filtered = products.filter(p =>
    (category === 'All' || p.category === category) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const cartCount = state.cart.reduce((s, i) => s + i.quantity, 0);

  const getQty = (id: string) => quantities[id] || 1;
  const setQty = (id: string, q: number) => setQuantities(prev => ({ ...prev, [id]: Math.max(1, q) }));

  const addToCart = (productId: string) => {
    const qty = getQty(productId);
    dispatch({ type: 'CART_ADD', productId, quantity: qty });
    setQuantities(prev => ({ ...prev, [productId]: 1 }));
  };

  const inCart = (productId: string) => state.cart.find(c => c.productId === productId);

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto p-3.5 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45]">Sari-Fi Market</h1>
            <p className="text-xs sm:text-sm text-[#65727A] mt-0.5">Wholesale grocery inventory for your store</p>
          </div>
          {cartCount > 0 && (
            <button
              onClick={() => navigate('customer/cart')}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer self-start sm:self-auto shadow-sm shadow-[#1E7D3B]/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              View Cart ({cartCount})
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] transition-all"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 sm:mb-6 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-600 transition-all border cursor-pointer ${
                category === cat
                  ? 'bg-[#0D2B45] text-white border-[#0D2B45]'
                  : 'bg-white text-[#65727A] border-[#E4E8E6] hover:border-[#0D2B45]/30 hover:text-[#0D2B45]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-xs text-[#65727A] mb-3">{filtered.length} product{filtered.length !== 1 ? 's' : ''} {category !== 'All' ? `in ${category}` : ''}</div>

        {/* Product Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {filtered.map(product => {
              const cartItem = inCart(product.id);
              const qty = getQty(product.id);
              return (
                <div key={product.id} className="bg-white rounded-2xl border border-[#E4E8E6] p-3 sm:p-4 flex flex-col hover:border-[#1E7D3B]/30 hover:shadow-sm transition-all">
                  {/* Category chip */}
                  <div className="text-[10px] font-700 text-[#65727A] uppercase tracking-wider mb-1.5 truncate">{product.category}</div>

                  {/* Product name */}
                  <div className="font-700 text-xs sm:text-sm text-[#10212B] leading-tight mb-1 flex-1 line-clamp-2">{product.name}</div>
                  <div className="text-[11px] text-[#65727A] mb-2">{product.sku}</div>

                  {/* Price */}
                  <div className="text-base sm:text-xl font-800 text-[#0D2B45] mb-1">{formatPHP(product.sellingPrice)}</div>

                  {/* Stock */}
                  <div className={`text-xs font-600 mb-3 ${product.stock <= product.reorderLevel ? 'text-amber-600' : 'text-[#65727A]'}`}>
                    Stock: {product.stock}
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setQty(product.id, qty - 1)}
                      className="w-8 h-8 rounded-lg border border-[#E4E8E6] flex items-center justify-center text-[#65727A] hover:border-[#0D2B45] hover:text-[#0D2B45] transition-all font-700"
                    >−</button>
                    <input
                      type="number"
                      value={qty}
                      onChange={e => setQty(product.id, parseInt(e.target.value) || 1)}
                      min={1}
                      max={product.stock}
                      className="flex-1 text-center text-sm font-700 border border-[#E4E8E6] rounded-lg py-1 focus:outline-none focus:border-[#1E7D3B]"
                    />
                    <button
                      onClick={() => setQty(product.id, Math.min(qty + 1, product.stock))}
                      className="w-8 h-8 rounded-lg border border-[#E4E8E6] flex items-center justify-center text-[#65727A] hover:border-[#0D2B45] hover:text-[#0D2B45] transition-all font-700"
                    >+</button>
                  </div>

                  {/* Add to cart */}
                  <button
                    onClick={() => addToCart(product.id)}
                    className={`w-full py-2 text-sm font-600 rounded-xl transition-all ${
                      cartItem
                        ? 'bg-[#F7F8F6] text-[#1E7D3B] border border-[#1E7D3B]/30 hover:bg-[#1E7D3B]/5'
                        : 'bg-[#1E7D3B] text-white hover:bg-[#22913f]'
                    }`}
                  >
                    {cartItem ? `In Cart (${cartItem.quantity})` : 'Add to Cart'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-700 text-[#10212B]">No products found</div>
            <div className="text-sm text-[#65727A] mt-1">Try a different category or search term</div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
