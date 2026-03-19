import React, { useState } from 'react';

import { ChevronDown, User, Search, Check } from 'lucide-react';

interface Customer {
  id: number;
  fullname: string;
}

interface CustomerSelectorProps {
  customers: Customer[];
  currentUserId: number;
  currentUserName: string;
  selectedCustomerId: number | null;
  onCustomerSelect: (customerId: number | null) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  customers,
  currentUserId,
  currentUserName,
  selectedCustomerId,
  onCustomerSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedCustomer = selectedCustomerId 
    ? customers.find(c => c.id === selectedCustomerId) || { id: currentUserId, fullname: currentUserName }
    : { id: currentUserId, fullname: currentUserName };

  const filteredCustomers = [
    { id: currentUserId, fullname: currentUserName },
    ...customers.filter(c => c.id !== currentUserId)
  ].filter(customer => 
    customer.fullname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (customerId: number) => {
    onCustomerSelect(customerId === currentUserId ? null : customerId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <label className="block text-white text-xs mb-2 font-semibold">
        Đặt món cho:
      </label>
      
      {/* Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white text-sm font-medium flex items-center justify-between hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <span>
            {selectedCustomerId === currentUserId || !selectedCustomerId 
              ? `🙋‍♂️ ${currentUserName} (Bản thân)`
              : `👤 ${selectedCustomer.fullname}`
            }
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
          >
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm người dùng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DA251D]/20 focus:border-[#DA251D]"
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelect(customer.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      customer.id === currentUserId 
                        ? 'bg-[#DA251D] text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {customer.fullname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {customer.fullname}
                        {customer.id === currentUserId && (
                          <span className="text-xs text-[#DA251D] ml-2">(Bản thân)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {selectedCustomer.id === customer.id && (
                    <Check size={16} className="text-[#DA251D]" />
                  )}
                </button>
              ))}
              
              {filteredCustomers.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-500">
                  <p className="text-sm">Không tìm thấy người dùng nào</p>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Selection Info */}
      {selectedCustomerId && selectedCustomerId !== currentUserId && (
        <div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-white/80 text-xs bg-white/10 px-3 py-2 rounded-lg border border-white/20"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
              <Check size={10} className="text-white" />
            </div>
            <span>
              Bạn đang đặt món cho: <span className="font-semibold">{selectedCustomer.fullname}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
