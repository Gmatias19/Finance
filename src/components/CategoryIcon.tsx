import React from 'react';
import {
  Utensils,
  Home,
  Car,
  PartyPopper,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  Tv,
  Briefcase,
  Laptop,
  TrendingUp,
  Coins,
  MoreHorizontal,
  CreditCard,
  Wallet,
  ShieldCheck,
  Plane,
  Gift,
  Coffee,
  Sparkles,
  DollarSign,
  type LucideProps
} from 'lucide-react';

const iconMap: Record<string, React.FC<LucideProps>> = {
  Utensils,
  Home,
  Car,
  PartyPopper,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  Tv,
  Briefcase,
  Laptop,
  TrendingUp,
  Coins,
  MoreHorizontal,
  CreditCard,
  Wallet,
  ShieldCheck,
  Plane,
  Gift,
  Coffee,
  Sparkles,
  DollarSign,
};

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  className = 'w-5 h-5',
  size,
  color,
}) => {
  const IconComponent = iconMap[name] || DollarSign;
  return <IconComponent className={className} size={size} color={color} />;
};
