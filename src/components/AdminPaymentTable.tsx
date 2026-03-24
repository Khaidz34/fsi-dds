import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, DollarSign } from 'lucide-react';

interface PaymentUser {
  userId: number;
  fullname: string;
  ordersCount: number;
  paidTotal: number;
  remainingTotal: number;
  paidCount?: number;
  remainingCount?: number;
}

interface AdminPaymentTableProps {
  userPayments: PaymentUser[];
  isProcessingPayment: boolean;
  onMarkPaid: (userId: number, amount: number) => void;
}

type SortField = 'fullname' | 'ordersCount' | 'remainingTotal' | 'paidTotal';
type SortOrder = 'asc' | 'desc';

export const AdminPaymentTable: React.FC<AdminPaymentTableProps> = ({
  userPayments = [],
  isProcessingPayment,
  onMarkPaid
}) => {
  // Safety check: ensure userPayments is an array
  const safePayments = Array.isArray(userPayments) ? userPayments : [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('remainingTotal');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  
  const itemsPerPage = 10;

  // Filter data
  const filteredData = useMemo(() => {
    return safePayments.filter(payment => {
      const matchesSearch = payment.fullname.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        filterStatus === 'all' ? true :
        filterStatus === 'unpaid' ? payment.remainingTotal > 0 :
        payment.remainingTotal === 0;
      
      return matchesSearch && matchesFilter;
    });
  }, [safePayments, searchTerm, filterStatus]);

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [filteredData, sortField, sortOrder]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4" />;
    return sortOrder === 'asc' ? 
      <ChevronUp size={16} /> : 
      <ChevronDown size={16} />;
  };

  const totalUnpaid = safePayments.reduce((sum, p) => sum + p.remainingTotal, 0);
  const totalPaid = safePayments.reduce((sum, p) => sum + p.paidTotal, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
          <p className="text-sm text-orange-700 font-semibold mb-1">Chưa thanh toán</p>
          <p className="text-2xl font-black text-orange-600">{totalUnpaid.toLocaleString()}đ</p>
          <p className="text-xs text-orange-600 mt-1">{safePayments.filter(p => p.remainingTotal > 0).length} người</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
          <p className="text-sm text-green-700 font-semibold mb-1">Đã thanh toán</p>
          <p className="text-2xl font-black text-green-600">{totalPaid.toLocaleString()}đ</p>
          <p className="text-xs text-green-600 mt-1">{safePayments.filter(p => p.remainingTotal === 0).length} người</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
          <p className="text-sm text-blue-700 font-semibold mb-1">Tổng cộng</p>
          <p className="text-2xl font-black text-blue-600">{(totalUnpaid + totalPaid).toLocaleString()}đ</p>
          <p className="text-xs text-blue-600 mt-1">{safePayments.length} người</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-[#DA251D] focus:ring-1 focus:ring-[#DA251D]"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilterStatus('all');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              filterStatus === 'all'
                ? 'bg-[#DA251D] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => {
              setFilterStatus('unpaid');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              filterStatus === 'unpaid'
                ? 'bg-[#DA251D] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Chưa thanh toán
          </button>
          <button
            onClick={() => {
              setFilterStatus('paid');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              filterStatus === 'paid'
                ? 'bg-[#DA251D] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Đã thanh toán
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('fullname')}
                  className="flex items-center gap-2 font-bold text-gray-700 hover:text-gray-900"
                >
                  Tên người dùng
                  <SortIcon field="fullname" />
                </button>
              </th>
              <th className="px-6 py-4 text-right">
                <button
                  onClick={() => handleSort('ordersCount')}
                  className="flex items-center justify-end gap-2 font-bold text-gray-700 hover:text-gray-900 ml-auto"
                >
                  Số suất
                  <SortIcon field="ordersCount" />
                </button>
              </th>
              <th className="px-6 py-4 text-right">
                <button
                  onClick={() => handleSort('paidTotal')}
                  className="flex items-center justify-end gap-2 font-bold text-gray-700 hover:text-gray-900 ml-auto"
                >
                  Đã thanh toán
                  <SortIcon field="paidTotal" />
                </button>
              </th>
              <th className="px-6 py-4 text-right">
                <button
                  onClick={() => handleSort('remainingTotal')}
                  className="flex items-center justify-end gap-2 font-bold text-gray-700 hover:text-gray-900 ml-auto"
                >
                  Còn nợ
                  <SortIcon field="remainingTotal" />
                </button>
              </th>
              <th className="px-6 py-4 text-center font-bold text-gray-700">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((payment) => (
                <tr key={payment.userId} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{payment.fullname}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {payment.paidCount !== undefined ? `${payment.paidCount} đã thanh toán, ${payment.remainingCount} chưa thanh toán` : 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {payment.ordersCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-green-600">{payment.paidTotal.toLocaleString()}đ</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className={`font-bold ${payment.remainingTotal > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {payment.remainingTotal.toLocaleString()}đ
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {payment.remainingTotal > 0 ? (
                      <button
                        onClick={() => onMarkPaid(payment.userId, payment.remainingTotal)}
                        disabled={isProcessingPayment}
                        className="px-4 py-2 bg-[#DA251D] text-white rounded-xl font-bold text-sm hover:bg-[#DA251D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Thanh toán
                      </button>
                    ) : (
                      <span className="text-green-600 font-bold text-sm">✓ Đã thanh toán</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Hiển thị {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, sortedData.length)} trong {sortedData.length} kết quả
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-xl font-semibold text-sm transition-colors ${
                  currentPage === page
                    ? 'bg-[#DA251D] text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
