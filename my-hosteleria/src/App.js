import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { getFirebaseConfig, hasFirebaseConfig } from './firebase';

const baseNavItems = [
  { key: 'inici', label: 'Inici' },
  { key: 'alumnes', label: 'Visualitzar Alumnes' },
  { key: 'restaurants', label: 'Restaurants' },
  { key: 'signup', label: 'SignUp' },
];

const firestoreString = (field) => field?.stringValue ?? '';
const firestoreBoolean = (field) => field?.booleanValue ?? false;
const firestoreGeoPoint = (field) => field?.geoPointValue ?? null;
const firestoreReferenceId = (field) => field?.referenceValue?.split('/').pop() ?? '';

const parseAlumniDoc = (doc, index) => {
  const fields = doc?.fields ?? {};
  const id = doc?.name?.split('/').pop() || `alumni-${index}`;

  return {
    id,
    nom: firestoreString(fields.Name) || `Alumni ${index + 1}`,
    rol: firestoreString(fields.Status) || 'Sense estat',
    status: firestoreString(fields.Status) || 'Sense estat',
    imatge: firestoreString(fields.PhotoURL) || '/user_default',
    email: firestoreString(fields.email),
    restaurantsIds: [],
    restaurantRoles: [],
  };
};

const parseRestaurantDoc = (doc, index) => {
  const fields = doc?.fields ?? {};
  const id = doc?.name?.split('/').pop() || `restaurant-${index}`;
  const location = firestoreGeoPoint(fields.location);

  return {
    id,
    nom: firestoreString(fields.name) || `Restaurant ${index + 1}`,
    adreca: firestoreString(fields.Address) || 'Sense adreça',
    imatge: firestoreString(fields.PhotoURL) || '/restaurant_default',
    ubicacio: location,
    alumnesIds: [],
    alumnesRoles: [],
  };
};

const parseRelationDoc = (doc, index) => {
  const fields = doc?.fields ?? {};

  return {
    id: doc?.name?.split('/').pop() || `relation-${index}`,
    alumniId: firestoreReferenceId(fields.id_alumni),
    restaurantId: firestoreReferenceId(fields.id_restaurant),
    rol: firestoreString(fields.rol) || 'Sense rol',
    currentJob: firestoreBoolean(fields.current_job),
  };
};

const parseAdministratorDoc = (doc) => {
  const fields = doc?.fields ?? {};
  return firestoreString(fields.Email).trim().toLowerCase();
};

const buildLinkedData = (alumniDocs, restaurantDocs, relationDocs) => {
  const alumniMap = new Map(alumniDocs.map((alumni) => [alumni.id, { ...alumni }]));
  const restaurantMap = new Map(restaurantDocs.map((restaurant) => [restaurant.id, { ...restaurant }]));

  relationDocs.forEach((relation) => {
    const alumni = alumniMap.get(relation.alumniId);
    const restaurant = restaurantMap.get(relation.restaurantId);

    if (!alumni || !restaurant) {
      return;
    }

    if (!alumni.restaurantsIds.includes(restaurant.id)) {
      alumni.restaurantsIds.push(restaurant.id);
    }

    if (!restaurant.alumnesIds.includes(alumni.id)) {
      restaurant.alumnesIds.push(alumni.id);
    }

    if (relation.currentJob) {
      alumni.restaurantRoles.push({ restaurantId: restaurant.id, rol: relation.rol });
      restaurant.alumnesRoles.push({ alumneId: alumni.id, rol: relation.rol });
    }
  });

  return {
    alumnes: Array.from(alumniMap.values()),
    restaurants: Array.from(restaurantMap.values()),
  };
};

const restorePageState = (snapshot, setSelectedAlumne, setSelectedRestaurant, setActivePage) => {
  setSelectedAlumne(snapshot.selectedAlumne || null);
  setSelectedRestaurant(snapshot.selectedRestaurant || null);
  setActivePage(snapshot.page);
};

