/**
 * DailyQuote – Hiển thị câu danh ngôn / triết lý sống mỗi ngày
 * với hình nền nhiếp ảnh thiên nhiên độ phân giải cao phù hợp nội dung.
 * Đổi tự động theo ngày trong năm, đồng thời cho phép bấm đổi câu linh hoạt.
 */

import React, { useState, useMemo } from 'react';
import { Quote as QuoteIcon } from 'lucide-react';

interface QuoteItem {
  text: string;
  author: string;
  theme: string;
  photoId: string;
}

const QUOTES: QuoteItem[] = [
  {
    text: 'Đừng chạy theo hạnh phúc – hãy trở thành hạnh phúc.',
    author: 'Lão Tử',
    theme: 'An lạc nội tâm',
    photoId: '1470071459604-3b5ec3a7fe05', // Rừng thông mờ sương tĩnh lặng
  },
  {
    text: 'Sóng không biết mình đẹp cho đến khi vỡ tan. Sóng quên rằng mình chính là đại dương.',
    author: 'Thiền ngữ',
    theme: 'Giác ngộ & Buông bỏ',
    photoId: '1505118380757-91f5f5632de0', // Ngọn sóng đại dương xanh biếc cuộn trào
  },
  {
    text: 'Mỗi khoảnh khắc hiện tại là nơi duy nhất bạn thực sự tồn tại.',
    author: 'Thích Nhất Hạnh',
    theme: 'Chánh niệm hiện tại',
    photoId: '1441974231531-c6227db76b6e', // Vạt nắng vàng xuyên qua tán rừng già
  },
  {
    text: 'Im lặng không phải là trống rỗng – đó là nơi sự thật cư ngụ.',
    author: 'Thiền ngữ',
    theme: 'Tĩnh lặng tâm hồn',
    photoId: '1470770841072-f978cf4d019e', // Hồ nước phẳng lặng như gương phản chiếu dãy núi
  },
  {
    text: 'Cuộc đời không phải là vấn đề cần giải quyết, mà là một thực tại cần trải nghiệm.',
    author: 'Søren Kierkegaard',
    theme: 'Trải nghiệm sống',
    photoId: '1506744038136-46273834b3fb', // Thung lũng kỳ vĩ Yosemite dưới ánh hoàng hôn
  },
  {
    text: 'Gốc rễ của đau khổ là bám víu. Buông bỏ mang lại tự do đích thực.',
    author: 'Phật Thích Ca',
    theme: 'Tự do tâm hồn',
    photoId: '1507003211169-0a1dd7228f2d', // Cây cổ thụ đơn độc kiên cường trong sương
  },
  {
    text: 'Người biết đủ là người giàu có nhất thế gian.',
    author: 'Lão Tử – Đạo Đức Kinh',
    theme: 'Tâm thái biết đủ',
    photoId: '1472214103451-9374bd1c798e', // Đồi cỏ xanh mướt trải dài trong nắng sớm
  },
  {
    text: 'Không có con đường nào dẫn đến hạnh phúc – hạnh phúc chính là con đường bạn đang đi.',
    author: 'Thích Nhất Hạnh',
    theme: 'Hành trình cuộc sống',
    photoId: '1426604966848-d7adac402bff', // Con đường mòn ven hồ dẫn vào rặng núi
  },
  {
    text: 'Sự phù du của mọi thứ không phải là lý do để buồn – mà là lý do để trân quý từng phút giây.',
    author: 'Marcus Aurelius',
    theme: 'Trân trọng hiện tại',
    photoId: '1469474968028-56623f02e42e', // Rừng lá thu vàng rực rỡ trong nắng
  },
  {
    text: 'Hãy nhìn sâu vào thiên nhiên, và bạn sẽ thấu hiểu mọi thứ rõ ràng hơn.',
    author: 'Albert Einstein',
    theme: 'Thiên nhiên & Trí tuệ',
    photoId: '1447752875215-b2761acb3c5d', // Ánh sáng mặt trời chiếu rọi rừng sâu
  },
  {
    text: 'Ánh sáng không chinh phục bóng tối – nó chỉ làm bóng tối biến mất bằng sự hiện diện của mình.',
    author: 'Thiền ngữ',
    theme: 'Ánh sáng nội tâm',
    photoId: '1499209974431-9dddcece7f88', // Bình minh rạng ngời nơi đường chân trời biển cả
  },
  {
    text: 'Bạn là một phần kỳ diệu của vũ trụ bao la, đang trải nghiệm chính mình.',
    author: 'Carl Sagan',
    theme: 'Vũ trụ & Bản thể',
    photoId: '1451187580459-43490279c0fa', // Dải ngân hà và muôn ngàn tinh tú rực sáng
  },
  {
    text: 'Hãy là sự thay đổi tích cực mà bạn muốn thấy trên thế giới.',
    author: 'Mahatma Gandhi',
    theme: 'Hành động & Lan toả',
    photoId: '1504701954957-2010ec3bcec1', // Con đường đón bình minh rực rỡ trên núi cao
  },
  {
    text: 'Tâm trí yên tĩnh là nơi nuôi dưỡng những ý tưởng sáng suốt nhất.',
    author: 'Thiền ngữ',
    theme: 'Bình an tĩnh tại',
    photoId: '1470240731273-7821a6eeb6bd', // Hồ nước trong vắt soi bóng đỉnh núi tuyết
  },
  {
    text: 'Dòng nước không tranh giành với đá – nó kiên nhẫn chảy qua và mài mòn tất cả.',
    author: 'Lão Tử',
    theme: 'Nhu thắng cương',
    photoId: '1518837695005-2083093ee35b', // Sóng biển lấp lánh ánh hoàng hôn
  },
  {
    text: 'Mọi việc đều có thời điểm của nó. Hãy kiên nhẫn và tin tưởng vào tiến trình cuộc sống.',
    author: 'Ecclesiastes',
    theme: 'Kiên nhẫn & Niềm tin',
    photoId: '1509114397022-ed747cca3f65', // Đồi cát sa mạc uốn lượn dưới hoàng hôn
  },
  {
    text: 'Kỳ tích không phải là đi trên mặt nước, mà là bước đi bình an trên mặt đất này.',
    author: 'Thích Nhất Hạnh',
    theme: 'Chân giá trị cuộc sống',
    photoId: '1506905925346-21bda4d32df4', // Thảo nguyên hoa dại bạt ngàn dưới chân núi
  },
  {
    text: 'Đau khổ là không thể tránh khỏi, nhưng lựa chọn vượt lên hay đắm chìm là ở chính bạn.',
    author: 'Haruki Murakami',
    theme: 'Bản lĩnh sống',
    photoId: '1464822759023-fed622ff2c3b', // Rặng núi hùng vĩ ẩn hiện trong mây bạc
  },
  {
    text: 'Tự do thực sự là khi bạn tìm thấy sự bình yên và không cần sự công nhận từ bên ngoài.',
    author: 'Jean-Paul Sartre',
    theme: 'Tự do tự tại',
    photoId: '1519681393784-d120267933ba', // Bầu trời đêm ngàn sao trên đỉnh núi tuyết
  },
  {
    text: 'Nước càng sâu càng tĩnh lặng. Người càng thông tuệ càng khiêm nhường.',
    author: 'Ngạn ngữ Á Đông',
    theme: 'Khiêm nhường & Sâu sắc',
    photoId: '1501785888041-af3ef285b470', // Chiếc thuyền gỗ cô đơn trên mặt hồ tĩnh lặng
  },
  {
    text: 'Người hiểu người là thông minh. Người thấu hiểu chính mình mới là bậc giác ngộ.',
    author: 'Lão Tử',
    theme: 'Thấu hiểu bản thân',
    photoId: '1454496522488-7a8e488e8606', // Đỉnh núi vươn cao chạm dải ngân hà
  },
  {
    text: 'Vết nứt chính là nơi ánh sáng kỳ diệu đi vào tâm hồn bạn.',
    author: 'Rumi',
    theme: 'Hy vọng & Tái sinh',
    photoId: '1433086966358-54859d0ed716', // Thác nước nguyên sinh tuôn trào sức sống
  },
  {
    text: 'Đừng chờ đợi cơ hội hoàn hảo, hãy biến ngày hôm nay thành cơ hội tuyệt vời nhất.',
    author: 'Ralph Waldo Emerson',
    theme: 'Chủ động đón ngày mới',
    photoId: '1470252649378-9c29740c9fa8', // Thung lũng xanh đón ánh nắng sớm ban mai
  },
  {
    text: 'Cơn bão nào rồi cũng sẽ tan. Và sau cơn bão, bầu trời lại trong xanh hơn bao giờ hết.',
    author: 'Thiền ngữ',
    theme: 'Vượt qua thử thách',
    photoId: '1534447677768-be436bb09401', // Cực quang huyền ảo nhảy múa trên bầu trời đêm
  },
  {
    text: 'Ta là ai của ngày hôm qua không quan trọng bằng ta đang chọn trở thành ai hôm nay.',
    author: 'C.S. Lewis',
    theme: 'Phát triển bản thân',
    photoId: '1418065460487-3e41a6c84dc5', // Rừng thông cao vút chạm tới trời xanh
  },
  {
    text: 'Sự khiêm tốn không phải là nghĩ mình thấp kém, mà là bớt bận tâm về cái tôi của mình.',
    author: 'C.S. Lewis',
    theme: 'Buông bỏ bản ngã',
    photoId: '1465146344425-f00d5f5c8f07', // Cánh đồng hoa dại rực rỡ trong nắng chiều
  },
  {
    text: 'Hạnh phúc không phải là có tất cả mọi thứ, mà là trân trọng những gì mình đang có.',
    author: 'Khuyết danh',
    theme: 'Lòng biết ơn',
    photoId: '1507525428034-b723cf961d3e', // Bờ biển nhiệt đới trong vắt êm đềm
  },
  {
    text: 'Mỗi ngày là một khởi đầu mới. Hãy hít thật sâu, mỉm cười và tiến bước.',
    author: 'Khuyết danh',
    theme: 'Khởi đầu tươi sáng',
    photoId: '1472214103451-9374bd1c798e', // Bình minh trên đồi xanh bát ngát
  },
  {
    text: 'Lòng biết ơn biến những điều bình dị thành điều kỳ diệu của cuộc sống.',
    author: 'Melody Beattie',
    theme: 'Tri ân cuộc sống',
    photoId: '1441974231531-c6227db76b6e', // Rừng cây ngập tràn ánh nắng ấm áp
  },
  {
    text: 'Giữ tâm tĩnh tại giữa thế giới hối hả – đó chính là sức mạnh lớn nhất của bạn.',
    author: 'Marcus Aurelius',
    theme: 'Sức mạnh nội tâm',
    photoId: '1464822759023-fed622ff2c3b', // Biển mây trập trùng bao quanh đỉnh núi hùng vĩ
  },
  {
    text: 'Khi bạn thay đổi cách nhìn, những thứ bạn nhìn sẽ thay đổi.',
    author: 'Wayne Dyer',
    theme: 'Góc nhìn & Tầm nhìn mới',
    photoId: '1490730141103-6cac27aaab94', // Người đứng trên đỉnh núi cao phóng tầm mắt qua biển mây
  },
];

