import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('shows header logo, toggles sidebar and renders students list', () => {
  render(<App />);

  expect(screen.getByAltText(/logo joviat/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /visualitzar alumnes/i })).toBeInTheDocument();
  expect(screen.getByText(/llistat d'alumnes/i)).toBeInTheDocument();

  const toggleButton = screen.getByRole('button', { name: /abrir barra lateral/i });
  fireEvent.click(toggleButton);

  expect(screen.getByRole('button', { name: /cerrar barra lateral/i })).toBeInTheDocument();
  expect(screen.getByText(/aina martí/i)).toBeInTheDocument();
});
