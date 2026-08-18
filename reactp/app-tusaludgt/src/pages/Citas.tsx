import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

interface Appointment {
  id: number;
  paciente: number;
  doctor: number;
  hospital: number;
  cita_fecha: string;
  estado: string;
  tipo: string;
  enlace_virtual: string | null;
  razon_cancelado: string | null;
}

interface Hospital {
  id: number;
  nombre: string;
}

interface Doctor {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

const Citas: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [doctorVal, setDoctorVal] = useState('');
  const [hospitalVal, setHospitalVal] = useState('');
  const [fechaVal, setFechaVal] = useState('');
  const [tipoVal, setTipoVal] = useState('PRESENCIAL');
  const [enlaceVal, setEnlaceVal] = useState('');
  const [booking, setBooking] = useState(false);

  // Cancel states
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const appRes = await api.get('appointments/');
      const patientApps = appRes.data.filter((a: any) => a.paciente === parseInt(userId || '0'));
      setAppointments(patientApps);

      const hospRes = await api.get('hospitals/');
      setHospitals(hospRes.data);

      const usersRes = await api.get('users/');
      const docUsers = usersRes.data.filter((u: any) => u.role === 'doctor');
      setDoctors(docUsers);
    } catch (err: any) {
      console.error(err);
      setError('Error al obtener datos de citas del servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [userId, navigate]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorVal || !hospitalVal || !fechaVal) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }

    setBooking(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        paciente: parseInt(userId || '0'),
        doctor: parseInt(doctorVal),
        hospital: parseInt(hospitalVal),
        cita_fecha: new Date(fechaVal).toISOString(),
        tipo: tipoVal,
        enlace_virtual: tipoVal === 'TELEMEDICINA' ? enlaceVal || 'http://telemedicina.tusaludgt.gob' : null,
        estado: 'PENDIENTE',
      };

      await api.post('appointments/', payload);
      setSuccess('Cita agendada exitosamente.');
      
      setDoctorVal('');
      setHospitalVal('');
      setFechaVal('');
      setTipoVal('PRESENCIAL');
      setEnlaceVal('');

      fetchData();
    } catch (err: any) {
      console.error(err);
      setError('Error al intentar agendar la cita.');
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!cancelReason.trim()) {
      setError('Por favor indica una razón para la cancelación.');
      return;
    }

    try {
      await api.patch(`appointments/${id}/`, {
        estado: 'CANCELADA',
        razon_cancelado: cancelReason,
      });

      setSuccess('Cita cancelada con éxito.');
      setCancellingId(null);
      setCancelReason('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError('Error al intentar cancelar la cita.');
    }
  };

  const getHospitalName = (id: number) => {
    const h = hospitals.find((hosp) => hosp.id === id);
    return h ? h.nombre : `Hospital #${id}`;
  };

  const getDoctorName = (id: number) => {
    const d = doctors.find((doc) => doc.id === id);
    return d ? `${d.first_name} ${d.last_name}` : `Médico #${id}`;
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        
        {/* Encabezado */}
        <div>
          <h2 className="text-3xl font-extrabold text-gob-blue tracking-tight">Agendar y Control de Citas</h2>
          <p className="text-slate-500 text-sm mt-1">Programa tus citas presenciales o virtuales con médicos paliativos y consulta tu historial.</p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-center font-bold animate-shake">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-center font-bold animate-fade-in">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-gob-blue border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(0,44,108,0.1)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left side: Book Appointment Form */}
            <div className="lg:col-span-1 bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out self-start">
              <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Agendar Consulta</span>
                <span className="text-gob-celeste text-lg">📅</span>
              </h3>
              
              <form onSubmit={handleBooking} className="space-y-4 mt-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Médico / Especialista *
                  </label>
                  <select
                    value={doctorVal}
                    onChange={(e) => setDoctorVal(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-gob-blue text-sm transition-all"
                  >
                    <option value="">Seleccione un médico</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.first_name} {d.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Centro Hospitalario *
                  </label>
                  <select
                    value={hospitalVal}
                    onChange={(e) => setHospitalVal(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-gob-blue text-sm transition-all"
                  >
                    <option value="">Seleccione un hospital</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Fecha y Hora programada *
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaVal}
                    onChange={(e) => setFechaVal(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-gob-blue text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Modalidad de Atención
                  </label>
                  <select
                    value={tipoVal}
                    onChange={(e) => setTipoVal(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-gob-blue text-sm transition-all"
                  >
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="TELEMEDICINA">Telemedicina</option>
                  </select>
                </div>

                {tipoVal === 'TELEMEDICINA' && (
                  <div className="animate-fade-in">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Enlace Virtual (Zoom / Teams)
                    </label>
                    <input
                      type="url"
                      value={enlaceVal}
                      onChange={(e) => setEnlaceVal(e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-gob-blue text-sm transition-all"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={booking}
                  className="w-full py-3 px-4 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white font-bold rounded-2xl shadow-sm hover:scale-[1.01] active:scale-95 transition-all duration-300 ease-out disabled:opacity-50 cursor-pointer text-sm"
                >
                  {booking ? 'Agendando cita...' : 'AGENDAR CONSULTA'}
                </button>
              </form>
            </div>

            {/* Right side: List of Current Appointments */}
            <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out">
              <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3">
                Historial de Consultas
              </h3>

              <div className="mt-6">
                {appointments.length > 0 ? (
                  <div className="space-y-6">
                    {appointments.map((appointment) => (
                      <div 
                        key={appointment.id}
                        className="p-5 rounded-2xl border border-slate-100 bg-white/50 space-y-4 flex flex-col shadow-sm transition-all duration-350 hover:scale-[1.02] hover:shadow-md"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              appointment.estado === 'PENDIENTE' 
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : appointment.estado === 'CONFIRMADA'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : appointment.estado === 'CANCELADA'
                                ? 'bg-rose-500/10 text-rose-550 border-rose-500/20'
                                : 'bg-slate-100 text-slate-600 border-transparent'
                            }`}>
                              {appointment.estado}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Modalidad: {appointment.tipo}</span>
                          </div>
                          <span className="text-xs font-bold text-gob-blue bg-gob-blue/5 border border-gob-blue/10 px-3 py-1 rounded-full">
                            🕒 {new Date(appointment.cita_fecha).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                          <div>
                            <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Médico Asignado</span>
                            <span className="font-bold text-slate-800">{getDoctorName(appointment.doctor)}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Centro Hospitalario</span>
                            <span className="font-bold text-slate-800">{getHospitalName(appointment.hospital)}</span>
                          </div>
                        </div>

                        {appointment.enlace_virtual && appointment.estado !== 'CANCELADA' && (
                          <div className="p-3.5 bg-gob-celeste/5 border border-gob-celeste/20 rounded-2xl text-xs flex justify-between items-center shadow-sm">
                            <span className="text-gob-blue font-bold">Videoconsulta Virtual Disponible</span>
                            <a 
                              href={appointment.enlace_virtual} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-4 py-1.5 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white rounded-xl text-xs transition duration-300 font-bold hover:scale-102 active:scale-95 shadow-sm"
                            >
                              Conectarse
                            </a>
                          </div>
                        )}

                        {appointment.razon_cancelado && (
                          <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-xs">
                            <span className="block text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1">Motivo de Cancelación:</span>
                            <span className="text-slate-500 italic">"{appointment.razon_cancelado}"</span>
                          </div>
                        )}

                        {appointment.estado !== 'CANCELADA' && (
                          <div className="border-t border-slate-50 pt-3 flex justify-end">
                            {cancellingId === appointment.id ? (
                              <div className="w-full flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={cancelReason}
                                  onChange={(e) => setCancelReason(e.target.value)}
                                  placeholder="Indique el motivo por el cual cancela la consulta..."
                                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-rose-500 transition-all"
                                />
                                <div className="flex justify-end gap-2 text-xs">
                                  <button
                                    onClick={() => setCancellingId(null)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 font-bold transition"
                                  >
                                    Descartar
                                  </button>
                                  <button
                                    onClick={() => handleCancel(appointment.id)}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition shadow-sm shadow-rose-600/10"
                                  >
                                    Confirmar Cancelación
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setCancellingId(appointment.id);
                                  setCancelReason('');
                                }}
                                className="px-3.5 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-xl text-[11px] font-bold tracking-wide uppercase transition duration-300 ease-out active:scale-95 cursor-pointer"
                              >
                                Cancelar Consulta
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm text-center py-12">
                    No tiene citas programadas en este momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Citas;
