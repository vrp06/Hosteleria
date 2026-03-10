import { useEffect, useState } from 'react';
import './App.css';

const alumnesFirebase = [
  {
    id: 1,
    nom: 'Aina Martí',
    rol: 'Cap de sala',
    imatge:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 2,
    nom: 'Nil Ferrer',
    rol: 'Cuiner de partida',
    imatge:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 3,
    nom: 'Júlia Casas',
    rol: 'Sommelier',
    imatge:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 4,
    nom: 'Pol Riera',
    rol: 'Responsable de reserves',
    imatge:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
  },
];

const restaurants = [
  {
    id: 1,
    nom: 'Restaurant Escola Joviat',
    especialitat: 'Cuina catalana i de temporada',
    adreca: 'Carrer de la Sardana, 24, Manresa',
  },
  {
    id: 2,
    nom: 'Joviat Gastrobar',
    especialitat: 'Tapes creatives i menú degustació',
    adreca: 'Passeig de Pere III, 18, Manresa',
  },
  {
    id: 3,
    nom: 'Aula Restaurant Pràctiques',
    especialitat: 'Servei de sala i cuina d autor',
    adreca: 'Avinguda Bases de Manresa, 12, Manresa',
  },
];

const navItems = [
  { key: 'inici', label: 'Inici' },
  { key: 'alumnes', label: 'Visualitzar Alumnes' },
  { key: 'restaurants', label: 'Restaurants' },
  { key: 'mapa', label: 'Mapa' },
];

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState('inici');

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', closeOnResize);
    return () => window.removeEventListener('resize', closeOnResize);
  }, []);

  const goToPage = (page) => {
    setActivePage(page);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
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
            <div className="students-grid">
              {alumnesFirebase.map((alumne) => (
                <article className="student-card" key={alumne.id}>
                  <img src={alumne.imatge} alt={alumne.nom} className="student-image" />
                  <div>
                    <h3>{alumne.nom}</h3>
                    <p>{alumne.rol}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'restaurants' && (
          <section>
            <h2>Restaurants</h2>
            <div className="restaurants-grid">
              {restaurants.map((restaurant) => (
                <article className="restaurant-card" key={restaurant.id}>
                  <h3>{restaurant.nom}</h3>
                  <p>{restaurant.especialitat}</p>
                  <small>{restaurant.adreca}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'mapa' && (
          <section>
            <h2>Mapa de restaurants</h2>
            <p>Consulta la ubicació dels restaurants de pràctiques.</p>
            <div className="map-wrapper">
              <iframe
                title="Mapa de restaurants Joviat"
                src="https://www.openstreetmap.org/export/embed.html?bbox=1.8100%2C41.7100%2C1.8600%2C41.7400&layer=mapnik&marker=41.7281%2C1.8272"
                loading="lazy"
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
