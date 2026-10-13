/**
 * 共享状态：将核心 composable 实例化为模块级单例
 * 这样在不同视图间切换（chat / knowledge）状态不丢失
 */
import { useChat } from './useChat'
import { useKnowledgeBase } from './useKnowledgeBase'

let _chat: ReturnType<typeof useChat> | null = null
let _kb: ReturnType<typeof useKnowledgeBase> | null = null

/** 获取共享 chat 单例（函数式调用，便于在 setup 中使用） */
export function useSharedChat(): ReturnType<typeof useChat> {
  if (!_chat) _chat = useChat()
  return _chat
}

/** 获取共享知识库单例 */
export function useSharedKB(): ReturnType<typeof useKnowledgeBase> {
  if (!_kb) _kb = useKnowledgeBase()
  return _kb
}
