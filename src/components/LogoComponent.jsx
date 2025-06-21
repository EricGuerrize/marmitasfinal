// src/components/LogoComponent.jsx
import React from 'react';

/**
 * Componente para exibir o logo da Fit In Box
 * Inclui fallback para emoji se a imagem não carregar
 */
const LogoComponent = ({ 
  size = 'medium', 
  showText = true, 
  style = {},
  onClick = null 
}) => {
  const sizes = {
    small: { height: '40px', fontSize: '20px' },
    medium: { height: '60px', fontSize: '24px' },
    large: { height: '80px', fontSize: '32px' }
  };

  const logoStyle = {
    ...sizes[size],
    ...style,
    cursor: onClick ? 'pointer' : 'default'
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#009245',
        fontWeight: 'bold',
        ...logoStyle
      }}
      onClick={onClick}
    >
      {/* Tenta carregar a imagem primeiro */}
      <img 
        src="/assets/logo.jpg" 
        alt="Fit In Box"
        style={{ 
          height: logoStyle.height,
          width: 'auto',
          objectFit: 'contain'
        }}
        onError={(e) => {
          // Se a imagem falhar, substitui por emoji
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'inline';
        }}
      />
      
      {/* Fallback emoji (inicialmente oculto) */}
      <span 
        style={{ 
          fontSize: logoStyle.fontSize,
          display: 'none' // Só aparece se a imagem falhar
        }}
      >
        🍽️
      </span>
      
      {/* Texto do logo */}
      {showText && (
        <span style={{ fontSize: logoStyle.fontSize }}>
          Fit In Box
        </span>
      )}
    </div>
  );
};

export default LogoComponent;

// ===== ATUALIZAÇÕES NO HOMEPAGE =====
// src/components/HomePage.jsx - Adicionar link para "Esqueci minha senha"

// No final do form de login, após o botão ENTRAR, adicionar:

/*
<div style={{ 
  marginTop: '15px', 
  textAlign: 'center',
  fontSize: '14px',
  color: '#666'
}}>
  {modo === 'login' && (
    <>
      <button 
        onClick={() => onNavigate('forgot-password')}
        style={{
          background: 'none',
          border: 'none',
          color: '#009245',
          textDecoration: 'underline',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Esqueci minha senha
      </button>
      <br />
      <br />
    </>
  )}
  
  {modo === 'login' ? (
    <>
      Não tem conta? 
      <button 
        onClick={() => setModo('cadastro')}
        style={{
          background: 'none',
          border: 'none',
          color: '#009245',
          textDecoration: 'underline',
          cursor: 'pointer',
          marginLeft: '5px'
        }}
      >
        Cadastre-se
      </button>
    </>
  ) : (
    <>
      Já tem conta? 
      <button 
        onClick={() => setModo('login')}
        style={{
          background: 'none',
          border: 'none',
          color: '#009245',
          textDecoration: 'underline',
          cursor: 'pointer',
          marginLeft: '5px'
        }}
      >
        Entrar
      </button>
    </>
  )}
</div>
*/

// ===== ATUALIZAÇÃO NO APP.JS =====
// Adicionar rota para esqueci-senha:

/*
case 'forgot-password':
  return <ForgotPasswordPage onNavigate={navigate} />;

case 'consultar-pedido':
  return <ConsultaPedidosPage onNavigate={navigate} />;
*/

// ===== SUPABASE SCHEMA =====
// SQL para criar tabelas necessárias no Supabase:

const supabaseSchema = `
-- Tabela para tokens de reset de senha
CREATE TABLE password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  metodo VARCHAR(50) NOT NULL, -- 'sms', 'perguntas'
  telefone VARCHAR(20),
  dados_verificacao JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pedidos aprimorada
CREATE TABLE pedidos (
  id BIGSERIAL PRIMARY KEY,
  numero INTEGER UNIQUE NOT NULL,
  empresa_cnpj VARCHAR(18) NOT NULL,
  empresa_nome VARCHAR(255) NOT NULL,
  itens JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  taxa_entrega DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  endereco_entrega TEXT NOT NULL,
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'enviado',
  metodo_pagamento VARCHAR(50) DEFAULT 'pix',
  previsao_entrega TIMESTAMP WITH TIME ZONE,
  data_pedido TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notas JSONB DEFAULT '[]'::jsonb,
  origem VARCHAR(20) DEFAULT 'sistema'
);

-- Índices para performance
CREATE INDEX idx_password_reset_tokens_empresa_id ON password_reset_tokens(empresa_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_pedidos_empresa_cnpj ON pedidos(empresa_cnpj);
CREATE INDEX idx_pedidos_numero ON pedidos(numero);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_data_pedido ON pedidos(data_pedido);

-- RLS (Row Level Security) policies
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Empresas podem acessar seus próprios tokens" ON password_reset_tokens
  FOR ALL USING (empresa_id IN (
    SELECT id FROM empresas WHERE cnpj = current_setting('app.current_user_cnpj', true)
  ));

CREATE POLICY "Empresas podem acessar seus próprios pedidos" ON pedidos
  FOR ALL USING (empresa_cnpj = current_setting('app.current_user_cnpj', true));

-- Função para limpar tokens expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < NOW() OR usado = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para log de tentativas de login (já existe, melhorada)
CREATE OR REPLACE FUNCTION log_tentativa_login(
  p_cnpj VARCHAR(14),
  p_ip_address INET,
  p_sucesso BOOLEAN,
  p_motivo_falha TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO login_attempts (
    cnpj,
    ip_address,
    sucesso,
    motivo_falha,
    timestamp
  ) VALUES (
    p_cnpj,
    p_ip_address,
    p_sucesso,
    p_motivo_falha,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

// ===== INTEGRAÇÃO COM SMS (Para produção) =====
// Exemplo de integração com Twilio para SMS real:

const twilioIntegration = `
// src/services/smsService.js
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export const smsService = {
  async enviarSMS(telefone, mensagem) {
    try {
      const message = await client.messages.create({
        body: mensagem,
        from: fromNumber,
        to: telefone
      });
      
      return {
        success: true,
        messageId: message.sid
      };
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  async enviarCodigoVerificacao(telefone, codigo) {
    const mensagem = \`Fit In Box - Seu código de verificação é: \${codigo}. Válido por 10 minutos. Não compartilhe este código.\`;
    return this.enviarSMS(telefone, mensagem);
  }
};
`;

// ===== ARQUIVO DE CONFIGURAÇÃO =====
// .env.example
const envExample = `
# Supabase
REACT_APP_SUPABASE_URL=https://yzzyrbpjefiprdnzfvrj.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# SMS (Twilio) - Para produção
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+5511999999999

# API Externa de CNPJ
CNPJ_API_KEY=your_api_key

# Configurações gerais
REACT_APP_ENVIRONMENT=development
REACT_APP_WHATSAPP_NUMBER=5565992556938
REACT_APP_PEDIDO_MINIMO=30
`;

export { LogoComponent, supabaseSchema, twilioIntegration, envExample };