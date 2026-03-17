import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('students show related restaurants and relation buttons navigate to restaurant detail', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  expect(screen.getAllByText(/restaurants:/i).length).toBeGreaterThan(0);

  fireEvent.click(screen.getAllByRole('button', { name: /ver detalles/i })[0]);
  expect(screen.getByRole('heading', { name: /aina martí/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /restaurant escola joviat/i }));
  expect(screen.getByRole('heading', { name: /restaurant escola joviat/i })).toBeInTheDocument();
});

test('restaurants show related students and relation buttons navigate to student detail', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^restaurants$/i }));
  expect(screen.getAllByText(/alumnes:/i).length).toBeGreaterThan(0);

  fireEvent.click(screen.getAllByRole('button', { name: /ver detalles/i })[0]);
  expect(screen.getByRole('heading', { name: /restaurant escola joviat/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /aina martí/i }));
  expect(screen.getByRole('heading', { name: /aina martí/i })).toBeInTheDocument();
});

test('logo uses logo_joviat.webp and mobile menu opens sidebar', () => {
  render(<App />);

  const logo = screen.getByAltText(/logo joviat/i);
  expect(logo).toHaveAttribute('src', expect.stringContaining('/logo_joviat.webp'));

  fireEvent.click(screen.getByRole('button', { name: /abrir barra lateral/i }));
  expect(screen.getByRole('button', { name: /cerrar barra lateral/i })).toBeInTheDocument();
});
