import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Clock, ChevronRight, Zap, Users } from 'lucide-react';

interface Customer {
  id: number;
  fullname: string;
}

interface QuickOrderPanelProps {
  customers: Customer[];
  currentUserId: number;
  onQuickOrder: (customerId: number) => void;
  recentOrders: Array<{
    customerId: number;
    customerName: string;
    lastOrderDate: string;
    orderCount: number;
  }>;
}

export const QuickOrderPanel: React.FC<QuickOrderPanelProps> = ({
  customers,
  currentUserId,
  onQuickOrder,
  recentOrders
}) => {
  const [showAll, setShowAll] = useState(false);

  // Get frequent customers (excluding current user)
  const frequentCustomers = recentOrders
    .filter(order => order.customerId !== currentUserId)
    .slice(0, showAll ? recentOrders.length : 4);

  if (frequentCustomers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-yellow-300" />
          <p className="text-white font-semibold text-sm">Đặt nhanh cho:</p>
        </div>
        <div className="flex items-center gap-1">
          <Users size={14} className="text-white/60" />
          <span className="text-white/60 text-xs">{frequentCustomers.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <AnimatePresence>
          {frequentCustomers.map((order, index) => (
            <motion.button
              key={order.customerId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                transition: { delay: index * 0.05 }
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onQuickOrder(order.customerId)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-3 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <User size={12} className="text-white" />
                </div>
                <ChevronRight size={12} className="text-white/40 group-hover:text-white/80 transition-colors" />
              </div>
              
              <p className="text-white text-xs font-medium truncate mb-1">
                {order.customerName}
              </p>
              
              <div className="flex items-center gap-2 text-white/60 text-[10px]">
                <Clock size={8} />
                <span>{order.orderCount} đơn</span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {recentOrders.length > 4 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 py-2 text-white/60 hover:text-white text-xs font-medium transition-colors"
        >
          {showAll ? 'Thu gọn' : `Xem thêm ${recentOrders.length - 4} người`}
        </motion.button>
      )}
    </motion.div>
  );
};