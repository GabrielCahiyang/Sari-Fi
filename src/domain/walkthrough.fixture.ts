import { DEFAULT_SETTINGS } from '../data/seed'
import type { AppState } from '../types'

export function sourceFixture():AppState {
  return {currentUser:null,currentPage:'home',cart:[],checkoutData:null,customers:[],employees:[],orders:[],financing:[],payments:[],restockOrders:[],auditLog:[],toast:null,
    settings:structuredClone(DEFAULT_SETTINGS),categories:[{id:'a',name:'Beverages'},{id:'b',name:'Instant Noodles'}],
    suppliers:['s1','s2'].map(id=>({id,name:id,contact:'private contact',phone:'private phone',email:'private@example.test',address:'private address',categories:['Beverages','Instant Noodles'],status:'active',password:'private password'})),
    products:[
      {id:'p1',name:'Kopiko Black (Solo)',sku:'KOPIKO',category:'Beverages',supplierId:'s1',sellingPrice:7.35,retailPrice:7,costPrice:5.95,stock:60,reorderLevel:12,status:'active',imageUrl:'https://res.cloudinary.com/a5bi1hsj/image/upload/kopiko.jpg'},
      {id:'p2',name:'Lucky Me Pancit Canton',sku:'NOODLES',category:'Instant Noodles',supplierId:'s2',sellingPrice:12.39,retailPrice:11.8,costPrice:10.03,stock:60,reorderLevel:12,status:'active'},
      {id:'p3',name:'Milo',sku:'MILO',category:'Beverages',supplierId:'s1',sellingPrice:9.45,retailPrice:9,costPrice:7.65,stock:24,reorderLevel:12,status:'active'},
    ]}
}