/**
 * Lấy chỉ số quote theo ngày làm việc (Thứ 2 - Thứ 6).
 * Thứ 7 và Chủ Nhật không đi làm nên giữ nguyên câu triết lý của Thứ 6 (không đổi câu mới).
 * Mốc neo: Chủ Nhật 08/11/2026 và Thứ 2 09/11/2026 dùng chung câu triết lý hôm nay (index 2).
 */
function getWorkdayQuoteIndex(targetDate: Date = new Date(), totalQuotes: number = QUOTES.length): number {
  // Mốc neo: Thứ 2 ngày 09/11/2026 (index = 2, giữ nguyên câu của Chủ Nhật 08/11/2026)
  const baseDate = new Date(2026, 10, 9);
  const baseIndex = 2;

  // Chuẩn hoá ngày về 0h00 theo giờ địa phương
  const d = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (d.getTime() < baseDate.getTime()) {
    return baseIndex;
  }

  // Nếu rơi vào Thứ 7 (6) hoặc Chủ Nhật (0), chuyển về mốc Thứ 6 gần nhất để giữ nguyên câu
  const dayOfWeek = d.getDay();
  const effectiveDate = new Date(d.getTime());
  if (dayOfWeek === 6) {
    effectiveDate.setDate(effectiveDate.getDate() - 1);
  } else if (dayOfWeek === 0) {
    effectiveDate.setDate(effectiveDate.getDate() - 2);
  }

  const diffTime = effectiveDate.getTime() - baseDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return baseIndex;
  }

  const fullWeeks = Math.floor(diffDays / 7);
  const remDays = diffDays % 7;
  let workdays = fullWeeks * 5;

  for (let i = 1; i <= remDays; i++) {
    const day = (baseDate.getDay() + i) % 7;
    if (day !== 0 && day !== 6) {
      workdays++;
    }
  }

  return (baseIndex + workdays) % totalQuotes;
}

