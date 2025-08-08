import { VoiceCommand, QwenAPIRequest, QwenAPIResponse } from '@/types'

const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const QWEN_API_KEY = 'sk-68791bbe5fc546d299a6608db427dd28'

export async function processVoiceInput(transcript: string): Promise<VoiceCommand> {
  const prompt = `你是一个为工厂食品供应商服务的订单系统助手。用户通过语音输入订单信息，语音识别可能有错误，请先校对再处理。

常见校对示例：
- "15块吧" → "15.8"
- "肌肉" → "鸡肉" (在食品供应商场景下)
- "斤半" → "1.5斤"

请根据用户输入返回JSON格式的操作指令：

用户说："${transcript}"

返回格式：
{
    "action": "add",
    "items": [
        {
            "name": "商品名称",
            "quantity": 数量,
            "unit": "单位",
            "price": 单价
        }
    ]
}

只返回JSON，不要其他文字。`

  try {
    const requestBody: QwenAPIRequest = {
      model: 'qwen-plus',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }

    const data: QwenAPIResponse = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    
    return result as VoiceCommand
  } catch (error) {
    console.error('AI处理错误:', error)
    throw new Error('处理语音指令时出错，请重试')
  }
}

export function validateVoiceCommand(command: VoiceCommand): boolean {
  if (!command.action || !command.items || !Array.isArray(command.items)) {
    return false
  }

  return command.items.every(item => 
    item.name && 
    item.quantity && 
    item.price && 
    !isNaN(Number(item.quantity)) && 
    !isNaN(Number(item.price))
  )
}