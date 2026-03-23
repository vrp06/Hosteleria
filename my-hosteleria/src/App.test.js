import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

let mockFirebaseEnabled = false;

jest.mock('./firebase', () => ({
  getFirebaseConfig: () => ({
    apiKey: 'test-api-key',
    projectId: 'test-project',
    alumnesCollection: 'alumnes',
    restaurantsCollection: 'restaurants',
  }),
  get hasFirebaseConfig() {
    return mockFirebaseEnabled;
  },
}));

afterEach(() => {
  mockFirebaseEnabled = false;
  jest.restoreAllMocks();
});

test('students and restaurants keep bidirectional relation navigation', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  fireEvent.click(screen.getAllByRole('button', { name: /ver detalles/i })[0]);
  expect(screen.getByRole('heading', { name: /aina martí/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /restaurant escola joviat/i }));
  expect(screen.getByRole('heading', { name: /restaurant escola joviat/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /retroceder/i }));
  expect(screen.getByRole('heading', { name: /aina martí/i })).toBeInTheDocument();
});

test('login tab renders and can switch to logout when firebase auth succeeds', async () => {
  mockFirebaseEnabled = true;
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (String(url).includes('identitytoolkit')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          email: 'demo@test.com',
          idToken: 'token',
          localId: 'uid-1',
        }),
      });
    }

    return Promise.resolve({ ok: false, json: async () => ({}) });
  });

  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'demo@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});

test('logo uses logo_joviat.webp and mobile menu opens sidebar', () => {
  render(<App />);

  const logo = screen.getByAltText(/logo joviat/i);
  expect(logo).toHaveAttribute('src', expect.stringContaining('/logo_joviat.webp'));

  fireEvent.click(screen.getByRole('button', { name: /abrir barra lateral/i }));
  expect(screen.getByRole('button', { name: /cerrar barra lateral/i })).toBeInTheDocument();
});
