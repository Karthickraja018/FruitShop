/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { Home } from './components/Home';
import { Sales } from './components/Sales';
import { Inventory } from './components/Inventory';
import { Money } from './components/Money';
import { Settings } from './components/Settings';
import { ToastProvider } from './components/ui/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from './lib/store';
import { WifiOff } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const { isOffline, isReady } = useStore();

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <Home />;
      case 'sales': return <Sales />;
      case 'inventory': return <Inventory />;
      case 'money': return <Money />;
      case 'settings': return <Settings />;
      default: return <Home />;
    }
  };

  // Loading screen
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex justify-center items-center font-sans text-[#1A1A2E]">
        <div className="w-8 h-8 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Main application
  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F9FAFB] flex justify-center font-sans text-[#1A1A2E]">
        <div className="w-full max-w-7xl mx-auto bg-[#F9FAFB] min-h-screen relative shadow-sm overflow-hidden flex flex-col">
          {isOffline && (
            <div className="bg-amber-500 text-white text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-2 z-50">
              <WifiOff size={14} />
              <span>You are offline. All changes are stored locally.</span>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 h-full overflow-hidden"
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
          <BottomNav activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>
    </ToastProvider>
  );
}
