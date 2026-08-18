import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

interface CalendarAppointment {
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
  duracion_minutos: number;
  enlace_virtual: string | null;
}

type ViewMode = 'month' | 'week';

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const Calendario: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Record<string, CalendarAppointment[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = localStorage.getItem('user_role') || 'patient';

  // Calcular rango de fechas según la vista
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const desde = new Date(year, month, 1);
      const hasta = new Date(year, month + 1, 0);
      return {
        desde: desde.toISOString().split('T')[0],
        hasta: hasta.toISOString().split('T')[0],
      };
    } else {
      const day = currentDate.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(year, month, currentDate.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        desde: monday.toISOString().split('T')[0],
        hasta: sunday.toISOString().split('T')[0],
      };
    }
  }, [currentDate, viewMode]);

  // Fetch de citas agrupadas por fecha
  useEffect(() => {
    const fetchCalendario = async () => {
      setLoading(true);
      try {
        const res = await api.get('appointments/calendario/', {
          params: { desde: dateRange.desde, hasta: dateRange.hasta },
        });
        setAppointments(res.data);
      } catch (err) {
        console.error('Error al cargar el calendario:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendario();
  }, [dateRange]);

  // Navegación
  const navigate = (direction: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + direction);
    } else {
      d.setDate(d.getDate() + direction * 7);
    }
    setCurrentDate(d);
  };

  // Generar días del calendario mensual
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Ajustar para que la semana empiece en Lunes
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];
    
    // Días del mes anterior
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Completar filas (hasta 42 = 6×7)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  // Generar días de la semana actual
  const weekDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(year, month, currentDate.getDate() + mondayOffset);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const formatDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const selectedApps = useMemo(() => {
    if (!selectedDate) return [];
    const apps = appointments[selectedDate] || [];
    return [...apps].sort((a, b) => new Date(a.cita_fecha).getTime() - new Date(b.cita_fecha).getTime());
  }, [selectedDate, appointments]);

  // Franjas horarias para vista semanal
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 a 20:00

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-gob-blue tracking-tight">Calendario</h2>
            <p className="text-slate-500 text-sm mt-1">
              {userRole === 'doctor' 
                ? 'Visualiza tu carga de consultas y gestiona tu agenda.' 
                : 'Consulta tus citas médicas programadas.'}
            </p>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            {/* Switch de vista */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-1 flex shadow-sm">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-gob-blue text-white shadow-md'
                    : 'text-slate-500 hover:text-gob-blue'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-gob-blue text-white shadow-md'
                    : 'text-slate-500 hover:text-gob-blue'
                }`}
              >
                Semana
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-gob-blue hover:text-white text-slate-600 rounded-xl transition-all duration-200 cursor-pointer active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-bold text-gob-blue">
            {viewMode === 'month'
              ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              : `Semana del ${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()].slice(0, 3)} — ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()].slice(0, 3)} ${weekDays[6].getFullYear()}`}
          </h3>
          <button
            onClick={() => navigate(1)}
            className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-gob-blue hover:text-white text-slate-600 rounded-xl transition-all duration-200 cursor-pointer active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-gob-blue border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(0,44,108,0.1)]" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Calendar Grid */}
            <div className="flex-1">
              {viewMode === 'month' ? (
                /* Vista Mensual */
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-sm">
                  {/* Header de días */}
                  <div className="grid grid-cols-7 mb-2">
                    {DAYS_SHORT.map((day) => (
                      <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Grid de días */}
                  <div className="grid grid-cols-7 gap-1">
                    {monthDays.map(({ date: d, isCurrentMonth }, idx) => {
                      const key = formatDateKey(d);
                      const dayApps = appointments[key] || [];
                      const isSelected = selectedDate === key;
                      const today = isToday(d);

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDate(isSelected ? null : key)}
                          className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer group border ${
                            isSelected
                              ? 'bg-gob-blue text-white shadow-lg shadow-gob-blue/20 border-gob-celeste scale-105'
                              : today
                              ? 'bg-gob-celeste/10 text-gob-blue border-gob-celeste/30 font-extrabold'
                              : isCurrentMonth
                              ? 'bg-white hover:bg-slate-50 text-slate-700 border-transparent hover:border-slate-200'
                              : 'bg-transparent text-slate-300 border-transparent'
                          }`}
                        >
                          <span className={`text-sm font-bold ${!isCurrentMonth ? 'opacity-40' : ''}`}>
                            {d.getDate()}
                          </span>

                          {/* Indicadores de citas */}
                          {dayApps.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5">
                              {dayApps.slice(0, 3).map((app, i) => (
                                <span
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? 'bg-white/80' :
                                    app.tipo === 'TELEMEDICINA'
                                      ? 'bg-gob-celeste'
                                      : 'bg-gob-blue'
                                  }`}
                                />
                              ))}
                              {dayApps.length > 3 && (
                                <span className={`text-[7px] font-bold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                  +{dayApps.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Vista Semanal */
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-sm overflow-x-auto">
                  <div className="min-w-[700px]">
                    {/* Header de días */}
                    <div className="grid grid-cols-8 border-b border-slate-100 pb-2 mb-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center py-2">Hora</div>
                      {weekDays.map((d, i) => {
                        const key = formatDateKey(d);
                        const today = isToday(d);
                        const dayApps = appointments[key] || [];
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedDate(selectedDate === key ? null : key)}
                            className={`text-center py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                              today
                                ? 'bg-gob-celeste/10 text-gob-blue font-extrabold'
                                : selectedDate === key
                                ? 'bg-gob-blue/10 text-gob-blue font-bold'
                                : 'text-slate-600'
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider">{DAYS_SHORT[i]}</div>
                            <div className="text-lg font-bold">{d.getDate()}</div>
                            {dayApps.length > 0 && (
                              <div className="flex justify-center gap-0.5 mt-1">
                                {dayApps.slice(0, 3).map((app, j) => (
                                  <span key={j} className={`w-1.5 h-1.5 rounded-full ${app.tipo === 'TELEMEDICINA' ? 'bg-gob-celeste' : 'bg-gob-blue'}`} />
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Franjas horarias */}
                    <div className="space-y-0">
                      {hours.map((hour) => (
                        <div key={hour} className="grid grid-cols-8 border-b border-slate-50 min-h-[40px]">
                          <div className="text-[10px] text-slate-400 font-bold text-center py-2">
                            {String(hour).padStart(2, '0')}:00
                          </div>
                          {weekDays.map((d, i) => {
                            const key = formatDateKey(d);
                            const dayApps = appointments[key] || [];
                            const hourApps = dayApps.filter((app) => {
                              const appHour = new Date(app.cita_fecha).getHours();
                              return appHour === hour;
                            });
                            return (
                              <div key={i} className="px-0.5 py-0.5">
                                {hourApps.map((app) => (
                                  <div
                                    key={app.id}
                                    onClick={() => setSelectedDate(key)}
                                    className={`text-[8px] font-bold px-1.5 py-1 rounded-lg cursor-pointer truncate transition-all duration-200 hover:scale-105 ${
                                      app.tipo === 'TELEMEDICINA'
                                        ? 'bg-gob-celeste/15 text-gob-celeste border border-gob-celeste/20'
                                        : 'bg-gob-blue/10 text-gob-blue border border-gob-blue/15'
                                    }`}
                                    title={`${app.paciente_name || app.doctor_name} - ${app.hospital_name}`}
                                  >
                                    {new Date(app.cita_fecha).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })} {app.paciente_name?.split(' ')[0] || `#${app.id}`}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Leyenda */}
              <div className="flex items-center justify-center gap-6 mt-3 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gob-blue" />
                  <span>Presencial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gob-celeste" />
                  <span>Telemedicina</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gob-celeste/30 border border-gob-celeste/40" />
                  <span>Hoy</span>
                </div>
              </div>
            </div>

            {/* Panel lateral de citas del día seleccionado */}
            <div className="lg:w-80 shrink-0">
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-sm sticky top-24">
                <h4 className="text-sm font-bold text-gob-blue border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                  <span>
                    {selectedDate
                      ? `Citas del ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : 'Selecciona un día'}
                  </span>
                  {selectedApps.length > 0 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-gob-blue/10 text-gob-blue rounded-full">
                      {selectedApps.length}
                    </span>
                  )}
                </h4>

                {!selectedDate ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3 opacity-30">📅</div>
                    <p className="text-xs text-slate-400 font-medium">
                      Haz clic en un día del calendario para ver las citas programadas.
                    </p>
                  </div>
                ) : selectedApps.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-3xl mb-2 opacity-30">✨</div>
                    <p className="text-xs text-slate-400 font-medium">
                      No hay citas programadas para este día.
                    </p>
                  </div>
                ) : (
                  <div className="relative space-y-0 max-h-[60vh] overflow-y-auto pr-2 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {selectedApps.map((app) => (
                      <div key={app.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-3">
                        
                        {/* Timeline dot */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gob-blue text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 -translate-x-1/2 z-10 transition-transform duration-300 group-hover:scale-110">
                          <span className="text-[10px] font-bold">
                            {new Date(app.cita_fecha).getHours()}:{String(new Date(app.cita_fecha).getMinutes()).padStart(2, '0')}
                          </span>
                        </div>

                        {/* Card */}
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] ml-12 md:ml-0 p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white border-slate-100 shadow-sm relative">
                          {/* Arrow pointing to dot */}
                          <div className="absolute top-5 -left-3 md:group-odd:-right-3 md:group-odd:left-auto md:group-even:-left-3 w-3 h-3 bg-white border-b border-l border-slate-100 md:group-odd:border-l-0 md:group-odd:border-r md:group-odd:border-t-0 md:group-odd:border-b-0 rotate-45 md:group-odd:-rotate-45" />

                          <div className="flex items-start justify-between mb-3 border-b border-slate-50 pb-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cita #{app.id}</span>
                              <span className="text-sm font-extrabold text-gob-blue truncate mt-0.5">
                                {userRole === 'doctor' ? (app.paciente_name || `Paciente #${app.paciente}`) : (app.doctor_name || `Doctor #${app.doctor}`)}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider shadow-sm ${
                              app.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : app.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-gob-blue/10 text-gob-blue border border-gob-blue/20'
                            }`}>
                              {app.estado}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center shrink-0">🕐</div>
                              <span className="font-bold text-slate-700">
                                {new Date(app.cita_fecha).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                                <span className="text-slate-400 font-medium ml-1">({app.duracion_minutos} min)</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center shrink-0">🏥</div>
                              <span className="font-medium text-slate-600 truncate">{app.hospital_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                                {app.tipo === 'TELEMEDICINA' ? '💻' : '🏠'}
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                app.tipo === 'TELEMEDICINA' ? 'bg-gob-celeste/10 text-gob-celeste' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {app.tipo}
                              </span>
                            </div>
                          </div>

                          {/* Acciones para el médico */}
                          {userRole === 'doctor' && (
                            <div className="mt-4 pt-3 border-t border-slate-50 flex gap-2">
                              <button className="flex-1 bg-gob-blue/5 hover:bg-gob-blue/10 text-gob-blue transition-colors text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                Expediente Histórico
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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

export default Calendario;
