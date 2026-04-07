/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion } from "motion/react";
import { Shield, Sparkles, Loader2 } from "lucide-react";

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isAnniversary, setIsAnniversary] = useState(false);

  useEffect(() => {
    // Set target date to April 10, 2026
    const targetDate = new Date("2026-04-10T00:00:00").getTime();
    
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

  const generateBannerImage = async () => {
    setIsLoading(true);
    try {
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
            aspectRatio: "4:1",
            imageSize: "1K"
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setBannerImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err) {
      console.error("Error generating banner image:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateBannerImage();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl space-y-6">
        {/* The Banner */}
        <div className="relative aspect-[4/1] w-full overflow-hidden rounded-2xl bg-[#004d4d] border border-teal-400/30 shadow-[0_0_60px_-12px_rgba(0,77,77,0.5)]">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Đang thiết kế banner...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="relative h-full w-full"
            >
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
                  {/* High-fidelity SVG recreation of the new logo */}
                  <div className="relative w-12 h-12 md:w-20 md:h-20 lg:w-24 lg:h-24">
                 
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-lg md:text-3xl lg:text-4xl font-black tracking-normal text-white leading-none font-display">
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
                <div className="text-center space-y-1 md:space-y-2 relative z-10 justify-self-center">
                  <motion.div 
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center gap-2 text-teal-100 text-[7px] md:text-[10px] lg:text-xs font-bold uppercase tracking-[0.4em] drop-shadow-sm"
                  >
                    <Sparkles className="w-3 h-3 md:w-4 h-4" />
                    Kỷ niệm 1 năm thành lập
                  </motion.div>
                  
                  <motion.h1 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-lg md:text-2xl lg:text-4xl font-black tracking-tight leading-none text-white drop-shadow-lg font-display"
                  >
                    MỪNG SINH <br />
                    <span className="text-teal-200 uppercase tracking-widest flex items-center justify-center gap-1 md:gap-2">
                      NHẬT 
                      <span className="relative inline-block">
                        <span className="text-white italic font-serif text-xl md:text-3xl lg:text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">1</span>
                        <span className="absolute -inset-1 bg-teal-400/20 blur-xl rounded-full -z-10"></span>
                      </span>
                      TUỔI
                    </span>
                  </motion.h1>
                  
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-teal-50 text-[6px] md:text-[9px] lg:text-xs font-semibold opacity-80 tracking-[0.1em]"
                  >
                    MÔT NĂM DỰNG NỀN - VỮNG BỀN PHÁT TRIỂN
                  </motion.p>
                </div>

                {/* Right: Countdown Timer or Anniversary Message */}
                <div className="flex flex-col items-end gap-2 md:gap-4 font-display justify-self-end">
                  {isAnniversary ? (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-right"
                    >
                      <span className="text-xs md:text-lg font-black text-white uppercase tracking-[0.4em] block animate-pulse">
                        SỰ KIỆN ĐANG DIỄN RA
                      </span>
                      <div className="mt-2 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-900 px-4 py-1 rounded-full text-[10px] md:text-sm font-black uppercase tracking-[0.3em] shadow-lg">
                        HAPPY ANNIVERSARY!
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <span className="text-[8px] md:text-xs font-bold text-teal-300 uppercase tracking-[0.3em] opacity-60">
                        Sự kiện bắt đầu sau
                      </span>
                      <div className="flex gap-1 md:gap-3">
                        {[
                          { value: timeLeft.days, label: "Ngày" },
                          { value: timeLeft.hours, label: "Giờ" },
                          { value: timeLeft.minutes, label: "Phút" },
                          { value: timeLeft.seconds, label: "Giây" }
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

              {/* Anniversary Badge */}
              <div className="absolute -bottom-4 -left-4 w-20 h-20 md:w-28 md:h-28 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-teal-500 -rotate-12 hidden md:flex">
                <div className="text-center">
                  <div className="text-teal-600 font-black text-2xl md:text-3xl leading-none">1st</div>
                  <div className="text-teal-800 text-[8px] md:text-[10px] font-bold uppercase tracking-tighter">Year</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Simple Footer Info */}
        <div className="flex justify-between items-center px-2 text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span>Tỷ lệ 4:1</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
            <span>Branding bên trái</span>
          </div>
          <button 
            onClick={() => window.print()}
            className="hover:text-teal-400 transition-colors"
          >
            In Banner
          </button>
        </div>
      </div>
    </div>
  );
}
