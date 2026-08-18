import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ChatAsistente from './ChatAsistente';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Usuario';
  const userRole = localStorage.getItem('user_role') || 'paciente';

  const [showEmergencyMenu, setShowEmergencyMenu] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting geolocation:", error);
          setUserCoords([14.6349, -90.5069]);
        }
      );
    } else {
      setUserCoords([14.6349, -90.5069]);
    }
  }, []);

  const triggerGPSAlert = async () => {
    setSendingAlert(true);
    try {
      await api.post('emergencia/', {
        latitud: userCoords ? userCoords[0] : 14.6349,
        longitud: userCoords ? userCoords[1] : -90.5069,
      });
      setAlertSuccess(true);
      setTimeout(() => {
        setAlertSuccess(false);
      }, 5000);
    } catch (err) {
      console.error("Error al enviar la alerta de emergencia:", err);
    } finally {
      setSendingAlert(false);
      setShowEmergencyMenu(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      path: '/dashboard',
      label: 'Panel',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      )
    },
    {
      path: '/citas',
      label: 'Citas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      )
    },
    {
      path: '/hospitales',
      label: 'Hospitales',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      )
    },
    {
      path: '/calendario',
      label: 'Calendario',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
        </svg>
      )
    },
  ];

  if (userRole === 'admin') {
    navItems.push({
      path: '/admin',
      label: 'Admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
        </svg>
      )
    });
  }

  return (
    <div className="min-h-screen bg-gob-light text-slate-900 flex flex-col font-sans transition-all duration-300">
      
      {/* Sidebar for PC */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white/70 backdrop-blur-xl border-r border-white/40 p-6 z-30 shadow-sm justify-between">
        <div className="space-y-8">
          {/* Logo / Header */}
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.jpeg" 
              alt="Logo TUSALUDgt" 
              className="h-10 w-auto object-contain rounded-xl shadow-sm"
            />
            <div>
              <h1 className="text-lg font-bold text-gob-blue leading-none">TUSALUDgt</h1>
              <span className="text-[9px] font-semibold text-gob-celeste tracking-widest uppercase">Gobierno Abierto</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ease-out hover:scale-[1.02] active:scale-95 ${
                  isActive(item.path)
                    ? 'bg-gob-blue text-white shadow-md shadow-gob-blue/10 font-bold'
                    : 'text-slate-650 hover:bg-slate-100 hover:text-gob-blue font-semibold'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="pt-6 border-t border-slate-200 space-y-3">
          <div className="px-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Usuario</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{username}</p>
            <p className="text-[9px] font-medium text-gob-celeste uppercase tracking-wider">{userRole}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100/80 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ease-out hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <header className="md:hidden flex justify-between items-center bg-white/70 backdrop-blur-xl border-b border-white/40 px-6 py-4 sticky top-0 z-35 shadow-sm">
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.jpeg" 
            alt="Logo TUSALUDgt" 
            className="h-8 w-auto object-contain rounded-lg shadow-sm"
          />
          <span className="text-base font-bold text-gob-blue">TUSALUDgt</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all duration-300 ease-out active:scale-95 cursor-pointer"
          title="Cerrar Sesión"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6 md:p-8 pb-20 md:pb-8 transition-all duration-300">
          {children}
        </main>

        {/* Footer Institucional Obligatorio */}
        <footer className="w-full py-6 px-6 bg-white/40 border-t border-white/40 backdrop-blur-md text-center text-xs text-slate-500 font-semibold tracking-wide mt-auto">
          Diseñada por Angel Hernández - Comisión Presidencial de Gobierno Abierto y Electrónico.
        </footer>
      </div>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-t border-white/40 flex justify-around py-2.5 z-30 shadow-md">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center space-y-1 transition-all duration-300 ease-out active:scale-95 ${
              isActive(item.path)
                ? 'text-gob-blue font-bold scale-105'
                : 'text-slate-400 hover:text-gob-blue font-medium'
            }`}
          >
            {item.icon}
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Contenedor Flotante Unificado */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 items-center z-50">
        {/* Botón Flotante (FAB) de Emergencias */}
        <div className="relative font-sans">
          {showEmergencyMenu && (
            <div className="absolute bottom-18 right-0 w-72 bg-white border border-rose-200 rounded-3xl shadow-xl p-4 mb-3 text-slate-800 animate-fade-in z-50">
              <h4 className="font-extrabold text-rose-600 text-sm mb-2 flex items-center gap-1.5">
                <span>🚨 Menú de Emergencias</span>
              </h4>
              <p className="text-[10px] text-slate-400 mb-3 font-semibold leading-normal">
                Selecciona una opción para reportar tu estado o pedir auxilio inmediato.
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    window.location.href = 'tel:+50223000000';
                  }}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  📞 Llamar al 911 GT
                </button>
                
                <button
                  onClick={triggerGPSAlert}
                  disabled={sendingAlert}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sendingAlert ? 'Enviando...' : '🚨 Enviar Alerta GPS'}
                </button>
              </div>

              {alertSuccess && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] rounded-xl text-center font-bold">
                  ¡Alerta de pánico GPS y SMS de rescate simulados con éxito!
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowEmergencyMenu(!showEmergencyMenu)}
            className="w-14 h-14 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg shadow-rose-600/20 flex items-center justify-center text-2xl focus:outline-none border-2 border-white hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            🚨
          </button>
        </div>

        {/* Chatbot Asistente */}
        <ChatAsistente />
      </div>
      
    </div>
  );
};

export default Layout;
