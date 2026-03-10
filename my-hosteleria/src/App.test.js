import { render, screen } from '@testing-library/react';
import App from './App';

test('renders visualitzar alumnes section', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /visualitzar alumnes/i })).toBeInTheDocument();
  expect(screen.getByText(/llistat d'alumnes/i)).toBeInTheDocument();
  expect(screen.getByText(/maria soler/i)).toBeInTheDocument();
});
