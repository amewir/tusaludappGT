import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

interface PatientProfile {
  id: number;
  dpi: string;
  birth_date: string;
  emergency_name: string;
  emergency_contact: string;
  latitude: number;
  longitud: number;
}

interface MedicationReminder {
  id: number;
  nombre_medicacion: string;
  dosificacion: string;
  frecuencia: number;
  inicio: string;
  fin_medicamento: string | null;
  activo: boolean;
}

interface Appointment {
  id: number;
  paciente: number;
  paciente_name: string;
  doctor: number;
  doctor_name: string;
  hospital: number;
  hospital_name: string;
  cita_fecha: string;
  estado: string;
  tipo: string;
  enlace_virtual: string | null;
  razon_cancelado: string | null;
}

interface RecetaMedica {
  id: number;
  doctor: number;
  doctor_name: string;
  paciente: number;
  paciente_name: string;
  cita: number | null;
  cita_info: string | null;
  diagnostico: string;
  medicamentos_json: Array<{
    nombre_medicamento: string;
    dosificacion: string;
    frecuencia_horas: number;
    duracion_dias: number;
  }>;
  requiere_control_especial: boolean;
  estado: string;
  firma_digital_5B: string;
  fecha_emision: string;
  archivo_pdf?: string;
}

interface RegistroESAS {
  id: number;
  paciente: number;
  fecha: string;
  dolor: number;
  cansancio: number;
  nausea: number;
  depresion: number;
  ansiedad: number;
  somnolencia: number;
  apetito: number;
  respiracion: number;
  nota_adicional: string | null;
}

const ESAS_SYMPTOMS = [
  { key: 'dolor', label: 'Dolor', emoji: '🔴' },
  { key: 'cansancio', label: 'Cansancio', emoji: '😴' },
  { key: 'nausea', label: 'Náusea', emoji: '🤢' },
  { key: 'depresion', label: 'Depresión', emoji: '😔' },
  { key: 'ansiedad', label: 'Ansiedad', emoji: '😰' },
  { key: 'somnolencia', label: 'Somnolencia', emoji: '💤' },
  { key: 'apetito', label: 'Falta de Apetito', emoji: '🍽️' },
  { key: 'respiracion', label: 'Dif. Respirar', emoji: '🫁' },
] as const;

const getEsasColor = (value: number): string => {
  if (value <= 3) return 'bg-emerald-500';
  if (value <= 6) return 'bg-amber-500';
  return 'bg-rose-500';
};

const getEsasTrackColor = (value: number): string => {
  if (value <= 3) return 'from-emerald-400 to-emerald-500';
  if (value <= 6) return 'from-amber-400 to-amber-500';
  return 'from-rose-400 to-rose-500';
};

