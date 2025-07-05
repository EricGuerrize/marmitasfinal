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
      icon: { fontSize: '24px' },
      text: { fontSize: '16px' }
    },
    medium: {
      container: { width: '160px', height: '50px' },
      icon: { fontSize: '32px' },
      text: { fontSize: '20px' }
    },
    large: {
      container: { width: '200px', height: '60px' },
      icon: { fontSize: '40px' },
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
      {/* Ícone/Logo */}
      <div style={{
        ...currentSize.icon,
        color: style.color || '#009245',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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