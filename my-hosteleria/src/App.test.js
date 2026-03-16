import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('filters students and opens student detail page', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  expect(screen.getByRole('heading', { name: /visualitzar alumnes/i })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: /buscar alumnes/i }), {
    target: { value: 'sommelier' },
  });

  expect(screen.getByText(/júlia casas/i)).toBeInTheDocument();
  expect(screen.queryByText(/nil ferrer/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /ver detalles/i }));
  expect(screen.getByRole('heading', { name: /júlia casas/i })).toBeInTheDocument();
});

test('restaurants page contains map, filters list and opens detail page', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^restaurants$/i }));

  expect(screen.getByTitle(/mapa de restaurants joviat/i)).toBeInTheDocument();
  expect(screen.getByText(/restaurant escola joviat/i)).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: /buscar restaurants/i }), {
    target: { value: 'gastrobar' },
  });

  expect(screen.getByText(/joviat gastrobar/i)).toBeInTheDocument();
  expect(screen.queryByText(/restaurant escola joviat/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /ver detalles/i }));
  expect(screen.getByRole('heading', { name: /joviat gastrobar/i })).toBeInTheDocument();
});

test('logo uses logo_joviat.webp, goes back to home and mobile menu can open sidebar', () => {
  render(<App />);

  const logo = screen.getByAltText(/logo joviat/i);
  expect(logo).toHaveAttribute('src', expect.stringContaining('/logo_joviat.webp'));

  fireEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  fireEvent.click(screen.getByRole('button', { name: /ir al inicio/i }));

  expect(screen.getByRole('heading', { name: /benvinguts a hostaleria joviat/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /abrir barra lateral/i }));
  expect(screen.getByRole('button', { name: /cerrar barra lateral/i })).toBeInTheDocument();
});
