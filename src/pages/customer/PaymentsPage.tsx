import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { Badge } from '../../components/ui/Badge';

export function PaymentsPage() {
  const { state, getCurrentCustomer, formatPHP } = useApp();
  const customer = getCurrentCustomer();
  const payments = state.payments.filter(p => p.customerId === customer?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-3.5 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45] mb-4 sm:mb-5">Payment History</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-[#1E7D3B] rounded-2xl p-3.5 sm:p-4">
            <div className="text-white/70 text-[11px] sm:text-xs font-600 uppercase tracking-wider">Total Paid</div>
            <div className="text-white font-800 text-lg sm:text-xl mt-1 truncate">{formatPHP(totalPaid)}</div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E8E6]">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Transactions</div>
            <div className="text-[#10212B] font-800 text-lg sm:text-xl mt-1">{payments.length}</div>
          </div>
          <div className="bg-[#FFF8E1] rounded-2xl p-3.5 sm:p-4 border border-[#FFC107]/30">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Pending</div>
            <div className="text-[#10212B] font-800 text-lg sm:text-xl mt-1 truncate">{formatPHP(pendingAmount)}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#F7F8F6]">
            <div className="text-sm font-700 text-[#10212B]">All Transactions</div>
          </div>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-[#65727A] text-sm">No payments yet.</div>
          ) : (
            <div className="divide-y divide-[#F7F8F6]">
              {payments.map(pay => (
                <div key={pay.id} className="flex items-center justify-between p-3.5 sm:px-5 sm:py-4 gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className={`w-8 sm:w-9 h-8 sm:h-9 rounded-xl flex items-center justify-center font-700 text-xs sm:text-sm shrink-0 ${pay.method === 'gcash' ? 'bg-blue-50 text-blue-600' : 'bg-[#F7F8F6] text-[#65727A]'}`}>
                      {pay.method === 'gcash' ? 'G' : '₱'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-600 text-[#10212B] truncate">
                        {pay.type === 'installment' ? 'Installment Payment' :
                         pay.type === 'full_settlement' ? 'Full Settlement' : 'Purchase Payment'}
                      </div>
                      <div className="text-[11px] text-[#65727A] truncate">
                        {pay.paymentNo} · {new Date(pay.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {pay.orderId && <div className="text-[10px] text-[#65727A]">Order payment</div>}
                      {pay.financingId && <div className="text-[10px] text-[#65727A]">Financing repayment</div>}
                      {pay.financingId && pay.method === 'cash' && pay.status === 'pending' && (
                        <div className="text-[10px] font-600 text-amber-700">Awaiting supervisor confirmation</div>
                      )}
                      {pay.confirmedBy && <div className="text-[10px] text-[#65727A]">Confirmed by {pay.confirmedBy}</div>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-800 text-xs sm:text-sm ${pay.status === 'paid' ? 'text-[#1E7D3B]' : 'text-amber-600'}`}>
                      {formatPHP(pay.amount)}
                    </div>
                    <Badge variant={pay.status === 'paid' ? 'green' : 'yellow'} size="sm">
                      {pay.status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
