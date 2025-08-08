'use client'

import { useOrderSystem } from '@/contexts/OrderContext'
import { formatCurrency } from '@/lib/utils'

interface OrderPreviewProps {
  onAddManualItem: () => void
}

export default function OrderPreview({ onAddManualItem }: OrderPreviewProps) {
  const { currentOrders, removeOrderItem } = useOrderSystem()

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="step-indicator mr-3">3</div>
          <h2 className="text-lg font-semibold text-gray-800">订单预览</h2>
        </div>
        <button
          onClick={onAddManualItem}
          className="text-primary-600 hover:text-primary-800 text-sm"
        >
          <i className="fas fa-plus mr-1"></i>手动添加
        </button>
      </div>
      
      <div className="space-y-3 min-h-[100px]">
        {currentOrders.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <i className="fas fa-shopping-cart text-3xl mb-2"></i>
            <p>暂无商品，使用语音添加</p>
          </div>
        ) : (
          currentOrders.map((item) => (
            <div key={item.id} className="order-item bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                {/* 商品信息：50% 宽度 */}
                <div className="w-1/2 flex-shrink-0">
                  <h3 className="font-semibold text-gray-800 leading-tight">{item.name}</h3>
                </div>
                
                {/* 价格数量：35% 宽度 */}
                <div className="w-[35%] flex-shrink-0">
                  <p className="text-sm text-gray-600 mb-1">
                    {item.quantity}{item.unit} × {formatCurrency(item.price)}
                  </p>
                  <p className="text-lg font-bold text-primary-600">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
                
                {/* 删除按钮：15% 宽度 */}
                <div className="w-[15%] flex-shrink-0 flex justify-center">
                  <button
                    onClick={() => removeOrderItem(item.id)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-3 transition-colors duration-200 shadow-sm"
                  >
                    <i className="fas fa-trash text-lg"></i>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}