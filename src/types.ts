export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tips'
  content: string
}
