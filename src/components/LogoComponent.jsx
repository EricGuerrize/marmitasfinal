// src/components/LogoComponent.js
import React from 'react';

const LogoComponent = ({ 
  size = 'medium', 
  showText = true, 
  style = {},
  onClick = null 
}) => {
  const sizes = {
    small: {
      container: { width: '120px', height: '40px' },
      logo: { height: '30px' },
      text: { fontSize: '16px' }
    },
    medium: {
      container: { width: '160px', height: '50px' },
      logo: { height: '40px' },
      text: { fontSize: '20px' }
    },
    large: {
      container: { width: '200px', height: '60px' },
      logo: { height: '50px' },
      text: { fontSize: '24px' }
    }
  };

  const currentSize = sizes[size] || sizes.medium;

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: showText ? '10px' : '0',
        cursor: onClick ? 'pointer' : 'default',
        ...currentSize.container,
        ...style
      }}
      onClick={onClick}
    >
      {/* Logo da empresa */}
      <img 
        src="/logo-fitinbox.png" 
        alt="Fit In Box" 
        style={{
          height: currentSize.logo.height,
          width: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
        onError={(e) => {
          // Fallback caso a imagem não carregue
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      
      {/* Fallback emoji (caso logo não carregue) */}
      <div style={{
        fontSize: currentSize.logo.height,
        color: style.color || '#009245',
        fontWeight: 'bold',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        height: currentSize.logo.height,
        lineHeight: '1'
      }}>
        🍽️
      </div>
      
      {/* Texto */}
      {showText && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          lineHeight: '1.1'
        }}>
          <span style={{
            ...currentSize.text,
            fontWeight: 'bold',
            color: style.color || '#009245'
          }}>
            Fit In Box
          </span>
          <span style={{
            fontSize: `${parseInt(currentSize.text.fontSize) * 0.6}px`,
            color: style.color || '#666',
            fontWeight: 'normal'
          }}>
            Alimentação
          </span>
        </div>
      )}
    </div>
  );
};

export default LogoComponent;