import type { Intent, IntentType } from '../types/intent';

export class IntentManager {
  /**
   * Deterministically classify incoming requirement into a typed Intent model
   */
  public static classify(prompt: string, currentNodesCount: number): Intent {
    const trimmed = prompt.trim();
    const lower = trimmed.toLowerCase();
    let type: IntentType = 'NEW_REQUIREMENT';
    let targetDomain = 'General Architecture';

    // 1. Cancellation check
    if (
      lower.includes('cancel') ||
      lower.includes('abort') ||
      lower.includes('stop') ||
      lower.includes('nevermind') ||
      lower.includes('clear all')
    ) {
      type = 'CANCELLATION';
    }
    // 2. Correction check
    else if (
      lower.includes('wait') ||
      lower.startsWith('no,') ||
      lower.startsWith('no ') ||
      lower.includes('replace') ||
      lower.includes('switch') ||
      lower.includes('instead') ||
      lower.includes('wrong') ||
      lower.includes('actually,')
    ) {
      type = 'CORRECTION';
    }
    // 3. Modification check (when nodes already exist in graph)
    else if (currentNodesCount > 0) {
      type = 'MODIFICATION';
    }
    // 4. Default to NEW_REQUIREMENT when graph is empty
    else {
      type = 'NEW_REQUIREMENT';
    }

    // Domain heuristic: Check more specific multi-agent first
    if (lower.includes('multi-agent') || lower.includes('multi agent') || lower.includes('router')) {
      targetDomain = 'Multi-Agent Support';
    } else if (lower.includes('support') || lower.includes('customer') || lower.includes('rag')) {
      targetDomain = 'AI Customer Support';
    } else if (lower.includes('ecommerce') || lower.includes('shop') || lower.includes('order')) {
      targetDomain = 'E-Commerce Infrastructure';
    }

    return {
      id: `intent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      type,
      timestamp: Date.now(),
      status: 'detecting',
      targetDomain,
    };
  }
}

export function detectIntent(prompt: string, currentNodesCount: number): Intent {
  return IntentManager.classify(prompt, currentNodesCount);
}
