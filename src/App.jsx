import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Wizard from './pages/Wizard';
import Portal from './pages/Portal';
import Privacidade from './pages/Privacidade';
import { Background } from './components/Background';
import { SupportButton } from './components/SupportButton';

function Layout() {
  return (
    <>
      <Background />
      {/* O SupportButton fica em cada página: Home e Wizard (menos na tela de sucesso) o exibem; o Portal não. */}
      <Routes>
        <Route path="/" element={<><Home /><SupportButton /></>} />
        <Route path="/create" element={<Wizard />} />
        <Route path="/portal/:slug" element={<Portal />} />
        <Route path="/privacidade" element={<Privacidade />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
