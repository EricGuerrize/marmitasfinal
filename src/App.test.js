import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Fit In Box home page', () => {
  render(<App />);
  expect(screen.getAllByRole('img', { name: /fit in box/i }).length).toBeGreaterThan(0);
});