const DailyQuote: React.FC = () => {
  const quote = useMemo(() => {
    const idx = getWorkdayQuoteIndex();
    return QUOTES[idx];
  }, []);

  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // URL ảnh Unsplash độ phân giải cao được căn chỉnh đúng tỉ lệ
  const photoUrl = imageError
    ? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85'
    : `https://images.unsplash.com/photo-${quote.photoId}?auto=format&fit=crop&w=1200&q=85`;

  return (
    <div className="relative w-full h-full min-h-[320px] xl:min-h-[360px] rounded-2xl overflow-hidden shadow-lg group bg-slate-900 select-none">
      {/* Background Image với hiệu ứng load mượt và zoom nhẹ khi hover */}
      <img
        src={photoUrl}
        alt={quote.author ? `Triết lý - ${quote.author}` : "Triết lý cuộc sống"}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 group-hover:scale-105 ${
          imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-102'
        }`}
      />

      {/* Cinematic Gradient Overlays để chữ luôn sáng rõ trên mọi nền ảnh */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25 pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-black/30 pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Lớp nội dung trên nền ảnh */}
      <div className="relative z-10 w-full h-full min-h-[320px] xl:min-h-[360px] p-6 sm:p-8 xl:p-10 flex flex-col justify-end">
        {/* Quote Content Section */}
        <div className="space-y-4 xl:space-y-5 max-w-3xl">
          {/* Decorative Quote Icon */}
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-amber-300 shadow-sm">
            <QuoteIcon className="w-5 h-5 fill-amber-300/25" />
          </div>

          {/* Câu danh ngôn (Font chữ to, rõ ràng, dễ đọc) */}
          <blockquote className="space-y-3.5">
            <p className="text-white text-xl sm:text-2xl md:text-3xl xl:text-4xl font-serif font-medium leading-relaxed sm:leading-relaxed md:leading-relaxed tracking-wide drop-shadow-lg">
              "{quote.text}"
            </p>

            {/* Tác giả */}
            <footer className="flex items-center gap-3 pt-1">
              <span className="block w-10 sm:w-12 h-0.5 bg-amber-400/80 rounded-full shadow-sm" aria-hidden="true" />
              <cite className="text-amber-200/95 text-base sm:text-lg font-medium tracking-wide not-italic drop-shadow">
                {quote.author}
              </cite>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default DailyQuote;
