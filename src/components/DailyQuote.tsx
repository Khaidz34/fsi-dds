/**
 * DailyQuote – Hiển thị câu triết lý cuộc sống mỗi ngày một câu,
 * với hình nền phù hợp phong cách suy tư, sâu sắc.
 * Câu đổi theo ngày trong năm (seed = dayOfYear).
 */

import React, { useMemo } from 'react';

interface Quote {
  text: string;
  author: string;
  /** Unsplash photo ID – dùng làm hình nền */
  photoId: string;
  /** Màu chủ đạo để tô text phù hợp với ảnh */
  overlayClass: string;
}

const QUOTES: Quote[] = [
  {
    text: 'Đừng chạy theo hạnh phúc – hãy trở thành hạnh phúc.',
    author: 'Lão Tử',
    photoId: '1518495973542-4542adad0122', // misty forest
    overlayClass: 'from-stone-900/80 via-stone-800/50 to-transparent',
  },
  {
    text: 'Sóng không biết mình đẹp cho đến khi vỡ tan.',
    author: 'Thiền ngữ',
    photoId: '1505118380757-91f5f5632de0', // ocean wave
    overlayClass: 'from-blue-950/80 via-blue-900/50 to-transparent',
  },
  {
    text: 'Mỗi khoảnh khắc hiện tại là nơi duy nhất bạn thực sự tồn tại.',
    author: 'Thích Nhất Hạnh',
    photoId: '1441974231531-c6227db76b6e', // sunlit path
    overlayClass: 'from-emerald-950/75 via-emerald-800/40 to-transparent',
  },
  {
    text: 'Im lặng không phải là trống rỗng – đó là nơi sự thật cư ngụ.',
    author: 'Thiền ngữ',
    photoId: '1470770841072-f978cf4d019e', // calm lake reflection
    overlayClass: 'from-slate-950/80 via-slate-800/50 to-transparent',
  },
  {
    text: 'Cuộc đời không phải là vấn đề cần giải quyết, mà là một thực tại cần trải nghiệm.',
    author: 'Søren Kierkegaard',
    photoId: '1490730141103-6cac27aaab94', // person on mountain top
    overlayClass: 'from-neutral-950/80 via-neutral-700/50 to-transparent',
  },
  {
    text: 'Gốc rễ của đau khổ là bám víu.',
    author: 'Phật Thích Ca',
    photoId: '1507003211169-0a1dd7228f2d', // lone tree in fog
    overlayClass: 'from-zinc-950/80 via-zinc-700/50 to-transparent',
  },
  {
    text: 'Người không sợ chết thì không có gì để mất.',
    author: 'Lão Tử – Đạo Đức Kinh',
    photoId: '1454496522488-7a8e488e8606', // starry night sky
    overlayClass: 'from-indigo-950/85 via-indigo-900/50 to-transparent',
  },
  {
    text: 'Biết người là trí tuệ. Biết mình là giác ngộ.',
    author: 'Lão Tử',
    photoId: '1529688499388-6f21e42f50e2', // mirror lake mountains
    overlayClass: 'from-teal-950/80 via-teal-800/50 to-transparent',
  },
  {
    text: 'Không có con đường nào dẫn đến hạnh phúc – hạnh phúc chính là con đường.',
    author: 'Thích Nhất Hạnh',
    photoId: '1506905925346-21bda4d32df4', // trail through forest
    overlayClass: 'from-green-950/80 via-green-800/40 to-transparent',
  },
  {
    text: 'Sự phù du của mọi thứ không phải là lý do để buồn – mà là lý do để trân quý.',
    author: 'Marcus Aurelius',
    photoId: '1469474968028-56623f02e42e', // autumn leaves
    overlayClass: 'from-amber-950/80 via-amber-800/50 to-transparent',
  },
  {
    text: 'Đôi khi câu hỏi quan trọng hơn câu trả lời.',
    author: 'Ursula K. Le Guin',
    photoId: '1516912481851-ca9ad2191ade', // open book in nature
    overlayClass: 'from-rose-950/80 via-rose-900/50 to-transparent',
  },
  {
    text: 'Ánh sáng không chinh phục bóng tối – nó chỉ làm bóng tối biến mất.',
    author: 'Thiền ngữ Thiên Chúa Giáo',
    photoId: '1500534314209-a157d0e7c9f1', // light through clouds
    overlayClass: 'from-sky-950/80 via-sky-800/40 to-transparent',
  },
  {
    text: 'Mọi con người đều là một bí ẩn, và mọi khoảnh khắc là một sự mặc khải.',
    author: 'Ralph Waldo Emerson',
    photoId: '1451187580459-43490279c0fa', // galaxy view
    overlayClass: 'from-violet-950/85 via-violet-900/50 to-transparent',
  },
  {
    text: 'Hãy là sự thay đổi mà bạn muốn thấy trên thế giới.',
    author: 'Mahatma Gandhi',
    photoId: '1504701954957-2010ec3bcec1', // sunrise over mountains
    overlayClass: 'from-orange-950/80 via-orange-800/45 to-transparent',
  },
  {
    text: 'Tâm trí yên tĩnh là kho báu quý giá nhất.',
    author: 'Thiền ngữ',
    photoId: '1476611338391-6f395a0dd082', // peaceful mountain scene
    overlayClass: 'from-stone-950/80 via-stone-700/50 to-transparent',
  },
  {
    text: 'Dòng sông không sợ chảy qua đá – nó kiên nhẫn tìm đường.',
    author: 'Thiền ngữ Nhật Bản',
    photoId: '1500534314209-a157d0e7c9f1', // mountain stream
    overlayClass: 'from-cyan-950/80 via-cyan-800/45 to-transparent',
  },
  {
    text: 'Đời người như bọt nước – xuất hiện rồi tan biến, nhưng đại dương vẫn còn đó.',
    author: 'Phật Thích Ca',
    photoId: '1505118380757-91f5f5632de0', // sea foam
    overlayClass: 'from-blue-950/80 via-blue-800/50 to-transparent',
  },
  {
    text: 'Kẻ mạnh không phải là người không bao giờ ngã, mà là người biết đứng dậy.',
    author: 'Khổng Tử',
    photoId: '1490730141103-6cac27aaab94', // cliff edge strength
    overlayClass: 'from-gray-950/80 via-gray-700/50 to-transparent',
  },
  {
    text: 'Chấp nhận những gì không thể thay đổi. Thay đổi những gì không thể chấp nhận.',
    author: 'Angela Davis',
    photoId: '1441974231531-c6227db76b6e', // crossroads in forest
    overlayClass: 'from-emerald-950/80 via-emerald-700/40 to-transparent',
  },
  {
    text: 'Cuộc sống không đo bằng số lần bạn thở, mà bằng những khoảnh khắc khiến bạn nín thở.',
    author: 'Maya Angelou',
    photoId: '1506905925346-21bda4d32df4', // breathtaking view
    overlayClass: 'from-teal-950/80 via-teal-700/40 to-transparent',
  },
  {
    text: 'Chỉ khi ta ngừng tìm kiếm, ta mới thực sự tìm thấy.',
    author: 'Carl Jung',
    photoId: '1454496522488-7a8e488e8606', // person sitting alone
    overlayClass: 'from-indigo-950/85 via-indigo-800/45 to-transparent',
  },
  {
    text: 'Đau khổ là không thể tránh, nhưng đau khổ không nhất thiết phải kéo dài.',
    author: 'Haruki Murakami',
    photoId: '1469474968028-56623f02e42e', // melancholy autumn
    overlayClass: 'from-amber-950/80 via-amber-700/50 to-transparent',
  },
  {
    text: 'Tự do thực sự không phải là làm bất cứ điều gì mình muốn, mà là không làm điều mình không muốn.',
    author: 'Jean-Paul Sartre',
    photoId: '1507003211169-0a1dd7228f2d', // open field, freedom
    overlayClass: 'from-zinc-950/80 via-zinc-700/50 to-transparent',
  },
  {
    text: 'Nước có thể vừa mềm mại nhất vừa cứng rắn nhất – tất cả phụ thuộc vào thời gian.',
    author: 'Lão Tử',
    photoId: '1529688499388-6f21e42f50e2', // river carving stone
    overlayClass: 'from-blue-950/80 via-blue-800/50 to-transparent',
  },
  {
    text: 'Người hiểu biết không nói nhiều. Người nói nhiều không hiểu biết.',
    author: 'Lão Tử – Đạo Đức Kinh',
    photoId: '1476611338391-6f395a0dd082', // peaceful solitude
    overlayClass: 'from-stone-950/80 via-stone-700/50 to-transparent',
  },
  {
    text: 'Mọi vết thương đều có thể trở thành cửa sổ của tâm hồn.',
    author: 'Rumi',
    photoId: '1500534314209-a157d0e7c9f1', // light through cracks
    overlayClass: 'from-rose-950/80 via-rose-800/50 to-transparent',
  },
  {
    text: 'Đừng lo lắng về việc ai đó lấy đi ý tưởng của bạn. Nếu nó thực sự hay, bạn sẽ phải nhét nó vào đầu người khác.',
    author: 'Howard Aiken',
    photoId: '1518495973542-4542adad0122', // creative mind
    overlayClass: 'from-violet-950/80 via-violet-800/50 to-transparent',
  },
  {
    text: 'Cơn bão không kéo dài mãi. Và sau bão, trời lại xanh hơn bao giờ hết.',
    author: 'Thiền ngữ',
    photoId: '1451187580459-43490279c0fa', // after storm
    overlayClass: 'from-sky-950/80 via-sky-800/40 to-transparent',
  },
  {
    text: 'Ta là ai không quan trọng bằng ta đang trở thành ai.',
    author: 'C.S. Lewis',
    photoId: '1504701954957-2010ec3bcec1', // journey road
    overlayClass: 'from-orange-950/80 via-orange-800/45 to-transparent',
  },
  {
    text: 'Sự khiêm tốn không phải là nghĩ xấu về mình, mà là nghĩ ít về mình hơn.',
    author: 'C.S. Lewis',
    photoId: '1470770841072-f978cf4d019e', // humble nature
    overlayClass: 'from-green-950/80 via-green-800/45 to-transparent',
  },
  {
    text: 'Khi bạn thay đổi cách nhìn, những thứ bạn nhìn sẽ thay đổi.',
    author: 'Wayne Dyer',
    photoId: '1516912481851-ca9ad2191ade', // new perspective
    overlayClass: 'from-teal-950/80 via-teal-700/40 to-transparent',
  },
];

