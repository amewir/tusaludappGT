import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('patient');

  // Patient Profile fields
  const [dpi, setDpi] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [coords, setCoords] = useState<[number, number]>([14.6349, -90.5069]); // Default: Guatemala City

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Intentar obtener la ubicación satelital en el registro
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          console.warn("Permiso de GPS denegado para el registro. Usando ubicación base.");
        }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (role === 'patient') {
      if (!dpi.trim() || !birthDate.trim() || !emergencyName.trim() || !emergencyContact.trim()) {
        setError('Por favor complete los datos médicos y de emergencia obligatorios.');
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Crear el usuario
      const userPayload = {
        username,
        password,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        role,
      };

      const userRes = await api.post('users/', userPayload);
      const createdUser = userRes.data;

      // 2. Obtener Token
      const tokenRes = await api.post('token/', { username, password });
      const { access, refresh } = tokenRes.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user_id', createdUser.id.toString());
      localStorage.setItem('user_role', createdUser.role);
      localStorage.setItem('username', createdUser.username);

      // 3. Si es Paciente, registrar perfil de paciente
      if (role === 'patient') {
        const profilePayload = {
          user: createdUser.id,
          dpi,
          birth_date: birthDate,
          emergency_name: emergencyName,
          emergency_contact: emergencyContact,
          latitude: coords[0],
          longitud: coords[1],
        };

        // Petición POST a patient-profiles (el interceptor adjuntará el token recién guardado)
        await api.post('patient-profiles/', profilePayload);
      }

      setSuccess('¡Registro completado con éxito! Redirigiendo...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      const serverMsg = err.response?.data
        ? Object.entries(err.response.data)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ')
        : 'Error en la conexión. Por favor intente de nuevo.';
      setError(serverMsg || 'Error al intentar registrar la cuenta.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gob-light p-4 md:py-12 font-sans text-slate-800">
      
      {/* Brand Header */}
      <div className="text-center mb-6 animate-fade-in">
        <img 
          src="/logo.jpeg" 
          alt="Logo TUSALUDgt" 
          className="h-14 w-auto mx-auto mb-2 object-contain rounded-2xl shadow-sm"
        />
        <h1 className="text-2xl font-bold tracking-tight text-gob-blue">
          TUSALUDgt
        </h1>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
          Comisión Presidencial de Gobierno Abierto
        </span>
      </div>

      {/* Register Glassmorphic Form Card */}
      <div className="w-full max-w-2xl p-6 md:p-8 bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm shadow-indigo-50/50 rounded-3xl animate-slide-up">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gob-blue">Crear Cuenta Nueva</h2>
          <p className="text-slate-400 text-xs mt-1">Completa el formulario para registrarte en la red nacional de salud</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-750 text-xs rounded-2xl text-center font-bold animate-shake">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-2xl text-center font-bold">
              {success}
            </div>
          )}

          {/* Secciones del Formulario en Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Col 1: Datos de la Cuenta */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-gob-blue uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Datos de la Cuenta
              </h3>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Nombre de Usuario *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  placeholder="Ej: carlostorres"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  placeholder="ejemplo@salud.gob.gt"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Nombres
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  placeholder="Ej: Carlos Alberto"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Apellidos
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  placeholder="Ej: Torres López"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  placeholder="Ej: 55554444"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tipo de Usuario / Rol
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                >
                  <option value="patient">Paciente (Usuario de Salud)</option>
                  <option value="doctor">Médico / Especialista</option>
                  <option value="support">Soporte Técnico</option>
                </select>
              </div>
            </div>

            {/* Col 2: Datos Médicos y Emergencia (Solo si es Paciente) */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-gob-blue uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Datos Médicos y Emergencia
              </h3>

              {role === 'patient' ? (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Documento Personal (DPI) *
                    </label>
                    <input
                      type="text"
                      required
                      value={dpi}
                      onChange={(e) => setDpi(e.target.value)}
                      maxLength={13}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                      placeholder="Código de 13 dígitos"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Fecha de Nacimiento *
                    </label>
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Contacto de Emergencia *
                    </label>
                    <input
                      type="text"
                      required
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                      placeholder="Nombre del familiar o contacto"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Teléfono del Contacto *
                    </label>
                    <input
                      type="text"
                      required
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      maxLength={8}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                      placeholder="Número de 8 dígitos"
                    />
                  </div>

                  <div className="p-3 bg-gob-celeste/5 border border-gob-celeste/10 rounded-2xl text-[10px] leading-relaxed text-gob-blue font-semibold">
                    📍 La ubicación actual del registro se guardará mediante geolocalización satelital para ordenar centros de salud cercanos en el panel.
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center text-xs text-slate-400 h-64 flex items-center justify-center">
                  Los roles de Médico y Soporte no requieren configurar ficha médica de paciente.
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row md:justify-between items-center gap-4">
            <Link to="/login" className="text-xs text-gob-celeste hover:text-gob-blue font-bold transition">
              ¿Ya tienes cuenta? Inicia sesión aquí
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-8 py-3 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white font-bold rounded-2xl shadow-sm hover:scale-[1.01] active:scale-95 transition-all duration-300 ease-out disabled:opacity-50 cursor-pointer text-sm"
            >
              {loading ? 'Procesando Registro...' : 'COMPLETAR REGISTRO'}
            </button>
          </div>
        </form>
      </div>

      <footer className="mt-8 text-center text-[10px] text-slate-400 font-semibold tracking-wide">
        Diseñada por Angel Hernández - Comisión Presidencial de Gobierno Abierto y Electrónico.
      </footer>
    </div>
  );
};

export default Register;
