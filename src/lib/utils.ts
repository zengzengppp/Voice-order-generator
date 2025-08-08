import { Order } from '@/types'

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-CN')
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

export function filterOrdersByDateRange(
  orders: Order[], 
  startDate?: string, 
  endDate?: string
): Order[] {
  let filtered = orders

  if (startDate) {
    filtered = filtered.filter(order => order.date >= startDate)
  }

  if (endDate) {
    filtered = filtered.filter(order => order.date <= endDate)
  }

  return filtered
}

export function calculateOrdersTotal(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + order.total, 0)
}

export function generatePrintHTML(orders: Order[], startDate?: string, endDate?: string): string {
  const total = calculateOrdersTotal(orders)
  const dateRange = startDate 
    ? `时间范围: ${startDate} 至 ${endDate || '今天'}` 
    : '全部订单'

  return `
    <html>
    <head>
        <title>订单报表</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
            .order { border: 1px solid #e5e7eb; margin-bottom: 15px; padding: 15px; border-radius: 8px; }
            .order-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px; }
            .items { margin-top: 10px; font-size: 14px; color: #666; }
            .total { text-align: right; font-size: 20px; font-weight: bold; margin-top: 30px; color: #4F46E5; border-top: 2px solid #4F46E5; padding-top: 10px; }
            h1 { color: #4F46E5; margin: 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>智能开单助手 - 订单报表</h1>
            <p>${dateRange}</p>
            <p>打印时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
        ${orders.map(order => `
            <div class="order">
                <div class="order-header">
                    <span>客户: ${order.supplier}</span>
                    <span>日期: ${order.date}</span>
                    <span>金额: ${formatCurrency(order.total)}</span>
                </div>
                <div class="items">
                    商品明细: ${order.items.map(item => 
                      `${item.name} ${item.quantity}${item.unit} × ${formatCurrency(item.price)} = ${formatCurrency(item.amount)}`
                    ).join(' | ')}
                </div>
            </div>
        `).join('')}
        <div class="total">总计: ${formatCurrency(total)}</div>
    </body>
    </html>
  `
}

export function printOrders(orders: Order[], startDate?: string, endDate?: string): void {
  if (orders.length === 0) {
    throw new Error('没有订单可打印')
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('无法打开打印窗口，请检查浏览器设置')
  }

  const html = generatePrintHTML(orders, startDate, endDate)
  printWindow.document.write(html)
  printWindow.document.close()
  
  setTimeout(() => {
    printWindow.print()
  }, 500)
}