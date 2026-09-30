import {
  User,
  Bot,
  Server,
  Database,
  Layers,
  Globe,
  Zap,
  HardDrive,
  Box,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NodeType } from '../../types/graph';

export const iconMap: Record<NodeType, { icon: LucideIcon; color: string; bg: string }> = {
  user: { icon: User, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
  agent: { icon: Bot, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  service: { icon: Server, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  database: { icon: Database, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  queue: { icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  api: { icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  cache: { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  storage: { icon: HardDrive, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30' },
  generic: { icon: Box, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' },
};

export function getNodeTheme(type: NodeType) {
  return iconMap[type] || iconMap.generic;
}
