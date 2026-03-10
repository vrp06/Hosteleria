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

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', closeOnResize);
    return () => window.removeEventListener('resize', closeOnResize);
  }, []);

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
        <img src="/logo_joviat.webp" alt="Logo Joviat" className="brand-logo" />
      </header>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <nav aria-label="Navegació lateral">
          <a href="#inicio">Inici</a>
          <a href="#visualitzar-alumnes">Visualitzar Alumnes</a>
          <a href="#contacte">Contacte</a>
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

      <main className="main-content" id="inicio">
        <h1>Benvinguts a Hostaleria Joviat</h1>
        <p>Encapçalament i barra lateral responsive per a mòbil i PC.</p>

        <section className="students-section" id="visualitzar-alumnes">
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
      </main>
    </div>
  );
}

export default App;
