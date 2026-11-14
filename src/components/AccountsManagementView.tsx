import React from 'react';
import { Edit, Trash2, Users } from 'lucide-react';

interface UserItem {
  id: number;
  fullname: string;
  username: string;
  role: string;
}

interface AccountsManagementViewProps {
  users: UserItem[];
  currentUser?: {
    id?: number;
    role?: string;
  };
  translations: any;
  onEditUser: (user: UserItem) => void;
  onDeleteUser: (userId: number) => Promise<any>;
}

export const AccountsManagementView: React.FC<AccountsManagementViewProps> = ({
  users,
  currentUser,
  translations: t,
  onEditUser,
  onDeleteUser
}) => {
  const acc = t?.accounts;

  const handleDelete = async (userItem: UserItem) => {
    const confirmMsg = (acc?.confirmDelete || 'Bạn có chắc chắn muốn xóa tài khoản "{name}" ({username}) không?\n\nLƯU Ý: Hành động này không thể hoàn tác!')
      .replace('{name}', userItem.fullname)
      .replace('{username}', userItem.username);

    if (confirm(confirmMsg)) {
      try {
        await onDeleteUser(userItem.id);
        alert(acc?.deleteSuccess || 'Đã xóa người dùng thành công!');
      } catch (err: any) {
        alert((acc?.deleteError || 'Lỗi khi xóa người dùng: ') + (err?.message || 'Lỗi server'));
      }
    }
  };

  const subtitleText = (acc?.subtitle || 'Danh sách nhân viên và quyền truy cập trong hệ thống ({count} người dùng)')
    .replace('{count}', String(users.length));

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="lacquer-card p-4 lg:p-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-app-accent/10 text-app-accent flex items-center justify-center">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold tracking-tight">
                {acc?.title || t?.admin?.accountManagement || 'Quản lý tài khoản'}
              </h3>
              <p className="text-xs text-[#1C1917]/50 mt-0.5">
                {subtitleText}
              </p>
            </div>
          </div>
        </div>
        
        {users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5E1D1]">
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40">
                    {acc?.colFullname || 'Họ tên'}
                  </th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40">
                    {acc?.colUsername || 'Tên đăng nhập'}
                  </th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40">
                    {acc?.colRole || 'Vai trò'}
                  </th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40">
                    {acc?.colActions || 'Hành động'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D1]/50">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-[#FDF4E3]/30 transition-colors">
                    <td className="py-4 font-bold text-sm text-[#1C1917]">{userItem.fullname}</td>
                    <td className="py-4 text-sm text-[#1C1917]/60 font-mono">{userItem.username}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        userItem.role === 'admin' ? 'bg-[#DA251D]/10 text-[#DA251D]' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {userItem.role === 'admin' ? (acc?.roleAdmin || 'Quản trị viên') : (acc?.roleUser || 'Nhân viên')}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => onEditUser(userItem)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                          title={acc?.btnEdit || 'Chỉnh sửa tài khoản'}
                        >
                          <Edit size={14} />
                          {acc?.btnEdit || 'Chỉnh sửa'}
                        </button>
                        {userItem.id !== currentUser?.id && (
                          <button 
                            type="button"
                            onClick={() => handleDelete(userItem)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5"
                            title={acc?.btnDelete || 'Xóa tài khoản'}
                          >
                            <Trash2 size={14} />
                            {acc?.btnDelete || 'Xóa'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>{acc?.noUsers || 'Chưa có tài khoản người dùng nào.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsManagementView;
