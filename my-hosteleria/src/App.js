import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { getFirebaseConfig, hasFirebaseConfig } from './firebase';

const baseNavItems = [
  { key: 'inici', label: 'Inici' },
  { key: 'alumnes', label: 'Visualitzar Alumnes' },
  { key: 'restaurants', label: 'Restaurants' },
];

const firestoreString = (field) => field?.stringValue ?? '';
const firestoreArray = (field) =>
  (field?.arrayValue?.values || []).map((value) => value.stringValue).filter(Boolean);

const parseFirestoreDoc = (doc, index, kind) => {
  const fields = doc?.fields ?? {};
  const id = doc?.name?.split('/').pop() || `doc-${index}`;

  if (kind === 'alumnes') {
    return {
      id,
      nom: firestoreString(fields.nom) || firestoreString(fields.nombre) || `Alumne ${index + 1}`,
      rol: firestoreString(fields.rol) || 'Sense rol',
      imatge:
        firestoreString(fields.imatge) ||
        firestoreString(fields.imagen) ||
        'https://via.placeholder.com/120',
      bio:
        firestoreString(fields.bio) ||
        firestoreString(fields.descripcio) ||
        firestoreString(fields.descripcion) ||
        'Sense descripció',
      restaurantsIds: firestoreArray(fields.restaurantsIds),
    };
  }

  return {
    id,
    nom: firestoreString(fields.nom) || firestoreString(fields.nombre) || `Restaurant ${index + 1}`,
    especialitat: firestoreString(fields.especialitat) || 'Sense especialitat',
    adreca: firestoreString(fields.adreca) || firestoreString(fields.direccion) || 'Sense adreça',
    descripcio:
      firestoreString(fields.descripcio) ||
      firestoreString(fields.descripcion) ||
      'Sense descripció',
    alumnesIds: firestoreArray(fields.alumnesIds),
  };
};

