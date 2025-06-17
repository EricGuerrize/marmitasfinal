// src/components/ImageUpload.jsx
import React, { useState, useRef } from 'react';

/**
 * Componente reutilizável para upload de imagens
 */
const ImageUpload = ({ 
  onImageUpload, 
  currentImage = '', 
  placeholder = 'Clique para fazer upload ou digite uma URL',
  maxSize = 5, // MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  preview = true,
  previewSize = { width: '120px', height: '80px' }
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImage);
  const fileInputRef = useRef(null);

  /**
   * Processa o arquivo de imagem
   */
  const processFile = async (file) => {
    try {
      // Validações
      if (!acceptedTypes.includes(file.type)) {
        throw new Error(`Tipo de arquivo não suportado. Use: ${acceptedTypes.join(', ')}`);
      }

      if (file.size > maxSize * 1024 * 1024) {
        throw new Error(`Arquivo muito grande. Máximo ${maxSize}MB`);
      }

      setUploading(true);

      // Converte para base64 ou URL (simula upload)
      const base64 = await convertToBase64(file);
      
      // Simula delay de upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setImageUrl(base64);
      
      if (onImageUpload) {
        onImageUpload(base64);
      }

    } catch (error) {
      alert(`Erro no upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Converte arquivo para base64
   */
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handlers de eventos
   */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setImageUrl(url);
    
    if (onImageUpload) {
      onImageUpload(url);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setImageUrl('');
    if (onImageUpload) {
      onImageUpload('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Input de URL */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px', 
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          URL da Imagem
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={handleUrlChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Área de Upload */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px', 
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          Ou faça upload de uma imagem
        </label>
        
        <div
          style={{
            border: `2px dashed ${dragOver ? '#007bff' : '#ddd'}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: dragOver ? '#f8f9ff' : '#fafafa',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'all 0.3s ease'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={uploading}
          />

          {uploading ? (
            <div>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
              <div style={{ color: '#007bff', fontWeight: 'bold' }}>
                Fazendo upload...
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📁</div>
              <div style={{ color: '#666', marginBottom: '5px' }}>
                Clique aqui ou arraste uma imagem
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                Formatos aceitos: JPG, PNG, WebP, GIF (máx. {maxSize}MB)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview da Imagem */}
      {preview && imageUrl && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            Preview
          </label>
          
          <div style={{
            position: 'relative',
            display: 'inline-block'
          }}>
            <img
              src={imageUrl}
              alt="Preview"
              style={{
                width: previewSize.width,
                height: previewSize.height,
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            
            {/* Botão para remover imagem */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Remover imagem"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Informações sobre os tipos aceitos */}
      <div style={{
        fontSize: '12px',
        color: '#666',
        backgroundColor: '#f8f9fa',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #e9ecef'
      }}>
        <strong>💡 Dicas:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Para melhor qualidade, use imagens com resolução mínima de 300x200px</li>
          <li>Formatos recomendados: JPG ou PNG</li>
          <li>Você pode inserir uma URL ou fazer upload de um arquivo</li>
          <li>Imagens muito grandes serão redimensionadas automaticamente</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;