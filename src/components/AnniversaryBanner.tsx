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
          <div className="absolute top-2 md:top-4 left-0 right-0 text-center">
            <p className="text-[8px] md:text-xs lg:text-base text-white font-black uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900 }}>
              MỘT NĂM DỰNG NỀN - VỮNG BỀN PHÁT TRIỂN
            </p>
          </div>

          {/* Content Layout */}
          <div className="absolute inset-0 grid grid-cols-3 items-center gap-4 px-3 md:px-6 lg:px-10 pt-8 md:pt-10">
            
            {/* Left: Company Branding */}
            <div className="flex items-center gap-2 md:gap-3 justify-self-start">
              <div className="flex flex-col gap-0.5">
                <span className="text-lg md:text-3xl lg:text-5xl font-black text-white leading-none tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900 }}>
                  FSI DDS
                </span>
                <span className="text-[7px] md:text-[10px] lg:text-sm font-black text-teal-300 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800 }}>
                  DIGITAL DATA SOLUTIONS
                </span>
                <span className="text-[6px] md:text-[9px] lg:text-xs font-bold text-white/70 uppercase tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>
                  BY FSI VIETNAM & DDS JAPAN
                </span>
              </div>
            </div>

            {/* Center: Anniversary Message */}
            <div className="text-center space-y-0.5 md:space-y-1 relative z-10 justify-self-center">
              <h1 className="text-2xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-2xl tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900 }}>
                CHÚC MỪNG
              </h1>
              
              <div className="text-teal-200 uppercase flex items-center justify-center whitespace-nowrap" style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontWeight: 900,
                letterSpacing: '0.025em',
                gap: 'calc(0.25rem * 2)',
                lineHeight: 1.2,
                alignItems: 'baseline'
              }}>
                <span className="text-xl md:text-4xl lg:text-5xl font-black" style={{ lineHeight: 1.2 }}>SINH NHẬT</span>
                <span className="relative inline-block mx-0.5 md:mx-1" style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                  <span className="text-white italic font-serif text-5xl md:text-8xl lg:text-9xl drop-shadow-[0_0_40px_rgba(255,255,255,0.9)]" style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold', lineHeight: 1.2, display: 'inline-block' }}>1</span>
                  <span className="absolute -inset-3 bg-teal-400/30 blur-3xl rounded-full -z-10"></span>
                </span>
                <span className="text-xl md:text-4xl lg:text-5xl font-black" style={{ lineHeight: 1.2 }}>TUỔI</span>
              </div>
            </div>

            {/* Right: Countdown Timer */}
            <div className="flex flex-col items-end gap-1 md:gap-2 justify-self-end">
              {isAnniversary ? (
                <div className="text-right">
                  <span className="text-xs md:text-lg font-black text-white uppercase block animate-pulse tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900 }}>
                    SỰ KIỆN ĐANG DIỄN RA
                  </span>
                  <div className="mt-2 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-900 px-4 py-1.5 rounded-full text-[10px] md:text-base font-black uppercase shadow-2xl tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900 }}>
                    HAPPY ANNIVERSARY!
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-[9px] md:text-xs font-black text-teal-300 uppercase tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800 }}>
                    SỰ KIỆN BẮT ĐẦU SAU
                  </span>
                  <div className="flex gap-1 md:gap-2">
                    {[
                      { value: timeLeft.days, label: 'NGÀY' },
                      { value: timeLeft.hours, label: 'GIỜ' },
                      { value: timeLeft.minutes, label: 'PHÚT' },
                      { value: timeLeft.seconds, label: 'GIÂY' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-0.5">
                        <div className="bg-teal-950/90 border-2 border-teal-400/50 rounded-lg w-8 h-8 md:w-14 md:h-14 flex items-center justify-center shadow-lg backdrop-blur-sm">
                          <span className="text-white text-base md:text-3xl font-black tabular-nums" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900 }}>
                            {item.value.toString().padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-[6px] md:text-[9px] font-black text-teal-300 uppercase tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800 }}>
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
        </div>
      )}
    </div>
  );
};
