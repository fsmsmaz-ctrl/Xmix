export interface OrderItemRow {
  id: string
  nameAr: string
  nameEn: string
  emoji: string
  price: number
  qty: number
  companyAr: string | null
  companyEn: string | null
}

export interface OrderData {
  id: string
  orderNumber: string
  customerName: string
  city: string
  address: string
  status: string
  subtotal: number
  shipping: number
  total: number
  createdAt: string
  items: OrderItemRow[]
}
