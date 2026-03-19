// Mock framer-motion to avoid dependency issues
import React from 'react';

export const motion = {
  div: React.forwardRef((props: any, ref: any) => React.createElement('div', { ...props, ref })),
  button: React.forwardRef((props: any, ref: any) => React.createElement('button', { ...props, ref })),
  span: React.forwardRef((props: any, ref: any) => React.createElement('span', { ...props, ref })),
  p: React.forwardRef((props: any, ref: any) => React.createElement('p', { ...props, ref })),
  h1: React.forwardRef((props: any, ref: any) => React.createElement('h1', { ...props, ref })),
  h2: React.forwardRef((props: any, ref: any) => React.createElement('h2', { ...props, ref })),
  h3: React.forwardRef((props: any, ref: any) => React.createElement('h3', { ...props, ref })),
  h4: React.forwardRef((props: any, ref: any) => React.createElement('h4', { ...props, ref })),
};

export const AnimatePresence = ({ children }: any) => children;

export const useAnimation = () => ({});
export const useMotionValue = () => ({});
export const useTransform = () => ({});
export const useViewportScroll = () => ({});
