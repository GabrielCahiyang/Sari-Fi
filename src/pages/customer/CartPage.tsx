import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';

export function CartPage() {
  const { state, dispatch, navigate, getProduct, getCurrentCustomer, formatPHP } = useApp();
  const customer = getCurrentCustomer();
  const available = customer ? customer.creditLimit - customer.usedCredit : 0;

  const items = state.cart.map(item => ({
    ...item,
    product: getProduct(item.productId),
  })).filter(i => i.product);

  const total = items.reduce((s, i) => s + (i.product!.sellingPrice * i.quantity), 0);
  const hasSingleSupplier = new Set(items.map(item => item.product!.supplierId)).size === 1;

  const updateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) dispatch({ type: 'CART_REMOVE', productId });
    else dispatch({ type: 'CART_UPDATE', productId, quantity });
  };

  if (items.length === 0) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6">
          <div className="w-16 h-16 bg-[#F7F8F6] rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h2 className="text-xl font-800 text-[#10212B] mb-2">Your cart is empty</h2>
          <p className="text-sm text-[#65727A] mb-6">Add products from the shop to get started</p>
          <button
            onClick={() => navigate('customer/shop')}
            className="px-6 py-2.5 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all"
          >
            Browse Shop
          </button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-3.5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-800 text-[#0D2B45]">Your Cart</h1>
          <button
            onClick={() => dispatch({ type: 'CART_CLEAR' })}
            className="text-sm text-red-500 hover:text-red-600 font-500"
          >
            Clear cart
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Items */}
          <div className="col-span-12 md:col-span-8 space-y-3">
            {items.map(item => (
              <div key={item.productId} className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-[10px] font-700 text-[#65727A] uppercase tracking-wider mb-0.5">{item.product!.category}</div>
                    <div className="font-700 text-sm text-[#10212B]">{item.product!.name}</div>
                    <div className="text-xs text-[#65727A] mt-0.5">{formatPHP(item.product!.sellingPrice)} / unit</div>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'CART_REMOVE', productId: item.productId })}
                    className="text-[#65727A] hover:text-red-500 transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg border border-[#E4E8E6] text-[#65727A] hover:border-[#0D2B45] hover:text-[#0D2B45] font-700 text-lg flex items-center justify-center transition-all"
                    >−</button>
                    <span className="w-10 text-center font-700 text-sm text-[#10212B]">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-[#E4E8E6] text-[#65727A] hover:border-[#0D2B45] hover:text-[#0D2B45] font-700 text-lg flex items-center justify-center transition-all"
                    >+</button>
                  </div>
                  <div className="font-800 text-sm text-[#0D2B45]">{formatPHP(item.product!.sellingPrice * item.quantity)}</div>
                </div>
              </div>
            ))}

            <button
              onClick={() => navigate('customer/shop')}
              className="flex items-center gap-2 text-sm text-[#1E7D3B] font-600 hover:underline mt-2"
            >
              ← Continue Shopping
            </button>
          </div>

          {/* Summary */}
          <div className="col-span-12 md:col-span-4">
            <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5 sticky top-4">
              <div className="text-sm font-700 text-[#10212B] mb-4">Order Summary</div>

              <div className="space-y-2 mb-4">
                {items.map(item => (
                  <div key={item.productId} className="flex justify-between text-xs text-[#65727A]">
                    <span className="truncate pr-2">{item.product!.name} ×{item.quantity}</span>
                    <span className="font-600 shrink-0">{formatPHP(item.product!.sellingPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#E4E8E6] pt-3 mb-4">
                <div className="flex justify-between">
                  <span className="font-700 text-[#10212B]">Total</span>
                  <span className="font-800 text-[#0D2B45] text-lg">{formatPHP(total)}</span>
                </div>
              </div>

              {/* Credit info */}
              <div className="bg-[#F7F8F6] rounded-xl p-3 mb-4">
                <div className="text-xs text-[#65727A] mb-1">Available Credit</div>
                <div className={`font-700 text-sm ${available >= total ? 'text-[#1E7D3B]' : 'text-amber-600'}`}>
                  {formatPHP(available)}
                </div>
                {total > available && (
                  <div className="text-xs text-amber-600 mt-1">
                    Split payment available for the difference
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('customer/checkout')}
                disabled={!hasSingleSupplier}
                className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Checkout
              </button>
              {!hasSingleSupplier && (
                <p className="mt-2 text-xs text-amber-700 text-center">
                  One supplier per order. Remove items from other suppliers to continue.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
