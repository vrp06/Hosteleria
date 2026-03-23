import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

let mockFirebaseEnabled = false;

const alumniPayload = {
  documents: [
    {
      name: 'projects/test-project/databases/(default)/documents/Alumni/alumni-1',
      fields: {
        Name: { stringValue: 'Aina Martí' },
        Status: { stringValue: 'Disponible' },
        email: { stringValue: 'aina@test.com' },
      },
    },
  ],
};

const restaurantPayload = {
  documents: [
    {
      name: 'projects/test-project/databases/(default)/documents/Restaurant/rest-1',
      fields: {
        name: { stringValue: 'Restaurant Escola Joviat' },
        Address: { stringValue: 'Manresa' },
        location: { geoPointValue: { latitude: 41.72, longitude: 1.82 } },
      },
    },
  ],
};

const relationPayload = {
  documents: [
    {
      name: 'projects/test-project/databases/(default)/documents/Rest-Alum/relation-1',
      fields: {
        current_job: { booleanValue: true },
        id_alumni: {
          referenceValue: 'projects/test-project/databases/(default)/documents/Alumni/alumni-1',
        },
        id_restaurant: {
          referenceValue: 'projects/test-project/databases/(default)/documents/Restaurant/rest-1',
        },
        rol: { stringValue: 'Cap de sala' },
      },
    },
  ],
};

const administratorPayload = {
  documents: [
    {
      name: 'projects/test-project/databases/(default)/documents/Administrator/admin-1',
      fields: {
        Email: { stringValue: 'admin@test.com' },
      },
    },
  ],
};

jest.mock('./firebase', () => ({
  getFirebaseConfig: () => ({
    apiKey: 'test-api-key',
    projectId: 'test-project',
    administratorCollection: 'Administrator',
    alumniCollection: 'Alumni',
    restAlumCollection: 'Rest-Alum',
    restaurantCollection: 'Restaurant',
  }),
  get hasFirebaseConfig() {
    return mockFirebaseEnabled;
  },
}));

afterEach(() => {
  mockFirebaseEnabled = false;
  jest.restoreAllMocks();
});

const mockFirebaseFetch = () =>
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (String(url).includes('/Alumni?')) {
      return Promise.resolve({ ok: true, json: async () => alumniPayload });
    }

    if (String(url).includes('/Restaurant?')) {
      return Promise.resolve({ ok: true, json: async () => restaurantPayload });
    }

    if (String(url).includes('/Rest-Alum?')) {
      return Promise.resolve({ ok: true, json: async () => relationPayload });
    }

    if (String(url).includes('/Administrator?')) {
      return Promise.resolve({ ok: true, json: async () => administratorPayload });
    }

    return Promise.resolve({ ok: false, json: async () => ({}) });
  });

test('students and restaurants are loaded from firebase, use default images and keep bidirectional relation navigation', async () => {
  mockFirebaseEnabled = true;
  mockFirebaseFetch();

  render(<App />);

  await waitFor(() => {
    expect(screen.queryByText(/font de dades: firebase/i)).not.toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /aina martí/i })).toBeInTheDocument();
  });

  expect(screen.getByAltText(/aina martí/i)).toHaveAttribute('src', expect.stringContaining('/user_default'));

  fireEvent.click(screen.getByRole('button', { name: /ver detalles/i }));
  expect(screen.getByRole('heading', { name: /aina martí/i })).toBeInTheDocument();
  expect(screen.getByAltText(/restaurant escola joviat/i)).toHaveAttribute(
    'src',
    expect.stringContaining('/restaurant_default')
  );

  fireEvent.click(screen.getByRole('button', { name: /ver detalles/i }));
  expect(screen.getByRole('heading', { name: /restaurant escola joviat/i })).toBeInTheDocument();
  expect(screen.getByTitle(/mapa de restaurant escola joviat/i)).toBeInTheDocument();
});

test('shows local badge and server connection error when firebase returns no data', async () => {
  mockFirebaseEnabled = true;
  jest.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({ ok: true, json: async () => ({ documents: [] }) })
  );

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText(/error de conexión con el servidor/i)).toBeInTheDocument();
  });

  expect(screen.getByText(/font de dades: local/i)).toBeInTheDocument();
});

test('login tab renders and can switch to logout when administrator email exists', async () => {
  mockFirebaseEnabled = true;
  mockFirebaseFetch();

  render(<App />);

  await waitFor(() => {
    expect(screen.queryByText(/cargando datos desde firebase/i)).not.toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  fireEvent.change(screen.getByLabelText(/email administrador/i), {
    target: { value: 'admin@test.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});

test('logo uses logo_joviat.webp, mobile menu opens sidebar and dark mode toggle works', async () => {
  mockFirebaseEnabled = true;
  mockFirebaseFetch();

  const { container } = render(<App />);

  await waitFor(() => {
    expect(screen.queryByText(/font de dades: firebase/i)).not.toBeInTheDocument();
  });

  const logo = screen.getByAltText(/logo joviat/i);
  expect(logo).toHaveAttribute('src', expect.stringContaining('/logo_joviat.webp'));

  fireEvent.click(screen.getByRole('button', { name: /abrir barra lateral/i }));
  expect(screen.getByRole('button', { name: /cerrar barra lateral/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /activar modo oscuro/i }));
  expect(container.querySelector('.app-layout')).toHaveClass('dark-mode');
});