const restorePageState = (snapshot, setSelectedAlumne, setSelectedRestaurant, setActivePage) => {
  setSelectedAlumne(snapshot.selectedAlumne || null);
  setSelectedRestaurant(snapshot.selectedRestaurant || null);
  setActivePage(snapshot.page);
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState('inici');
  const [searchAlumnes, setSearchAlumnes] = useState('');
  const [searchRestaurants, setSearchRestaurants] = useState('');
  const [selectedAlumne, setSelectedAlumne] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [pageHistory, setPageHistory] = useState([]);
  const [alumnes, setAlumnes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [dataSource, setDataSource] = useState('firebase');
  const [dataError, setDataError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', closeOnResize);
    return () => window.removeEventListener('resize', closeOnResize);
  }, []);

  useEffect(() => {
    const loadFirebaseData = async () => {
      if (!hasFirebaseConfig || typeof fetch !== 'function') {
        setAlumnes([]);
        setRestaurants([]);
        setDataSource('firebase');
        setDataError('Error de conexión con el servidor');
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      setDataError('');

      try {
        const config = getFirebaseConfig();
        const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

        const [alumnesResponse, restaurantsResponse] = await Promise.all([
          fetch(`${baseUrl}/${config.alumnesCollection}?key=${config.apiKey}`),
          fetch(`${baseUrl}/${config.restaurantsCollection}?key=${config.apiKey}`),
        ]);

        if (!alumnesResponse.ok || !restaurantsResponse.ok) {
          throw new Error('firebase-response-error');
        }

        const alumnesPayload = await alumnesResponse.json();
        const restaurantsPayload = await restaurantsResponse.json();

        const alumnesFirestore = (alumnesPayload.documents || []).map((doc, index) =>
          parseFirestoreDoc(doc, index, 'alumnes')
        );
        const restaurantsFirestore = (restaurantsPayload.documents || []).map((doc, index) =>
          parseFirestoreDoc(doc, index, 'restaurants')
        );

        if (alumnesFirestore.length === 0 && restaurantsFirestore.length === 0) {
          throw new Error('firebase-empty-data');
        }

        setAlumnes(alumnesFirestore);
        setRestaurants(restaurantsFirestore);
        setDataSource('firebase');
      } catch (_error) {
        setAlumnes([]);
        setRestaurants([]);
        setDataSource('firebase');
        setDataError('Error de conexión con el servidor');
      } finally {
        setDataLoading(false);
      }
    };

    loadFirebaseData();
  }, []);

  const restaurantById = useMemo(
    () => Object.fromEntries(restaurants.map((restaurant) => [String(restaurant.id), restaurant])),
    [restaurants]
  );
  const alumneById = useMemo(
    () => Object.fromEntries(alumnes.map((alumne) => [String(alumne.id), alumne])),
    [alumnes]
  );

  const navItems = useMemo(
    () => [
      ...baseNavItems,
      { key: authUser ? 'logout' : 'login', label: authUser ? 'Logout' : 'Login' },
    ],
    [authUser]
  );

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const goToPage = (page) => {
    if (page === 'logout') {
      setAuthUser(null);
      setLoginPassword('');
      setLoginError('');
      setActivePage('inici');
      setPageHistory([]);
      closeSidebarOnMobile();
      return;
    }

    setActivePage(page);
    closeSidebarOnMobile();
  };

  const navigateToDetail = (page, payload) => {
    setPageHistory((current) => [
      ...current,
      {
        page: activePage,
        selectedAlumne,
        selectedRestaurant,
      },
    ]);

    if (page === 'alumneDetail') {
      setSelectedAlumne(payload);
      setSelectedRestaurant(null);
    }

    if (page === 'restaurantDetail') {
      setSelectedRestaurant(payload);
      setSelectedAlumne(null);
    }

    setActivePage(page);
    closeSidebarOnMobile();
  };

  const goBack = (fallbackPage) => {
    if (pageHistory.length === 0) {
      setSelectedAlumne(null);
      setSelectedRestaurant(null);
      setActivePage(fallbackPage);
      return;
    }

    const previousEntry = pageHistory[pageHistory.length - 1];
    setPageHistory((current) => current.slice(0, -1));
    restorePageState(previousEntry, setSelectedAlumne, setSelectedRestaurant, setActivePage);
  };

  const filteredAlumnes = useMemo(() => {
    const term = searchAlumnes.trim().toLowerCase();
    if (!term) {
      return alumnes;
    }

    return alumnes.filter(
      (alumne) =>
        alumne.nom.toLowerCase().includes(term) || alumne.rol.toLowerCase().includes(term)
    );
  }, [alumnes, searchAlumnes]);

  const filteredRestaurants = useMemo(() => {
    const term = searchRestaurants.trim().toLowerCase();
    if (!term) {
      return restaurants;
    }

    return restaurants.filter(
      (restaurant) =>
        restaurant.nom.toLowerCase().includes(term) ||
        restaurant.especialitat.toLowerCase().includes(term) ||
        restaurant.adreca.toLowerCase().includes(term)
    );
  }, [restaurants, searchRestaurants]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');

    if (!hasFirebaseConfig) {
      setLoginError('Falta configurar Firebase en src/firebase.js o variables REACT_APP_FIREBASE_*');
      return;
    }

    setLoginLoading(true);

    try {
      const { apiKey } = getFirebaseConfig();
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
            returnSecureToken: true,
          }),
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        setLoginError(payload.error?.message || 'No s ha pogut iniciar sessió');
        return;
      }

      setAuthUser({ email: payload.email, idToken: payload.idToken, localId: payload.localId });
      setLoginPassword('');
      setActivePage('inici');
    } catch (_error) {
      setLoginError('Error de xarxa en iniciar sessió amb Firebase');
    } finally {
      setLoginLoading(false);
    }
  };

  const renderDataStatus = () => {
    if (dataLoading) {
      return <p className="data-source">Cargando datos desde Firebase...</p>;
    }

    if (dataError) {
      return <p className="login-error">{dataError}</p>;
    }

    return <p className="data-source">Font de dades: Firebase</p>;
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <button
          type="button"
          className="menu-toggle"
          aria-label="Abrir barra lateral"
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen((prevState) => !prevState)}
        >
          <span className="menu-line" />
          <span className="menu-line" />
          <span className="menu-line" />
        </button>

        <button
          type="button"
          className="logo-button"
          aria-label="Ir al inicio"
          onClick={() => goToPage('inici')}
        >
          <img src="/logo_joviat.webp" alt="Logo Joviat" className="brand-logo" />
        </button>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <nav aria-label="Navegació lateral">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`nav-link ${activePage === item.key ? 'active' : ''}`}
              onClick={() => goToPage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Cerrar barra lateral"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="main-content">
        {renderDataStatus()}
        {authUser && <p className="auth-badge">Sessió iniciada: {authUser.email}</p>}

        {activePage === 'inici' && (
          <section>
            <h1>Benvinguts a Hostaleria Joviat</h1>
            <p>Header responsive amb sidebar fixa en PC i desplegable en mòbil.</p>
          </section>
        )}

        {activePage === 'login' && (
          <section className="detail-page login-panel">
            <h2>Login</h2>
            <form className="login-form" onSubmit={handleLogin}>
              <label>
                Email
                <input
                  type="email"
                  className="search-input"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  className="search-input"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </label>
              {loginError && <p className="login-error">{loginError}</p>}
              <button type="submit" className="details-button" disabled={loginLoading}>
                {loginLoading ? 'Iniciant sessió...' : 'Entrar'}
              </button>
            </form>
          </section>
        )}

        {activePage === 'alumnes' && (
          <section className="students-section">
            <h2>Visualitzar Alumnes</h2>
            <p className="students-subtitle">Llistat d'alumnes des de Firebase</p>
            <input
              type="search"
              className="search-input"
              placeholder="Buscar alumne o rol"
              aria-label="Buscar alumnes"
              value={searchAlumnes}
              onChange={(event) => setSearchAlumnes(event.target.value)}
            />
            {dataError ? (
              <p className="login-error">{dataError}</p>
            ) : (
              <div className="students-grid">
                {filteredAlumnes.map((alumne) => {
                  const relatedRestaurants = (alumne.restaurantsIds || [])
                    .map((restaurantId) => restaurantById[String(restaurantId)])
                    .filter(Boolean);

                  return (
                    <article className="student-card" key={alumne.id}>
                      <img src={alumne.imatge} alt={alumne.nom} className="student-image" />
                      <div>
                        <h3>{alumne.nom}</h3>
                        <p>{alumne.rol}</p>
                        <p className="relation-text">
                          Restaurants:{' '}
                          {relatedRestaurants.length
                            ? relatedRestaurants.map((restaurant) => restaurant.nom).join(', ')
                            : 'Sense dades'}
                        </p>
                        <button
                          type="button"
                          className="details-button"
                          onClick={() => navigateToDetail('alumneDetail', alumne)}
                        >
                          Ver detalles
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activePage === 'alumneDetail' && selectedAlumne && (
          <section className="detail-page">
            <button type="button" className="back-button" onClick={() => goBack('alumnes')}>
              ← Retroceder
            </button>
            <h2>{selectedAlumne.nom}</h2>
            <img src={selectedAlumne.imatge} alt={selectedAlumne.nom} className="detail-image" />
            <p>
              <strong>Rol:</strong> {selectedAlumne.rol}
            </p>
            <p>{selectedAlumne.bio}</p>
            <h3>Restaurants on treballa o ha treballat</h3>
            <div className="relation-buttons">
              {(selectedAlumne.restaurantsIds || [])
                .map((restaurantId) => restaurantById[String(restaurantId)])
                .filter(Boolean)
                .map((restaurant) => (
                  <button
                    key={restaurant.id}
                    type="button"
                    className="link-button"
                    onClick={() => navigateToDetail('restaurantDetail', restaurant)}
                  >
                    {restaurant.nom}
                  </button>
                ))}
            </div>
          </section>
        )}

        {activePage === 'restaurants' && (
          <section>
            <h2>Restaurants</h2>
            <p>Mapa i llistat dels restaurants disponibles.</p>
            <div className="map-wrapper">
              <iframe
                title="Mapa de restaurants Joviat"
                src="https://www.openstreetmap.org/export/embed.html?bbox=1.8100%2C41.7100%2C1.8600%2C41.7400&layer=mapnik&marker=41.7281%2C1.8272"
                loading="lazy"
              />
            </div>
            <input
              type="search"
              className="search-input"
              placeholder="Buscar restaurant, especialitat o adreça"
              aria-label="Buscar restaurants"
              value={searchRestaurants}
              onChange={(event) => setSearchRestaurants(event.target.value)}
            />
            {dataError ? (
              <p className="login-error">{dataError}</p>
            ) : (
              <div className="restaurants-grid">
                {filteredRestaurants.map((restaurant) => {
                  const relatedAlumnes = (restaurant.alumnesIds || [])
                    .map((alumneId) => alumneById[String(alumneId)])
                    .filter(Boolean);

                  return (
                    <article className="restaurant-card" key={restaurant.id}>
                      <h3>{restaurant.nom}</h3>
                      <p>{restaurant.especialitat}</p>
                      <small>{restaurant.adreca}</small>
                      <p className="relation-text">
                        Alumnes:{' '}
                        {relatedAlumnes.length
                          ? relatedAlumnes.map((alumne) => alumne.nom).join(', ')
                          : 'Sense dades'}
                      </p>
                      <button
                        type="button"
                        className="details-button"
                        onClick={() => navigateToDetail('restaurantDetail', restaurant)}
                      >
                        Ver detalles
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activePage === 'restaurantDetail' && selectedRestaurant && (
          <section className="detail-page">
            <button type="button" className="back-button" onClick={() => goBack('restaurants')}>
              ← Retroceder
            </button>
            <h2>{selectedRestaurant.nom}</h2>
            <p>
              <strong>Especialitat:</strong> {selectedRestaurant.especialitat}
            </p>
            <p>
              <strong>Adreça:</strong> {selectedRestaurant.adreca}
            </p>
            <p>{selectedRestaurant.descripcio}</p>
            <h3>Alumnes que hi treballen o han treballat</h3>
            <div className="relation-buttons">
              {(selectedRestaurant.alumnesIds || [])
                .map((alumneId) => alumneById[String(alumneId)])
                .filter(Boolean)
                .map((alumne) => (
                  <button
                    key={alumne.id}
                    type="button"
                    className="link-button"
                    onClick={() => navigateToDetail('alumneDetail', alumne)}
                  >
                    {alumne.nom}
                  </button>
                ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