const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recetas, setRecetas] = useState<RecetaMedica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // States for Doctor Recipe Modal
  const [selectedAppForReceta, setSelectedAppForReceta] = useState<Appointment | null>(null);
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [diagnostico, setDiagnostico] = useState('');
  const [requiereControlEspecial, setRequiereControlEspecial] = useState(false);
  const [firmaDigital5B, setFirmaDigital5B] = useState('');
  const [medicamentos, setMedicamentos] = useState<Array<{
    nombre_medicamento: string;
    dosificacion: string;
    frecuencia_horas: string;
    duracion_dias: string;
  }>>([
    { nombre_medicamento: '', dosificacion: '', frecuencia_horas: '8', duracion_dias: '7' }
  ]);
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // States for Patient Recipe View Modal
  const [activeRecetaForView, setActiveRecetaForView] = useState<RecetaMedica | null>(null);

  // States for ESAS Module
  const [esasValues, setEsasValues] = useState<Record<string, number>>({
    dolor: 0, cansancio: 0, nausea: 0, depresion: 0,
    ansiedad: 0, somnolencia: 0, apetito: 0, respiracion: 0,
  });
  const [esasNota, setEsasNota] = useState('');
  const [esasCompletadoHoy, setEsasCompletadoHoy] = useState(false);
  const [esasHistorial, setEsasHistorial] = useState<RegistroESAS[]>([]);
  const [esasSubmitting, setEsasSubmitting] = useState(false);
  const [esasSuccess, setEsasSuccess] = useState('');

  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');
  const userRole = localStorage.getItem('user_role');
  const username = localStorage.getItem('username') || 'Usuario';

  // 1. Geolocalización en tiempo real (solo para pacientes)
  useEffect(() => {
    if (userRole === 'doctor') return;

    if (!navigator.geolocation) {
      console.warn("La geolocalización no está soportada en este navegador.");
      setCoords({ lat: 14.6349, lng: -90.5069 });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        try {
          await api.patch('users/update-location/', {
            latitude: latitude,
            longitude: longitude,
          });
        } catch (err) {
          console.error("Error al actualizar la ubicación en el backend:", err);
        }
      },
      (error) => {
        console.warn("Acceso a geolocalización denegado. Usando ubicación por defecto.", error);
        setCoords({ lat: 14.6349, lng: -90.5069 });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [userRole]);

  // 2. Cargar perfil y recordatorios / citas de médico / recetas
  const fetchData = async () => {
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (userRole === 'doctor') {
        const res = await api.get('appointments/');
        const doctorApps = res.data.filter((a: any) => a.doctor === parseInt(userId));
        setAppointments(doctorApps);
      } else {
        const profilesRes = await api.get('patient-profiles/');
        const patientProfile = profilesRes.data.find((p: any) => p.user === parseInt(userId));
        if (patientProfile) {
          setProfile(patientProfile);
        }

        const remindersRes = await api.get('recordatorios-medicos/');
        const patientReminders = remindersRes.data.filter((r: any) => r.patient === parseInt(userId));
        setReminders(patientReminders);

        // Cargar recetas del paciente
        const recetasRes = await api.get('recetas/');
        setRecetas(recetasRes.data);

        // Cargar estado ESAS de hoy y historial
        try {
          const esasHoyRes = await api.get('esas/hoy/');
          if (esasHoyRes.data.completado) {
            setEsasCompletadoHoy(true);
            const reg = esasHoyRes.data.registro;
            setEsasValues({
              dolor: reg.dolor, cansancio: reg.cansancio, nausea: reg.nausea,
              depresion: reg.depresion, ansiedad: reg.ansiedad, somnolencia: reg.somnolencia,
              apetito: reg.apetito, respiracion: reg.respiracion,
            });
          }
          const esasHistRes = await api.get('esas/historial/', { params: { dias: 7 } });
          setEsasHistorial(esasHistRes.data);
        } catch (esasErr) {
          console.warn('ESAS module not available:', esasErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Error al conectar con el servidor para cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, navigate, coords, userRole]);

  const updateAppointmentStatus = async (appId: number, status: string) => {
    try {
      setError('');
      setSuccess('');
      await api.patch(`appointments/${appId}/`, { estado: status });
      setSuccess(`Cita marcada como ${status} exitosamente.`);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError('Error al intentar actualizar el estado de la cita.');
    }
  };

  // Recipe Modal Helpers
  const handleOpenRecetaModal = (app: Appointment) => {
    setSelectedAppForReceta(app);
    setDiagnostico('');
    setRequiereControlEspecial(false);
    setFirmaDigital5B('');
    setMedicamentos([{ nombre_medicamento: '', dosificacion: '', frecuencia_horas: '8', duracion_dias: '7' }]);
    setArchivoPdf(null);
    setModalError('');
    setShowRecetaModal(true);
  };

  const addMedicamentoRow = () => {
    setMedicamentos(prev => [...prev, { nombre_medicamento: '', dosificacion: '', frecuencia_horas: '8', duracion_dias: '7' }]);
  };

  const removeMedicamentoRow = (index: number) => {
    if (medicamentos.length <= 1) return;
    setMedicamentos(prev => prev.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: string, val: string) => {
    setMedicamentos(prev => prev.map((med, i) => i === index ? { ...med, [field]: val } : med));
  };

  const generateFirmaDigitalMock = () => {
    const randomHex = Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setFirmaDigital5B(`5B-SIG-${randomHex.substring(0, 16).toUpperCase()}-${userId}`);
  };

  const handleRecetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSubmitting(true);

    if (!diagnostico.trim()) {
      setModalError('El diagnóstico clínico es requerido.');
      setModalSubmitting(false);
      return;
    }

    if (!firmaDigital5B.trim()) {
      setModalError('La Firma Digital 5B es obligatoria para emitir recetas oficiales.');
      setModalSubmitting(false);
      return;
    }

    const filteredMeds = medicamentos.filter(m => m.nombre_medicamento.trim() !== '');
    if (filteredMeds.length === 0) {
      setModalError('Debes registrar al menos un medicamento válido.');
      setModalSubmitting(false);
      return;
    }

    try {
      // Usar FormData para soportar multipart/form-data
      const formData = new FormData();
      formData.append('doctor', userId || '0');
      if (selectedAppForReceta?.paciente) {
        formData.append('paciente', selectedAppForReceta.paciente.toString());
      }
      if (selectedAppForReceta?.id) {
        formData.append('cita', selectedAppForReceta.id.toString());
      }
      formData.append('diagnostico', diagnostico);
      formData.append('medicamentos_json', JSON.stringify(filteredMeds.map(m => ({
        nombre_medicamento: m.nombre_medicamento,
        dosificacion: m.dosificacion,
        frecuencia_horas: parseInt(m.frecuencia_horas) || 8,
        duracion_dias: parseInt(m.duracion_dias) || 7
      }))));
      formData.append('requiere_control_especial', requiereControlEspecial ? 'true' : 'false');
      formData.append('firma_digital_5B', firmaDigital5B);
      if (archivoPdf) {
        formData.append('archivo_pdf', archivoPdf);
      }

      // 1. Enviar Receta Médica al backend
      await api.post('recetas/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // 2. Completar Cita
      if (selectedAppForReceta) {
        await api.patch(`appointments/${selectedAppForReceta.id}/`, { estado: 'COMPLETADA' });
      }

      setSuccess('Consulta completada e receta oficial emitida exitosamente.');
      setShowRecetaModal(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setModalError(err.response?.data?.detail || 'Error al intentar guardar la receta y completar la cita.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleViewReceta = (receta: RecetaMedica) => {
    setActiveRecetaForView(receta);
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        
        {/* Encabezado */}
        <div>
          <h2 className="text-3xl font-extrabold text-gob-blue tracking-tight">
            {userRole === 'doctor' ? 'Panel de Médico' : 'Panel de Control'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {userRole === 'doctor' 
              ? 'Gestiona tu agenda de citas médicas y reportes de atención.' 
              : 'Monitorea tu información médica y recordatorios en tiempo real.'}
          </p>
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

        {/* Indicador de rastreo de GPS solo para pacientes */}
        {userRole !== 'doctor' && (
          <div className="p-4 bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm shadow-indigo-50/50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-gob-blue">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gob-celeste opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-gob-blue"></span>
              </span>
              <span className="font-semibold">Rastreo de ubicación GPS activo.</span>
            </div>
            {coords && (
              <span className="text-xs font-mono bg-gob-blue/5 text-gob-blue border border-gob-blue/10 px-3 py-1 rounded-xl">
                Latitud: {coords.lat.toFixed(5)}, Longitud: {coords.lng.toFixed(5)}
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-gob-blue border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(0,44,108,0.1)]" />
          </div>
        ) : userRole === 'doctor' ? (
          /* Vista del Médico: Agenda de Citas */
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 hover:scale-[1.005] hover:shadow-md transition-all duration-300 ease-out">
            <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Agenda de Consultas Asignadas</span>
              <span className="text-xs font-bold px-3 py-1 bg-gob-blue/10 text-gob-blue border border-gob-blue/20 rounded-full">
                Dr. {username}
              </span>
            </h3>

            <div className="mt-6 overflow-x-auto">
              {appointments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12 font-medium">
                  No tienes citas programadas en tu agenda en este momento.
                </p>
              ) : (
                <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Cita ID</th>
                      <th className="py-3 px-4">Paciente</th>
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">Centro Hospitalario</th>
                      <th className="py-3 px-4">Modalidad</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones de Atención</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {appointments.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">#{app.id}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{app.paciente_name || `Paciente #${app.paciente}`}</td>
                        <td className="py-3.5 px-4 font-medium">{new Date(app.cita_fecha).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-500">{app.hospital_name}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            app.tipo === 'TELEMEDICINA' 
                              ? 'bg-gob-celeste/10 text-gob-celeste border border-gob-celeste/20' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {app.tipo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                            app.estado === 'PENDIENTE' 
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : app.estado === 'CONFIRMADA'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : app.estado === 'COMPLETADA'
                              ? 'bg-gob-blue/10 text-gob-blue border-gob-blue/20'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          }`}>
                            {app.estado}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                          {app.estado !== 'COMPLETADA' && app.estado !== 'CANCELADA' && (
                            <>
                              <button
                                onClick={() => handleOpenRecetaModal(app)}
                                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-xl text-xs font-bold transition duration-200 active:scale-95 cursor-pointer"
                              >
                                Completar y Recetar
                              </button>
                              <button
                                onClick={() => updateAppointmentStatus(app.id, 'CANCELADA')}
                                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-655 border border-rose-200 rounded-xl text-xs font-bold transition duration-200 active:scale-95 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* Vista del Paciente */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left side: Patient Profile with Glassmorphism */}
            <div className="lg:col-span-1 bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out font-sans">
              <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Ficha del Paciente</span>
                <span className="text-gob-celeste text-lg">📁</span>
              </h3>
              
              {profile ? (
                <div className="space-y-4 text-sm mt-4">
                  <div>
                    <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Documento Personal (DPI)</span>
                    <span className="text-slate-800 font-bold text-base">{profile.dpi}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Fecha de Nacimiento</span>
                    <span className="text-slate-800 font-semibold">{profile.birth_date}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Contacto de Emergencia</span>
                    <span className="text-slate-800 font-semibold">{profile.emergency_name}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Teléfono de Emergencia</span>
                    <span className="text-rose-600 font-extrabold text-lg">{profile.emergency_contact}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="block text-slate-400 font-medium">Latitud Registrada</span>
                      <span className="text-slate-650 font-mono font-semibold">{profile.latitude.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-medium">Longitud Registrada</span>
                      <span className="text-slate-650 font-mono font-semibold">{profile.longitud.toFixed(5)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-sm py-4">
                  Perfil no configurado para este usuario. Por favor solicita ayuda en la unidad.
                </div>
              )}
            </div>

            {/* Right side: Medication Reminders and Signed Recipes */}
            <div className="lg:col-span-2 space-y-8 font-sans">
              
              {/* Reminders Card */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out">
                <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3">
                  Medicamentos Activos
                </h3>

                <div className="mt-6">
                  {reminders.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {reminders.map((reminder) => (
                        <div 
                          key={reminder.id}
                          className={`p-5 rounded-2xl border transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md active:scale-95 ${
                            reminder.activo 
                              ? 'bg-white border-gob-blue/20 shadow-sm' 
                              : 'bg-slate-50 border-slate-100 opacity-60'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-lg text-gob-blue leading-snug">{reminder.nombre_medicacion}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              reminder.activo 
                                ? 'bg-gob-blue/10 text-gob-blue border border-gob-blue/20' 
                                : 'bg-slate-200 text-slate-500 border border-slate-300'
                            }`}>
                              {reminder.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs mt-3">Dosis:</p>
                          <p className="text-slate-800 font-bold text-sm leading-snug">{reminder.dosificacion}</p>
                          
                          <div className="mt-6 flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 pt-3">
                            <span className="font-bold text-gob-celeste">Cada {reminder.frecuencia} horas</span>
                            <span>Inicio: {reminder.inicio}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm text-center py-12">
                      No hay recordatorios de medicamentos asignados actualmente.
                    </div>
                  )}
                </div>
              </div>

              {/* Recipes Card */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out">
                <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3 flex justify-between items-center">
                  <span>Trámites Firmados Digitalmente (GAE)</span>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    GAE
                  </span>
                </h3>

                <div className="mt-6 space-y-4">
                  {recetas.length > 0 ? (
                    recetas.map((receta) => (
                      <div 
                        key={receta.id}
                        className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gob-blue/40 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-gob-blue">Receta Oficial #{receta.id}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${
                              receta.requiere_control_especial
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                : 'bg-gob-celeste/10 text-gob-celeste border border-gob-celeste/20'
                            }`}>
                              {receta.requiere_control_especial ? 'Control Especial ⚠️' : 'Estándar'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-semibold mt-1">
                            Emitida por: <span className="text-slate-700">{receta.doctor_name || `Doctor ID #${receta.doctor}`}</span>
                          </p>
                          <p className="text-xs text-slate-650 mt-2 font-medium">
                            <span className="font-bold text-slate-700">Diagnóstico:</span> {receta.diagnostico}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-xs md:max-w-md">
                            Firma 5B: {receta.firma_digital_5B}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
                          <button
                            onClick={() => handleViewReceta(receta)}
                            className="px-4 py-2 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white text-xs font-bold rounded-xl transition duration-200 active:scale-95 cursor-pointer shadow-sm shadow-gob-blue/10 flex items-center justify-center gap-1"
                          >
                            📄 Ver Receta
                          </button>
                          
                          {receta.archivo_pdf && (
                            <a
                              href={receta.archivo_pdf.startsWith('http') ? receta.archivo_pdf : `http://localhost:8000${receta.archivo_pdf}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-gob-celeste hover:bg-gob-celeste/95 text-white text-xs font-bold rounded-xl transition duration-200 active:scale-95 text-center shadow-sm shadow-gob-celeste/10 whitespace-nowrap"
                            >
                              Descargar PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-sm text-center py-10">
                      No tienes trámites o recetas firmadas digitalmente en tu historial clínico actualmente.
                    </div>
                  )}
                </div>
              </div>

              {/* ESAS Symptom Diary Card */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out">
                <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3 flex justify-between items-center">
                  <span>Bitácora de Síntomas ESAS</span>
                  <span className="text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-0.5 rounded-full">
                    Edmonton Symptom Assessment
                  </span>
                </h3>

                {esasSuccess && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-2xl text-center font-bold">
                    {esasSuccess}
                  </div>
                )}

                <div className="mt-6 space-y-6">
                  {/* Sliders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ESAS_SYMPTOMS.map(({ key, label, emoji }) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>{emoji}</span>
                            <span>{label}</span>
                          </label>
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${getEsasColor(esasValues[key])} text-white`}>
                            {esasValues[key]}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={esasValues[key]}
                            disabled={esasCompletadoHoy}
                            onChange={(e) => setEsasValues(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                              background: `linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%)`,
                            }}
                          />
                          <div className="flex justify-between text-[7px] text-slate-400 font-bold mt-0.5 px-0.5">
                            <span>Sin síntoma</span>
                            <span>Máximo</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Nota adicional */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Observaciones (Opcional)</label>
                    <textarea
                      value={esasNota}
                      disabled={esasCompletadoHoy}
                      onChange={(e) => setEsasNota(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm h-14 resize-none disabled:opacity-60"
                      placeholder="Describe cómo te sientes hoy..."
                    />
                  </div>

                  {/* Submit or Status */}
                  <div className="flex items-center justify-between">
                    {esasCompletadoHoy ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                        <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-[10px]">✓</span>
                        Registro de hoy completado
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={esasSubmitting}
                        onClick={async () => {
                          setEsasSubmitting(true);
                          try {
                            await api.post('esas/', {
                              ...esasValues,
                              nota_adicional: esasNota || null,
                            });
                            setEsasCompletadoHoy(true);
                            setEsasSuccess('¡Registro ESAS del día guardado exitosamente!');
                            // Refresh historial
                            const histRes = await api.get('esas/historial/', { params: { dias: 7 } });
                            setEsasHistorial(histRes.data);
                            setTimeout(() => setEsasSuccess(''), 4000);
                          } catch (err: any) {
                            console.error('Error al guardar ESAS:', err);
                            setEsasSuccess('');
                          } finally {
                            setEsasSubmitting(false);
                          }
                        }}
                        className="px-5 py-2.5 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white rounded-2xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition cursor-pointer shadow-sm shadow-gob-blue/10"
                      >
                        {esasSubmitting ? 'Guardando...' : '📊 Registrar Síntomas del Día'}
                      </button>
                    )}
                  </div>

                  {/* Mini chart - last 7 days */}
                  {esasHistorial.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Tendencia de los Últimos 7 Días</p>
                      <div className="grid grid-cols-7 gap-1.5 items-end" style={{ height: '80px' }}>
                        {esasHistorial.slice(-7).map((reg, idx) => {
                          const avg = Math.round(
                            (reg.dolor + reg.cansancio + reg.nausea + reg.depresion +
                              reg.ansiedad + reg.somnolencia + reg.apetito + reg.respiracion) / 8
                          );
                          const height = Math.max(avg * 10, 5);
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1">
                              <span className={`text-[7px] font-extrabold ${getEsasColor(avg)} text-white px-1 py-0.5 rounded`}>{avg}</span>
                              <div
                                className={`w-full rounded-lg bg-gradient-to-t ${getEsasTrackColor(avg)} transition-all duration-300`}
                                style={{ height: `${height}%` }}
                              />
                              <span className="text-[7px] text-slate-400 font-bold">
                                {new Date(reg.fecha + 'T00:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Doctor Recipe / Complete Consultation Modal */}
      {showRecetaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 shadow-xl animate-fade-in text-left my-8">
            <h3 className="text-xl font-bold text-gob-blue mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span>🩺 Emitir Tratamiento y Receta Médica</span>
              <span className="text-xs font-bold px-2 py-0.5 bg-gob-blue/10 text-gob-blue rounded-full">
                Cita #{selectedAppForReceta?.id}
              </span>
            </h3>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl mb-4 font-bold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRecetaSubmit} className="space-y-4">
              
              {/* Diagnóstico */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Diagnóstico Clínico *</label>
                <textarea
                  required
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-sm h-16 resize-none"
                  placeholder="Escribe el diagnóstico completo de la consulta..."
                />
              </div>

              {/* Medicamentos Dinámicos */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Medicamentos Prescritos *</label>
                  <button
                    type="button"
                    onClick={addMedicamentoRow}
                    className="px-2.5 py-1 bg-gob-blue/10 text-gob-blue hover:bg-gob-blue/15 text-[11px] font-bold rounded-lg transition cursor-pointer"
                  >
                    [+] Recomendar Medicamento
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {medicamentos.map((med, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 relative">
                      {/* Nombre del medicamento */}
                      <div className="md:col-span-3">
                        <input
                          type="text"
                          placeholder="Medicamento"
                          required={index === 0}
                          value={med.nombre_medicamento}
                          onChange={(e) => handleMedChange(index, 'nombre_medicamento', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-gob-blue text-xs"
                        />
                      </div>
                      {/* Dosificación con sufijo mg */}
                      <div className="md:col-span-3">
                        <div className="flex items-stretch">
                          <input
                            type="number"
                            placeholder="Dosis"
                            required={index === 0}
                            min="1"
                            step="any"
                            value={med.dosificacion}
                            onChange={(e) => handleMedChange(index, 'dosificacion', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-l-xl focus:outline-none focus:border-gob-blue text-xs border-r-0"
                          />
                          <span className="inline-flex items-center px-2.5 py-1.5 bg-gob-celeste/10 text-gob-celeste border border-gob-celeste/20 text-[10px] font-extrabold rounded-r-xl tracking-wider select-none">
                            mg
                          </span>
                        </div>
                      </div>
                      {/* Frecuencia con sufijo horas */}
                      <div className="md:col-span-2">
                        <div className="flex items-stretch">
                          <input
                            type="number"
                            placeholder="Frec."
                            required={index === 0}
                            min="1"
                            value={med.frecuencia_horas}
                            onChange={(e) => handleMedChange(index, 'frecuencia_horas', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-l-xl focus:outline-none focus:border-gob-blue text-xs border-r-0"
                          />
                          <span className="inline-flex items-center px-2 py-1.5 bg-gob-celeste/10 text-gob-celeste border border-gob-celeste/20 text-[9px] font-extrabold rounded-r-xl tracking-wider select-none whitespace-nowrap">
                            hrs
                          </span>
                        </div>
                      </div>
                      {/* Duración con sufijo días */}
                      <div className="md:col-span-3">
                        <div className="flex items-stretch">
                          <input
                            type="number"
                            placeholder="Dur."
                            required={index === 0}
                            min="1"
                            value={med.duracion_dias}
                            onChange={(e) => handleMedChange(index, 'duracion_dias', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-l-xl focus:outline-none focus:border-gob-blue text-xs border-r-0"
                          />
                          <span className="inline-flex items-center px-2 py-1.5 bg-gob-celeste/10 text-gob-celeste border border-gob-celeste/20 text-[9px] font-extrabold rounded-r-xl tracking-wider select-none">
                            días
                          </span>
                        </div>
                      </div>
                      {/* Botón eliminar */}
                      <div className="md:col-span-1 flex items-center justify-center">
                        <button
                          type="button"
                          disabled={medicamentos.length <= 1}
                          onClick={() => removeMedicamentoRow(index)}
                          className="text-rose-500 hover:text-rose-700 disabled:opacity-30 cursor-pointer font-bold text-sm"
                          title="Eliminar medicamento"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carga de PDF */}
              <div className="pt-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Documento PDF de la Receta (Opcional)
                </label>
                <div className="relative flex items-center justify-center w-full">
                  {!archivoPdf ? (
                    <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition-all duration-200">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2 text-center">
                        <svg className="w-5 h-5 text-slate-400 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-xs text-slate-500 font-bold">
                          Subir archivo PDF oficial
                        </p>
                        <p className="text-[9px] text-slate-400">Archivos PDF de hasta 5MB</p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setArchivoPdf(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between w-full h-20 px-4 border border-slate-200 rounded-2xl bg-slate-50">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-xl">📄</span>
                        <span className="text-xs font-bold text-slate-700 truncate">{archivoPdf.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setArchivoPdf(null)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                        title="Eliminar PDF"
                      >
                        <span>✕</span>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Control Especial & Firma Digital */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="control_especial"
                    checked={requiereControlEspecial}
                    onChange={(e) => setRequiereControlEspecial(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-350 text-gob-blue focus:ring-gob-blue"
                  />
                  <label htmlFor="control_especial" className="text-xs font-bold text-slate-700 cursor-pointer">
                    ⚠️ Control Especial / Opioides
                  </label>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Firma Digital 5B *</label>
                    <button
                      type="button"
                      onClick={generateFirmaDigitalMock}
                      className="text-[10px] text-gob-celeste hover:text-gob-blue font-bold cursor-pointer"
                    >
                      Generar Firma
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={firmaDigital5B}
                    onChange={(e) => setFirmaDigital5B(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-xs font-mono"
                    placeholder="SHA-255 token..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRecetaModal(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-2xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-6 py-2 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white rounded-2xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition cursor-pointer"
                >
                  {modalSubmitting ? 'Firmando Receta...' : 'Firmar y Completar Consulta'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Patient view recipe printable sheet Modal */}
      {activeRecetaForView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-250 rounded-3xl w-full max-w-xl p-6 shadow-2xl animate-fade-in text-left my-8 relative">
            
            {/* Hoja de Receta Imprimible */}
            <div id="printable-receta-sheet" className="p-4 border-4 border-double border-slate-200 rounded-2xl bg-slate-50/55 text-slate-800 relative overflow-hidden font-sans">
              
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                <span className="text-[120px] font-black rotate-45 text-gob-blue">GAE</span>
              </div>

              {/* Logo / Header de Gobierno */}
              <div className="flex justify-between items-start border-b-2 border-gob-blue/30 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <img src="/logo.jpeg" alt="Logo TUSALUDgt" className="h-12 w-auto object-contain rounded-xl shadow-sm border border-slate-100" />
                  <div>
                    <h4 className="text-sm font-black text-gob-blue uppercase leading-none tracking-wide">TUSALUDgt</h4>
                    <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">Gobierno de la República de Guatemala</span>
                    <p className="text-[7px] font-semibold text-gob-celeste uppercase">Comisión Presidencial de Gobierno Abierto y Electrónico</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                    RECETA DIGITAL OFICIAL
                  </span>
                  <p className="text-[9px] text-slate-400 mt-2 font-mono">Emisión: {new Date(activeRecetaForView.fecha_emision).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Patient / Doctor Details */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-4 bg-white/70 p-3 rounded-xl border border-slate-200/50">
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Paciente</p>
                  <p className="font-bold text-slate-800">{activeRecetaForView.paciente_name}</p>
                  <p className="text-[10px] text-slate-500">Receta ID: #{activeRecetaForView.id}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Médico Emisor</p>
                  <p className="font-bold text-slate-800">{activeRecetaForView.doctor_name || `Doctor ID #${activeRecetaForView.doctor}`}</p>
                  {activeRecetaForView.cita_info && (
                    <p className="text-[9px] text-slate-500">{activeRecetaForView.cita_info}</p>
                  )}
                </div>
              </div>

              {/* Diagnóstico */}
              <div className="mb-4">
                <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Diagnóstico Clínico</p>
                <div className="p-3 bg-white border border-slate-150 rounded-xl text-xs italic text-slate-700 leading-relaxed">
                  "{activeRecetaForView.diagnostico}"
                </div>
              </div>

              {/* List of Medications */}
              <div className="mb-6">
                <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Tratamiento de Medicamentos</p>
                <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-450 text-[8px] font-bold uppercase tracking-wider">
                        <th className="py-2 px-3">Medicamento</th>
                        <th className="py-2 px-3">Dosificación</th>
                        <th className="py-2 px-3 text-center">Frecuencia</th>
                        <th className="py-2 px-3 text-right">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {activeRecetaForView.medicamentos_json.map((med, index) => (
                        <tr key={index} className="hover:bg-slate-50/30">
                          <td className="py-2 px-3 font-bold text-gob-blue">{med.nombre_medicamento}</td>
                          <td className="py-2 px-3 font-semibold">{med.dosificacion}</td>
                          <td className="py-2 px-3 text-center font-bold text-gob-celeste">Cada {med.frecuencia_horas} horas</td>
                          <td className="py-2 px-3 text-right">{med.duracion_dias} días</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stamp & Footer of recipe */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-t-2 border-slate-200/50 pt-4 bg-white/40 p-3 rounded-xl">
                <div className="md:col-span-3 text-[9px] text-slate-450 font-semibold space-y-1">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Validez y Firma Digital 5B</p>
                  <p className="text-emerald-700 font-extrabold flex items-center gap-1">
                    <span>✓ Autorizada Electrónicamente en Guatemala</span>
                  </p>
                  <p className="font-mono text-[8px] text-slate-500 break-all bg-slate-100 p-1.5 rounded-lg border border-slate-200/40">
                    HASH: {activeRecetaForView.firma_digital_5B}
                  </p>
                </div>
                
                {/* QR Code Simulation */}
                <div className="md:col-span-1 flex justify-center">
                  <div className="w-16 h-16 border border-slate-300 p-1 bg-white rounded-lg flex items-center justify-center flex-col shadow-sm">
                    <svg className="w-12 h-12 text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="0" y="0" width="30" height="30" />
                      <rect x="10" y="10" width="10" height="10" fill="white" />
                      <rect x="70" y="0" width="30" height="30" />
                      <rect x="80" y="10" width="10" height="10" fill="white" />
                      <rect x="0" y="70" width="30" height="30" />
                      <rect x="10" y="80" width="10" height="10" fill="white" />
                      <rect x="40" y="40" width="20" height="20" />
                      <rect x="45" y="45" width="10" height="10" fill="white" />
                      <rect x="40" y="10" width="15" height="15" />
                      <rect x="75" y="45" width="15" height="15" />
                      <rect x="15" y="45" width="15" height="15" />
                      <rect x="45" y="75" width="15" height="15" />
                    </svg>
                    <span className="text-[6px] text-slate-400 font-bold tracking-widest mt-1">VERIFICAR</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-md shadow-gob-blue/10 flex items-center gap-1.5"
              >
                <span>🖨 Imprimir / Guardar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveRecetaForView(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receta-sheet, #printable-receta-sheet * {
            visibility: visible;
          }
          #printable-receta-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            background: white;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>

    </Layout>
  );
};

export default Dashboard;
