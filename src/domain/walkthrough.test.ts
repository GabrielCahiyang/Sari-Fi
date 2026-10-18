import { describe, expect, it } from 'vitest'
import { createWalkthroughSession, walkthroughFrame, describeWalkthroughStep, TOUR_STEPS } from './walkthrough'
import { sourceFixture } from './walkthrough.fixture'
import { planReservationPaths } from './checkoutReservation'
import { getUnitPrice, toCentavos } from '../utils/productPricing'

const now=new Date('2026-10-19T03:00:00+08:00')
describe('walkthrough contracts and navigation',()=>{
  it('uses current catalog prices/images without copying private identities or mutating live state',()=>{
    const source=sourceFixture();const before=structuredClone(source)
    const session=createWalkthroughSession(source,now)
    expect(session.base.products).toHaveLength(3)
    expect(session.base.products[0].imageUrl).toBe(source.products[0].imageUrl)
    expect(JSON.stringify(session)).not.toContain('private')
    TOUR_STEPS.forEach((_,i)=>{walkthroughFrame(session,i,false);walkthroughFrame(session,i,true)})
    expect(source).toEqual(before)
  })
  it('builds two supplier orders accepted by actual checkout validation with exact schedules',()=>{
    const session=createWalkthroughSession(sourceFixture(),now)
    const {base,bundles}=session
    expect(bundles).toHaveLength(2)
    expect(new Set(bundles.map(b=>b.order.supplierId)).size).toBe(2)
    expect(new Set(bundles.map(b=>b.order.checkoutGroupId)).size).toBe(1)
    expect(()=>planReservationPaths(bundles,{settings:base.settings,customers:Object.fromEntries(base.customers.map(c=>[c.id,c])),suppliers:Object.fromEntries(base.suppliers.map(s=>[s.id,s])),products:Object.fromEntries(base.products.map(p=>[p.id,p]))})).not.toThrow()
    bundles.forEach(({financing:f})=>expect(f.schedule.reduce((sum,row)=>sum+toCentavos(row.baseAmount),0)).toBe(toCentavos(f.totalRepayable)))
    expect(getUnitPrice(base.products[0],11,base.settings)).toBe(7.35)
    expect(bundles[0].order.items[0].price).toBe(7)
  })
  it('shows all three current terms and an alternative split preview without affecting main approval',()=>{
    const session=createWalkthroughSession(sourceFixture(),now)
    for(const [index,months] of [[4,1],[5,2],[6,3]]){
      const frame=walkthroughFrame(session,index)
      expect(frame.checkoutData?.plan).toBe(session.base.settings.repaymentPlans[months-1].id)
      expect(describeWalkthroughStep(session,index).detailedInstruction).toContain(`${months}% total interest`)
    }
    const split=walkthroughFrame(session,7)
    expect(split.checkoutData?.mode).toBe('split')
    expect(split.customers[0].creditLimit-split.customers[0].usedCredit).toBeLessThan(split.checkoutData!.total)
    expect(walkthroughFrame(session,8).customers[0].usedCredit).toBe(0)
  })
  it('enforces delivery order, keeps the second supplier separate, and waits for customer confirmation',()=>{
    const session=createWalkthroughSession(sourceFixture(),now)
    expect(walkthroughFrame(session,8).orders[0].status).toBe('pending_financing')
    expect(walkthroughFrame(session,8,true).orders[0].status).toBe('processing')
    expect([9,10,11,12].map(i=>walkthroughFrame(session,i,true).orders[0].status)).toEqual(['ready','out_for_delivery','delivered','completed'])
    expect(walkthroughFrame(session,12,true).orders[1].status).toBe('processing')
    expect(walkthroughFrame(session,9,true).orders[0].stockReservationStatus).toBe('committed')
  })
  it('keeps cash pending until confirmation, restores principal only, and settles without clearing other loans',()=>{
    const session=createWalkthroughSession(sourceFixture(),now)
    const pending=walkthroughFrame(session,13,true)
    const confirmed=walkthroughFrame(session,14,true)
    expect(pending.payments[0].status).toBe('pending')
    expect(pending.financing[0].schedule[0].status).toBe('due')
    const release=pending.financing[0].principal/pending.financing[0].installmentCount
    expect(confirmed.customers[0].usedCredit).toBe(pending.customers[0].usedCredit-release)
    expect(confirmed.payments[0].amount).toBeGreaterThan(release)
    const final=walkthroughFrame(session,15,true)
    expect(final.financing[0].status).toBe('completed')
    expect(final.financing[1].status).toBe('active')
    expect(final.customers[0].usedCredit).toBeCloseTo(final.financing[1].principal)
    expect(final.customers[0].creditLimit).toBe(Math.min(session.base.settings.maxAutomaticLimit,session.base.customers[0].creditLimit+session.base.settings.limitIncreaseAmount))
  })
  it('can jump backwards/replay without duplicating stock changes or payments',()=>{
    const session=createWalkthroughSession(sourceFixture(),now)
    const first=walkthroughFrame(session,17,true)
    walkthroughFrame(session,3,true)
    expect(walkthroughFrame(session,17,true)).toEqual(first)
    expect(first.products[0].stock).toBe(session.base.products[0].stock-12+24)
    expect(first.payments).toHaveLength(2)
  })
  it('reports actionable setup gaps instead of silently showing an invalid example',()=>{
    const source=sourceFixture();source.suppliers=[]
    expect(()=>createWalkthroughSession(source,now)).toThrow('two suppliers')
  })
})
