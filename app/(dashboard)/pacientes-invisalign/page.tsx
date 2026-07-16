"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, RefreshCw, Users } from "lucide-react";

interface PacienteExistente {
  id: string; nombre: string; tipo_doc: string; cedula: string;
  fecha_primera_consulta: string; fecha_ultima_consulta: string;
  folios: number; telefono: string | null; notas: string | null;
}

export default function PacientesInvisalignPage() {
  const [pacientes, setPacientes] = useState<PacienteExistente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTel, setEditTel] = useState("");
  const [editNotas, setEditNotas] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("pacientes_existentes").select("*").order("nombre");
    setPacientes((data || []) as PacienteExistente[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtrados = pacientes.filter(p => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.cedula || "").includes(busqueda));

  const guardarEdicion = async (id: string) => {
    await supabase.from("pacientes_existentes").update({ telefono: editTel || null, notas: editNotas || null }).eq("id", id);
    await load(); setEditId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Pacientes en tratamiento</p>
          <h1 style={{ fontFamily:"var(--font-cormorant)", fontSize:"2rem", fontWeight:500, color:"var(--text)" }}>
            Base Invisalign
          </h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>{pacientes.length} pacientes · Ortodoncia invisible</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl"
          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--text-3)" }} />
        <input type="text" placeholder="Buscar por nombre o cédula..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
          style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor:"rgba(6,182,212,0.2)", borderTopColor:"var(--cyan)" }} /></div>
      ) : (
        <div className="dm-card overflow-hidden">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid var(--border)" }}>
                  {["Nombre","Doc","Cédula","Primera consulta","Última consulta","Folios","Teléfono","Notas"].map(h => (
                    <th key={h} className="text-left px-4 py-3 section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id} className="table-row-hover" style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-3 font-semibold text-sm" style={{ color:"var(--text)" }}>{p.nombre}</td>
                    <td className="px-4 py-3 text-sm" style={{ color:"var(--text-3)" }}>{p.tipo_doc}</td>
                    <td className="px-4 py-3 text-sm" style={{ color:"var(--text-2)" }}>{p.cedula}</td>
                    <td className="px-4 py-3 text-sm" style={{ color:"var(--text-3)" }}>
                      {p.fecha_primera_consulta ? format(new Date(p.fecha_primera_consulta + 'T12:00:00'), "d MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color:"var(--text-3)" }}>
                      {p.fecha_ultima_consulta ? format(new Date(p.fecha_ultima_consulta + 'T12:00:00'), "d MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge badge-cyan">{p.folios}</span>
                    </td>
                    <td className="px-4 py-3">
                      {editId === p.id ? (
                        <input value={editTel} onChange={e => setEditTel(e.target.value)}
                          placeholder="+57..." className="w-32 px-2 py-1 text-sm rounded-lg"
                          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(6,182,212,0.3)", color:"var(--text)" }}
                          onKeyDown={e => e.key === "Enter" && guardarEdicion(p.id)} />
                      ) : (
                        <span className="text-sm cursor-pointer" style={{ color: p.telefono ? "var(--cyan)" : "var(--text-3)" }}
                          onClick={() => { setEditId(p.id); setEditTel(p.telefono || ""); setEditNotas(p.notas || ""); }}>
                          {p.telefono || "＋ agregar"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editId === p.id ? (
                        <div className="flex gap-1">
                          <input value={editNotas} onChange={e => setEditNotas(e.target.value)}
                            placeholder="nota..." className="w-28 px-2 py-1 text-sm rounded-lg"
                            style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(6,182,212,0.3)", color:"var(--text)" }} />
                          <button onClick={() => guardarEdicion(p.id)} className="text-sm px-2 py-1 rounded-lg" style={{ background:"var(--cyan)", color:"#000" }}>✓</button>
                          <button onClick={() => setEditId(null)} className="text-sm px-2 py-1 rounded-lg" style={{ background:"rgba(255,255,255,0.05)", color:"var(--text-3)" }}>✕</button>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color:"var(--text-3)" }}>{p.notas || "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <div className="text-center py-10">
                <Users className="w-8 h-8 mx-auto mb-2" style={{ color:"var(--text-3)" }} />
                <p className="text-sm" style={{ color:"var(--text-3)" }}>No se encontraron pacientes</p>
              </div>
            )}
          </div>
          {/* Mobile */}
          <div className="sm:hidden divide-y" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
            {filtrados.map(p => (
              <div key={p.id} className="p-4">
                <p className="font-semibold text-sm mb-1" style={{ color:"var(--text)" }}>{p.nombre}</p>
                <div className="flex flex-wrap gap-2 text-sm" style={{ color:"var(--text-3)" }}>
                  <span>{p.tipo_doc} {p.cedula}</span>
                  <span className="badge badge-cyan">{p.folios} folios</span>
                  {p.telefono && <span style={{ color:"var(--cyan)" }}>{p.telefono}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