/** Lấy câu theo ngày trong năm (0‑based) */
function getDailyQuote(): Quote {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}

const DailyQuote: React.FC = () => {
  const quote = useMemo(() => getDailyQuote(), []);

  const bgUrl = `https://images.unsplash.com/photo-${quote.photoId}?auto=format&fit=crop&w=800&q=80`;

  return (
    <div className="relative w-full h-full min-h-[320px] xl:min-h-[360px] rounded-2xl overflow-hidden shadow-lg group">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${bgUrl})` }}
        aria-hidden="true"
      />

      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${quote.overlayClass}`}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 xl:p-8">
        {/* Decorative quotation mark */}
        <span
          className="block text-white/25 font-serif text-8xl leading-none select-none mb-1"
          aria-hidden="true"
        >
          "
        </span>

        <blockquote className="space-y-3">
          <p className="text-white text-lg xl:text-xl font-semibold leading-relaxed drop-shadow-md">
            {quote.text}
          </p>
          <footer className="flex items-center gap-2">
            <span className="block w-8 h-px bg-white/50" aria-hidden="true" />
            <cite className="text-white/70 text-sm font-medium not-italic tracking-wide">
              {quote.author}
            </cite>
          </footer>
        </blockquote>
      </div>
    </div>
  );
};

export default DailyQuote;
