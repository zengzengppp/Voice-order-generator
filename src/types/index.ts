export interface VoiceCommand {
  action: 'add' | 'delete' | 'update'
  items: OrderItem[]
}

export interface OrderItem {
  name: string
  quantity: number
  unit: string
  price: number
}

export interface QwenAPIRequest {
  model: string
  messages: {
    role: 'user' | 'system' | 'assistant'
    content: string
  }[]
  temperature?: number
  max_tokens?: number
  response_format?: {
    type: 'json_object'
  }
}

export interface QwenAPIResponse {
  choices: {
    message: {
      content: string
      role: string
    }
    finish_reason: string
    index: number
  }[]
  created: number
  id: string
  model: string
  object: string
  usage: {
    completion_tokens: number
    prompt_tokens: number
    total_tokens: number
  }
}

export interface Order {
  id: number
  date: string
  factoryId: number
  items: OrderItem[]
  grandTotal: number
}

export interface Factory {
  id: number
  name: string
  contact?: string
  address?: string
}