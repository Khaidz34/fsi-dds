/**
 * Anniversary Banner Component
 * Displays 1-year anniversary celebration banner with countdown timer
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AnniversaryBannerProps {
  onClose?: () => void;
}

export const AnniversaryBanner: React.FC<AnniversaryBannerProps> = ({ onClose }) => {
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isAnniversary, setIsAnniversary] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    const targetDate = new Date('2026-04-10T00:00:00').getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      
      if (distance <= 0) {
        clearInterval(interval);
        setIsAnniversary(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Generate AI background (with timeout)
  useEffect(() => {
    const generateBackground = async () => {
      setIsLoading(true);
      
      // Check if Gemini API key is configured
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('Gemini API key not configured, using gradient fallback');
        setIsLoading(false);
        return;
      }

      try {
        // Timeout after 8 seconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const { GoogleGenAI } = await import('@google/genai');
        const genAI = new GoogleGenAI({ apiKey });

        const response = await genAI.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: {
            parts: [
              {
                text: 'A professional, high-tech cinematic banner background for a data recovery company 1st anniversary. Deep corporate teal and dark cyan digital data streams, glowing circuits, subtle golden particles. Sophisticated, trustworthy, and elegant color palette. Clean, modern, corporate. Aspect ratio 4:1.',
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: '4:1',
              imageSize: '1K'
            },
          },
        });

        clearTimeout(timeoutId);

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            setBannerImage(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      } catch (err) {
        console.warn('Gemini API error, using gradient fallback:', err);
      } finally {
        setIsLoading(false);
      }
    };

    generateBackground();
  }, []);

  return (
    <div className="relative aspect-[4/1] w-full overflow-hidden rounded-2xl bg-[#004d4d] border border-teal-400/30 shadow-[0_0_60px_-12px_rgba(0,77,77,0.5)]">
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Đang thiết kế banner...</p>
        </div>
      ) : (
        <div className="relative h-full w-full">
          {/* Deep Teal Gradient Base */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#004d4d] via-[#003333] to-[#001a1a]"></div>

          {/* AI Background Overlay */}
          {bannerImage && (
            <img 
              src={bannerImage} 
              alt="Background Pattern" 
              className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
              referrerPolicy="no-referrer"
            />
          )}
          
          {/* Decorative Light Effects */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,rgba(0,128,128,0.4)_0%,transparent_50%)]"></div>

          {/* Content Layout */}
          <div className="absolute inset-0 grid grid-cols-3 items-center px-4 md:px-8 lg:px-12">
            
            {/* Left: Company Branding */}
            <div className="flex items-center gap-2 md:gap-4 justify-self-start">
              {/* FSI DDS Logo */}
              <div className="relative w-12 h-12 md:w-20 md:h-20 lg:w-24 lg:h-24">
                <img 
                  src="/logo.svg" 
                  alt="FSI DDS Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
                />
              </div>
              
              <div className="flex flex-col">
                <span className="text-lg md:text-3xl lg:text-4xl font-black tracking-normal text-white leading-none">
                  FSI DDS
                </span>
                <span className="text-[6px] md:text-[10px] font-bold text-teal-300 uppercase tracking-[0.2em] mt-1">
                  Digital Data Solutions
                </span>
                <span className="text-[5px] md:text-[8px] font-semibold text-teal-100/70 uppercase tracking-[0.1em] mt-1">
                  by FSI Vietnam & DDS Japan
                </span>
              </div>
            </div>

            {/* Center: Anniversary Message */}
            <div className="text-center space-y-0 md:space-y-1 relative z-10 justify-self-center">
              <div className="flex items-center justify-center gap-2 text-teal-100 text-[7px] md:text-[10px] lg:text-xs font-bold uppercase tracking-[0.4em] drop-shadow-sm">
                Kỷ niệm 1 năm thành lập
              </div>
              
              <h1 className="text-base md:text-xl lg:text-3xl font-black tracking-tight leading-tight text-white drop-shadow-lg">
                MỪNG SINH
              </h1>
              
              <div className="text-teal-200 uppercase tracking-widest flex items-center justify-center gap-0 md:gap-1 leading-none">
                <span className="text-2xl md:text-4xl lg:text-6xl font-black">NHẬT</span>
                <span className="relative inline-block">
                  <span className="text-white italic font-serif text-6xl md:text-8xl lg:text-9xl drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] leading-none">1</span>
                  <span className="absolute -inset-1 bg-teal-400/20 blur-xl rounded-full -z-10"></span>
                </span>
                <span className="text-2xl md:text-4xl lg:text-6xl font-black">TUỔI</span>
              </div>
              
              <p className="text-teal-50 text-[6px] md:text-[9px] lg:text-xs font-semibold opacity-80 tracking-[0.1em] mt-1">
                MÔT NĂM DỰNG NỀN - VỮNG BỀN PHÁT TRIỂN
              </p>
            </div>

            {/* Right: Countdown Timer or Anniversary Message */}
            <div className="flex flex-col items-end gap-2 md:gap-4 justify-self-end">
              {isAnniversary ? (
                <div className="text-right">
                  <span className="text-xs md:text-lg font-black text-white uppercase tracking-[0.4em] block animate-pulse">
                    SỰ KIỆN ĐANG DIỄN RA
                  </span>
                  <div className="mt-2 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-900 px-4 py-1 rounded-full text-[10px] md:text-sm font-black uppercase tracking-[0.3em] shadow-lg">
                    HAPPY ANNIVERSARY!
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-[8px] md:text-xs font-bold text-teal-300 uppercase tracking-[0.3em] opacity-60">
                    Sự kiện bắt đầu sau
                  </span>
                  <div className="flex gap-1 md:gap-3">
                    {[
                      { value: timeLeft.days, label: 'Ngày' },
                      { value: timeLeft.hours, label: 'Giờ' },
                      { value: timeLeft.minutes, label: 'Phút' },
                      { value: timeLeft.seconds, label: 'Giây' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className="bg-teal-950/80 border border-teal-400/30 rounded-lg w-8 h-8 md:w-14 md:h-14 flex items-center justify-center shadow-inner backdrop-blur-sm">
                          <span className="text-white text-base md:text-2xl font-black tabular-nums">
                            {item.value.toString().padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-[5px] md:text-[9px] font-bold text-teal-300 uppercase tracking-[0.2em] mt-1">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Close button (if onClose provided) */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
              aria-label="Close banner"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
