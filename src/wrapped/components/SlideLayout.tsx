import React from 'react';
import { motion } from 'framer-motion';

export const SlideTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.h2 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      fontSize: 'clamp(2rem, 5vw, 4rem)',
      fontWeight: 900,
      background: 'linear-gradient(to right, #00ff88, #0088ff)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      marginBottom: '2rem',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: '-0.02em'
    }}
  >
    {children}
  </motion.h2>
);

export const BigStat: React.FC<{ label: string; value: string | number; delay?: number }> = ({ label, value, delay = 0 }) => (
  <motion.div 
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: delay + 0.3 }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      minWidth: '150px'
    }}
  >
    <span style={{ 
      fontSize: 'clamp(3rem, 8vw, 5rem)', 
      fontWeight: 'bold', 
      color: '#fff', 
      marginBottom: '8px',
      fontFamily: 'monospace'
    }}>{value}</span>
    <span style={{ 
      fontSize: '0.75rem', 
      color: 'rgba(255,255,255,0.7)', 
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      textAlign: 'center'
    }}>{label}</span>
  </motion.div>
);

export const SlideContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: '20px',
    textAlign: 'center',
    position: 'relative',
    zIndex: 30,
    color: '#fff'
  }}>
    {children}
  </div>
);