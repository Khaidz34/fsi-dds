import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';

interface FeedbackItem {
  id: number;
  fullname: string;
  created_at: string;
  subject?: string;
  message: string;
  status: string;
}

interface FeedbackViewProps {
  user?: {
    role?: string;
    id?: number;
    fullname?: string;
  };
  feedbacks: FeedbackItem[];
  translations: any;
  updateFeedbackStatus: (id: number, status: string) => Promise<any>;
  createFeedback: (subject: string, message: string) => Promise<any>;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  user,
  feedbacks,
  translations: t,
  updateFeedbackStatus,
  createFeedback
}) => {
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedbackMessage.trim()) return;

    try {
      setIsSubmitting(true);
      await createFeedback(feedbackSubject.trim(), feedbackMessage.trim());
      setFeedbackSubject('');
      setFeedbackMessage('');
      alert(t?.feedbackForm?.successMessage || 'Cảm ơn bạn đã gửi góp ý! Chúng tôi sẽ xem xét sớm nhất.');
    } catch (error) {
      console.error('Lỗi khi gửi góp ý:', error);
      alert(t?.feedbackForm?.errorMessage || 'Lỗi khi gửi góp ý. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {user?.role === 'admin' ? (
        // Admin view - Xem tất cả góp ý
        <div className="lacquer-card p-4 lg:p-10">
          <h3 className="text-2xl font-display font-bold tracking-tight mb-8">
            {t?.admin?.feedback || 'Quản lý góp ý'}
          </h3>
          
          {feedbacks && feedbacks.length > 0 ? (
            <div className="space-y-6">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="p-6 bg-[#F5F2E9]/30 rounded-2xl border border-[#E5E1D1]">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <p className="font-bold text-[#1C1917]">{feedback.fullname}</p>
                      <p className="text-xs text-[#1C1917]/40 font-bold uppercase tracking-widest">
                        {new Date(feedback.created_at).toLocaleDateString('vi-VN')} lúc {new Date(feedback.created_at).toLocaleTimeString('vi-VN')}
                      </p>
                      {feedback.subject && (
                        <p className="text-sm font-semibold text-[#1C1917] mt-1">Chủ đề: {feedback.subject}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={feedback.status}
                        onChange={(e) => updateFeedbackStatus(feedback.id, e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-app-accent"
                      >
                        <option value="pending">Chờ xử lý</option>
                        <option value="reviewed">Đã xem</option>
                        <option value="resolved">Đã giải quyết</option>
                      </select>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        feedback.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                        feedback.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {feedback.status === 'resolved' ? 'Đã giải quyết' :
                         feedback.status === 'reviewed' ? 'Đã xem' : 'Chờ xử lý'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[#1C1917]/75 italic leading-relaxed bg-white/60 p-3.5 rounded-xl border border-[#E5E1D1]/60">
                    &ldquo;{feedback.message}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <MessageSquare size={48} className="mx-auto" />
              </div>
              <p className="text-gray-500 text-lg font-medium">Chưa có góp ý nào</p>
              <p className="text-gray-400 text-sm">{t?.feedbackForm?.noFeedback || 'Chưa có nhân viên nào gửi phản hồi.'}</p>
            </div>
          )}
        </div>
      ) : (
        // User view - Gửi góp ý
        <div className="lacquer-card p-4 lg:p-10">
          <h3 className="text-2xl font-display font-bold tracking-tight mb-8">
            {t?.feedbackForm?.title || 'Đóng góp ý kiến'}
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#1C1917] mb-2">
                {t?.feedbackForm?.subjectLabel || 'Chủ đề góp ý (tùy chọn)'}
              </label>
              <input
                type="text"
                value={feedbackSubject}
                onChange={(e) => setFeedbackSubject(e.target.value)}
                placeholder={t?.feedbackForm?.subjectPlaceholder || 'Ví dụ: Thực đơn, chất lượng món ăn, góp ý tính năng...'}
                className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#1C1917] mb-2">
                {t?.feedbackForm?.contentLabel || 'Nội dung phản hồi'}
              </label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder={t?.feedbackForm?.contentPlaceholder || 'Nhập ý kiến đóng góp của bạn để bếp và ban quản lý cải thiện tốt hơn...'}
                rows={6}
                className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent resize-none text-sm leading-relaxed"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!feedbackMessage.trim() || isSubmitting}
                className="bg-app-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-app-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-app-accent/20"
              >
                {isSubmitting ? 'Đang gửi...' : (t?.feedbackForm?.submitButton || 'Gửi góp ý')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedbackSubject('');
                  setFeedbackMessage('');
                }}
                disabled={isSubmitting}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                {t?.feedbackForm?.clearButton || 'Xóa trắng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackView;
