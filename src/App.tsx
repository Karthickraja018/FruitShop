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
import { WifiOff, LogIn } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const { isOffline, isAuthReady, user, login } = useStore();

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

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex justify-center items-center font-sans text-[#1A1A2E]">
        <div className="w-8 h-8 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex justify-center font-sans text-[#1A1A2E]">
        <div className="w-full max-w-[430px] bg-white min-h-screen relative shadow-2xl overflow-hidden flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-5xl">🍍</span>
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">FruitTrack Pro</h1>
          <p className="text-[#6B7280] text-center mb-10">Manage your fruit shop inventory, sales, and expenses easily.</p>
          
          <button
            onClick={login}
            className="w-full bg-[#FF6B35] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-3"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F9FAFB] flex justify-center font-sans text-[#1A1A2E]">
        <div className="w-full max-w-[430px] bg-[#F9FAFB] min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
          {isOffline && (
            <div className="bg-amber-500 text-white text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-2 z-50">
              <WifiOff size={14} />
              <span>You are offline. Changes will sync when reconnected.</span>
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
