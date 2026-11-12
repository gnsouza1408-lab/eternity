import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Wizard from './pages/Wizard';
import Portal from './pages/Portal';
import Privacidade from './pages/Privacidade';
import { Background } from './components/Background';
import { SupportButton } from './components/SupportButton';

function Layout() {
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/portal/');

  return (
    <>
      <Background />
      <Routes>
        <Route path="/" element={<><Home /><SupportButton /></>} />
        <Route path="/create" element={<Wizard />} /> {/* Wizard handles its own support button logic if needed, or we add it here? The requirement said "except success screen". Wizard manages steps, so we let Wizard include SupportButton conditionally. */}
        <Route path="/portal/:slug" element={<Portal />} />
        <Route path="/privacidade" element={<Privacidade />} />
      </Routes>
      {/* 
         We moved SupportButton inside routes or components to control visibility better.
         Home needs it. 
         Wizard needs it (except step 10).
         Portal usually doesn't need it.
      */}
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
