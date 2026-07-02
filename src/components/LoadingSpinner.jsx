import React from 'react';

// ─── Spinner de carregamento animado e reutilizável ─────────────────────────
// Substitui os emojis estáticos (🔄/⏳) por um anel girando de verdade.
// Uso:
//   <LoadingSpinner texto="Carregando pedidos..." />
//   <LoadingSpinner size={32} color="#009245" fullScreen={false} />

const LoadingSpinner = ({
  texto = 'Carregando...',
  size = 48,
  color = '#009245',
  fullScreen = true,
}) => {
  const border = Math.max(3, Math.round(size / 10));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        padding: '40px 20px',
        minHeight: fullScreen ? '60vh' : 'auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <style>{`
        @keyframes fitinboxSpin { to { transform: rotate(360deg); } }
        @keyframes fitinboxPulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>

      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `${border}px solid #e3e7ee`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'fitinboxSpin 0.8s linear infinite',
        }}
      />

      {texto && (
        <div
          style={{
            fontSize: '16px',
            color: '#555',
            fontWeight: 500,
            textAlign: 'center',
            animation: 'fitinboxPulse 1.5s ease-in-out infinite',
          }}
        >
          {texto}
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;
