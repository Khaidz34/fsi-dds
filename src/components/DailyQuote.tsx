/**
 * DailyQuote – Hiển thị câu danh ngôn / triết lý sống mỗi ngày
 * Đa ngôn ngữ (Tiếng Việt, Tiếng Anh, Tiếng Nhật)
 * với hình nền nhiếp ảnh thiên nhiên độ phân giải cao phù hợp nội dung.
 * Đổi tự động theo ngày làm việc (Thứ 2 - Thứ 6; Thứ 7 & CN giữ nguyên câu của Thứ 6).
 */

import React, { useState, useMemo } from 'react';
import { Quote as QuoteIcon } from 'lucide-react';

interface LocalizedString {
  vi: string;
  en: string;
  ja: string;
}

interface QuoteItem {
  text: LocalizedString;
  author: LocalizedString;
  theme: LocalizedString;
  photoId: string;
}

const QUOTES: QuoteItem[] = [
  {
    text: {
      vi: 'Đừng chạy theo hạnh phúc – hãy trở thành hạnh phúc.',
      en: 'Do not chase happiness – become happiness.',
      ja: '幸せを追い求めるのではなく、自らが幸せそのものになりなさい。'
    },
    author: {
      vi: 'Lão Tử',
      en: 'Lao Tzu',
      ja: '老子'
    },
    theme: {
      vi: 'An lạc nội tâm',
      en: 'Inner Peace',
      ja: '心の平安'
    },
    photoId: '1470071459604-3b5ec3a7fe05'
  },
  {
    text: {
      vi: 'Sóng không biết mình đẹp cho đến khi vỡ tan. Sóng quên rằng mình chính là đại dương.',
      en: 'A wave does not know its beauty until it breaks. It forgets that it is the ocean itself.',
      ja: '波は砕け散るまで己の美しさを知らず、自身が海そのものであることを忘れている。'
    },
    author: {
      vi: 'Thiền ngữ',
      en: 'Zen Proverb',
      ja: '禅の言葉'
    },
    theme: {
      vi: 'Giác ngộ & Buông bỏ',
      en: 'Enlightenment & Release',
      ja: '悟りと手放し'
    },
    photoId: '1505118380757-91f5f5632de0'
  },
  {
    text: {
      vi: 'Mỗi khoảnh khắc hiện tại là nơi duy nhất bạn thực sự tồn tại.',
      en: 'The present moment is the only place where you truly exist.',
      ja: '今この瞬間こそが、あなたが本当に生きている唯一の場所である。'
    },
    author: {
      vi: 'Thích Nhất Hạnh',
      en: 'Thich Nhat Hanh',
      ja: 'ティク・ナット・ハン'
    },
    theme: {
      vi: 'Chánh niệm hiện tại',
      en: 'Mindful Presence',
      ja: '今ここにあること'
    },
    photoId: '1441974231531-c6227db76b6e'
  },
  {
    text: {
      vi: 'Im lặng không phải là trống rỗng – đó là nơi sự thật cư ngụ.',
      en: 'Silence is not emptiness – it is where truth dwells.',
      ja: '静寂は虚無ではない。真実が宿る場所である。'
    },
    author: {
      vi: 'Thiền ngữ',
      en: 'Zen Proverb',
      ja: '禅の言葉'
    },
    theme: {
      vi: 'Tĩnh lặng tâm hồn',
      en: 'Quiet Soul',
      ja: '静寂な心'
    },
    photoId: '1470770841072-f978cf4d019e'
  },
  {
    text: {
      vi: 'Cuộc đời không phải là vấn đề cần giải quyết, mà là một thực tại cần trải nghiệm.',
      en: 'Life is not a problem to be solved, but a reality to be experienced.',
      ja: '人生は解決すべき問題ではなく、体験すべき現実である。'
    },
    author: {
      vi: 'Søren Kierkegaard',
      en: 'Søren Kierkegaard',
      ja: 'キルケゴール'
    },
    theme: {
      vi: 'Trải nghiệm sống',
      en: 'Living Experience',
      ja: '生きる体験'
    },
    photoId: '1506744038136-46273834b3fb'
  },
  {
    text: {
      vi: 'Gốc rễ của đau khổ là bám víu. Buông bỏ mang lại tự do đích thực.',
      en: 'The root of suffering is attachment. Letting go brings true freedom.',
      ja: '執着こそが苦しみの根源である。手放すことこそが真の自由をもたらす。'
    },
    author: {
      vi: 'Phật Thích Ca',
      en: 'Gautama Buddha',
      ja: '釈迦牟尼仏'
    },
    theme: {
      vi: 'Tự do tâm hồn',
      en: 'Inner Freedom',
      ja: '真の自由'
    },
    photoId: '1535463731090-e34f4b5098c5'
  },
  {
    text: {
      vi: 'Người biết đủ là người giàu có nhất thế gian.',
      en: 'He who knows contentment is truly wealthy beyond measure.',
      ja: '足るを知る者は、世界で最も富める者である。'
    },
    author: {
      vi: 'Lão Tử',
      en: 'Lao Tzu',
      ja: '老子'
    },
    theme: {
      vi: 'Tâm thái biết đủ',
      en: 'Contentment',
      ja: '知足の心'
    },
    photoId: '1472214103451-9374bd1c798e'
  },
  {
    text: {
      vi: 'Không có con đường nào dẫn đến hạnh phúc – hạnh phúc chính là con đường bạn đang đi.',
      en: 'There is no way to happiness – happiness is the path you walk.',
      ja: '幸せに至る道はない。歩む道のりこそが幸せである。'
    },
    author: {
      vi: 'Thích Nhất Hạnh',
      en: 'Thich Nhat Hanh',
      ja: 'ティク・ナット・ハン'
    },
    theme: {
      vi: 'Hành trình cuộc sống',
      en: 'Journey of Life',
      ja: '人生の旅路'
    },
    photoId: '1426604966848-d7adac402bff'
  },
  {
    text: {
      vi: 'Sự phù du của mọi thứ không phải là lý do để buồn – mà là lý do để trân quý từng phút giây.',
      en: 'The impermanence of all things is not a reason to grieve – but a reason to treasure each breath.',
      ja: '万物の無常は悲しむためではなく、一瞬一瞬をかけがえのないものとして愛おしむためのものである。'
    },
    author: {
      vi: 'Marcus Aurelius',
      en: 'Marcus Aurelius',
      ja: 'マルクス・アウレリウス'
    },
    theme: {
      vi: 'Trân trọng hiện tại',
      en: 'Cherishing the Present',
      ja: '今を慈しむ'
    },
    photoId: '1469474968028-56623f02e42e'
  },
  {
    text: {
      vi: 'Hãy nhìn sâu vào thiên nhiên, và bạn sẽ thấu hiểu mọi thứ rõ ràng hơn.',
      en: 'Look deep into nature, and then you will understand everything better.',
      ja: '自然を深く見つめなさい。そうすれば、すべてのことがよりよく理解できるだろう。'
    },
    author: {
      vi: 'Albert Einstein',
      en: 'Albert Einstein',
      ja: 'アルバート・アインシュタイン'
    },
    theme: {
      vi: 'Thiên nhiên & Trí tuệ',
      en: 'Nature & Wisdom',
      ja: '自然と叡智'
    },
    photoId: '1447752875215-b2761acb3c5d'
  },
  {
    text: {
      vi: 'Ánh sáng không chinh phục bóng tối – nó chỉ làm bóng tối biến mất bằng sự hiện diện của mình.',
      en: 'Light does not fight the darkness – darkness simply vanishes in its radiant presence.',
      ja: '光は闇と争わない。ただ光がそこに在るだけで、闇は静かに消え去るのである。'
    },
    author: {
      vi: 'Thiền ngữ',
      en: 'Zen Wisdom',
      ja: '禅の言葉'
    },
    theme: {
      vi: 'Ánh sáng nội tâm',
      en: 'Inner Radiance',
      ja: '内なる光'
    },
    photoId: '1499209974431-9dddcece7f88'
  },
  {
    text: {
      vi: 'Bạn là một phần kỳ diệu của vũ trụ bao la, đang trải nghiệm chính mình.',
      en: 'You are a wondrous part of the vast cosmos, experiencing itself.',
      ja: 'あなたは広大な宇宙の奇跡的な一部であり、宇宙が自らを体験している姿である。'
    },
    author: {
      vi: 'Carl Sagan',
      en: 'Carl Sagan',
      ja: 'カール・セーガン'
    },
    theme: {
      vi: 'Vũ trụ & Bản thể',
      en: 'Cosmos & Being',
      ja: '宇宙と自己'
    },
    photoId: '1451187580459-43490279c0fa'
  },
  {
    text: {
      vi: 'Hãy là sự thay đổi tích cực mà bạn muốn thấy trên thế giới.',
      en: 'Be the positive change that you wish to see in the world.',
      ja: '世界に見たいと願う前向きな変化に、あなた自身がなりなさい。'
    },
    author: {
      vi: 'Mahatma Gandhi',
      en: 'Mahatma Gandhi',
      ja: 'マハトマ・ガンディー'
    },
    theme: {
      vi: 'Hành động & Lan toả',
      en: 'Action & Impact',
      ja: '行動と希望'
    },
    photoId: '1504701954957-2010ec3bcec1'
  },
  {
    text: {
      vi: 'Tâm trí yên tĩnh là nơi nuôi dưỡng những ý tưởng sáng suốt nhất.',
      en: 'A peaceful mind is the fertile soil where the clearest wisdom blossoms.',
      ja: '静寂な心こそが、最も明晰な知恵を育む場所である。'
    },
    author: {
      vi: 'Thiền ngữ',
      en: 'Zen Wisdom',
      ja: '禅の言葉'
    },
    theme: {
      vi: 'Bình an tĩnh tại',
      en: 'Stillness & Clarity',
      ja: '静寂と明晰'
    },
    photoId: '1470240731273-7821a6eeb6bd'
  },
  {
    text: {
      vi: 'Dòng nước không tranh giành với đá – nó kiên nhẫn chảy qua và mài mòn tất cả.',
      en: 'Water does not quarrel with the rock – with patient flow, it gently shapes all things.',
      ja: '水は岩と争わない。ただ忍耐強く流れ、やがてすべてを優しく削り磨く。'
    },
    author: {
      vi: 'Lão Tử',
      en: 'Lao Tzu',
      ja: '老子'
    },
    theme: {
      vi: 'Nhu thắng cương',
      en: 'Gentle Strength',
      ja: '柔よく剛を制す'
    },
    photoId: '1518837695005-2083093ee35b'
  },
  {
    text: {
      vi: 'Mọi việc đều có thời điểm của nó. Hãy kiên nhẫn và tin tưởng vào tiến trình cuộc sống.',
      en: 'To everything there is a season. Be patient and trust the natural rhythm of life.',
      ja: 'すべての出来事には時がある。忍耐を持ち、人生の自然な歩みを信じなさい。'
    },
    author: {
      vi: 'Ecclesiastes',
      en: 'Ecclesiastes',
      ja: '伝道の書'
    },
    theme: {
      vi: 'Kiên nhẫn & Niềm tin',
      en: 'Patience & Faith',
      ja: '忍耐と信じる心'
    },
    photoId: '1509114397022-ed747cca3f65'
  },
  {
    text: {
      vi: 'Kỳ tích không phải là đi trên mặt nước, mà là bước đi bình an trên mặt đất này.',
      en: 'The miracle is not to walk on water, but to walk peacefully on the earth.',
      ja: '奇跡とは水の上を歩くことではなく、大地の上に心穏やかに歩みを進めることである。'
    },
    author: {
      vi: 'Thích Nhất Hạnh',
      en: 'Thich Nhat Hanh',
      ja: 'ティク・ナット・ハン'
    },
    theme: {
      vi: 'Chân giá trị cuộc sống',
      en: 'True Life Value',
      ja: '生の真価'
    },
    photoId: '1506905925346-21bda4d32df4'
  },
  {
    text: {
      vi: 'Đau khổ là không thể tránh khỏi, nhưng lựa chọn vượt lên hay đắm chìm là ở chính bạn.',
      en: 'Pain is inevitable. Suffering is optional.',
      ja: '痛みは避けられないが、苦しみを選ぶかどうかは自分次第である。'
    },
    author: {
      vi: 'Haruki Murakami',
      en: 'Haruki Murakami',
      ja: '村上春樹'
    },
    theme: {
      vi: 'Bản lĩnh sống',
      en: 'Resilience',
      ja: '生きる力'
    },
    photoId: '1464822759023-fed622ff2c3b'
  },
  {
    text: {
      vi: 'Tự do thực sự là khi bạn tìm thấy sự bình yên và không cần sự công nhận từ bên ngoài.',
      en: 'True freedom begins when you find inner tranquility and no longer crave external validation.',
      ja: '真の自由とは、他者からの承認を求めず、自らの内に静けさを見出した時に始まる。'
    },
    author: {
      vi: 'Jean-Paul Sartre',
      en: 'Jean-Paul Sartre',
      ja: 'ジャン＝ポール・サルトル'
    },
    theme: {
      vi: 'Tự do tự tại',
      en: 'Sovereign Freedom',
      ja: '真の自由'
    },
    photoId: '1519681393784-d120267933ba'
  },
  {
    text: {
      vi: 'Nước càng sâu càng tĩnh lặng. Người càng thông tuệ càng khiêm nhường.',
      en: 'Still waters run deep. The wiser the spirit, the gentler and humbler they walk.',
      ja: '深き水は静かに流れる。智恵深き人ほど、謙虚で穏やかである。'
    },
    author: {
      vi: 'Ngạn ngữ Á Đông',
      en: 'Eastern Proverb',
      ja: '東洋の格言'
    },
    theme: {
      vi: 'Khiêm nhường & Sâu sắc',
      en: 'Humility & Depth',
      ja: '謙虚と深み'
    },
    photoId: '1501785888041-af3ef285b470'
  },
  {
    text: {
      vi: 'Khi bạn thay đổi cách nhìn, những thứ bạn nhìn sẽ thay đổi.',
      en: 'When you change the way you look at things, the things you look at change.',
      ja: 'ものの見方を変えれば、見ている世界そのものが変わる。'
    },
    author: {
      vi: 'Wayne Dyer',
      en: 'Wayne Dyer',
      ja: 'ウエイン・ダイアー'
    },
    theme: {
      vi: 'Góc nhìn mới',
      en: 'New Perspective',
      ja: '新たな視点'
    },
    photoId: '1490730141103-6cac27aaab94'
  }
];

