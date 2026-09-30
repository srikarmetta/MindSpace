export type IntentType =
  | 'NEW_REQUIREMENT'
  | 'MODIFICATION'
  | 'CORRECTION'
  | 'CANCELLATION';

export type IntentLifecycle =
  | 'detecting'
  | 'planned'
  | 'executing'
  | 'replanning'
  | 'completed'
  | 'interrupted'
  | 'superseded'
  | 'cancelled';

export interface Intent {
  id: string;
  text: string;
  type: IntentType;
  timestamp: number;
  status?: IntentLifecycle;
  targetDomain?: string;
  activeOperationsCount?: number;
}
