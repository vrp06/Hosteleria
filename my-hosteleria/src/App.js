import { useEffect, useState } from 'react';
import './App.css';

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
        <nav aria-label="Navegación lateral">
          <a href="#inicio">Inicio</a>
          <a href="#menu">Menú</a>
          <a href="#reservas">Reservas</a>
          <a href="#contacto">Contacto</a>
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
        <h1>Bienvenido a Hostelería Joviat</h1>
        <p>Encabezado y barra lateral responsive para móvil y PC.</p>
      </main>
    </div>
  );
}

export default App;