function getWorkdayQuoteIndex(targetDate: Date = new Date(), totalQuotes: number = QUOTES.length): number {
  const baseDate = new Date(2026, 10, 9);
  const baseIndex = 2;

  const d = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (d.getTime() < baseDate.getTime()) {
    return baseIndex;
  }

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

export interface DailyQuoteProps {
  currentLang?: 'vi' | 'en' | 'ja';
  className?: string;
}

export const DailyQuote: React.FC<DailyQuoteProps> = ({ currentLang = 'vi', className = '' }) => {
  const quote = useMemo(() => {
    const idx = getWorkdayQuoteIndex();
    return QUOTES[idx];
  }, []);

  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const lang = currentLang || 'vi';
  const quoteText = quote.text[lang] || quote.text.vi;
  const quoteAuthor = quote.author[lang] || quote.author.vi;

  const photoUrl = imageError
    ? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85'
    : `https://images.unsplash.com/photo-${quote.photoId}?auto=format&fit=crop&w=1200&q=85`;

  const altText = quoteAuthor
    ? (lang === 'vi' ? `Triết lý - ${quoteAuthor}` : lang === 'ja' ? `名言 - ${quoteAuthor}` : `Daily Quote - ${quoteAuthor}`)
    : (lang === 'vi' ? 'Triết lý cuộc sống' : lang === 'ja' ? '日々の言葉' : 'Daily Reflection');

  return (
    <div className={`relative w-full h-full min-h-[320px] xl:min-h-[360px] rounded-2xl overflow-hidden shadow-lg group bg-slate-900 select-none ${className}`}>
      {/* Background Image với hiệu ứng load mượt và zoom nhẹ khi hover */}
      <img
        src={photoUrl}
        alt={altText}
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

          {/* Câu danh ngôn (Font chữ to, rõ ràng, dễ đọc, tự đổi theo ngôn ngữ đã chọn) */}
          <blockquote className="space-y-3.5">
            <p className="text-white text-xl sm:text-2xl md:text-3xl xl:text-4xl font-serif font-medium leading-relaxed sm:leading-relaxed md:leading-relaxed tracking-wide drop-shadow-lg">
              &ldquo;{quoteText}&rdquo;
            </p>

            {/* Tác giả */}
            <footer className="flex items-center gap-3 pt-1">
              <span className="block w-10 sm:w-12 h-0.5 bg-amber-400/80 rounded-full shadow-sm" aria-hidden="true" />
              <cite className="text-amber-200/95 text-base sm:text-lg font-medium tracking-wide not-italic drop-shadow">
                {quoteAuthor}
              </cite>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default DailyQuote;
