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

          {/* Top Tagline */}
          <div className="absolute top-3 md:top-5 left-0 right-0 text-center">
            <p className="text-[9px] md:text-sm lg:text-lg text-white font-black uppercase" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.35em', fontWeight: 900 }}>
              MỘT NĂM DỰNG NỀN - VỮNG BỀN PHÁT TRIỂN
            </p>
          </div>

          {/* Content Layout */}
          <div className="absolute inset-0 grid grid-cols-3 items-center px-4 md:px-8 lg:px-12 pt-8 md:pt-10">
            
            {/* Left: Company Branding */}
            <div className="flex items-center gap-3 md:gap-5 justify-self-start">
              {/* FSI DDS Logo */}
              <div className="relative w-16 h-14 md:w-28 md:h-24 lg:w-36 lg:h-28 flex-shrink-0">
                <img 
                  src="/logo.svg" 
                  alt="FSI DDS Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-2xl md:text-5xl lg:text-6xl font-black text-white leading-none" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.08em', fontWeight: 900 }}>
                  FSI DDS
                </span>
                <span className="text-[8px] md:text-sm lg:text-base font-black text-teal-300 uppercase" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.2em', fontWeight: 800 }}>
                  DIGITAL DATA SOLUTIONS
                </span>
                <span className="text-[7px] md:text-xs lg:text-sm font-bold text-white/70 uppercase" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.15em', fontWeight: 700 }}>
                  BY FSI VIETNAM & DDS JAPAN
                </span>
              </div>
            </div>

            {/* Center: Anniversary Message */}
            <div className="text-center space-y-1 md:space-y-2 relative z-10 justify-self-center">
              <h1 className="text-3xl md:text-6xl lg:text-7xl font-black text-white drop-shadow-2xl" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.2em', fontWeight: 900 }}>
                CHÚC MỪNG
              </h1>
              
              <div className="text-teal-200 uppercase flex items-baseline justify-center gap-2 md:gap-3 leading-none" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.15em', fontWeight: 900 }}>
                <span className="text-2xl md:text-5xl lg:text-6xl font-black">SINH NHẬT</span>
                <span className="relative inline-block mx-1 md:mx-2">
                  <span className="text-white italic font-serif text-6xl md:text-9xl lg:text-[10rem] drop-shadow-[0_0_40px_rgba(255,255,255,0.9)] leading-none" style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>1</span>
                  <span className="absolute -inset-4 bg-teal-400/30 blur-3xl rounded-full -z-10"></span>
                </span>
                <span className="text-2xl md:text-5xl lg:text-6xl font-black">TUỔI</span>
              </div>
            </div>

            {/* Right: Countdown Timer */}
            <div className="flex flex-col items-end gap-2 md:gap-3 justify-self-end">
              {isAnniversary ? (
                <div className="text-right">
                  <span className="text-sm md:text-xl font-black text-white uppercase block animate-pulse" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.25em', fontWeight: 900 }}>
                    SỰ KIỆN ĐANG DIỄN RA
                  </span>
                  <div className="mt-3 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-900 px-5 py-2 rounded-full text-xs md:text-lg font-black uppercase shadow-2xl" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.2em', fontWeight: 900 }}>
                    HAPPY ANNIVERSARY!
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-[10px] md:text-sm font-black text-teal-300 uppercase" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.15em', fontWeight: 800 }}>
                    SỰ KIỆN BẮT ĐẦU SAU
                  </span>
                  <div className="flex gap-1.5 md:gap-3">
                    {[
                      { value: timeLeft.days, label: 'NGÀY' },
                      { value: timeLeft.hours, label: 'GIỜ' },
                      { value: timeLeft.minutes, label: 'PHÚT' },
                      { value: timeLeft.seconds, label: 'GIÂY' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div className="bg-teal-950/90 border-2 border-teal-400/50 rounded-xl w-9 h-9 md:w-16 md:h-16 flex items-center justify-center shadow-lg backdrop-blur-sm">
                          <span className="text-white text-lg md:text-4xl font-black tabular-nums" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900 }}>
                            {item.value.toString().padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-[7px] md:text-[10px] font-black text-teal-300 uppercase" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.15em', fontWeight: 800 }}>
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
              className="absolute top-2 right-2 md:top-3 md:right-3 bg-white/10 hover:bg-white/20 text-white rounded-full p-1.5 md:p-2 transition-colors z-20"
              aria-label="Close banner"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
