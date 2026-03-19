import React from 'react';

import { User, Utensils, FileText, DollarSign } from 'lucide-react';

interface Dish {
  id: number;
  name: string;
}

interface OrderSummaryProps {
  selectedDishes: Dish[];
  customerName: string;
  isForSelf: boolean;
  notes: string;
  options: {
    extraRice: boolean;
    extraSoup: boolean;
    chiliSauce: boolean;
    fishSauce: boolean;
    chopsticks: boolean;
    lessRice: boolean;
  };
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  translations: any; // Add translations prop
  theme?: 'fusion' | 'corporate'; // Add theme prop
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  selectedDishes,
  customerName,
  isForSelf,
  notes,
  options,
  onConfirm,
  onCancel,
  isLoading = false,
  translations: t,
  theme = 'fusion'
}) => {
  const activeOptions = Object.entries(options)
    .filter(([_, value]) => value)
    .map(([key, _]) => {
      const optionLabels: Record<string, string> = {
        extraRice: t.extraRice,
        extraSoup: t.extraSoup,
        chiliSauce: t.chiliSauce,
        fishSauce: t.fishSauce,
        chopsticks: t.chopsticks,
        lessRice: t.lessRice
      };
      return optionLabels[key];
    });

  return (
    <div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-gray-200 max-w-md mx-auto"
    >
      <div className="text-center mb-4 md:mb-6">
        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 ${
          theme === 'corporate' ? 'bg-[#00A693]' : 'bg-[#DA251D]'
        }`}>
          <Utensils size={20} className="text-white md:w-6 md:h-6" />
        </div>
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{t.confirmOrder}</h3>
        <p className="text-gray-600 text-xs md:text-sm">{t.checkOrderInfo}</p>
      </div>

      <div className="space-y-4">
        {/* Customer Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            theme === 'corporate' ? 'bg-[#00A693]' : 'bg-[#DA251D]'
          }`}>
            <User size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isForSelf ? t.orderForSelf : t.orderForOther}
            </p>
            <p className="text-xs text-gray-600">{customerName}</p>
          </div>
        </div>

        {/* Dishes - Mobile Optimized */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Utensils size={14} />
            {t.selectedDishes} ({selectedDishes.length})
          </p>
          
          {/* Mobile: Compact list view */}
          <div className="md:hidden">
            <div className="p-3 bg-gray-50 rounded-lg">
              {selectedDishes.map((dish, index) => (
                <div key={dish.id} className="flex items-center gap-2 py-1">
                  <span className={`w-5 h-5 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    theme === 'corporate' ? 'bg-[#00A693]' : 'bg-[#DA251D]'
                  }`}>
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-900 font-medium truncate">{dish.name}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Desktop: Original card view */}
          <div className="hidden md:block space-y-2">
            {selectedDishes.map((dish, index) => (
              <div key={dish.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className={`w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold ${
                  theme === 'corporate' ? 'bg-[#00A693]' : 'bg-[#DA251D]'
                }`}>
                  {index + 1}
                </div>
                <p className="text-sm text-gray-900 font-medium">{dish.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        {activeOptions.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">{t.additionalOptions}</p>
            <div className="flex flex-wrap gap-1">
              {activeOptions.map((option, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium"
                >
                  {option}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes.trim() && (
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText size={14} />
              {t.notes}
            </p>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{notes}</p>
            </div>
          </div>
        )}

        {/* Price */}
        <div className={`flex items-center justify-between p-3 rounded-xl border ${
          theme === 'corporate' 
            ? 'bg-[#00A693]/10 border-[#00A693]/20' 
            : 'bg-[#DA251D]/10 border-[#DA251D]/20'
        }`}>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} />
            <span className="text-sm font-semibold text-gray-900">{t.totalAmount}</span>
          </div>
          <span className={`text-lg font-bold ${theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'}`}>40,000đ</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2.5 md:py-3 px-3 md:px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm md:text-base"
        >
          {t.cancel}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 py-2.5 md:py-3 px-3 md:px-4 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base ${
            theme === 'corporate' 
              ? 'bg-[#00A693] hover:bg-[#00A693]/90' 
              : 'bg-[#DA251D] hover:bg-[#DA251D]/90'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t.ordering}
            </>
          ) : (
            t.confirmOrder
          )}
        </button>
      </div>
    </div>
  );
};
