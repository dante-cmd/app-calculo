import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Operaciones from './pages/Operaciones.jsx';
import FlujoCaja from './pages/FlujoCaja.jsx';
import Upload from './pages/Upload.jsx';
import Config from './pages/Config.jsx';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/operaciones', label: 'Operaciones' },
  { to: '/flujo-caja', label: 'Flujo de caja' },
  { to: '/upload', label: 'Cargar datos' },
  { to: '/config', label: 'Configuración' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <header className="border-b border-white/10 bg-slate-950 text-white shadow-lg shadow-slate-950/10">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-cyan-300 font-black text-slate-950 shadow-lg shadow-blue-500/20">ƒ</div>
                <div>
                  <h1 className="text-base font-bold tracking-tight">Cartera Factoring</h1>
                  <p className="text-xs text-slate-400">Análisis de inversiones · Prestamype</p>
                </div>
              </div>
              <nav className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1">
                {LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/operaciones" element={<Operaciones />} />
            <Route path="/flujo-caja" element={<FlujoCaja />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/config" element={<Config />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
