import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

interface SystemWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StoryStep {
  id: number;
  stageNumber: string;
  role: string;
  roleIcon: string;
  roleBadgeColor: string;
  accountEmail: string;
  title: string;
  headline: string;
  storyNarrative: string;
  portalRoute: string;
  portalButtonText: string;
  screenSimulation: {
    screenTitle: string;
    metrics?: { label: string; value: string; color?: string }[];
    actionsTaken: string[];
    visualBadgeText?: string;
    visualBadgeColor?: string;
  };
  keyTakeaways: string[];
}

export function SystemWalkthroughModal({ isOpen, onClose }: SystemWalkthroughModalProps) {
  const { navigate } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  const storySteps: StoryStep[] = [
    {
      id: 0,
      stageNumber: '01',
      role: 'Wholesale Supplier',
      roleIcon: '🏭',
      roleBadgeColor: 'bg-[#0D2B45] text-[#FFC107]',
      accountEmail: 'test@gmail.com (Password: 123456)',
      title: 'Wholesale Supplier Lists & Stocks Inventory',
      headline: 'Suppliers add goods with direct photo upload & stock quantities',
      storyNarrative:
        'Test Supplier logs into the Wholesale Partner Portal. Instead of relying on manual catalogs, they publish wholesale products with photos (e.g. Coke 1.5L Case of 12, canned corned beef), set their wholesale selling price (₱480) and supplier cost (₱420), and record 50 cases in their warehouse.',
      portalRoute: 'supplier/products',
      portalButtonText: 'Open Supplier Catalog →',
      screenSimulation: {
        screenTitle: 'Wholesale Supplier Portal · Catalog & Warehouse',
        visualBadgeText: 'Catalog Active',
        visualBadgeColor: 'bg-emerald-100 text-emerald-800',
        metrics: [
          { label: 'Product Added', value: 'Coke 1.5L (Case of 12)' },
          { label: 'Wholesale Price', value: '₱480.00 / case' },
          { label: 'Warehouse Stock', value: '50 units on hand' },
          { label: 'Reorder Threshold', value: '10 units' },
        ],
        actionsTaken: [
          'Directly dragged-and-dropped product photo from phone/computer',
          'Automatic canvas image downscaling stored cleanly into RTDB',
          'Products instantly published to the centralized marketplace catalog',
        ],
      },
      keyTakeaways: [
        'Suppliers manage their own stock and pricing directly.',
        'Sari-Fi acts as the middleman marketplace — not a manufacturer.',
      ],
    },
    {
      id: 1,
      stageNumber: '02',
      role: 'Sari-Sari Store Owner',
      roleIcon: '🏪',
      roleBadgeColor: 'bg-[#1E7D3B] text-white',
      accountEmail: 'gabzcah@gmail.com (Password: 123456)',
      title: 'Store Owner Shops & Selects Credit Financing',
      headline: 'Zero loan-shark "5-6" exploitation — revolving credit at 5%',
      storyNarrative:
        'Gabriel Cahiyang opens his customer store account. He has a ₱6,000 revolving credit line. His shelves are low, so he browses the wholesale catalog, adds 3 cases of Coke (₱1,440) to his cart, and selects "Sari-Fi Financing (4-Week Installment Plan)". The system transparently computes a flat 5% finance fee (₱72), bringing the total to ₱1,512 at ₱378/week.',
      portalRoute: 'customer/shop',
      portalButtonText: 'Open Store Owner Shop →',
      screenSimulation: {
        screenTitle: 'Customer Portal · Cart & Checkout Screen',
        visualBadgeText: 'Financing Order Submitted',
        visualBadgeColor: 'bg-amber-100 text-amber-800',
        metrics: [
          { label: 'Wholesale Cart', value: '3x Coke 1.5L (₱1,440)' },
          { label: 'Financing Plan', value: '4 Weeks (Plan 1)' },
          { label: 'Flat 5% Fee', value: '₱72.00 (No hidden daily interest)' },
          { label: 'Weekly Payment', value: '₱378.00 / week' },
        ],
        actionsTaken: [
          'Store owner selects revolving credit without fronting cash upfront',
          'Order #ORD-0001 submitted to the platform',
          'Queued for supervisor credit risk review',
        ],
      },
      keyTakeaways: [
        'Store owners restock without draining their working cash capital.',
        'Total interest is 5% flat — never compounding 20% "5-6" daily loans.',
      ],
    },
    {
      id: 2,
      stageNumber: '03',
      role: 'Credit Supervisor',
      roleIcon: '👔',
      roleBadgeColor: 'bg-indigo-700 text-white',
      accountEmail: 'super@gmail.com (Password: 123456)',
      title: 'Supervisor Reviews & Approves Financing',
      headline: 'Credit is vetted; available line adjusts; order confirmed',
      storyNarrative:
        'Supervisor SuperJeff signs into the Staff Hub and opens Financing Management. He reviews Gabriel’s store history, credit limit usage, and order contents. Satisfied with Gabriel’s track record, he clicks "Approve Financing". The order is confirmed, financing FIN-0001 becomes active, and Gabriel’s used credit adjusts in real time.',
      portalRoute: 'supervisor/financing',
      portalButtonText: 'Open Supervisor Queue →',
      screenSimulation: {
        screenTitle: 'Internal Portal · Financing Approval Terminal',
        visualBadgeText: 'Financing Approved & Active',
        visualBadgeColor: 'bg-emerald-100 text-emerald-800',
        metrics: [
          { label: 'Application ID', value: 'FIN-0001 (Gabriel Cahiyang)' },
          { label: 'Principal Amount', value: '₱1,440.00' },
          { label: 'Approved By', value: 'SuperJeff (Supervisor)' },
          { label: 'Customer Balance', value: '₱4,488 Avail / ₱1,512 Used' },
        ],
        actionsTaken: [
          'Supervisor verifies store operating stability and approves credit',
          'Audit trail logs timestamped supervisor decision',
          'Order automatically routed to supplier for fulfillment dispatch',
        ],
      },
      keyTakeaways: [
        'Supervisors mitigate bad debt through automated risk assessment.',
        'Borrowing is tied directly to physical inventory, preventing speculative cash loans.',
      ],
    },
    {
      id: 3,
      stageNumber: '04',
      role: 'Wholesale Supplier',
      roleIcon: '🚚',
      roleBadgeColor: 'bg-[#0D2B45] text-[#FFC107]',
      accountEmail: 'test@gmail.com (Wholesale Supplier)',
      title: 'Supplier Receives Store Order & Dispatches Goods',
      headline: 'Warehouse packages the items and sends out delivery',
      storyNarrative:
        'Test Supplier checks their "Orders to Fulfill" queue. The new approved order ORD-0001 for Gabriel’s store appears with the destination address and packing list. The warehouse staff packs the 3 cases and clicks "Dispatch / Out for Delivery". The inventory is in transit.',
      portalRoute: 'supplier/orders',
      portalButtonText: 'Open Supplier Orders →',
      screenSimulation: {
        screenTitle: 'Wholesale Partner Portal · Fulfillment Queue',
        visualBadgeText: 'Out for Delivery',
        visualBadgeColor: 'bg-blue-100 text-blue-800',
        metrics: [
          { label: 'Fulfillment Order', value: 'ORD-0001 for Gabriel Cahiyang' },
          { label: 'Delivery Location', value: 'Ormoc City, Leyte' },
          { label: 'Warehouse Stock', value: '50 units → 47 units remaining' },
          { label: 'Supplier Payout', value: '₱1,440.00 (Guaranteed by Sari-Fi)' },
        ],
        actionsTaken: [
          'Supplier verifies order items and destination store',
          'Clicks "Dispatch" button to notify the platform',
          'Delivery truck departs warehouse for store drop-off',
        ],
      },
      keyTakeaways: [
        'Suppliers get guaranteed sales without collecting from 500 individual stores.',
        'Sari-Fi assumes credit risk and guarantees payment to the supplier.',
      ],
    },
    {
      id: 4,
      stageNumber: '05',
      role: 'Two-Sided Delivery Handshake',
      roleIcon: '🤝',
      roleBadgeColor: 'bg-amber-600 text-white',
      accountEmail: 'Supplier & Store Owner Both Confirm',
      title: 'Driver Delivers & Store Owner Confirms Receipt',
      headline: 'Both parties confirm delivery before order is marked Completed',
      storyNarrative:
        'The delivery van arrives at Gabriel’s sari-sari store. The supplier driver unloads the boxes and clicks "Confirm Delivered to Store" on the supplier app. Gabriel inspects the 3 cases, opens his phone on the Customer Orders page, and clicks "Confirm Order Received" (✓). Only after BOTH sides confirm is the order officially marked Completed.',
      portalRoute: 'customer/orders',
      portalButtonText: 'Open Customer Orders →',
      screenSimulation: {
        screenTitle: 'Two-Sided Delivery Handshake · Both Sides Confirm',
        visualBadgeText: 'Order Completed & Stock Received',
        visualBadgeColor: 'bg-emerald-100 text-emerald-800',
        metrics: [
          { label: 'Supplier Side', value: 'Marked "Delivered to Store" ✓' },
          { label: 'Store Owner Side', value: 'Clicked "Confirm Order Received" ✓' },
          { label: 'Order Lifecycle', value: 'Transitioned to "COMPLETED"' },
          { label: 'Sari-Sari Shelves', value: 'Restocked and ready for customer sales' },
        ],
        actionsTaken: [
          'Supplier driver registers delivery location handover',
          'Store owner physically inspects crates and confirms receipt',
          'Prevents disputes, ghost deliveries, or damaged goods claims',
        ],
      },
      keyTakeaways: [
        'Orders require a two-way digital handshake to eliminate fraud.',
        'Stock is immediately available on store shelves to generate retail cash sales.',
      ],
    },
    {
      id: 5,
      stageNumber: '06',
      role: 'Sari-Sari Store Owner',
      roleIcon: '📲',
      roleBadgeColor: 'bg-[#1E7D3B] text-white',
      accountEmail: 'gabzcah@gmail.com (Store Owner)',
      title: 'Store Owner Pays Weekly Installment via GCash Mockup',
      headline: 'Installments paid from weekly retail profits via GCash or Cash',
      storyNarrative:
        'Having sold bottles from the 3 cases over the week, Gabriel has retail cash in hand. Week 1 installment of ₱378 is due. He opens his "Financing & Payments" dashboard, selects Week 1, and submits payment through the interactive GCash Mockup with reference code GCASH-98314.',
      portalRoute: 'customer/financing',
      portalButtonText: 'Open Customer Financing →',
      screenSimulation: {
        screenTitle: 'Customer Portal · GCash Payment Mockup Terminal',
        visualBadgeText: 'Payment Submitted (Pending)',
        visualBadgeColor: 'bg-blue-100 text-blue-800',
        metrics: [
          { label: 'Installment Due', value: 'Week 1 of 4 (₱378.00)' },
          { label: 'Channel', value: 'GCash E-Wallet' },
          { label: 'Reference Number', value: 'GCASH-98314' },
          { label: 'Payment Type', value: 'Installment Repayment' },
        ],
        actionsTaken: [
          'Store owner pays installment easily from their mobile phone',
          'Payment recorded with official receipt timestamp',
          'Submitted to cashier queue for instant verification',
        ],
      },
      keyTakeaways: [
        'Micro-installments match sari-sari stores’ daily cash flow.',
        'Supports both cashless GCash digital payments and walk-in cash.',
      ],
    },
    {
      id: 6,
      stageNumber: '07',
      role: 'Cashier / Supervisor',
      roleIcon: '💳',
      roleBadgeColor: 'bg-blue-700 text-white',
      accountEmail: 'shamlam@gmial.com or super@gmail.com',
      title: 'Staff Confirms Payment & Credit Restores Instantly',
      headline: 'Payment verified; revolving credit limit immediately frees up',
      storyNarrative:
        'Internal staff Sham Lam opens Payments Management and matches the GCash reference number. She clicks "Confirm Payment". Instantly, Gabriel’s repayment schedule marks Week 1 as Paid (₱378), reducing his used debt and freeing up ₱378 back into his available revolving credit line.',
      portalRoute: 'shared/payments',
      portalButtonText: 'Open Payments Hub →',
      screenSimulation: {
        screenTitle: 'Internal Portal · Payment Settlement & Ledger',
        visualBadgeText: 'Payment Confirmed & Settled',
        visualBadgeColor: 'bg-emerald-100 text-emerald-800',
        metrics: [
          { label: 'Payment #', value: 'PAY-0001 (₱378.00)' },
          { label: 'Week 1 Status', value: 'PAID IN FULL ✓' },
          { label: 'Credit Restored', value: '+₱378.00 back to available balance' },
          { label: 'Remaining Balance', value: '₱1,134.00 (Weeks 2, 3, 4)' },
        ],
        actionsTaken: [
          'Cashier/Supervisor confirms payment verification in one click',
          'Customer balance recalculates live across all screens',
          'Payment logged in permanent financial audit ledger',
        ],
      },
      keyTakeaways: [
        'Revolving credit restores immediately upon each weekly payment.',
        'The store owner does not have to wait for the entire loan to finish to borrow again.',
      ],
    },
    {
      id: 7,
      stageNumber: '08',
      role: 'Wholesale Supplier & Platform Growth',
      roleIcon: '🔄',
      roleBadgeColor: 'bg-emerald-800 text-white',
      accountEmail: 'Full Ecosystem Virtuous Cycle',
      title: 'Supplier Restocks Warehouse & Store Credit Limit Grows',
      headline: 'Continuous cycle: healthy inventory, growing credit, no loan sharks',
      storyNarrative:
        'Having fulfilled orders, Test Supplier opens the Restock Hub and logs an intake batch of 100 new crates directly from the factory. Meanwhile, Gabriel completes his repayment cycles on time: Sari-Fi’s engine automatically promotes Gabriel’s credit limit from ₱6,000 to ₱7,000! Gabriel is ready to restock his store again with zero fear of predatory lenders.',
      portalRoute: 'supplier/restock',
      portalButtonText: 'Open Supplier Restock Hub →',
      screenSimulation: {
        screenTitle: 'Complete Ecosystem · Virtuous Financial Cycle',
        visualBadgeText: 'Limit Upgraded to ₱7,000',
        visualBadgeColor: 'bg-emerald-100 text-emerald-800',
        metrics: [
          { label: 'Supplier Warehouse', value: 'Restocked +100 units from factory' },
          { label: 'Repayment Score', value: '100% On-Time Performance' },
          { label: 'New Credit Limit', value: '₱7,000.00 (+₱1,000 Auto-Increase)' },
          { label: 'Loan Shark Reliance', value: '0% — Completely eliminated' },
        ],
        actionsTaken: [
          'Supplier warehouse inventory replenished for future orders',
          'Store owner earns automatic credit score & limit expansion',
          'Platform generates reliable middleman revenue with zero delinquency',
        ],
      },
      keyTakeaways: [
        'The full supply, fulfillment, repayment, and restock loop is complete.',
        'Empowers grassroots sari-sari store commerce across the Philippines.',
      ],
    },
  ];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        setCurrentStep(prev => (prev < storySteps.length - 1 ? prev + 1 : prev));
      }
      if (e.key === 'ArrowLeft') {
        setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, storySteps.length, onClose]);

  if (!isOpen) return null;

  const current = storySteps[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-[#E4E8E6] overflow-hidden flex flex-col max-h-[94vh]"
        >
          {/* Top Bar Header */}
          <div className="p-5 sm:p-6 border-b border-[#E4E8E6] flex items-center justify-between bg-[#F7F8F6]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-900 text-[#1E7D3B] uppercase tracking-wider">
                  Live System Walkthrough Simulator
                </span>
                <span className="text-xs text-[#65727A]">·</span>
                <span className="text-xs font-700 text-[#0D2B45]">
                  Step {currentStep + 1} of {storySteps.length}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-900 text-[#0D2B45] tracking-tight mt-0.5">
                {current.title}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#65727A] hover:text-[#0D2B45] hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-[#E4E8E6]"
              aria-label="Close walkthrough"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 8-Stage Progress Strip */}
          <div className="grid grid-cols-4 sm:grid-cols-8 border-b border-[#E4E8E6] bg-white text-center">
            {storySteps.map((s, idx) => {
              const isActive = currentStep === idx;
              const isPast = currentStep > idx;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`py-2.5 px-1.5 border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#1E7D3B] bg-emerald-50/50 text-[#1E7D3B]'
                      : isPast
                      ? 'border-emerald-500/40 text-[#0D2B45] hover:bg-[#F7F8F6]'
                      : 'border-transparent text-[#65727A] hover:bg-[#F7F8F6]'
                  }`}
                >
                  <div className="text-[10px] font-800 tracking-wider truncate">
                    {s.stageNumber}. {s.roleIcon} {s.role.split(' ')[0]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Story Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Story Actor & Narrative Banner */}
            <div className="bg-[#F7F8F6] p-5 rounded-2xl border border-[#E4E8E6]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-800 uppercase px-3 py-1 rounded-xl shadow-xs ${current.roleBadgeColor}`}>
                    {current.roleIcon} {current.role}
                  </span>
                  <span className="text-xs font-mono text-[#65727A] bg-white px-2.5 py-1 rounded-lg border border-[#E4E8E6]">
                    Account: {current.accountEmail}
                  </span>
                </div>
                <span className="text-xs font-700 text-[#1E7D3B]">
                  Phase {current.stageNumber} of 08
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-900 text-[#0D2B45] tracking-tight">
                {current.headline}
              </h3>
              <p className="text-xs sm:text-sm text-[#4A5568] mt-2 leading-relaxed font-500">
                {current.storyNarrative}
              </p>
            </div>

            {/* Screen Simulation Box */}
            <div className="border border-[#E4E8E6] rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="bg-[#0D2B45] text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                  <span className="text-xs font-700 text-white/80 ml-2 font-mono truncate">
                    {current.screenSimulation.screenTitle}
                  </span>
                </div>
                {current.screenSimulation.visualBadgeText && (
                  <span className={`text-[10px] font-800 uppercase px-2 py-0.5 rounded-md ${current.screenSimulation.visualBadgeColor || 'bg-white text-[#0D2B45]'}`}>
                    {current.screenSimulation.visualBadgeText}
                  </span>
                )}
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* Metric Strip */}
                {current.screenSimulation.metrics && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {current.screenSimulation.metrics.map((m, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#F7F8F6] border border-[#E4E8E6]">
                        <div className="text-[11px] font-600 text-[#65727A]">{m.label}</div>
                        <div className="text-sm sm:text-base font-800 text-[#0D2B45] mt-0.5 tnum truncate">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Key Actions Logged */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-800 uppercase tracking-wider text-[#65727A]">
                    Automated Platform State Changes
                  </div>
                  <div className="space-y-1.5">
                    {current.screenSimulation.actionsTaken.map((act, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-600 text-[#10212B]">
                        <span className="text-[#1E7D3B] font-800">✓</span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Portal Action Link */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-800 text-[#1E7D3B]">Test This Exact Screen in the Real System</div>
                <div className="text-[11px] text-emerald-900/80">
                  Switch to this role and execute this action live with your active database.
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  navigate(current.portalRoute);
                }}
                className="px-4 py-2 bg-[#1E7D3B] hover:bg-[#165f2c] text-white text-xs font-700 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
              >
                {current.portalButtonText}
              </button>
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="p-4 sm:p-5 border-t border-[#E4E8E6] bg-[#F7F8F6] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 text-xs font-700 text-[#65727A] hover:text-[#0D2B45] hover:bg-white rounded-xl border border-transparent hover:border-[#E4E8E6] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous Phase
            </button>

            <div className="flex items-center gap-1.5">
              {storySteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentStep === i ? 'w-6 bg-[#1E7D3B]' : 'w-2 bg-[#C5CBD0] hover:bg-[#A0AEC0]'
                  }`}
                  aria-label={`Jump to stage ${i + 1}`}
                />
              ))}
            </div>

            {currentStep < storySteps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(storySteps.length - 1, prev + 1))}
                className="px-5 py-2 text-xs font-700 bg-[#0D2B45] text-white hover:bg-[#163b5c] rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Next Phase ({storySteps[currentStep + 1].role}) →
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-700 bg-[#1E7D3B] text-white hover:bg-[#165f2c] rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Finish Walkthrough ✓
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
