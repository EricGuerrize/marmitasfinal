// src/components/ForgotPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { passwordResetService } from '../services/passwordResetService';
import { cnpjService } from '../services/cnpjService';

const ForgotPasswordPage = ({ onNavigate }) => {
  const [etapa, setEtapa] = useState('metodo'); // metodo, sms, perguntas, sucesso
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [perguntas, setPerguntas] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [empresaId, setEmpresaId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metodoEscolhido, setMetodoEscolhido] = useState('');
  const [telefoneMascarado, setTelefoneMascarado] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCnpjChange = (e) => {
    const maskedValue = cnpjService.aplicarMascaraCnpj(e.target.value);
    setCnpj(maskedValue);
    setError('');
  };

  const handleTelefoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
    setTelefone(formatted);
  };

  const iniciarResetSMS = async () => {
    if (!cnpj.trim()) {
      setError('Por favor, informe o CNPJ');
      return;
    }
    
    if (!telefone.trim()) {
      setError('Por favor, informe o telefone');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resultado = await passwordResetService.iniciarResetPorSMS(cnpj, telefone);
      
      if (resultado.success) {
        setTelefoneMascarado(resultado.maskedPhone);
        setMetodoEscolhido('sms');
        setEtapa('sms');
      } else {
        setError(resultado.error);
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarResetPerguntas = async () => {
    if (!cnpj.trim()) {
      setError('Por favor, informe o CNPJ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resultado = await passwordResetService.iniciarResetPorPerguntas(cnpj);
      
      if (resultado.success) {
        setPerguntas(resultado.perguntas);
        setEmpresaId(resultado.empresaId);
        setMetodoEscolhido('perguntas');
        setEtapa('perguntas');
        
        // Inicializa respostas vazias
        const respostasIniciais = {};
        resultado.perguntas.forEach(p => {
          respostasIniciais[p.id] = '';
        });
        setRespostas(respostasIniciais);
      } else {
        setError(resultado.error);
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmarCodigoSMS = async () => {
    if (!codigo.trim()) {
      setError('Por favor, informe o código recebido');
      return;
    }
    
    if (!novaSenha || novaSenha.length < 6) {
      setError('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      setError('Senhas não conferem');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resultado = await passwordResetService.confirmarResetPorSMS(cnpj, codigo, novaSenha);
      
      if (resultado.success) {
        setEtapa('sucesso');
      } else {
        setError(resultado.error);
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmarPerguntas = async () => {
    // Verifica se todas as perguntas foram respondidas
    const respostasArray = perguntas.map(p => ({
      id: p.id,
      resposta: respostas[p.id]?.trim()
    }));
    
    const respostasVazias = respostasArray.filter(r => !r.resposta);
    if (respostasVazias.length > 0) {
      setError('Por favor, responda todas as perguntas');
      return;
    }
    
    if (!novaSenha || novaSenha.length < 6) {
      setError('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      setError('Senhas não conferem');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resultado = await passwordResetService.confirmarResetPorPerguntas(
        empresaId, 
        respostasArray, 
        novaSenha
      );
      
      if (resultado.success) {
        setEtapa('sucesso');
      } else {
        setError(resultado.error);
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const voltarEtapa = () => {
    setError('');
    if (etapa === 'sms' || etapa === 'perguntas') {
      setEtapa('metodo');
      setMetodoEscolhido('');
    } else {
      onNavigate('home');
    }
  };

  const irParaLogin = () => {
    onNavigate('home');
  };

  return (
    <div style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '15px' : '15px 40px',
        borderBottom: '1px solid #ccc'
      }}>
        <div style={{ 
          fontSize: isMobile ? '24px' : '32px', 
          fontWeight: 'bold', 
          color: '#009245' 
        }}>
          🍽️ Fit In Box
        </div>
        <button 
          onClick={() => onNavigate('home')}
          style={{
            backgroundColor: '#009245',
            color: 'white',
            border: 'none',
            padding: isMobile ? '8px 15px' : '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: isMobile ? '14px' : '16px'
          }}
        >
          Voltar ao Login
        </button>
      </div>

      {/* Container Principal */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: isMobile ? '15px' : '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '30px 20px' : '40px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '500px'
        }}>
          {/* Etapa: Escolher Método */}
          {etapa === 'metodo' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Esqueceu sua senha?
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Escolha como você gostaria de redefinir sua senha
                </p>
              </div>

              {/* CNPJ comum para ambos métodos */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold' 
                }}>
                  CNPJ da Empresa
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength="18"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Método SMS */}
              <div style={{
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: '#f8f9fa'
              }}>
                <h3 style={{ color: '#009245', margin: '0 0 15px 0' }}>
                  📱 Verificação por SMS
                </h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Receba um código no telefone cadastrado da empresa
                </p>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    Telefone da Empresa
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    placeholder="(11) 99999-9999"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <button
                  onClick={iniciarResetSMS}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#ccc' : '#25D366',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    cursor: loading ? 'wait' : 'pointer',
                    width: '100%',
                    fontSize: '14px'
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar Código SMS'}
                </button>
              </div>

              {/* Método Perguntas */}
              <div style={{
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: '#f8f9fa'
              }}>
                <h3 style={{ color: '#009245', margin: '0 0 15px 0' }}>
                  ❓ Perguntas de Segurança
                </h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Responda perguntas baseadas nos dados da sua empresa
                </p>
                
                <button
                  onClick={iniciarResetPerguntas}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    cursor: loading ? 'wait' : 'pointer',
                    width: '100%',
                    fontSize: '14px'
                  }}
                >
                  {loading ? 'Carregando...' : 'Usar Perguntas de Segurança'}
                </button>
              </div>

              {error && (
                <div style={{
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  padding: '12px',
                  borderRadius: '5px',
                  fontSize: '14px',
                  marginTop: '15px',
                  border: '1px solid #f5c6cb'
                }}>
                  {error}
                </div>
              )}
            </>
          )}

          {/* Etapa: Verificação SMS */}
          {etapa === 'sms' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Código Enviado!
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Digite o código de 6 dígitos enviado para<br />
                  <strong>{telefoneMascarado}</strong>
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold' 
                }}>
                  Código de Verificação
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '18px',
                    textAlign: 'center',
                    letterSpacing: '3px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold' 
                }}>
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold' 
                }}>
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Digite novamente sua nova senha"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                backgroundColor: '#fff3cd',
                padding: '12px',
                borderRadius: '5px',
                fontSize: '12px',
                color: '#856404',
                marginBottom: '20px',
                border: '1px solid #ffeaa7'
              }}>
                ⏱️ <strong>Código válido por 10 minutos</strong><br />
                Não recebeu? Verifique se o telefone está correto e tente novamente.
              </div>

              <button
                onClick={confirmarCodigoSMS}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '15px',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer',
                  width: '100%',
                  fontSize: '16px',
                  marginBottom: '10px'
                }}
              >
                {loading ? 'Alterando senha...' : 'Alterar Senha'}
              </button>

              <button
                onClick={voltarEtapa}
                style={{
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #6c757d',
                  padding: '12px',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '14px'
                }}
              >
                Voltar
              </button>

              {error && (
                <div style={{
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  padding: '12px',
                  borderRadius: '5px',
                  fontSize: '14px',
                  marginTop: '15px',
                  border: '1px solid #f5c6cb'
                }}>
                  {error}
                </div>
              )}
            </>
          )}

          {/* Etapa: Perguntas de Segurança */}
          {etapa === 'perguntas' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>❓</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Perguntas de Segurança
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Responda as perguntas baseadas nos dados da sua empresa<br />
                  <strong>Necessário acertar pelo menos 2 de 3 perguntas</strong>
                </p>
              </div>

              {perguntas.map((pergunta, index) => (
                <div key={pergunta.id} style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#009245'
                  }}>
                    {index + 1}. {pergunta.pergunta}
                  </label>
                  <input
                    type="text"
                    value={respostas[pergunta.id] || ''}
                    onChange={(e) => setRespostas({
                      ...respostas,
                      [pergunta.id]: e.target.value
                    })}
                    placeholder="Digite sua resposta"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {pergunta.dica && (
                    <small style={{ color: '#666', fontSize: '12px' }}>
                      💡 {pergunta.dica}
                    </small>
                  )}
                </div>
              ))}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold' 
                }}>
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold' 
                }}>
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Digite novamente sua nova senha"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                backgroundColor: '#e7f3ff',
                padding: '12px',
                borderRadius: '5px',
                fontSize: '12px',
                color: '#0066cc',
                marginBottom: '20px',
                border: '1px solid #b3d9ff'
              }}>
                🔐 <strong>Dicas de Segurança:</strong><br />
                • As respostas são baseadas nos dados oficiais da empresa<br />
                • Digite exatamente como aparece nos documentos<br />
                • Atenção a acentos e maiúsculas/minúsculas
              </div>

              <button
                onClick={confirmarPerguntas}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '15px',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer',
                  width: '100%',
                  fontSize: '16px',
                  marginBottom: '10px'
                }}
              >
                {loading ? 'Verificando...' : 'Alterar Senha'}
              </button>

              <button
                onClick={voltarEtapa}
                style={{
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #6c757d',
                  padding: '12px',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '14px'
                }}
              >
                Voltar
              </button>

              {error && (
                <div style={{
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  padding: '12px',
                  borderRadius: '5px',
                  fontSize: '14px',
                  marginTop: '15px',
                  border: '1px solid #f5c6cb'
                }}>
                  {error}
                </div>
              )}
            </>
          )}

          {/* Etapa: Sucesso */}
          {etapa === 'sucesso' && (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
                <h2 style={{ color: '#28a745', marginBottom: '15px' }}>
                  Senha Alterada com Sucesso!
                </h2>
                <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
                  Sua senha foi redefinida com segurança.<br />
                  Agora você pode fazer login com a nova senha.
                </p>

                <div style={{
                  backgroundColor: '#d4edda',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '25px',
                  border: '1px solid #c3e6cb'
                }}>
                  <div style={{ color: '#155724', fontSize: '14px' }}>
                    <strong>🔐 Para sua segurança:</strong><br />
                    • Sua senha anterior foi invalidada<br />
                    • Use sempre senhas únicas e seguras<br />
                    • Não compartilhe suas credenciais<br />
                    • Faça logout ao sair de computadores públicos
                  </div>
                </div>

                <button
                  onClick={irParaLogin}
                  style={{
                    backgroundColor: '#009245',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '16px',
                    width: '100%'
                  }}
                >
                  Ir para Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;