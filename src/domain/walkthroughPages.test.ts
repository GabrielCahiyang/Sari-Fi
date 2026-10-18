import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WalkthroughAppProvider } from '../context/AppContext'
import { sourceFixture } from './walkthrough.fixture'
import { createWalkthroughSession, walkthroughFrame, TOUR_STEPS } from './walkthrough'
import { CustomersManagementPage } from '../pages/shared/CustomersManagementPage'
import { SupplierProductsPage } from '../pages/supplier/SupplierProductsPage'
import { ShopPage } from '../pages/customer/ShopPage'
import { CartPage } from '../pages/customer/CartPage'
import { CheckoutPage } from '../pages/customer/CheckoutPage'
import { FinancingManagementPage } from '../pages/shared/FinancingManagementPage'
import { SupplierOrdersPage } from '../pages/supplier/SupplierOrdersPage'
import { OrdersPage } from '../pages/customer/OrdersPage'
import { FinancingPage } from '../pages/customer/FinancingPage'
import { PaymentsManagementPage } from '../pages/shared/PaymentsManagementPage'
import { AccountPage } from '../pages/customer/AccountPage'
import { SupplierRestockPage } from '../pages/supplier/SupplierRestockPage'
import { POSPage } from '../pages/shared/POSPage'

const persistence=vi.hoisted(()=>vi.fn(()=>{throw new Error('Walkthrough attempted persistence')}))
vi.mock('../services/firebase/rtdbService',()=>Object.fromEntries([
  'subscribeToNodeList','subscribeToNodeObject','saveRecord','updateRecord','deleteRecord','saveSettings','logAuditEntry','seedDatabaseIfEmpty',
  'updateRootPaths','createOrdersWithReservations','settleOrderPayment','approveFinancingFlow','cancelOrderFlow','transitionOrderFlow',
].map(key=>[key,persistence])))
vi.mock('../services/firebase/authService',()=>({loginWithEmail:persistence,logoutUser:persistence,subscribeToAuth:persistence}))

const pages:Record<string,React.ComponentType>={
  'supervisor/customers':CustomersManagementPage,'supplier/products':SupplierProductsPage,'customer/shop':ShopPage,
  'customer/cart':CartPage,'customer/checkout':CheckoutPage,'supervisor/financing':FinancingManagementPage,
  'supplier/orders':SupplierOrdersPage,'customer/orders':OrdersPage,'customer/financing':FinancingPage,
  'supervisor/payments':PaymentsManagementPage,'customer/account':AccountPage,'supplier/restock':SupplierRestockPage,'employee/pos':POSPage,
}
describe('actual walkthrough page rendering',()=>{
  const session=createWalkthroughSession(sourceFixture(),new Date('2026-10-19T03:00:00+08:00'))
  for(const step of TOUR_STEPS){
    it(`renders ${step.stageNumber} on ${step.targetPage} with its exact spotlight target`,()=>{
      for(const done of [false,true]){
        const state=walkthroughFrame(session,step.id,done)
        const html=renderToStaticMarkup(React.createElement(WalkthroughAppProvider,{state,children:React.createElement(pages[step.targetPage])}))
        expect(html).toContain(`data-tour-target="${step.focusTarget}"`)
        expect(html).not.toContain('undefined%')
      }
      expect(persistence).not.toHaveBeenCalled()
    })
  }
})
