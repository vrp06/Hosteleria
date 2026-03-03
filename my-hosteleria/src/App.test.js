import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('shows header logo and toggles sidebar', () => {
  render(<App />);

  expect(screen.getByAltText(/logo joviat/i)).toBeInTheDocument();

  const toggleButton = screen.getByRole('button', { name: /abrir barra lateral/i });
  fireEvent.click(toggleButton);

  expect(screen.getByRole('button', { name: /cerrar barra lateral/i })).toBeInTheDocument();
});
