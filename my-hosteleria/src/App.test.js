import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('navigates between pages and allows logo back to home', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /benvinguts a hostaleria joviat/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  expect(screen.getByRole('heading', { name: /visualitzar alumnes/i })).toBeInTheDocument();
  expect(screen.getByText(/llistat d'alumnes/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /restaurants/i }));
  expect(screen.getByRole('heading', { name: /restaurants/i })).toBeInTheDocument();
  expect(screen.getByText(/restaurant escola joviat/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /mapa/i }));
  expect(screen.getByRole('heading', { name: /mapa de restaurants/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /ir al inicio/i }));
  expect(screen.getByRole('heading', { name: /benvinguts a hostaleria joviat/i })).toBeInTheDocument();
});

test('opens sidebar from menu button on mobile interaction', () => {
  render(<App />);

  const menuButton = screen.getByRole('button', { name: /abrir barra lateral/i });
  fireEvent.click(menuButton);

  expect(screen.getByRole('button', { name: /cerrar barra lateral/i })).toBeInTheDocument();
});
