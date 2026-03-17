import { useEffect, useMemo, useState } from 'react';
import './App.css';

const alumnesLocal = [
  {
    id: 1,
    nom: 'Aina Martí',
    rol: 'Cap de sala',
    imatge:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    bio: 'Coordina el servei de sala i l atenció als clients durant el torn de pràctiques.',
  },
  {
    id: 2,
    nom: 'Nil Ferrer',
    rol: 'Cuiner de partida',
    imatge:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    bio: 'Especialitzat en partida de calents i control de temps de servei.',
  },
  {
    id: 3,
    nom: 'Júlia Casas',
    rol: 'Sommelier',
    imatge:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    bio: 'Assessorament de maridatges i carta de vins per al restaurant escola.',
  },
  {
    id: 4,
    nom: 'Pol Riera',
    rol: 'Responsable de reserves',
    imatge:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    bio: 'Gestió de reserves, assignació de taules i coordinació de flux de clients.',
  },
];

const restaurantsLocal = [
  {
    id: 1,
    nom: 'Restaurant Escola Joviat',
    especialitat: 'Cuina catalana i de temporada',
    adreca: 'Carrer de la Sardana, 24, Manresa',
    descripcio: 'Espai formatiu principal on es fan serveis reals amb alumnat.',
  },
  {
    id: 2,
    nom: 'Joviat Gastrobar',
    especialitat: 'Tapes creatives i menú degustació',
    adreca: 'Passeig de Pere III, 18, Manresa',
    descripcio: 'Format modern de sala per treballar tècniques de servei dinàmic.',
  },
  {
    id: 3,
    nom: 'Aula Restaurant Pràctiques',
    especialitat: 'Servei de sala i cuina d autor',
    adreca: 'Avinguda Bases de Manresa, 12, Manresa',
    descripcio: 'Entorn acadèmic per simulacions de servei i esdeveniments.',
  },
];

const navItems = [
  { key: 'inici', label: 'Inici' },
  { key: 'alumnes', label: 'Visualitzar Alumnes' },
  { key: 'restaurants', label: 'Restaurants' },
];

const firestoreString = (field) => field?.stringValue ?? '';

