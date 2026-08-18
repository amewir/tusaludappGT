import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
}

interface Hospital {
  id: number;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  tel_emergencia: string;
  tiene_unidad_paliativa: boolean;
  calendario_atencion: string;
  estado_atencion: string;
}

const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for Hospital Modal
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingHospitalId, setEditingHospitalId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    latitud: '',
    longitud: '',
    tel_emergencia: '911 GT',
    tiene_unidad_paliativa: false,
    calendario_atencion: 'Abierto 24 Horas',
    estado_atencion: 'Verde'
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role');
  const userId = localStorage.getItem('user_id');

  const checkRoleAndFetch = async () => {
    if (!userId || userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const usersRes = await api.get('users/');
      setUsers(usersRes.data);

      const hospitalsRes = await api.get('hospitals/');
      setHospitals(hospitalsRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Error al obtener la información administrativa del servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRoleAndFetch();
  }, [userId, userRole, navigate]);

  // Eliminar usuario
  const handleDeleteUser = async (id: number) => {
    if (id.toString() === userId) {
      setError('No puedes eliminar tu propia cuenta de administrador.');
      return;
    }
    if (!window.confirm('¿Está seguro de que desea eliminar este usuario del sistema?')) return;

    try {
      setError('');
      setSuccess('');
      await api.delete(`users/${id}/`);
      setSuccess('Usuario eliminado exitosamente.');
      checkRoleAndFetch();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al intentar eliminar el usuario.');
    }
  };

  // Eliminar hospital
  const handleDeleteHospital = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este hospital de la base de datos?')) return;

    try {
      setError('');
      setSuccess('');
      await api.delete(`hospitals/${id}/`);
      setSuccess('Hospital eliminado exitosamente.');
      checkRoleAndFetch();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al intentar eliminar el hospital.');
    }
  };

  // Abrir formulario
  const handleOpenForm = (hosp: Hospital | null) => {
    setFormError('');
    if (hosp) {
      setFormMode('edit');
      setEditingHospitalId(hosp.id);
      setFormData({
        nombre: hosp.nombre,
        direccion: hosp.direccion,
        latitud: hosp.latitud.toString(),
        longitud: hosp.longitud.toString(),
        tel_emergencia: hosp.tel_emergencia,
        tiene_unidad_paliativa: hosp.tiene_unidad_paliativa,
        calendario_atencion: hosp.calendario_atencion || 'Abierto 24 Horas',
        estado_atencion: hosp.estado_atencion || 'Verde'
      });
    } else {
      setFormMode('add');
      setEditingHospitalId(null);
      setFormData({
        nombre: '',
        direccion: '',
        latitud: '14.6349',
        longitud: '-90.5069',
        tel_emergencia: '911 GT',
        tiene_unidad_paliativa: false,
        calendario_atencion: 'Abierto 24 Horas',
        estado_atencion: 'Verde'
      });
    }
    setShowForm(true);
  };

  // Guardar Hospital (Agregar/Editar)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    if (!formData.nombre.trim() || !formData.direccion.trim() || !formData.latitud.trim() || !formData.longitud.trim() || !formData.tel_emergencia.trim()) {
      setFormError('Por favor complete todos los campos obligatorios (*).');
      setFormSubmitting(false);
      return;
    }

    const lat = parseFloat(formData.latitud);
    const lng = parseFloat(formData.longitud);

    if (isNaN(lat) || isNaN(lng)) {
      setFormError('Las coordenadas latitud y longitud deben ser valores numéricos válidos.');
      setFormSubmitting(false);
      return;
    }

    const payload = {
      nombre: formData.nombre,
      direccion: formData.direccion,
      latitud: lat,
      longitud: lng,
      tel_emergencia: formData.tel_emergencia,
      tiene_unidad_paliativa: formData.tiene_unidad_paliativa,
      calendario_atencion: formData.calendario_atencion,
      estado_atencion: formData.estado_atencion
    };

    try {
      if (formMode === 'add') {
        await api.post('hospitals/', payload);
        setSuccess('Hospital creado exitosamente.');
      } else {
        await api.patch(`hospitals/${editingHospitalId}/`, payload);
        setSuccess('Hospital actualizado exitosamente.');
      }
      setShowForm(false);
      checkRoleAndFetch();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Error al intentar guardar el hospital.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-gob-blue tracking-tight">Administración del Sistema</h2>
            <p className="text-slate-500 text-sm mt-1">Panel exclusivo para administradores y soporte de la red nacional de salud.</p>
          </div>
          <button
            onClick={() => handleOpenForm(null)}
            className="px-5 py-2.5 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 hover:scale-[1.01] active:scale-95 shadow-sm shadow-gob-blue/10 cursor-pointer"
          >
            + Agregar Nuevo Hospital
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-center font-bold animate-shake">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-center font-bold">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-gob-blue border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(0,44,108,0.1)]" />
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* 1. Gestión de Usuarios */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 hover:scale-[1.005] hover:shadow-md transition-all duration-300 ease-out">
              <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Gestión de Usuarios</span>
                <span className="text-xs font-bold bg-slate-100 text-slate-655 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  Total: {users.length}
                </span>
              </h3>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Usuario ID</th>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Nombre Completo</th>
                      <th className="py-3 px-4">Correo Electrónico</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Teléfono</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">#{u.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{u.username}</td>
                        <td className="py-3.5 px-4">{u.first_name} {u.last_name}</td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{u.email || 'No ingresado'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                            u.role === 'admin' 
                              ? 'bg-gob-blue/10 text-gob-blue border-gob-blue/20'
                              : u.role === 'doctor'
                              ? 'bg-gob-celeste/10 text-gob-celeste border-gob-celeste/20'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">{u.phone || 'No ingresado'}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition duration-200 active:scale-95 cursor-pointer"
                          >
                            Eliminar Usuario
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Gestión de Hospitales */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 hover:scale-[1.005] hover:shadow-md transition-all duration-300 ease-out">
              <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Centros Hospitalarios Registrados</span>
                <span className="text-xs font-bold bg-slate-100 text-slate-655 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  Total: {hospitals.length}
                </span>
              </h3>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Hospital ID</th>
                      <th className="py-3 px-4">Nombre del Centro</th>
                      <th className="py-3 px-4">Dirección</th>
                      <th className="py-3 px-4">Coordenadas</th>
                      <th className="py-3 px-4">Paliativo</th>
                      <th className="py-3 px-4">Emergencia</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {hospitals.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">#{h.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{h.nombre}</td>
                        <td className="py-3.5 px-4 text-xs max-w-[200px] truncate">{h.direccion}</td>
                        <td className="py-3.5 px-4 text-xs font-mono">{h.latitud.toFixed(4)}, {h.longitud.toFixed(4)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            h.tiene_unidad_paliativa 
                              ? 'bg-amber-50 text-amber-700 border border-amber-250'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            {h.tiene_unidad_paliativa ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-rose-600">{h.tel_emergencia}</td>
                        <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenForm(h)}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition duration-200 active:scale-95 cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteHospital(h.id)}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition duration-200 active:scale-95 cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Hospital Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-xl animate-fade-in text-left">
            <h3 className="text-lg font-bold text-gob-blue mb-4 border-b border-slate-100 pb-2">
              {formMode === 'add' ? '✨ Registrar Nuevo Hospital' : '📝 Editar Hospital'}
            </h3>
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl mb-4 font-bold">
                {formError}
              </div>
            )}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nombre del Hospital *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  placeholder="Ej: Hospital Roosevelt"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dirección *</label>
                <textarea
                  required
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm h-16 resize-none"
                  placeholder="Dirección completa..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Latitud *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitud}
                    onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Longitud *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitud}
                    onChange={(e) => setFormData({ ...formData, longitud: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Teléfono de Emergencia *</label>
                  <input
                    type="text"
                    required
                    value={formData.tel_emergencia}
                    onChange={(e) => setFormData({ ...formData, tel_emergencia: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Estado de Atención *</label>
                  <select
                    value={formData.estado_atencion}
                    onChange={(e) => setFormData({ ...formData, estado_atencion: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                  >
                    <option value="Verde">Verde (Normal)</option>
                    <option value="Amarillo">Amarillo (Saturado)</option>
                    <option value="Rojo">Rojo (Crítico)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Horarios / Calendario de Atención</label>
                <input
                  type="text"
                  value={formData.calendario_atencion}
                  onChange={(e) => setFormData({ ...formData, calendario_atencion: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="tiene_unidad_paliativa"
                  checked={formData.tiene_unidad_paliativa}
                  onChange={(e) => setFormData({ ...formData, tiene_unidad_paliativa: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-gob-blue focus:ring-gob-blue"
                />
                <label htmlFor="tiene_unidad_paliativa" className="text-xs font-bold text-slate-650 cursor-pointer">
                  ¿Cuenta con Unidad de Cuidados Paliativos?
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white rounded-2xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition cursor-pointer"
                >
                  {formSubmitting ? 'Guardando...' : 'Guardar Hospital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default Admin;
