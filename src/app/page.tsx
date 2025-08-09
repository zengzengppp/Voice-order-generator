'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Order {
  id: number
  date: string
  factoryId: number
  items: OrderItem[]
  grandTotal: number
}

interface OrderItem {
  name: string
  quantity: number
  unit: string
  price: number
}

interface Factory {
  id: number
  name: string
}

export default function Home() {
  // Hydration fix - prevent SSR mismatch
  const [isClient, setIsClient] = useState(false)

  // Global state
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [factories, setFactories] = useState<Factory[]>([{id: 1, name: '默认厂家'}])
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [currentTab, setCurrentTab] = useState<'invoicing' | 'management'>('invoicing')
  const [status, setStatus] = useState('')
  const [voiceInput, setVoiceInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [filteredReportData, setFilteredReportData] = useState<{orders: Order[], title: string}>({orders: [], title: ''})
  
  // Modern UI state
  const [isScrolling, setIsScrolling] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalBody, setModalBody] = useState('')
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null)
  
  // Customer selection modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  // Form states
  const [newFactoryName, setNewFactoryName] = useState('')
  const [reportFactoryId, setReportFactoryId] = useState('all')
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')

  // Load data from localStorage - client-side only to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
    
    const savedOrders = localStorage.getItem('allOrders_v13')
    const savedFactories = localStorage.getItem('factories_v13')
    
    if (savedOrders) {
      setAllOrders(JSON.parse(savedOrders))
    }
    if (savedFactories) {
      setFactories(JSON.parse(savedFactories))
    }
  }, [])

  // Save data to localStorage with debouncing - client-side only
  const saveData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('allOrders_v13', JSON.stringify(allOrders))
      localStorage.setItem('factories_v13', JSON.stringify(factories))
    }
  }, [allOrders, factories])

  useEffect(() => {
    if (!isClient) return // Don't save during SSR
    
    const timeoutId = setTimeout(() => {
      saveData()
    }, 500) // 延迟保存，避免频繁写入

    return () => clearTimeout(timeoutId)
  }, [allOrders, factories, saveData, isClient])

  // Show toast message with enhanced UI
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' | 'celebration' = 'success') => {
    const enhancedMessage = getEnhancedMessage(message, type)
    setStatus(enhancedMessage)
    setTimeout(() => setStatus(''), type === 'celebration' ? 4000 : 3000)
  }

  // Get enhanced message with emojis and colors
  const getEnhancedMessage = (message: string, type: string) => {
    const messageConfig = {
      success: { emoji: '✅', bgColor: 'bg-[#44bba4]', textColor: 'text-white' },
      celebration: { emoji: '🎉', bgColor: 'bg-gradient-to-r from-[#e7bb41] to-[#d3a11a]', textColor: 'text-white' },
      error: { emoji: '❌', bgColor: 'bg-red-500', textColor: 'text-white' }, 
      warning: { emoji: '⚠️', bgColor: 'bg-[#e7bb41]', textColor: 'text-white' },
      info: { emoji: 'ℹ️', bgColor: 'bg-[#44bba4]', textColor: 'text-white' }
    }
    
    const config = messageConfig[type as keyof typeof messageConfig] || messageConfig.info
    return `${config.emoji} ${message}`
  }

  // Get toast style based on message type
  const getToastStyle = (message: string) => {
    if (message.includes('🎉')) return 'bg-gradient-to-r from-[#e7bb41] to-[#d3a11a] text-white animate-bounce shadow-lg transform scale-105'
    if (message.includes('✅')) return 'bg-[#44bba4] text-white shadow-lg'
    if (message.includes('❌')) return 'bg-red-500 text-white shadow-lg'
    if (message.includes('⚠️')) return 'bg-[#e7bb41] text-white shadow-lg'
    if (message.includes('ℹ️')) return 'bg-[#44bba4] text-white shadow-lg'
    return 'bg-[#393e41] text-white shadow-lg'
  }

  // Show confirmation modal
  const showConfirmModal = (title: string, body: string, onConfirm: () => void) => {
    setModalTitle(title)
    setModalBody(body)
    setConfirmCallback(() => onConfirm)
    setShowModal(true)
  }

  // Hide modal
  const hideModal = () => {
    setShowModal(false)
    setConfirmCallback(null)
  }

  // Start new order - show customer selection modal first
  const startNewOrder = () => {
    if (factories.length === 0) {
      showToast('请先在"厂家与报表"页面添加一个厂家。', 'warning')
      return
    }
    setShowCustomerModal(true)
  }
  
  // Create order with selected customer
  const createOrderWithCustomer = (factoryId: number) => {
    setCurrentOrder({
      id: Date.now(),
      date: new Date().toISOString(),
      factoryId: factoryId,
      items: [{ name: '', quantity: 1, unit: '', price: 0 }],
      grandTotal: 0
    })
    setShowCustomerModal(false)
    showToast('开始新订单！', 'success')
  }

  // Process with AI
  const processWithAI = async (text: string) => {
    if (!currentOrder) {
      showToast('请先"新开一单"', 'warning')
      return
    }
    
    if (!text.trim()) {
      showToast('请输入商品信息', 'warning')
      return
    }
    
    setIsProcessing(true)
    setStatus('🔍 好的，我正在记...')
    
    try {
      const response = await fetch('/api/process-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          currentItems: currentOrder.items || []
        })
      })

      if (!response.ok) {
        let errorMessage = 'API请求失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('AI响应:', result) // 调试用
      
      if (result.items && Array.isArray(result.items)) {
        // 过滤掉空的商品项
        const validItems = result.items.filter((item: any) => item.name && item.name.trim())
        if (validItems.length > 0) {
          const updatedOrder = { ...currentOrder, items: validItems }
          setCurrentOrder(updateTotals(updatedOrder))
          showToast('商品记录完成！', 'celebration')
          setStatus('🎁 记好啦，曾老板！请您检查一下。')
          setTimeout(() => setStatus(''), 4000)
        } else {
          showToast('未识别到有效的商品信息，请重试', 'warning')
          setStatus('')
        }
      } else {
        console.error('AI返回格式错误:', result) // 调试用
        throw new Error('AI返回的数据格式不正确')
      }
    } catch (error) {
      console.error('处理订单错误:', error) // 调试用
      const errorMessage = error instanceof Error ? error.message : '处理失败，请重试'
      showToast(errorMessage, 'error')
      setStatus('😅 出错了，请重试。')
      setTimeout(() => setStatus(''), 3000)
    } finally {
      setIsProcessing(false)
      // 不清空输入，让用户可以重试
    }
  }

  // Generate AI response button
  const handleGenerateAI = () => {
    if (!voiceInput.trim()) {
      showToast('请先输入要添加的商品', 'warning')
      return
    }
    processWithAI(voiceInput)
  }

  // Update order totals
  const updateTotals = (order: Order) => {
    const total = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    return { ...order, grandTotal: total }
  }

  // Handle form input changes
  const handleItemChange = useCallback((index: number, field: string, value: any) => {
    setCurrentOrder(prevOrder => {
      if (!prevOrder) return prevOrder
      
      const updatedItems = [...prevOrder.items]
      updatedItems[index] = { ...updatedItems[index], [field]: value }
      const updatedOrder = { ...prevOrder, items: updatedItems }
      return updateTotals(updatedOrder)
    })
  }, [])

  // Add new item row
  const addNewItemRow = useCallback(() => {
    setCurrentOrder(prevOrder => {
      if (!prevOrder) return prevOrder
      return {
        ...prevOrder,
        items: [...prevOrder.items, { name: '', quantity: 1, unit: '', price: 0 }]
      }
    })
  }, [])

  // Delete item
  const deleteItem = useCallback((index: number) => {
    setCurrentOrder(prevOrder => {
      if (!prevOrder) return prevOrder
      const updatedItems = prevOrder.items.filter((_, i) => i !== index)
      const updatedOrder = { ...prevOrder, items: updatedItems }
      return updateTotals(updatedOrder)
    })
  }, [])

  // Save current order
  const saveCurrentOrder = () => {
    if (!currentOrder || !currentOrder.factoryId || currentOrder.items.length === 0) {
      showToast('请选择厂家并添加至少一项商品', 'warning')
      return
    }
    
    const validItems = currentOrder.items.filter(item => item.name.trim())
    if (validItems.length === 0) {
      showToast('请添加至少一项有效商品', 'warning')
      return
    }
    
    const orderToSave = { ...currentOrder, items: validItems }
    setAllOrders(prev => [...prev, orderToSave])
    setCurrentOrder(null)
    showToast('订单保存成功！', 'celebration')
  }

  // Cancel current order
  const cancelCurrentOrder = () => {
    setCurrentOrder(null)
  }

  // Add factory
  const addFactory = () => {
    if (!newFactoryName.trim()) {
      showToast('厂家名称不能为空', 'warning')
      return
    }
    const newFactory = { id: Date.now(), name: newFactoryName.trim() }
    setFactories(prev => [...prev, newFactory])
    setNewFactoryName('')
    showToast('厂家添加成功！', 'celebration')
  }

  // Delete factory
  const deleteFactory = (id: number) => {
    showConfirmModal('确认删除', '确定要删除厂家吗？此操作会删除该厂家的所有订单记录，且不可撤销。', () => {
      setFactories(prev => prev.filter(f => f.id !== id))
      setAllOrders(prev => prev.filter(o => o.factoryId !== id))
      showToast('厂家及相关订单已删除', 'success')
    })
  }

  // Get today's orders
  const getTodaysOrders = () => {
    const today = new Date().toISOString().slice(0, 10)
    return allOrders.filter(o => o.date && o.date.slice(0, 10) === today)
  }

  // Export today's orders
  const exportTodayOrders = () => {
    const todaysOrders = getTodaysOrders()
    if (todaysOrders.length === 0) {
      showToast('今日还没有订单可以打印', 'info')
      return
    }
    generatePrintableReport(todaysOrders, `今日单据 (${new Date().toISOString().slice(0, 10)})`)
  }

  // Generate report based on filters
  const generateReport = () => {
    if (!reportStartDate || !reportEndDate) {
      showToast('请选择开始和结束日期', 'warning')
      return
    }

    let filteredOrders = allOrders.filter(order => {
      const orderDate = new Date(order.date).toISOString().slice(0, 10)
      return orderDate >= reportStartDate && orderDate <= reportEndDate
    })

    if (reportFactoryId !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.factoryId === parseInt(reportFactoryId))
    }

    if (filteredOrders.length === 0) {
      showToast('选定时间范围内没有订单', 'info')
      return
    }

    const factoryName = reportFactoryId === 'all' ? '所有厂家' : factories.find(f => f.id === parseInt(reportFactoryId))?.name || '未知厂家'
    const title = `${factoryName} 订单报表 (${reportStartDate} 至 ${reportEndDate})`
    
    setFilteredReportData({ orders: filteredOrders, title })
    showToast(`找到 ${filteredOrders.length} 个订单！`, 'success')
  }

  // Set date range shortcuts
  const setDateRange = (type: 'week' | 'month' | 'year') => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    
    let startDate: Date
    let endDate = today

    switch (type) {
      case 'week':
        const dayOfWeek = today.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startDate = new Date(today)
        startDate.setDate(today.getDate() - daysToMonday)
        break
      case 'month':
        startDate = new Date(currentYear, currentMonth, 1)
        break
      case 'year':
        startDate = new Date(currentYear, 0, 1)
        break
    }

    setReportStartDate(startDate.toISOString().slice(0, 10))
    setReportEndDate(endDate.toISOString().slice(0, 10))
  }

  // Print filtered report
  const printFilteredReport = () => {
    if (filteredReportData.orders.length === 0) {
      showToast('没有可打印的报表数据', 'info')
      return
    }
    generatePrintableReport(filteredReportData.orders, filteredReportData.title)
  }

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    // 忽略来自输入框和按钮的触摸事件
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('input, textarea, button')) {
      return
    }
    setTouchStart(e.targetTouches[0].clientX)
    setTouchEnd(0) // 重置结束位置
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // 忽略来自输入框和按钮的触摸事件
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('input, textarea, button')) {
      return
    }
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      // 清除触摸状态
      setTouchStart(0)
      setTouchEnd(0)
      return
    }
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && currentTab === 'invoicing') {
      setCurrentTab('management')
    }
    if (isRightSwipe && currentTab === 'management') {
      setCurrentTab('invoicing')
    }
    
    // 清除触摸状态
    setTouchStart(0)
    setTouchEnd(0)
  }

  // Get statistics for dashboard
  const getStatistics = () => {
    const today = new Date().toISOString().slice(0, 10)
    const todayOrders = allOrders.filter(o => o.date && o.date.slice(0, 10) === today)
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.grandTotal, 0)
    
    const thisMonth = new Date().toISOString().slice(0, 7)
    const monthOrders = allOrders.filter(o => o.date && o.date.slice(0, 7) === thisMonth)
    const monthRevenue = monthOrders.reduce((sum, order) => sum + order.grandTotal, 0)

    return {
      todayOrders: todayOrders.length,
      todayRevenue,
      monthOrders: monthOrders.length,
      monthRevenue,
      totalFactories: factories.length,
      totalOrders: allOrders.length
    }
  }

  // Generate printable report with better mobile support
  const generatePrintableReport = (ordersToPrint: Order[], title: string) => {
    const content = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segui UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; 
            margin: 0; 
            padding: 0; 
            font-size: 14px; 
            line-height: 1.4;
            color: #333;
            background: #fff;
          }
          
          .order-page { 
            padding: 20px;
            page-break-inside: avoid; 
            page-break-after: always; 
            background: #fff;
          }
          
          .order-page:last-child { 
            page-break-after: auto !important; 
          }
          
          .print-header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #44bba4; 
            padding-bottom: 15px;
          }
          
          .print-header h1 { 
            margin: 0 0 10px 0; 
            color: #44bba4; 
            font-size: 24px;
            font-weight: bold;
          }
          
          .print-date { 
            color: #666; 
            font-size: 14px; 
          }
          
          .order-content { 
            border: 2px solid #44bba4; 
            border-radius: 12px; 
            padding: 20px; 
            background: #fff;
          }
          
          .order-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            font-weight: bold; 
            font-size: 18px; 
            border-bottom: 2px solid #e7e5df; 
            padding-bottom: 15px; 
            margin-bottom: 20px;
            color: #393e41;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 15px;
          }
          
          th, td { 
            border: 1px solid #d3d0cb; 
            padding: 12px 8px; 
            text-align: center; 
            vertical-align: middle;
          }
          
          th { 
            background-color: #44bba4; 
            color: white;
            font-weight: bold;
            font-size: 14px;
          }
          
          td { 
            font-size: 13px; 
          }
          
          .product-name { 
            text-align: left !important; 
            font-weight: 600;
          }
          
          .total-row { 
            background-color: #faf1d9 !important; 
            border-top: 2px solid #e7bb41 !important;
          }
          
          .total-row td { 
            font-weight: bold; 
            font-size: 16px;
            color: #e7bb41;
          }
          
          /* 打印样式 */
          @media print {
            body { 
              margin: 0; 
              padding: 0;
              font-size: 12px; 
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .order-page { 
              page-break-inside: avoid; 
              page-break-after: always;
              break-inside: avoid;
              padding: 15px;
            }
            
            .order-page:last-child { 
              page-break-after: auto !important; 
              break-after: auto !important;
            }
            
            .no-print { 
              display: none !important; 
            }
            
            th { 
              background-color: #44bba4 !important; 
              color: white !important;
            }
            
            .total-row { 
              background-color: #faf1d9 !important; 
            }
          }
          
          /* 移动端样式 */
          @media screen and (max-width: 768px) {
            .order-page { padding: 10px; }
            .print-header h1 { font-size: 20px; }
            .order-content { padding: 15px; }
            .order-header { font-size: 16px; flex-direction: column; align-items: flex-start; gap: 5px; }
            th, td { padding: 8px 4px; font-size: 12px; }
          }
        </style>
      </head>
      <body>`

    let orderContent = ''
    ordersToPrint.forEach((order, orderIndex) => {
      const factory = factories.find(f => f.id === order.factoryId)
      orderContent += `
        <div class="order-page">
          <div class="print-header">
            <h1>丰业膳食开单系统</h1>
            <div class="print-date">打印时间: ${new Date().toLocaleString('zh-CN')}</div>
          </div>
          
          <div class="order-content">
            <div class="order-header">
              <span>客户: ${factory ? factory.name : '未知厂家'}</span>
              <span>日期: ${new Date(order.date).toLocaleDateString('zh-CN')}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35%">菜品</th>
                  <th style="width: 15%">数量</th>
                  <th style="width: 15%">单位</th>
                  <th style="width: 15%">单价</th>
                  <th style="width: 20%">小计</th>
                </tr>
              </thead>
              <tbody>`
      
      order.items.forEach(item => {
        orderContent += `
          <tr>
            <td class="product-name">${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.unit || '斤'}</td>
            <td>¥${(item.price || 0).toFixed(2)}</td>
            <td>¥${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
          </tr>`
      })
      
      orderContent += `
                <tr class="total-row">
                  <td colspan="4" style="text-align: right; font-weight: bold;">订单总计:</td>
                  <td style="font-weight: bold;">¥${(order.grandTotal || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>`
    })

    const footer = `
      </body>
      </html>`

    const finalContent = content + orderContent + footer

    // 检测浏览器类型和设备
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent)
    const isIOS = /ipad|iphone|ipod/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent)
    const isChrome = /chrome/.test(userAgent)
    const isMiui = /miuibrowser/.test(userAgent)
    const isWeChat = /micromessenger/.test(userAgent)
    
    // 创建简化的移动端打印界面
    const createMobilePrintInterface = (printWindow: Window) => {
      // 创建打印函数并添加到window对象
      (printWindow as any).safariPrint = function() {
        try {
          printWindow.print()
        } catch (error) {
          console.error('打印失败:', error)
          alert('打印功能可能不被当前浏览器支持，请使用浏览器菜单中的打印功能或长按页面选择打印')
        }
      }
      
      // 创建关闭窗口函数
      ;(printWindow as any).closePrintWindow = function() {
        printWindow.close()
      }
      
      // 添加控制按钮：左上角关闭按钮 + 底部打印按钮
      const printControls = printWindow.document.createElement('div')
      printControls.innerHTML = `
        <!-- 左上角关闭按钮 -->
        <div class="no-print" style="
          position: fixed; 
          top: 20px; 
          left: 20px;
          z-index: 1001;
        ">
          <button onclick="closePrintWindow()" style="
            background: rgba(0, 0, 0, 0.6); 
            color: white; 
            border: none; 
            width: 44px;
            height: 44px;
            border-radius: 50%; 
            font-size: 18px; 
            font-weight: bold; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            backdrop-filter: blur(10px);
          " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'" ontouchstart="this.style.transform='scale(0.95)'" ontouchend="this.style.transform='scale(1)'">
            ✕
          </button>
        </div>

        <!-- 底部打印按钮 -->
        <div class="no-print mobile-print-controls" style="
          position: fixed; 
          bottom: 20px; 
          left: 50%; 
          transform: translateX(-50%);
          z-index: 1000;
          display: flex;
          justify-content: center;
        ">
          <button onclick="safariPrint()" style="
            background: #44bba4; 
            color: white; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 50px; 
            font-size: 16px; 
            font-weight: bold; 
            box-shadow: 0 4px 15px rgba(68,187,164,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          ">
            🖨️ 打印订单
          </button>
        </div>
        
        <!-- 用户引导提示 -->
        <div class="no-print" style="
          position: fixed; 
          bottom: 80px; 
          left: 50%; 
          transform: translateX(-50%);
          z-index: 999;
          text-align: center;
          color: #666;
          font-size: 14px;
          background: rgba(255,255,255,0.9);
          padding: 10px 15px;
          border-radius: 10px;
          max-width: 90vw;
          backdrop-filter: blur(5px);
        ">
          如果打印按钮无效，请使用浏览器菜单中的"打印"功能
        </div>`
      
      printWindow.document.body.appendChild(printControls)
    }
    
    // 根据不同浏览器采用不同策略
    if (isMobile) {
      let windowFeatures = 'width=device-width,initial-scale=1.0,scrollbars=yes,resizable=yes'
      
      // Safari特殊处理
      if (isSafari || isIOS) {
        windowFeatures = 'scrollbars=yes,resizable=yes,width=' + screen.width + ',height=' + screen.height
      }
      
      const printWindow = window.open('', '_blank', windowFeatures)
      
      if (printWindow) {
        printWindow.document.write(finalContent)
        printWindow.document.close()
        
        // 添加移动端控制界面
        createMobilePrintInterface(printWindow)
        
        printWindow.focus()
        
      } else {
        // 弹窗被阻止的降级方案
        showToast('无法打开打印页面，请允许弹出窗口或尝试其他方式', 'warning')
        
        // 尝试在当前页面创建打印内容
        const printDiv = document.createElement('div')
        printDiv.innerHTML = finalContent
        printDiv.style.display = 'none'
        document.body.appendChild(printDiv)
        
        // 创建打印样式
        const printStyle = document.createElement('style')
        printStyle.innerHTML = `
          @media print {
            body * { visibility: hidden; }
            .print-content, .print-content * { visibility: visible; }
            .print-content { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `
        document.head.appendChild(printStyle)
        printDiv.className = 'print-content'
        printDiv.style.display = 'block'
        
        setTimeout(() => {
          window.print()
          document.body.removeChild(printDiv)
          document.head.removeChild(printStyle)
        }, 500)
      }
      
    } else {
      // 桌面端处理
      const printWindow = window.open('', '', 'height=800,width=1000,scrollbars=yes,resizable=yes')
      if (printWindow) {
        printWindow.document.write(finalContent)
        printWindow.document.close()
        printWindow.focus()
      } else {
        showToast('无法打开打印窗口，请允许弹出窗口', 'warning')
      }
    }
  }

  const stats = getStatistics()

  // 渲染函数 - 防止重新创建组件导致输入框失焦
  const renderTodayOrdersList = () => {
    const todayOrders = getTodaysOrders()
    
    if (todayOrders.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">今日暂无订单</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {todayOrders.slice(0, 3).map(order => {
          const factory = factories.find(f => f.id === order.factoryId)
          return (
            <div key={order.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{factory?.name || '未知厂家'}</span>
                <span className="font-bold text-[#44bba4]">¥{order.grandTotal.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500">
                {order.items.length} 项商品 • {new Date(order.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
        {todayOrders.length > 3 && (
          <div className="text-center">
            <div className="text-gray-500 text-sm">
              还有 {todayOrders.length - 3} 个订单
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderOrderItemsList = (order: Order) => {
    return (
      <div className="bg-[#e7e5df]/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-[#d3d0cb]/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#393e41] text-lg">📋 订单详情</h3>
          <div className="text-right">
            <div className="text-xl font-bold text-[#e7bb41]">¥{order.grandTotal.toFixed(2)}</div>
            <div className="text-xs text-[#5d666b]">{order.items.length} 项商品</div>
          </div>
        </div>
        
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="bg-[#d3d0cb]/30 rounded-2xl p-3 border border-[#d3d0cb]/50 hover:border-[#44bba4]/50 transition-all duration-200">
              <div className="flex items-center">
                {/* 商品信息：50% 宽度 */}
                <div className="w-2/5 flex-shrink-0">
                  <input 
                    type="text" 
                    value={item.name || ''} 
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    className="w-full bg-transparent border-none text-base font-semibold text-[#393e41] focus:outline-none focus:bg-[#e7e5df] focus:border focus:border-[#44bba4] focus:rounded-lg focus:px-2 focus:py-1 transition-all mb-1" 
                    placeholder="商品名称"
                  />
                  <div className="text-sm text-[#5d666b] flex items-center">
                    <input 
                      type="number" 
                      value={item.price || ''} 
                      onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="min-w-0 flex-shrink bg-transparent border-none focus:outline-none focus:bg-[#e7e5df] focus:border focus:border-[#44bba4] focus:rounded focus:px-1 transition-all text-right" 
                      placeholder="0"
                      style={{ width: `${Math.max(3, (item.price?.toString() || '0').length + 1)}ch` }}
                    />
                    <span className="mx-0.5">元/</span>
                    <input 
                      type="text" 
                      value={item.unit || ''} 
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="min-w-0 flex-shrink bg-transparent border-none focus:outline-none focus:bg-[#e7e5df] focus:border focus:border-[#44bba4] focus:rounded text-center transition-all" 
                      placeholder="单位"
                      style={{ width: `${Math.max(3, (item.unit || '').length + 1)}ch` }}
                    />
                  </div>
                </div>

                {/* 居中虚线分隔 */}
                <div className="h-16 border-l border-dashed border-[#d3d0cb] mx-2"></div>

                {/* 价格数量：35% 宽度 */}
                <div className="w-[35%] flex-shrink-0 flex flex-col items-center space-y-2">
                  {/* 总价 - 不换行显示 */}
                  <div className="text-center whitespace-nowrap">
                    <span className="text-xs text-[#5d666b] mr-1">总价:</span>
                    <span className="text-lg font-bold text-[#e7bb41]">
                      ¥{(item.quantity * item.price).toFixed(2)}
                    </span>
                  </div>
                  
                  {/* 数量调节器 */}
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => handleItemChange(index, 'quantity', Math.max(0, item.quantity - 1))}
                      className="w-6 h-6 rounded border-2 border-[#d3d0cb] flex items-center justify-center hover:border-[#44bba4] hover:bg-[#44bba4]/10 transition-all duration-200"
                    >
                      <svg className="w-2.5 h-2.5 text-[#5d666b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" />
                      </svg>
                    </button>
                    
                    <span className="text-sm font-semibold text-[#393e41] w-6 text-center">
                      {Math.floor(item.quantity) === item.quantity ? item.quantity : item.quantity.toFixed(1)}
                    </span>
                    
                    <button 
                      onClick={() => handleItemChange(index, 'quantity', item.quantity + 1)}
                      className="w-6 h-6 rounded border-2 border-[#d3d0cb] flex items-center justify-center hover:border-[#44bba4] hover:bg-[#44bba4]/10 transition-all duration-200"
                    >
                      <svg className="w-2.5 h-2.5 text-[#5d666b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 删除按钮：15% 宽度，参照图片设计 */}
                <div className="w-[15%] flex-shrink-0 flex justify-end pl-4">
                  <button 
                    onClick={() => deleteItem(index)}
                    className="w-5 h-5 rounded-full bg-pink-100/40 hover:bg-pink-200/50 text-red-400 hover:text-pink-600 flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-[#d3d0cb]/50">
          <button 
            onClick={addNewItemRow}
            className="flex-1 bg-[#44bba4]/10 hover:bg-[#44bba4]/20 text-[#44bba4] font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加商品
          </button>
          <button 
            onClick={saveCurrentOrder}
            className="flex-1 bg-[#e7bb41] hover:bg-[#d3a11a] text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            完成订单
          </button>
        </div>
      </div>
    )
  }

  const renderActiveOrderInterface = () => {
    return (
      <div className="space-y-4">
        {/* Order header card */}
        <div className="bg-[#e7e5df]/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-[#44bba4]/20 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#44bba4] rounded-full animate-pulse mr-2"></div>
              <div>
                <span className="font-medium text-[#393e41]">正在开单</span>
                <div className="text-sm text-[#5d666b]">
                  客户: {factories.find(f => f.id === currentOrder?.factoryId)?.name || '未知'}
                </div>
              </div>
            </div>
            <button 
              onClick={cancelCurrentOrder}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Voice input card - WeChat style */}
        <div className="bg-[#e7e5df]/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-[#44bba4]/20 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-[#44bba4] rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900">语音录入</span>
          </div>
          
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <textarea
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                placeholder="输入商品信息，例如：白萝卜10斤每斤1.5元..."
                className="w-full bg-transparent border-none resize-none focus:outline-none text-gray-700 placeholder-gray-400"
                rows={3}
                autoComplete="off"
                spellCheck="false"
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
            </div>
            
            <button 
              onClick={handleGenerateAI}
              disabled={isProcessing || !voiceInput.trim()}
              className="group w-full bg-[#44bba4] hover:bg-[#369683] disabled:bg-[#acb3b7] text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center disabled:cursor-not-allowed hover:shadow-lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  <span className="animate-pulse">🤖 AI识别中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="transition-all duration-300 group-hover:tracking-wide">⚡ 一键生成</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Order items */}
        {currentOrder && currentOrder.items.length > 0 && renderOrderItemsList(currentOrder)}
      </div>
    )
  }

  const renderInvoicingPage = () => {
    return (
      <div className="p-4 space-y-4">
        {!currentOrder ? (
          // No order state - Modern welcome screen
          <div className="pt-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#44bba4] to-[#369683] rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2"></h2>
              <p className="text-gray-600"></p>
            </div>

            {/* Quick stats cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="group bg-[#e7e5df]/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-[#44bba4]/20 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-[#44bba4]/40">
                <div className="text-2xl font-bold text-[#44bba4]">{stats.todayOrders}</div>
                <div className="text-xs text-[#5d666b] transition-colors group-hover:text-[#44bba4]">📊 今日订单</div>
              </div>
              <div className="group bg-[#e7e5df]/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-[#393e41]/20 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-[#393e41]/40">
                <div className="text-2xl font-bold text-[#393e41]">¥{stats.todayRevenue.toFixed(0)}</div>
                <div className="text-xs text-[#5d666b] transition-colors group-hover:text-[#393e41]">💰 今日营收</div>
              </div>
            </div>

            {factories.length === 0 ? (
              <div className="bg-[#faf1d9] border border-[#e7bb41]/30 rounded-2xl p-6 text-center">
                <div className="text-[#e7bb41] mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-[#d3a11a] mb-4 font-medium">请先添加厂家信息</p>
                <button 
                  onClick={() => setCurrentTab('management')}
                  className="bg-[#e7bb41] hover:bg-[#d3a11a] text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg"
                >
                  前往添加厂家
                </button>
              </div>
            ) : (
              <button 
                onClick={startNewOrder}
                className="group w-full bg-gradient-to-r from-[#44bba4] to-[#369683] hover:from-[#369683] hover:to-[#297062] text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-2xl hover:shadow-[#44bba4]/25"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-3 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="transition-all duration-300 group-hover:tracking-wide">新开一单</span>
                </div>
              </button>
            )}

            {/* Today's orders preview */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#393e41]">今日订单</h3>
                {getTodaysOrders().length > 0 && (
                  <button 
                    onClick={exportTodayOrders}
                    className="bg-[#44bba4] hover:bg-[#369683] text-white font-medium py-2 px-4 rounded-lg text-sm transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    打印今日
                  </button>
                )}
              </div>
              {renderTodayOrdersList()}
            </div>
          </div>
        ) : (
          // Active order state
          renderActiveOrderInterface()
        )}
      </div>
    )
  }

  const renderManagementPage = () => {
    return (
      <div className="p-4 space-y-6">
        {/* Enhanced Statistics Dashboard */}
        <div className="grid grid-cols-2 gap-4">
          <div className="group bg-gradient-to-br from-[#44bba4] to-[#369683] rounded-2xl p-4 text-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer">
            <div className="text-2xl font-bold">📈 {stats.monthOrders}</div>
            <div className="text-[#daf1ed] text-sm transition-opacity group-hover:opacity-90">本月订单</div>
            <div className="text-lg font-medium mt-1 transition-all group-hover:tracking-wide">¥{stats.monthRevenue.toFixed(0)}</div>
          </div>
          <div className="group bg-gradient-to-br from-[#393e41] to-[#2e3234] rounded-2xl p-4 text-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer">
            <div className="text-2xl font-bold">🏭 {stats.totalFactories}</div>
            <div className="text-[#d6d9db] text-sm transition-opacity group-hover:opacity-90">合作厂家</div>
            <div className="text-lg font-medium mt-1 transition-all group-hover:tracking-wide">{stats.totalOrders} 总订单</div>
          </div>
        </div>

        {/* Reports Section */}
        <div className="bg-[#e7e5df]/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-[#4A908A]/20">
          <h2 className="text-lg font-bold text-gray-900 mb-4">订单报表</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">选择厂家</label>
              <select 
                value={reportFactoryId}
                onChange={(e) => setReportFactoryId(e.target.value)}
                className="w-full px-4 py-3 bg-[#d3d0cb]/30 border border-[#d3d0cb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#44bba4] focus:border-transparent"
              >
                <option value="all">所有厂家</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>{factory.name}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">开始日期</label>
                <input 
                  type="date" 
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 bg-[#d3d0cb]/30 border border-[#d3d0cb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#44bba4] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">结束日期</label>
                <input 
                  type="date" 
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 bg-[#d3d0cb]/30 border border-[#d3d0cb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#44bba4] focus:border-transparent text-sm"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setDateRange('week')}
                className="flex-1 bg-[#d3d0cb]/30 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg text-sm transition-colors"
              >
                本周
              </button>
              <button 
                onClick={() => setDateRange('month')}
                className="flex-1 bg-[#d3d0cb]/30 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg text-sm transition-colors"
              >
                本月
              </button>
              <button 
                onClick={() => setDateRange('year')}
                className="flex-1 bg-[#d3d0cb]/30 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg text-sm transition-colors"
              >
                本年
              </button>
            </div>
            
            <button 
              onClick={generateReport}
              className="w-full bg-[#44bba4] hover:bg-[#369683] text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg"
            >
              📊 生成报表
            </button>
          </div>
        </div>

        {/* Report Results */}
        {filteredReportData.orders.length > 0 && (
          <div className="bg-[#e7e5df]/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-[#44bba4]/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#393e41]">{filteredReportData.title}</h3>
              <button 
                onClick={printFilteredReport}
                className="bg-[#44bba4] hover:bg-[#369683] text-white font-medium py-2 px-4 rounded-lg text-sm transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg"
              >
                打印
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {filteredReportData.orders.map(order => {
                const factory = factories.find(f => f.id === order.factoryId)
                return (
                  <div key={order.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#393e41]">{factory?.name || '未知厂家'}</span>
                      <span className="font-bold text-[#44bba4]">¥{order.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-[#5d666b]">
                      {new Date(order.date).toLocaleDateString()} • {order.items.length} 项商品
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="mt-4 p-3 bg-[#faf1d9] border border-[#e7bb41]/30 rounded-xl">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>总计 ({filteredReportData.orders.length} 个订单)</span>
                <span className="text-[#e7bb41] text-lg font-bold">
                  ¥{filteredReportData.orders.reduce((sum, order) => sum + order.grandTotal, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Factory Management */}
        <div className="bg-[#e7e5df]/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-[#393e41]/30">
          <h2 className="text-lg font-bold text-[#393e41] mb-4">厂家管理</h2>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={newFactoryName}
                onChange={(e) => setNewFactoryName(e.target.value)}
                className="flex-1 px-4 py-3 bg-[#d3d0cb]/30 border border-[#d3d0cb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#393e41] focus:border-transparent" 
                placeholder="输入新厂家名称"
              />
              <button 
                onClick={addFactory}
                className="bg-[#e7bb41] hover:bg-[#d3a11a] text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg"
              >
                添加
              </button>
            </div>
            
            <div className="space-y-2">
              {factories.map(factory => (
                <div key={factory.id} className="flex items-center justify-between p-3 bg-[#d3d0cb]/30 rounded-xl">
                  <span className="font-medium text-[#393e41]">{factory.name}</span>
                  <button 
                    onClick={() => deleteFactory(factory.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Prevent hydration mismatch by showing loading until client-side data is loaded
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fafaf9] via-[#e7e5df] to-[#f6f6f5] relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#44bba4] to-[#369683] rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#393e41]">加载中...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fafaf9] via-[#e7e5df] to-[#f6f6f5] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#d3d0cb]/20 via-transparent to-[#44bba4]/10"></div>
      
      {/* Main container with swipe support */}
      <div 
        ref={containerRef}
        className="relative z-10 min-h-screen flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Enhanced Status bar overlay */}
        {status && (
          <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
            <div className={`${getToastStyle(status)} backdrop-blur-sm text-center px-4 py-3 rounded-xl shadow-lg font-medium`}>
              {status}
            </div>
          </div>
        )}

        {/* Header */}
        <header className="bg-[#e7e5df]/90 backdrop-blur-sm border-b border-[#d3d0cb]/30 px-4 py-3 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#393e41]">丰业膳食开单系统</h1>
              <p className="text-xs text-[#5d666b]">语音录入，智能识别</p>
            </div>
            <div className="flex items-center space-x-2">
              {currentOrder && (
                <div className="flex items-center text-[#44bba4]">
                  <div className="w-2 h-2 bg-[#44bba4] rounded-full animate-pulse mr-1"></div>
                  <span className="text-xs">开单中</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content area with smooth slide animation */}
        <main className="flex-1 pb-20 overflow-hidden">
          <div className="relative h-full">
            <div 
              className={`flex h-full transition-transform duration-300 ease-in-out`}
              style={{ transform: `translateX(${currentTab === 'invoicing' ? '0%' : '-100%'})` }}
            >
              {/* Invoicing page - always rendered */}
              <div className="w-full h-full flex-shrink-0 overflow-y-auto">
                {renderInvoicingPage()}
              </div>
              
              {/* Management page - always rendered */}
              <div className="w-full h-full flex-shrink-0 overflow-y-auto">
                {renderManagementPage()}
              </div>
            </div>
          </div>
        </main>

        {/* Modern bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#e7e5df]/95 backdrop-blur-sm border-t border-[#d3d0cb]/50 px-4 py-2 z-50">
          <div className="relative flex items-center justify-around">
            {/* Animated sliding indicator */}
            <div 
              className="absolute top-0 h-1 bg-[#44bba4] rounded-full transition-all duration-300 ease-out"
              style={{
                width: '33.33%',
                left: currentTab === 'invoicing' ? '16.67%' : '50%',
                transform: 'translateX(-50%)'
              }}
            />
            
            <button
              onClick={() => setCurrentTab('invoicing')}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-300 ${
                currentTab === 'invoicing'
                  ? 'bg-[#44bba4]/20 text-[#44bba4] scale-105 transform'
                  : 'text-[#5d666b] hover:text-[#393e41] hover:scale-102 transform'
              }`}
            >
              <div className="relative">
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {currentOrder && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <span className="text-xs font-medium">开单</span>
            </button>
            
            <button
              onClick={() => setCurrentTab('management')}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-300 ${
                currentTab === 'management'
                  ? 'bg-[#44bba4]/20 text-[#44bba4] scale-105 transform'
                  : 'text-[#5d666b] hover:text-[#393e41] hover:scale-102 transform'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs font-medium">报表</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Customer selection modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-90 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#393e41] mb-2">曾老板，请先选择客户</h3>
              <p className="text-[#5d666b] mb-4"></p>
              
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {factories.map(factory => (
                  <button
                    key={factory.id}
                    onClick={() => createOrderWithCustomer(factory.id)}
                    className="w-full text-left p-4 bg-[#e7e5df]/50 hover:bg-[#44bba4]/10 rounded-xl border border-[#d3d0cb] hover:border-[#44bba4] transition-all duration-200 transform hover:scale-102"
                  >
                    <div className="font-medium text-[#393e41]">{factory.name}</div>
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setShowCustomerModal(false)}
                className="w-full bg-[#d3d0cb]/50 hover:bg-[#d3d0cb] text-[#393e41] font-medium py-3 px-4 rounded-xl transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-90 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#393e41] mb-2">{modalTitle}</h3>
              <p className="text-[#5d666b] mb-6">{modalBody}</p>
              <div className="flex space-x-3">
                <button 
                  onClick={hideModal}
                  className="flex-1 bg-[#d3d0cb]/50 hover:bg-[#d3d0cb] text-[#393e41] font-medium py-3 px-4 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    if (confirmCallback) confirmCallback()
                    hideModal()
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
