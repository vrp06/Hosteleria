import './App.css';

const alumnesFirebase = [
  {
    id: 'alumne-1',
    nom: 'Maria Soler',
    rol: 'Cap de sala',
    imatgeUrl:
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'alumne-2',
    nom: 'Pau Vila',
    rol: 'Cuiner',
    imatgeUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'alumne-3',
    nom: 'Laia Ferrer',
    rol: 'Cambrera',
    imatgeUrl:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'alumne-4',
    nom: 'Arnau Pons',
    rol: 'Sommelier',
    imatgeUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  },
];

function App() {
  return (
    <main className="app-container">
      <h1>Hostaleria</h1>

      <section className="seccio-alumnes" aria-labelledby="visualitzar-alumnes">
        <h2 id="visualitzar-alumnes">Visualitzar Alumnes</h2>
        <h3>Llistat d&apos;alumnes</h3>

        <ul className="alumnes-grid">
          {alumnesFirebase.map((alumne) => (
            <li key={alumne.id} className="alumne-card">
              <img src={alumne.imatgeUrl} alt={alumne.nom} className="alumne-imatge" />
              <div className="alumne-info">
                <p className="alumne-nom">{alumne.nom}</p>
                <p className="alumne-rol">Rol: {alumne.rol}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