const alumniToFirestoreFields = (profile) => ({
  Name: { stringValue: profile.nom || '' },
  PhotoURL: { stringValue: profile.imatge || '' },
  Status: { stringValue: profile.status || '' },
  email: { stringValue: profile.email || '' },
});

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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [adminEmails, setAdminEmails] = useState([]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [signUpForm, setSignUpForm] = useState({
    nom: '',
    imatge: '',
    status: '',
    email: '',
    password: '',
  });
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState('');
  const [editingAlumneId, setEditingAlumneId] = useState(null);
  const [editingForm, setEditingForm] = useState({ nom: '', imatge: '', status: '', email: '' });
  const [managementMessage, setManagementMessage] = useState('');
  const [managementError, setManagementError] = useState('');

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
        setAdminEmails([]);
        setDataSource('local');
        setDataError('Error de conexión con el servidor');
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      setDataError('');

      try {
        const config = getFirebaseConfig();
        const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

        const [alumniResponse, restaurantResponse, relationResponse, administratorResponse] =
          await Promise.all([
            fetch(`${baseUrl}/${config.alumniCollection}?key=${config.apiKey}`),
            fetch(`${baseUrl}/${config.restaurantCollection}?key=${config.apiKey}`),
            fetch(`${baseUrl}/${config.restAlumCollection}?key=${config.apiKey}`),
            fetch(`${baseUrl}/${config.administratorCollection}?key=${config.apiKey}`),
          ]);

        if (
          !alumniResponse.ok ||
          !restaurantResponse.ok ||
          !relationResponse.ok ||
          !administratorResponse.ok
        ) {
          throw new Error('firebase-response-error');
        }

        const [alumniPayload, restaurantPayload, relationPayload, administratorPayload] =
          await Promise.all([
            alumniResponse.json(),
            restaurantResponse.json(),
            relationResponse.json(),
            administratorResponse.json(),
          ]);

        const alumniDocs = (alumniPayload.documents || []).map(parseAlumniDoc);
        const restaurantDocs = (restaurantPayload.documents || []).map(parseRestaurantDoc);
        const relationDocs = (relationPayload.documents || []).map(parseRelationDoc);
        const administratorDocs = (administratorPayload.documents || []).map(parseAdministratorDoc);
        const linkedData = buildLinkedData(alumniDocs, restaurantDocs, relationDocs);

        if (linkedData.alumnes.length === 0 && linkedData.restaurants.length === 0) {
          throw new Error('firebase-empty-data');
        }

        setAlumnes(linkedData.alumnes);
        setRestaurants(linkedData.restaurants);
        setAdminEmails(administratorDocs.filter(Boolean));
        setDataSource('firebase');
      } catch (_error) {
        setAlumnes([]);
        setRestaurants([]);
        setAdminEmails([]);
        setDataSource('local');
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

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    if (authUser?.isAdmin) {
      items.push({ key: 'gestio', label: 'Gestión' });
    }
    items.push({ key: authUser ? 'logout' : 'login', label: authUser ? 'Logout' : 'Login' });
    return items;
  }, [authUser]);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const goToPage = (page) => {
    if (page === 'logout') {
      setAuthUser(null);
      setLoginError('');
      setManagementMessage('');
      setManagementError('');
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
        alumne.nom.toLowerCase().includes(term) ||
        alumne.rol.toLowerCase().includes(term) ||
        alumne.email.toLowerCase().includes(term)
    );
  }, [alumnes, searchAlumnes]);

  const filteredRestaurants = useMemo(() => {
    const term = searchRestaurants.trim().toLowerCase();
    if (!term) {
      return restaurants;
    }

    return restaurants.filter(
      (restaurant) =>
        restaurant.nom.toLowerCase().includes(term) || restaurant.adreca.toLowerCase().includes(term)
    );
  }, [restaurants, searchRestaurants]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');

    if (!hasFirebaseConfig) {
      setLoginError('Falta configurar Firebase en src/firebase.js o variables REACT_APP_FIREBASE_*');
      return;
    }

    const normalizedEmail = loginEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setLoginError('Introduce un email de administrador');
      return;
    }

    setLoginLoading(true);

    try {
      if (!adminEmails.includes(normalizedEmail)) {
        setLoginError('El email no existe en la colección Administrator');
        return;
      }

      setAuthUser({ email: normalizedEmail, isAdmin: true });
      setActivePage('inici');
    } catch (_error) {
      setLoginError('Error de conexión con el servidor');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignUpChange = (field, value) => {
    setSignUpForm((current) => ({ ...current, [field]: value }));
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setSignUpError('');
    setSignUpSuccess('');

    const config = getFirebaseConfig();
    const normalizedEmail = signUpForm.email.trim().toLowerCase();

    if (!normalizedEmail || !signUpForm.password.trim()) {
      setSignUpError('Email y password son obligatorios');
      return;
    }

    setSignUpLoading(true);

    try {
      const authResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password: signUpForm.password,
            returnSecureToken: true,
          }),
        }
      );

      const authPayload = await authResponse.json();
      if (!authResponse.ok) {
        throw new Error(authPayload.error?.message || 'signup-auth-error');
      }

      const profile = {
        id: authPayload.localId,
        nom: signUpForm.nom.trim() || normalizedEmail.split('@')[0],
        status: signUpForm.status.trim() || 'Nou registre',
        imatge: signUpForm.imatge.trim() || '/user_default',
        email: normalizedEmail,
        restaurantsIds: [],
        restaurantRoles: [],
      };

      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const profileResponse = await fetch(
        `${baseUrl}/${config.alumniCollection}?documentId=${authPayload.localId}&key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: alumniToFirestoreFields(profile) }),
        }
      );

      const profilePayload = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error(profilePayload.error?.message || 'signup-profile-error');
      }

      setAlumnes((current) => [...current, profile]);
      setSignUpForm({ nom: '', imatge: '', status: '', email: '', password: '' });
      setSignUpSuccess('Alumno registrado correctamente');
    } catch (error) {
      setSignUpError(error.message || 'No se ha podido completar el registro');
    } finally {
      setSignUpLoading(false);
    }
  };

  const startEditingAlumne = (alumne) => {
    setEditingAlumneId(alumne.id);
    setEditingForm({
      nom: alumne.nom,
      imatge: alumne.imatge === '/user_default' ? '' : alumne.imatge,
      status: alumne.status,
      email: alumne.email,
    });
    setManagementMessage('');
    setManagementError('');
  };

  const handleSaveAlumne = async (alumneId) => {
    setManagementMessage('');
    setManagementError('');

    try {
      const config = getFirebaseConfig();
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const updatedProfile = {
        id: alumneId,
        nom: editingForm.nom.trim(),
        imatge: editingForm.imatge.trim() || '/user_default',
        status: editingForm.status.trim(),
        email: editingForm.email.trim().toLowerCase(),
      };

      const patchUrl = new URL(`${baseUrl}/${config.alumniCollection}/${alumneId}`);
      patchUrl.searchParams.set('key', config.apiKey);
      ['Name', 'PhotoURL', 'Status', 'email'].forEach((fieldPath) =>
        patchUrl.searchParams.append('updateMask.fieldPaths', fieldPath)
      );

      const response = await fetch(patchUrl.toString(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: alumniToFirestoreFields(updatedProfile) }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || 'update-alumni-error');
      }

      setAlumnes((current) =>
        current.map((alumne) =>
          alumne.id === alumneId ? { ...alumne, ...updatedProfile } : alumne
        )
      );
      setEditingAlumneId(null);
      setManagementMessage('Perfil actualizado correctamente');
    } catch (error) {
      setManagementError(error.message || 'No se ha podido actualizar el perfil');
    }
  };

  const handleDeleteAlumne = async (alumneId) => {
    setManagementMessage('');
    setManagementError('');

    try {
      const config = getFirebaseConfig();
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const response = await fetch(
        `${baseUrl}/${config.alumniCollection}/${alumneId}?key=${config.apiKey}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error?.message || 'delete-alumni-error');
      }

      setAlumnes((current) => current.filter((alumne) => alumne.id !== alumneId));
      setManagementMessage('Perfil eliminado correctamente');
    } catch (error) {
      setManagementError(error.message || 'No se ha podido eliminar el perfil');
    }
  };

  const renderDataStatus = () => {
    if (dataLoading) {
      return <p className="data-source">Cargando datos desde Firebase...</p>;
    }

    return (
      <>
        {dataSource === 'local' && <p className="data-source">Font de dades: Local</p>}
        {dataError && <p className="login-error">{dataError}</p>}
      </>
    );
  };

  const renderRelationCards = (items, type) => (
    <div className="detail-relations-grid">
      {items.map((item) => (
        <article
          key={item.id}
          className={`relation-card ${type === 'alumne' ? 'student-card' : 'restaurant-card'}`}
        >
          <img
            src={item.imatge}
            alt={item.nom}
            className={type === 'alumne' ? 'student-image' : 'restaurant-thumb'}
          />
          <div>
            <h3>{item.nom}</h3>
            <p>{type === 'alumne' ? item.status : item.adreca}</p>
            {type === 'alumne' && <p>{item.email || 'Sense email'}</p>}
            <button
              type="button"
              className="details-button"
              onClick={() =>
                navigateToDetail(type === 'alumne' ? 'alumneDetail' : 'restaurantDetail', item)
              }
            >
              Ver detalles
            </button>
          </div>
        </article>
      ))}
    </div>
  );

  const restaurantMapUrl = (restaurant) => {
    if (!restaurant?.ubicacio) {
      return '';
    }

    const { latitude, longitude } = restaurant.ubicacio;
    const delta = 0.01;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  };

  return (
    <div className={`app-layout ${isDarkMode ? 'dark-mode' : ''}`}>
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

        <button
          type="button"
          className="theme-toggle"
          aria-label="Activar modo oscuro"
          onClick={() => setIsDarkMode((current) => !current)}
        >
          {isDarkMode ? '☀️' : '🌙'}
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
            <p>Dades carregades des de les col·leccions Alumni, Restaurant i Rest-Alum.</p>
          </section>
        )}

        {activePage === 'signup' && (
          <section className="detail-page login-panel">
            <h2>SignUp</h2>
            <form className="login-form" onSubmit={handleSignUp}>
              <label>
                Nombre
                <input
                  type="text"
                  className="search-input"
                  value={signUpForm.nom}
                  onChange={(event) => handleSignUpChange('nom', event.target.value)}
                />
              </label>
              <label>
                PhotoURL
                <input
                  type="text"
                  className="search-input"
                  value={signUpForm.imatge}
                  onChange={(event) => handleSignUpChange('imatge', event.target.value)}
                />
              </label>
              <label>
                Status
                <input
                  type="text"
                  className="search-input"
                  value={signUpForm.status}
                  onChange={(event) => handleSignUpChange('status', event.target.value)}
                />
              </label>
              <label>
                Email *
                <input
                  type="email"
                  className="search-input"
                  value={signUpForm.email}
                  onChange={(event) => handleSignUpChange('email', event.target.value)}
                />
              </label>
              <label>
                Password *
                <input
                  type="password"
                  className="search-input"
                  value={signUpForm.password}
                  onChange={(event) => handleSignUpChange('password', event.target.value)}
                />
              </label>
              {signUpError && <p className="login-error">{signUpError}</p>}
              {signUpSuccess && <p className="auth-badge">{signUpSuccess}</p>}
              <button type="submit" className="details-button" disabled={signUpLoading}>
                {signUpLoading ? 'Registrando...' : 'Crear cuenta'}
              </button>
            </form>
          </section>
        )}

        {activePage === 'login' && (
          <section className="detail-page login-panel">
            <h2>Login administrador</h2>
            <form className="login-form" onSubmit={handleLogin}>
              <label>
                Email administrador
                <input
                  type="email"
                  className="search-input"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                />
              </label>
              {loginError && <p className="login-error">{loginError}</p>}
              <button type="submit" className="details-button" disabled={loginLoading}>
                {loginLoading ? 'Comprovant accés...' : 'Entrar'}
              </button>
            </form>
          </section>
        )}

        {activePage === 'gestio' && authUser?.isAdmin && (
          <section>
            <h2>Gestión de perfiles</h2>
            <p>Desde aquí puedes editar o borrar los alumni dados de alta.</p>
            {managementError && <p className="login-error">{managementError}</p>}
            {managementMessage && <p className="auth-badge">{managementMessage}</p>}
            <div className="detail-relations-grid">
              {alumnes.map((alumne) => (
                <article key={alumne.id} className="detail-page management-card">
                  <img src={alumne.imatge} alt={alumne.nom} className="detail-image" />
                  {editingAlumneId === alumne.id ? (
                    <div className="login-form">
                      <label>
                        Nombre
                        <input
                          type="text"
                          className="search-input"
                          value={editingForm.nom}
                          onChange={(event) =>
                            setEditingForm((current) => ({ ...current, nom: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        PhotoURL
                        <input
                          type="text"
                          className="search-input"
                          value={editingForm.imatge}
                          onChange={(event) =>
                            setEditingForm((current) => ({ ...current, imatge: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Status
                        <input
                          type="text"
                          className="search-input"
                          value={editingForm.status}
                          onChange={(event) =>
                            setEditingForm((current) => ({ ...current, status: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          className="search-input"
                          value={editingForm.email}
                          onChange={(event) =>
                            setEditingForm((current) => ({ ...current, email: event.target.value }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="details-button"
                        onClick={() => handleSaveAlumne(alumne.id)}
                      >
                        Guardar cambios
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3>{alumne.nom}</h3>
                      <p>{alumne.status}</p>
                      <p>{alumne.email}</p>
                      <div className="management-actions">
                        <button
                          type="button"
                          className="details-button"
                          onClick={() => startEditingAlumne(alumne)}
                        >
                          Editar perfil
                        </button>
                        <button
                          type="button"
                          className="back-button"
                          onClick={() => handleDeleteAlumne(alumne.id)}
                        >
                          Borrar perfil
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'alumnes' && (
          <section className="students-section">
            <h2>Visualitzar Alumnes</h2>
            <p className="students-subtitle">Llistat d'alumnes des de la col·lecció Alumni</p>
            <input
              type="search"
              className="search-input"
              placeholder="Buscar alumne, estat o email"
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
                        <p>{alumne.status}</p>
                        <p>{alumne.email || 'Sense email'}</p>
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
              <strong>Status:</strong> {selectedAlumne.status}
            </p>
            <p>
              <strong>Email:</strong> {selectedAlumne.email || 'Sense email'}
            </p>
            <h3>Restaurants vinculats</h3>
            {renderRelationCards(
              (selectedAlumne.restaurantsIds || [])
                .map((restaurantId) => restaurantById[String(restaurantId)])
                .filter(Boolean),
              'restaurant'
            )}
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
              placeholder="Buscar restaurant o adreça"
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
                      <img src={restaurant.imatge} alt={restaurant.nom} className="detail-image" />
                      <h3>{restaurant.nom}</h3>
                      <p>{restaurant.adreca}</p>
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
            <img
              src={selectedRestaurant.imatge}
              alt={selectedRestaurant.nom}
              className="detail-image"
            />
            <p>
              <strong>Adreça:</strong> {selectedRestaurant.adreca}
            </p>
            {selectedRestaurant.ubicacio && (
              <p>
                <strong>Ubicació:</strong> {selectedRestaurant.ubicacio.latitude},{' '}
                {selectedRestaurant.ubicacio.longitude}
              </p>
            )}
            {selectedRestaurant.ubicacio && (
              <div className="map-wrapper detail-map">
                <iframe
                  title={`Mapa de ${selectedRestaurant.nom}`}
                  src={restaurantMapUrl(selectedRestaurant)}
                  loading="lazy"
                />
              </div>
            )}
            <h3>Alumnes vinculats</h3>
            {renderRelationCards(
              (selectedRestaurant.alumnesIds || [])
                .map((alumneId) => alumneById[String(alumneId)])
                .filter(Boolean),
              'alumne'
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
