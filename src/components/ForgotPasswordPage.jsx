import React, { useState, useEffect } from 'react';
import { firebaseAuthService } from '../services/firebaseAuthService';

const ForgotPasswordPage = ({ onNavigate }) => {
  const [etapa, setEtapa] = useState('cnpj'); // cnpj | enviado
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [mostrarEmail, setMostrarEmail] = useState(false);
  const [emailMascarado, setEmailMascarado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const formatarCnpj = (valor) => {
    const nums = valor.replace(/\D/g, '').slice(0, 14);
    return nums
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const enviarReset = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      setError('Digite um CNPJ válido com 14 dígitos');
      return;
    }
    if (mostrarEmail && !email.trim()) {
      setError('Digite seu email cadastrado');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await firebaseAuthService.resetPasswordByCnpj(cnpj, email);

      if (res.success) {
        setEmailMascarado(res.emailMascarado);
        setEtapa('enviado');
      } else {
        // Se o erro pede para informar o email, mostra o campo
        if (!mostrarEmail && res.error.includes('Informe seu email')) {
          setMostrarEmail(true);
          setError('Email não encontrado automaticamente. Digite seu email abaixo.');
        } else {
          setError(res.error);
        }
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px',
    border: '1px solid #ddd', borderRadius: '5px',
    fontSize: '16px', boxSizing: 'border-box'
  };

  const btnPrimary = (disabled) => ({
    backgroundColor: disabled ? '#ccc' : '#009245',
    color: 'white', border: 'none',
    padding: '15px', borderRadius: '5px',
    fontWeight: 'bold',
    cursor: disabled ? 'wait' : 'pointer',
    width: '100%', fontSize: '16px',
    marginBottom: '12px'
  });

  const btnSecondary = {
    backgroundColor: 'transparent', color: '#6c757d',
    border: '1px solid #6c757d', padding: '12px',
    borderRadius: '5px', fontWeight: 'bold',
    cursor: 'pointer', width: '100%', fontSize: '14px'
  };

  return (
    <div style={{ margin: 0, fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'white', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        padding: isMobile ? '15px' : '15px 40px',
        borderBottom: '1px solid #ccc'
      }}>
        <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 'bold', color: '#009245' }}>
          🍽️ Fit In Box
        </div>
        <button onClick={() => onNavigate('home')} style={btnSecondary}>
          Voltar ao Login
        </button>
      </div>

      {/* Card */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: 'calc(100vh - 80px)', padding: isMobile ? '15px' : '20px'
      }}>
        <div style={{
          backgroundColor: 'white', padding: isMobile ? '30px 20px' : '40px',
          borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          width: '100%', maxWidth: '460px'
        }}>

          {etapa === 'cnpj' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔐</div>
                <h2 style={{ color: '#009245', marginBottom: '8px' }}>Esqueceu sua senha?</h2>
                <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                  Digite seu CNPJ para receber o link de redefinição no email cadastrado.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  CNPJ da Empresa
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && !mostrarEmail && enviarReset()}
                  placeholder="00.000.000/0000-00"
                  style={inputStyle}
                />
              </div>

              {/* Campo de email — aparece se não encontrar automaticamente */}
              {mostrarEmail && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                    Seu Email Cadastrado
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && enviarReset()}
                    placeholder="empresa@exemplo.com"
                    autoFocus
                    style={inputStyle}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Digite o email que usou no cadastro
                  </small>
                </div>
              )}

              {error && (
                <div style={{
                  backgroundColor: '#f8d7da', color: '#721c24',
                  padding: '12px', borderRadius: '5px',
                  fontSize: '14px', marginBottom: '15px',
                  border: '1px solid #f5c6cb'
                }}>
                  {error}
                </div>
              )}

              <button onClick={enviarReset} disabled={loading} style={btnPrimary(loading)}>
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>

              <button onClick={() => onNavigate('home')} style={btnSecondary}>
                Voltar ao Login
              </button>
            </>
          )}

          {etapa === 'enviado' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📧</div>
              <h2 style={{ color: '#009245', marginBottom: '12px' }}>Email enviado!</h2>
              <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', marginBottom: '10px' }}>
                Enviamos um link de redefinição para:
              </p>
              <p style={{ color: '#009245', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px' }}>
                {emailMascarado}
              </p>
              <p style={{ color: '#666', fontSize: '13px', marginBottom: '30px', lineHeight: '1.5' }}>
                Verifique sua caixa de entrada (e a pasta de spam).<br />
                O link expira em <strong>1 hora</strong>.
              </p>
              <button onClick={() => onNavigate('home')} style={btnPrimary(false)}>
                Voltar ao Login
              </button>
              <button
                onClick={() => { setEtapa('cnpj'); setError(''); setCnpj(''); setEmail(''); setMostrarEmail(false); }}
                style={btnSecondary}
              >
                Tentar outro CNPJ
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
