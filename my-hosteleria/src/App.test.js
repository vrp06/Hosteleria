import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

let mockFirebaseEnabled = false;

const alumnesPayload = {
  documents: [
    {
      name: 'projects/test-project/databases/(default)/documents/alumnes/1',
      fields: {
        nom: { stringValue: 'Aina Martí' },
        rol: { stringValue: 'Cap de sala' },
        imatge: { stringValue: 'https://example.com/aina.jpg' },
        bio: { stringValue: 'Coordina el servei de sala.' },
        restaurantsIds: { arrayValue: { values: [{ stringValue: '1' }, { stringValue: '2' }] } },
      },
    },
  ],
};

const restaurantsPayload = {
  documents: [
    {
      name: 'projects/test-project/databases/(default)/documents/restaurants/1',
      fields: {
        nom: { stringValue: 'Restaurant Escola Joviat' },
        especialitat: { stringValue: 'Cuina catalana' },
        adreca: { stringValue: 'Manresa' },
        descripcio: { stringValue: 'Espai formatiu principal.' },
        alumnesIds: { arrayValue: { values: [{ stringValue: '1' }] } },
      },
    },
    {
      name: 'projects/test-project/databases/(default)/documents/restaurants/2',
      fields: {
        nom: { stringValue: 'Joviat Gastrobar' },
        especialitat: { stringValue: 'Tapes creatives' },
        adreca: { stringValue: 'Manresa Centre' },
        descripcio: { stringValue: 'Restaurant de pràctiques.' },
        alumnesIds: { arrayValue: { values: [{ stringValue: '1' }] } },
      },
    },
  ],
};

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

test('students and restaurants are loaded from firebase and keep bidirectional relation navigation', async () => {
  mockFirebaseEnabled = true;
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (String(url).includes('/alumnes?')) {
      return Promise.resolve({ ok: true, json: async () => alumnesPayload });
    }

    if (String(url).includes('/restaurants?')) {
      return Promise.resolve({ ok: true, json: async () => restaurantsPayload });
    }

    return Promise.resolve({ ok: false, json: async () => ({}) });
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText(/font de dades: firebase/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /aina martí/i })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /ver detalles/i }));
  expect(screen.getByRole('heading', { name: /aina martí/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /restaurant escola joviat/i }));
  expect(screen.getByRole('heading', { name: /restaurant escola joviat/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /retroceder/i }));
  expect(screen.getByRole('heading', { name: /aina martí/i })).toBeInTheDocument();
});

test('shows server connection error when firebase returns no data', async () => {
  mockFirebaseEnabled = true;
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (String(url).includes('/alumnes?') || String(url).includes('/restaurants?')) {
      return Promise.resolve({ ok: true, json: async () => ({ documents: [] }) });
    }

    return Promise.resolve({ ok: false, json: async () => ({}) });
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText(/error de conexión con el servidor/i)).toBeInTheDocument();
  });
});

test('login tab renders and can switch to logout when firebase auth succeeds', async () => {
  mockFirebaseEnabled = true;
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (String(url).includes('/alumnes?')) {
      return Promise.resolve({ ok: true, json: async () => alumnesPayload });
    }

    if (String(url).includes('/restaurants?')) {
      return Promise.resolve({ ok: true, json: async () => restaurantsPayload });
    }

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

  await waitFor(() => {
    expect(screen.getByText(/font de dades: firebase/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'demo@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});

test('logo uses logo_joviat.webp and mobile menu opens sidebar', async () => {
  mockFirebaseEnabled = true;
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (String(url).includes('/alumnes?')) {
      return Promise.resolve({ ok: true, json: async () => alumnesPayload });
    }

    if (String(url).includes('/restaurants?')) {
      return Promise.resolve({ ok: true, json: async () => restaurantsPayload });
    }

    return Promise.resolve({ ok: false, json: async () => ({}) });
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText(/font de dades: firebase/i)).toBeInTheDocument();
  });

  const logo = screen.getByAltText(/logo joviat/i);
  expect(logo).toHaveAttribute('src', expect.stringContaining('/logo_joviat.webp'));

  fireEvent.click(screen.getByRole('button', { name: /abrir barra lateral/i }));
  expect(screen.getByRole('button', { name: /cerrar barra lateral/i })).toBeInTheDocument();
});
