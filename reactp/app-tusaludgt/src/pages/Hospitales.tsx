import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Layout from '../components/Layout';

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
  distancia_km?: number;
  tiempo_viaje_min?: number;
}

// Icono personalizado SVG con color Azul Gubernamental para hospitales normales
const gobHospitalIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-opacity="0.15"/></filter><path filter="url(%23shadow)" fill="%23002c6c" stroke="white" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Icono personalizado SVG con color Dorado Institucional para unidades de cuidados paliativos
const paliativeHospitalIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-opacity="0.15"/></filter><path filter="url(%23shadow)" fill="%23d4af37" stroke="white" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Icono personalizado con color Celeste Gubernamental para marcar la ubicación del paciente
const patientIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><filter id="shadow"><feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-opacity="0.2"/></filter><circle filter="url(%23shadow)" cx="12" cy="12" r="7" fill="%2300b2e3" stroke="white" stroke-width="2"/></svg>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
};

const Hospitales: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [patientCoords, setPatientCoords] = useState<[number, number]>([14.6349, -90.5069]); // Default: Guatemala City
  const [mapCenter, setMapCenter] = useState<[number, number]>([14.6349, -90.5069]);
  
  // Tinder Swipe state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(0);
  
  // Estado para esperar que la geolocalización esté resuelta
  const [locationReady, setLocationReady] = useState(false);
  const [hasCenteredMapOnLoad, setHasCenteredMapOnLoad] = useState(false);

  // Filtro de distancia en km (Opciones: 10km, 25km, 40km, Todos)
  const [maxDistance, setMaxDistance] = useState<number>(99999);

  // Estados para Formulario Administrativo
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
  const userId = localStorage.getItem('user_id');
  const userRole = localStorage.getItem('user_role');
  const isAdminOrSupport = userRole === 'admin' || userRole === 'support';

  // 1. Geolocalización en tiempo real y watchPosition
  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    if (!navigator.geolocation) {
      console.warn("Geolocation no disponible. Usando ubicación fija.");
      setPatientCoords([14.6349, -90.5069]);
      setLocationReady(true);
      fetchHospitals(14.6349, -90.5069, null);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setPatientCoords([latitude, longitude]);
        setLocationReady(true);
        
        if (!hasCenteredMapOnLoad) {
          setMapCenter([latitude, longitude]);
          setHasCenteredMapOnLoad(true);
        }

        try {
          await api.patch('users/update-location/', {
            latitude,
            longitude,
          });
        } catch (err) {
          console.error("Error al actualizar la ubicación en DB:", err);
        }

        fetchHospitals(latitude, longitude, null);
      },
      (err) => {
        console.warn("Acceso a geolocalización denegado. Usando ubicación por defecto.", err);
        setPatientCoords([14.6349, -90.5069]);
        setLocationReady(true);
        fetchHospitals(14.6349, -90.5069, null);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 7000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [userId, navigate, hasCenteredMapOnLoad]);

  const fetchHospitals = async (lat: number, lng: number, forceSelectId: number | null = null) => {
    try {
      setLoading(true);
      const res = await api.get('hospitals/nearest/', {
        params: { lat, lng }
      });
      setHospitals(res.data);
      if (res.data.length > 0) {
        if (forceSelectId !== null) {
          const match = res.data.find((h: Hospital) => h.id === forceSelectId);
          if (match) {
            setSelectedHospital(match);
            setMapCenter([match.latitud, match.longitud]);
          }
        } else {
          const currentId = selectedHospital?.id;
          const match = res.data.find((h: Hospital) => h.id === currentId);
          if (match) {
            setSelectedHospital(match);
          } else {
            setSelectedHospital(res.data[0]);
            setMapCenter([res.data[0].latitud, res.data[0].longitud]);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Error al obtener la lista de hospitales ordenados por distancia.');
    } finally {
      setLoading(false);
    }
  };

  const selectHospital = (hosp: Hospital) => {
    setSelectedHospital(hosp);
    setMapCenter([hosp.latitud, hosp.longitud]);
  };

  // Ayudantes para Semáforo de Disponibilidad

  const getStatusBadge = (status: string) => {
    if (status === 'Verde') return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    if (status === 'Amarillo') return 'bg-amber-50 text-amber-800 border-amber-300';
    if (status === 'Rojo') return 'bg-rose-50 text-rose-800 border-rose-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  // Filtrado de hospitales en el frontend (Tinder-style slider)
  const filteredHospitals = hospitals.filter((hosp) => {
    const dist = hosp.distancia_km ?? 0;
    return dist <= maxDistance;
  });

  useEffect(() => {
    setCurrentIndex(0);
    if (filteredHospitals.length > 0) {
      selectHospital(filteredHospitals[0]);
    }
  }, [filteredHospitals.length]);

  const handleSwipe = (direction: 'left' | 'right') => {
    let nextIndex = currentIndex + (direction === 'left' ? 1 : -1);
    if (nextIndex >= filteredHospitals.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = filteredHospitals.length - 1;
    
    setCurrentIndex(nextIndex);
    selectHospital(filteredHospitals[nextIndex]);
  };

  // Abrir formulario administrativo
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
        latitud: patientCoords[0].toString(),
        longitud: patientCoords[1].toString(),
        tel_emergencia: '911 GT',
        tiene_unidad_paliativa: false,
        calendario_atencion: 'Abierto 24 Horas',
        estado_atencion: 'Verde'
      });
    }
    setShowForm(true);
  };

  // Enviar formulario (Agregar/Editar)
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
      setFormError('Las coordenadas de Latitud y Longitud deben ser números válidos.');
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
      let savedId: number;
      if (formMode === 'add') {
        const response = await api.post('hospitals/', payload);
        savedId = response.data.id;
      } else {
        const response = await api.patch(`hospitals/${editingHospitalId}/`, payload);
        savedId = response.data.id;
      }
      
      await fetchHospitals(patientCoords[0], patientCoords[1], savedId);
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Error al guardar el hospital. Por favor verifica los datos.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* Inyección de estilos CSS para Leaflet Light/Glass Theme */}
      <style>{`
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.9) !important;
          color: #0f172a !important;
          border: 1px solid rgba(255, 255, 255, 0.6) !important;
          backdrop-filter: blur(12px) !important;
          box-shadow: 0 10px 20px rgba(0, 44, 108, 0.06) !important;
          border-radius: 20px !important;
        }
        .leaflet-popup-content {
          margin: 12px 16px !important;
        }
        .leaflet-bar a {
          background-color: rgba(255, 255, 255, 0.8) !important;
          color: #002c6c !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        .leaflet-bar a:hover {
          background-color: #f8fafc !important;
          color: #00b2e3 !important;
        }
        .leaflet-container {
          border-radius: 24px !important;
          box-shadow: 0 4px 20px rgba(0, 44, 108, 0.04) !important;
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
        }
      `}</style>

      <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
        
        {/* Encabezado */}
        <div>
          <h2 className="text-3xl font-extrabold text-gob-blue tracking-tight">Centros de Salud</h2>
          <p className="text-slate-500 text-sm mt-1">Busca unidades de atención y cuidados paliativos más cercanos usando tu ubicación satelital en vivo.</p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-center font-bold">
            {error}
          </div>
        )}

        {loading && hospitals.length === 0 ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="w-10 h-10 border-4 border-gob-blue border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(0,44,108,0.1)]" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
            
            {/* List and range slider Panel */}
            <div className="w-full lg:w-[380px] bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm shadow-indigo-50/50 flex flex-col min-h-0 overflow-y-auto space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gob-blue border-b border-slate-100 pb-3 flex justify-between items-center">
                  <span>Hospitales Cercanos</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-gob-celeste/10 text-gob-celeste border border-gob-celeste/20 rounded-full">GPS Activo</span>
                </h3>

                {/* Filtro por rango de distancia (Selector Dropdown) */}
                <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200/50 rounded-2xl">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Radio de búsqueda</span>
                    <span className="text-gob-blue font-extrabold px-2 py-0.5 bg-white border border-slate-250 rounded-md shadow-sm">
                      {maxDistance === 99999 ? 'Todos' : `${maxDistance} km`}
                    </span>
                  </div>
                  <select
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-gob-blue text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <option value="10">10 km</option>
                    <option value="25">25 km</option>
                    <option value="40">40 km</option>
                    <option value="99999">Todos</option>
                  </select>
                </div>

                {/* Botón para Agregar Hospital (Admin/Soporte) */}
                {isAdminOrSupport && (
                  <button
                    onClick={() => handleOpenForm(null)}
                    className="w-full py-2.5 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ease-out hover:scale-[1.01] active:scale-95 shadow-sm shadow-gob-blue/10 cursor-pointer"
                  >
                    + Agregar Nuevo Hospital
                  </button>
                )}
              </div>

              {/* Contenedor de Tarjetas Deslizables - Tinder Style */}
              <div className="flex-1 relative flex flex-col pt-4 overflow-hidden h-[500px]">
                <AnimatePresence mode="popLayout">
                  {filteredHospitals.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-6">
                      No hay hospitales dentro del radio seleccionado.
                    </p>
                  ) : (
                    <motion.div
                      key={filteredHospitals[currentIndex]?.id || 'empty'}
                      initial={{ opacity: 0, scale: 0.9, y: 50 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: exitX, rotate: exitX * 0.05 }}
                      transition={{ duration: 0.3 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.7}
                      onDragEnd={(_, { offset, velocity }) => {
                        const swipe = offset.x * velocity.x;
                        if (swipe < -10000 || offset.x < -100) {
                          setExitX(-200);
                          handleSwipe('left');
                        } else if (swipe > 10000 || offset.x > 100) {
                          setExitX(200);
                          handleSwipe('right');
                        }
                      }}
                      className="absolute inset-0 w-full p-6 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-indigo-100/50 cursor-grab active:cursor-grabbing touch-pan-y flex flex-col z-20"
                    >
                      {/* Indicador de Swipe */}
                      <div className="flex justify-center mb-2">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                      </div>

                      <div className="flex justify-between items-start gap-2 mb-3">
                        <h4 className="font-extrabold text-gob-blue text-xl leading-snug">
                          {filteredHospitals[currentIndex]?.nombre}
                        </h4>
                        {isAdminOrSupport && (
                          <button
                            onClick={() => handleOpenForm(filteredHospitals[currentIndex])}
                            className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-slate-50 text-gob-blue border border-slate-200 rounded-xl transition-all duration-200 cursor-pointer"
                            title="Editar Hospital"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mb-4">
                        <span className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 border rounded-full ${getStatusBadge(filteredHospitals[currentIndex]?.estado_atencion || '')}`}>
                          {filteredHospitals[currentIndex]?.estado_atencion}
                        </span>
                        {filteredHospitals[currentIndex]?.tiene_unidad_paliativa && (
                          <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-250 rounded-full shadow-sm">
                            Paliativo Especializado
                          </span>
                        )}
                      </div>
                      
                      <p className="text-slate-500 text-sm mb-5 font-medium">{filteredHospitals[currentIndex]?.direccion}</p>
                      
                      {filteredHospitals[currentIndex]?.distancia_km !== undefined && (
                        <div className="mb-5 text-sm font-bold text-gob-blue flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                          <span className="flex items-center gap-2">📍 <span className="text-lg">{filteredHospitals[currentIndex]?.distancia_km} km</span></span>
                          {filteredHospitals[currentIndex]?.tiempo_viaje_min !== undefined && (
                            <span className="text-gob-celeste font-extrabold flex items-center gap-2">🚗 {filteredHospitals[currentIndex]?.tiempo_viaje_min} min</span>
                          )}
                        </div>
                      )}

                      <div className="space-y-3 text-xs text-slate-500 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <p className="flex justify-between items-center">
                          <strong className="text-slate-700 font-semibold">Horario:</strong> 
                          <span className="text-right">{filteredHospitals[currentIndex]?.calendario_atencion}</span>
                        </p>
                      </div>

                      <div className="mt-auto">
                        <a
                          href={`tel:${filteredHospitals[currentIndex]?.tel_emergencia}`}
                          className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black rounded-2xl shadow-lg shadow-rose-500/30 transition duration-300 text-base hover:scale-[1.02] active:scale-95"
                        >
                          <span className="text-xl">🚨</span> EMERGENCIA 911 GT
                        </a>
                      </div>

                      <div className="mt-4 flex items-center justify-between px-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                          Desliza
                        </span>
                        <span>{currentIndex + 1} de {filteredHospitals.length}</span>
                        <span className="flex items-center gap-1">
                          Desliza
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative z-10 h-full min-h-[400px] bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-inner">
              {locationReady ? (
                <MapContainer 
                  center={mapCenter} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%', background: '#f8fafc' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  />

                  {/* Marcador del Paciente */}
                  <Marker position={patientCoords} icon={patientIcon}>
                    <Popup>
                      <div className="text-slate-800 font-sans p-1 text-left">
                        <h4 className="font-extrabold text-xs text-gob-celeste">Tu ubicación actual</h4>
                        <p className="text-[10px] text-slate-400">Rastreado vía GPS en vivo</p>
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Marcadores de Hospitales */}
                  {filteredHospitals.map((hosp) => (
                    <Marker
                      key={hosp.id}
                      position={[hosp.latitud, hosp.longitud]}
                      icon={hosp.tiene_unidad_paliativa ? paliativeHospitalIcon : gobHospitalIcon}
                      eventHandlers={{
                        click: () => {
                          selectHospital(hosp);
                        },
                      }}
                    >
                      <Popup>
                        <div className="text-slate-850 p-0.5 font-sans text-left">
                          <h4 className="font-extrabold text-sm border-b border-slate-100 pb-1 mb-1 text-gob-blue">{hosp.nombre}</h4>
                          <p className="text-xs text-slate-500 mb-1">{hosp.direccion}</p>
                          {hosp.distancia_km !== undefined && (
                            <p className="text-xs font-bold text-gob-blue mb-1">A {hosp.distancia_km} km de ti</p>
                          )}
                          <p className="text-xs text-rose-600 font-extrabold">Emergencia: {hosp.tel_emergencia}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  <MapController center={mapCenter} />
                </MapContainer>
              ) : (
                <div className="w-full h-full flex flex-col justify-center items-center text-slate-400 p-6 min-h-[400px]">
                  <div className="w-12 h-12 border-4 border-gob-blue border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="font-bold text-lg text-slate-700">Cargando ubicación satelital en tiempo real...</p>
                  <p className="text-sm text-slate-400 mt-2">Por favor otorga permisos de GPS si el navegador te lo solicita.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Formulario Administrativo Modal */}
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
                  placeholder="Dirección completa del hospital..."
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
                    placeholder="Ej: 14.6349"
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
                    placeholder="Ej: -90.5069"
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
                    placeholder="Ej: 911 GT"
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
                  placeholder="Ej: Abierto 24 Horas"
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
                <label htmlFor="tiene_unidad_paliativa" className="text-xs font-bold text-slate-600 cursor-pointer">
                  ¿Cuenta con Unidad de Cuidados Paliativos?
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white rounded-2xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer"
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

export default Hospitales;
