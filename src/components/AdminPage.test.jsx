import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminPage from './AdminPage';
import {
  getAggregateFromServer, getCountFromServer, limit as firestoreLimit, onSnapshot
} from 'firebase/firestore';

jest.mock('../services/firebaseAuthService', () => ({
  firebaseAuthService: {
    verificarSessao: jest.fn(),
    listarEmpresas: jest.fn().mockResolvedValue([]),
    logout: jest.fn()
  }
}));

jest.mock('../services/produtoService', () => ({
  produtoService: {}
}));

jest.mock('../services/pedidoService', () => ({
  pedidoService: {}
}));

jest.mock('../services/firebaseConfig', () => ({ db: {} }));
jest.mock('./ImageUpload', () => () => null);
jest.mock('../hooks/useWindowSize', () => ({
  useWindowSize: () => ({ isMobile: false })
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, name) => ({ name })),
  query: jest.fn((ref, ...constraints) => ({ ref, constraints })),
  orderBy: jest.fn(() => ({ type: 'orderBy' })),
  where: jest.fn(() => ({ type: 'where' })),
  limit: jest.fn(() => ({ type: 'limit' })),
  startAfter: jest.fn(() => ({ type: 'startAfter' })),
  getDocs: jest.fn(),
  getCountFromServer: jest.fn(() => Promise.resolve({ data: () => ({ count: 0 }) })),
  getAggregateFromServer: jest.fn(() => Promise.resolve({ data: () => ({ totalVendas: 0 }) })),
  sum: jest.fn(() => ({ type: 'sum' })),
  Timestamp: { fromDate: jest.fn(date => date) },
  onSnapshot: jest.fn((queryRef, onNext) => {
    onNext({ docs: [], size: 0 });
    return jest.fn();
  })
}));

beforeEach(() => {
  getCountFromServer.mockImplementation(() => Promise.resolve({ data: () => ({ count: 0 }) }));
  getAggregateFromServer.mockImplementation(() => Promise.resolve({ data: () => ({ totalVendas: 0 }) }));
  onSnapshot.mockImplementation((queryRef, onNext) => {
    onNext({ docs: [], size: 0 });
    return jest.fn();
  });
});

test('loads dashboard metrics without opening collection listeners', async () => {
  sessionStorage.setItem('adminPreAuthenticated', JSON.stringify({ timestamp: Date.now() }));
  const onNavigate = jest.fn();

  const { rerender } = render(<AdminPage onNavigate={onNavigate} />);

  expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  expect(onSnapshot).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /pedidos/i }));
  expect(onNavigate).toHaveBeenCalledWith('admin-pedidos');

  // Simula a URL atualizada pelo roteador.
  rerender(<AdminPage onNavigate={onNavigate} initialTab="pedidos" />);
  await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
  expect(firestoreLimit).toHaveBeenCalledWith(30);
});
