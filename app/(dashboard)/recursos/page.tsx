"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Video, 
  FileText, 
  Image as ImageIcon, 
  Save, 
  Play, 
  ExternalLink, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";

interface Recurso {
  id: string;
  tipo: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  url_publica: string;
  activo: boolean;
  prioridad: string;
}

export default function RecursosPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchRecursos();
  }, []);

  async function fetchRecursos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("recursos_media")
      .select("*")
      .order("prioridad", { ascending: false });

    if (!error && data) {
      setRecursos(data);
    }
    setLoading(false);
  }

  async function handleSave(id: string, url: string, activo: boolean) {
    setSaving(id);
    setMsg(null);

    const { error } = await supabase
      .from("recursos_media")
      .update({ 
        url_publica: url, 
        activo: url !== 'PENDIENTE' && url.startsWith('http') ? activo : false,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      setMsg({ id, type: 'error', text: 'Error al guardar' });
    } else {
      setMsg({ id, type: 'success', text: 'Guardado correctamente' });
      fetchRecursos();
    }
    setSaving(null);
  }

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'video': return <Video className="w-5 h-5 text-teal-400" />;
      case 'pdf': return <FileText className="w-5 h-5 text-sky-400" />;
      case 'imagen': return <ImageIcon className="w-5 h-5 text-pink-400" />;
      default: return <Video className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Medios</h1>
          <p className="text-white/40 mt-1">Administra los 9 activos multimedia que utiliza el Agente de IA.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {recursos.map((r) => (
          <div key={r.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all group">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-teal-500/10 transition-colors">
                  {getIcon(r.tipo)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white leading-none">{r.nombre}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      r.prioridad === 'muy_alta' ? 'bg-rose-500/10 text-rose-400' :
                      r.prioridad === 'alta' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-white/5 text-white/40'
                    }`}>
                      {r.prioridad.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-white/30 mt-1.5">{r.descripcion}</p>
                </div>
              </div>
              
              {r.activo ? (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> ACTIVO
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 bg-white/5 px-3 py-1 rounded-full">
                  <AlertCircle className="w-3 h-3" /> PENDIENTE
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">URL Pública (Supabase Storage)</label>
                <div className="relative group/input">
                  <input 
                    type="text"
                    defaultValue={r.url_publica}
                    onBlur={(e) => {
                      if (e.target.value !== r.url_publica) {
                        handleSave(r.id, e.target.value, r.activo);
                      }
                    }}
                    className="w-full bg-black/20 border border-white/5 rounded-xl py-3 px-4 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all"
                  />
                  {r.url_publica !== 'PENDIENTE' && (
                    <a 
                      href={r.url_publica} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-lg text-white/20 hover:text-teal-400 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group/toggle">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={r.activo}
                        onChange={(e) => handleSave(r.id, r.url_publica, e.target.checked)}
                      />
                      <div className={`w-10 h-5 rounded-full transition-colors ${r.activo ? 'bg-teal-500' : 'bg-white/10'}`} />
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${r.activo ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-xs font-medium text-white/40 group-hover/toggle:text-white/60 transition-colors">Estado Activo</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  {msg?.id === r.id && (
                    <span className={`text-[10px] font-bold ${msg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'} animate-in fade-in duration-300`}>
                      {msg.text}
                    </span>
                  )}
                  <button 
                    disabled={saving === r.id}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {saving === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
