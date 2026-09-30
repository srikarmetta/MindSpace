import React from 'react';
import type { NodeType } from '../../types/graph';
import { iconMap } from './nodeThemes';

interface NodeIconProps {
  type: NodeType;
  className?: string;
}

export const NodeIcon: React.FC<NodeIconProps> = ({ type, className = 'w-4 h-4' }) => {
  const item = iconMap[type] || iconMap.generic;
  const IconComponent = item.icon;
  return <IconComponent className={`${className} ${item.color}`} />;
};
