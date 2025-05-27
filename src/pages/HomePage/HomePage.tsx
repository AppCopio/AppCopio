// src/App.tsx
import Navbar from './components/layout/navbar/Navbar'; // <-- IMPORTA
import './App.css';

function App() {
  return (
    <div className="App">
      <Navbar /> {/* <-- AÑADE EL COMPONENTE */}
      <main className="content">
        <h1>Bienvenido a AppCopio</h1>
        <p>Esta es el área de contenido principal. Pronto mostraremos el mapa y las herramientas aquí.</p>
      </main>
    </div>
  );
}

export default App;