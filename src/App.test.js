import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

test('renders the Fit In Box home page', () => {
  render(<App />);
  expect(screen.getAllByRole('img', { name: /fit in box/i }).length).toBeGreaterThan(0);
});

test('updates the URL when navigating to password recovery', async () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: /esqueci minha senha/i })[0]);

  expect(await screen.findByRole('heading', { name: /esqueceu sua senha/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/recuperar-senha');
});

test('renders a page directly from its URL', async () => {
  window.history.replaceState({}, '', '/recuperar-senha');
  render(<App />);

  expect(await screen.findByRole('heading', { name: /esqueceu sua senha/i })).toBeInTheDocument();
});
