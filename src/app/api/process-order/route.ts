import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, currentItems } = body

    if (!text) {
      return NextResponse.json({ error: '请提供输入文本' }, { status: 400 })
    }

    const apiKey = "sk-68791bbe5fc546d299a6608db427dd28"
    const apiUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    
    const systemPrompt = `你是一个为工厂食品供应商处理订单的智能助手。你的任务是根据用户的语音输入更新一个商品列表。返回的商品名称必须是常见的食品或食材。

用户通过语音输入订单信息，语音识别可能有错误，请先校对再处理。

常见校对示例：
- "15块吧" → "15.8"
- "肌肉" → "鸡肉" (在食品供应商场景下)
- "土斗" → "土豆"
- "白菜" → "白菜"

你的任务是根据用户的语音输入更新一个商品列表。你必须只返回一个JSON对象，该对象包含一个名为 "items" 的数组。数组中的每个对象都应包含 "name" (string), "quantity" (number), "unit" (string), 和 "price" (number) 这几个字段。

支持的操作：
1. 添加商品：用户说 "西红柿 2斤 5块钱"
2. 修改商品：用户说 "西红柿改成3斤" 或 "西红柿价格改成6块"
3. 删除商品：用户说 "删除西红柿" 或 "去掉西红柿"

注意：
- 单位通常是"斤"、"公斤"、"个"、"袋"、"箱"等
- 价格是每单位的价格，不是总价
- 如果用户没有明确说明某个字段，请保持原有值或使用合理默认值`

    const userPrompt = `这是当前的订单商品列表: ${JSON.stringify(currentItems || [])}

用户刚刚说了: "${text}"

请根据用户的意图更新商品列表，并返回更新后的完整JSON对象。`

    const payload = {
      model: "qwen-plus",
      messages: [
        { "role": "system", "content": systemPrompt },
        { "role": "user", "content": userPrompt }
      ],
      response_format: { "type": "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    }

    const response = await fetch(apiUrl, { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }, 
      body: JSON.stringify(payload) 
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('API Error Response:', errorData)
      throw new Error(`API请求失败: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
    }
    
    const result = await response.json()

    if (result.choices && result.choices[0].message && result.choices[0].message.content) {
      const contentStr = result.choices[0].message.content
      const updatedData = JSON.parse(contentStr)
      
      if (updatedData && Array.isArray(updatedData.items)) {
        return NextResponse.json({ items: updatedData.items })
      } else {
        throw new Error("AI助手返回的JSON格式不正确。")
      }
    } else { 
      throw new Error("AI助手未能返回有效更新。") 
    }
  } catch (error) {
    console.error('Process order error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '处理订单时出现错误' 
    }, { status: 500 })
  }
}