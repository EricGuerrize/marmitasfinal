// src/components/OptimizedImage.js
import React, { useState, useEffect, useRef } from 'react';

const OptimizedImage = ({ 
  src, 
  alt, 
  width = 300, 
  height = 200, 
  className,
  style,
  isMobile = false,
  lazy = true 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef();

  // Otimiza URL do Unsplash com parâmetros de performance
  const getOptimizedUrl = (url) => {
    if (!url || !url.includes('unsplash.com')) return url;
    
    // Calcula dimensões baseado no dispositivo
    const deviceWidth = isMobile ? Math.min(width, 280) : width;
    const deviceHeight = isMobile ? Math.min(height, 180) : height;
    
    // Remove parâmetros existentes e adiciona otimizados
    const baseUrl = url.split('?')[0];
    
    return `${baseUrl}?w=${deviceWidth}&h=${deviceHeight}&fit=crop&crop=center&auto=format&q=${isMobile ? '60' : '75'}&fm=webp&dpr=${window.devicePixelRatio || 1}`;
  };

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [lazy]);

  // Preload da imagem
  useEffect(() => {
    if (!isInView || hasError) return;

    const img = new Image();
    const optimizedSrc = getOptimizedUrl(src);
    
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setHasError(true);
    img.src = optimizedSrc;
  }, [isInView, src, isMobile, hasError]);

  const containerStyle = {
    width: '100%',
    height: isMobile ? '150px' : '200px',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style
  };

  // Placeholder enquanto carrega
  if (!isInView || (!isLoaded && !hasError)) {
    return (
      <div ref={imgRef} style={containerStyle} className={className}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: '#999',
          fontSize: isMobile ? '14px' : '16px'
        }}>
          <div style={{ 
            fontSize: isMobile ? '24px' : '32px', 
            marginBottom: '8px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            🍽️
          </div>
          <span>Carregando...</span>
        </div>
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}
        </style>
      </div>
    );
  }

  // Imagem com erro
  if (hasError) {
    return (
      <div style={containerStyle} className={className}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: '#999',
          fontSize: isMobile ? '14px' : '16px'
        }}>
          <div style={{ fontSize: isMobile ? '24px' : '32px', marginBottom: '8px' }}>
            🖼️
          </div>
          <span>Imagem indisponível</span>
        </div>
      </div>
    );
  }

  // Imagem carregada
  return (
    <div style={containerStyle} className={className}>
      <img
        src={getOptimizedUrl(src)}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'opacity 0.3s ease'
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export default OptimizedImage;