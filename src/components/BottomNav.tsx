import React from 'react';
import { Home, ShoppingCart, Package, Wallet, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/store';

interface BottomNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export const BottomNav = ({ activeTab, onChange }: BottomNavProps) => {
  const { t } = useTranslation();
  
  const tabs = [
    { id: 'home', icon: Home, label: t('Home') },
    { id: 'sales', icon: ShoppingCart, label: t('Sales') },
    { id: 'inventory', icon: Package, label: t('Inventory') },
    { id: 'money', icon: Wallet, label: t('Money') },
    { id: 'settings', icon: Settings, label: t('Settings') },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 pb-safe z-30">
      <div className="max-w-7xl mx-auto flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
                isActive ? "text-[#FF6B35]" : "text-[#6B7280]"
              )}
            >
              <Icon size={24} className={cn(isActive && "fill-current")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
