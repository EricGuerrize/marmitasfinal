// src/components/NotificationSystem.jsx
import React, { useState, useCallback, createContext, useContext } from 'react';

// Context para notificações
const NotificationContext = createContext();

/**
 * Hook para usar o sistema de notificações
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de NotificationProvider');
  }
  return context;
};

/**
 * Provider de notificações
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  /**
   * Adiciona uma nova notificação
   */
  const addNotification = useCallback((type, message, duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      type, // 'success', 'error', 'warning', 'info'
      message,
      duration,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, notification]);

    // Remove automaticamente após a duração especificada
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Remove uma notificação específica
   */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  /**
   * Limpa todas as notificações
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Funções de conveniência
   */
  const success = useCallback((message, duration) => {
    return addNotification('success', message, duration);
  }, [addNotification]);

  const error = useCallback((message, duration = 7000) => {
    return addNotification('error', message, duration);
  }, [addNotification]);

  const warning = useCallback((message, duration) => {
    return addNotification('warning', message, duration);
  }, [addNotification]);

  const info = useCallback((message, duration) => {
    return addNotification('info', message, duration);
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

/**
 * Container que renderiza as notificações
 */
const NotificationContainer = () => {
  const { notifications } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px'
    }}>
      {notifications.map(notification => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
        />
      ))}
    </div>
  );
};

/**
 * Item individual de notificação
 */
const NotificationItem = ({ notification }) => {
  const { removeNotification } = useNotification();

  const getNotificationStyle = (type) => {
    const baseStyle = {
      padding: '15px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: '1.4',
      position: 'relative',
      animation: 'slideIn 0.3s ease-out',
      maxWidth: '100%',
      wordBreak: 'break-word'
    };

    const styles = {
      success: {
        backgroundColor: '#d4edda',
        borderLeft: '4px solid #28a745',
        color: '#155724'
      },
      error: {
        backgroundColor: '#f8d7da',
        borderLeft: '4px solid #dc3545',
        color: '#721c24'
      },
      warning: {
        backgroundColor: '#fff3cd',
        borderLeft: '4px solid #ffc107',
        color: '#856404'
      },
      info: {
        backgroundColor: '#d1ecf1',
        borderLeft: '4px solid #17a2b8',
        color: '#0c5460'
      }
    };

    return { ...baseStyle, ...styles[type] };
  };

  const getIcon = (type) => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  };

  return (
    <div style={getNotificationStyle(notification.type)}>
      <div style={{ fontSize: '18px', flexShrink: 0 }}>
        {getIcon(notification.type)}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
        </div>
        <div>
          {notification.message}
        </div>
      </div>

      <button
        onClick={() => removeNotification(notification.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          color: 'inherit',
          opacity: 0.7,
          padding: '0',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        title="Fechar"
      >
        ✕
      </button>

      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

/**
 * Componente de botão para mostrar notificações de teste
 * (útil para desenvolvimento)
 */
export const NotificationTester = () => {
  const { success, error, warning, info, clearAll } = useNotification();

  const testNotifications = () => {
    success('Produto adicionado com sucesso!');
    setTimeout(() => error('Erro ao salvar produto'), 500);
    setTimeout(() => warning('Estoque baixo para alguns produtos'), 1000);
    setTimeout(() => info('Novo pedido recebido'), 1500);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      display: 'flex',
      gap: '10px',
      zIndex: 9998
    }}>
      <button
        onClick={testNotifications}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        🧪 Testar Notificações
      </button>
      
      <button
        onClick={clearAll}
        style={{
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        🗑️ Limpar Todas
      </button>
    </div>
  );
};