const parseFirestoreDoc = (doc, index, kind) => {
  const fields = doc?.fields ?? {};
  const id = doc?.name?.split('/').pop() || `doc-${index}`;

  if (kind === 'alumnes') {
    return {
      id,
      nom: firestoreString(fields.nom) || firestoreString(fields.nombre) || `Alumne ${index + 1}`,
      rol: firestoreString(fields.rol) || 'Sense rol',
      imatge: firestoreString(fields.imatge) || firestoreString(fields.imagen) || 'https://via.placeholder.com/120',
      bio: firestoreString(fields.bio) || firestoreString(fields.descripcio) || 'Sense descripció',
    };
  }

  return {
    id,
    nom: firestoreString(fields.nom) || firestoreString(fields.nombre) || `Restaurant ${index + 1}`,
    especialitat: firestoreString(fields.especialitat) || 'Sense especialitat',
    adreca: firestoreString(fields.adreca) || firestoreString(fields.direccion) || 'Sense adreça',
    descripcio: firestoreString(fields.descripcio) || firestoreString(fields.descripcion) || 'Sense descripció',
  };
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState('inici');
  const [searchAlumnes, setSearchAlumnes] = useState('');
  const [searchRestaurants, setSearchRestaurants] = useState('');
  const [selectedAlumne, setSelectedAlumne] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [alumnes, setAlumnes] = useState(alumnesLocal);
  const [restaurants, setRestaurants] = useState(restaurantsLocal);
  const [dataSource, setDataSource] = useState('local');

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
    const loadFirebaseDataIfConfigExists = async () => {
      if (typeof fetch !== 'function') {
        return;
      }

      try {
        const configResponse = await fetch('/firebase-connection.json', { cache: 'no-store' });
        if (!configResponse.ok) {
          return;
        }

        const config = await configResponse.json();
        const projectId = config.projectId;
        const apiKey = config.apiKey;

        if (!projectId || !apiKey) {
          return;
        }

        const alumnesCollection = config.alumnesCollection || 'alumnes';
        const restaurantsCollection = config.restaurantsCollection || 'restaurants';
        const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

        const [alumnesResponse, restaurantsResponse] = await Promise.all([
          fetch(`${baseUrl}/${alumnesCollection}?key=${apiKey}`),
          fetch(`${baseUrl}/${restaurantsCollection}?key=${apiKey}`),
        ]);

        if (!alumnesResponse.ok || !restaurantsResponse.ok) {
          return;
        }

        const alumnesPayload = await alumnesResponse.json();
        const restaurantsPayload = await restaurantsResponse.json();

        const alumnesFirestore = (alumnesPayload.documents || []).map((doc, index) =>
          parseFirestoreDoc(doc, index, 'alumnes')
        );
        const restaurantsFirestore = (restaurantsPayload.documents || []).map((doc, index) =>
          parseFirestoreDoc(doc, index, 'restaurants')
        );

        if (alumnesFirestore.length > 0) {
          setAlumnes(alumnesFirestore);
        }

        if (restaurantsFirestore.length > 0) {
          setRestaurants(restaurantsFirestore);
        }

        if (alumnesFirestore.length > 0 || restaurantsFirestore.length > 0) {
          setDataSource('firebase');
        }
      } catch (error) {
        console.info('No s ha pogut carregar Firebase, s utilitzen dades locals.');
      }
    };

    loadFirebaseDataIfConfigExists();
  }, []);

  const goToPage = (page) => {
    setActivePage(page);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const filteredAlumnes = useMemo(() => {
    const term = searchAlumnes.trim().toLowerCase();
    if (!term) {
      return alumnes;
    }
    return alumnes.filter(
      (alumne) => alumne.nom.toLowerCase().includes(term) || alumne.rol.toLowerCase().includes(term)
    );
  }, [searchAlumnes, alumnes]);

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
  }, [searchRestaurants, restaurants]);

  const openAlumneDetail = (alumne) => {
    setSelectedAlumne(alumne);
    goToPage('alumneDetail');
  };

  const openRestaurantDetail = (restaurant) => {
    setSelectedRestaurant(restaurant);
    goToPage('restaurantDetail');
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
        <p className="data-source">Font de dades: {dataSource === 'firebase' ? 'Firebase' : 'Local'}</p>

        {activePage === 'inici' && (
          <section>
            <h1>Benvinguts a Hostaleria Joviat</h1>
            <p>Header responsive amb sidebar fixa en PC i desplegable en mòbil.</p>
          </section>
        )}

        {activePage === 'alumnes' && (
          <section className="students-section">
            <h2>Visualitzar Alumnes</h2>
            <p className="students-subtitle">Llistat d'alumnes</p>
            <input
              type="search"
              className="search-input"
              placeholder="Buscar alumne o rol"
              aria-label="Buscar alumnes"
              value={searchAlumnes}
              onChange={(event) => setSearchAlumnes(event.target.value)}
            />
            <div className="students-grid">
              {filteredAlumnes.map((alumne) => (
                <article className="student-card" key={alumne.id}>
                  <img src={alumne.imatge} alt={alumne.nom} className="student-image" />
                  <div>
                    <h3>{alumne.nom}</h3>
                    <p>{alumne.rol}</p>
                    <button
                      type="button"
                      className="details-button"
                      onClick={() => openAlumneDetail(alumne)}
                    >
                      Ver detalles
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'alumneDetail' && selectedAlumne && (
          <section className="detail-page">
            <button type="button" className="back-button" onClick={() => goToPage('alumnes')}>
              ← Tornar a alumnes
            </button>
            <h2>{selectedAlumne.nom}</h2>
            <img src={selectedAlumne.imatge} alt={selectedAlumne.nom} className="detail-image" />
            <p>
              <strong>Rol:</strong> {selectedAlumne.rol}
            </p>
            <p>{selectedAlumne.bio}</p>
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
            <div className="restaurants-grid">
              {filteredRestaurants.map((restaurant) => (
                <article className="restaurant-card" key={restaurant.id}>
                  <h3>{restaurant.nom}</h3>
                  <p>{restaurant.especialitat}</p>
                  <small>{restaurant.adreca}</small>
                  <button
                    type="button"
                    className="details-button"
                    onClick={() => openRestaurantDetail(restaurant)}
                  >
                    Ver detalles
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'restaurantDetail' && selectedRestaurant && (
          <section className="detail-page">
            <button type="button" className="back-button" onClick={() => goToPage('restaurants')}>
              ← Tornar a restaurants
            </button>
            <h2>{selectedRestaurant.nom}</h2>
            <p>
              <strong>Especialitat:</strong> {selectedRestaurant.especialitat}
            </p>
            <p>
              <strong>Adreça:</strong> {selectedRestaurant.adreca}
            </p>
            <p>{selectedRestaurant.descripcio}</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
