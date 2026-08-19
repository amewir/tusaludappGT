import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const tokenRes = await api.post('token/', { username, password });
      const { access, refresh } = tokenRes.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      const usersRes = await api.get('users/');
      const currentUser = usersRes.data.find((u: any) => u.username === username);

      if (currentUser) {
        localStorage.setItem('user_id', currentUser.id.toString());
        localStorage.setItem('user_role', currentUser.role);
        localStorage.setItem('username', currentUser.username);
        navigate('/dashboard');
      } else {
        setError('No se pudo encontrar la información del perfil del usuario.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Credenciales inválidas. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gob-light p-4 font-sans text-slate-800">

      {/* Brand Header above card */}
      <div className="text-center mb-6 animate-fade-in">
        <img
          src="/logo.jpeg"
          alt="Logo TUSALUDgt"
          className="h-48 w-auto mx-auto mb-3 object-contain rounded-2xl shadow-sm"
        />
        <h1 className="text-3xl font-extrabold tracking-tight text-gob-blue">
          TUSALUDgt
        </h1>
        <p className="text-slate-400 text-xs mt-1.5 font-bold uppercase tracking-widest">
          Portal de Salud
        </p>
      </div>

      {/* Login Card with Glassmorphism */}
      <div className="w-full max-w-md p-8 bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm shadow-indigo-50/50 rounded-3xl relative animate-slide-up">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gob-blue">Iniciar Sesión</h2>
          <p className="text-slate-400 text-xs mt-1">Acceso seguro al Portal de Tramites - Seccion de Enfermos Paleoliticos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl text-center font-bold animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1" htmlFor="username">
              Nombre de Usuario
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm transition-all"
              placeholder="Ingrese su usuario"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1" htmlFor="password">
              Contraseña del Sistema
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white font-bold rounded-2xl shadow-sm hover:scale-[1.01] active:scale-95 transition-all duration-300 ease-out disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? 'Validando Credenciales...' : 'INGRESAR AL SISTEMA'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs">
          <span className="text-slate-400">¿No tienes una cuenta activa? </span>
          <Link to="/register" className="text-gob-celeste hover:text-gob-blue font-bold transition">
            Regístrate aquí
          </Link>
        </div>
      </div>

      <footer className="mt-8 text-center text-[10px] text-slate-400 font-semibold tracking-wide">
        Diseñada por Angel Hernández
      </footer>
    </div>
  );
};

export default Login;
