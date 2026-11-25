import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, Edit3, Trash2, X } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatCLP } from '../../lib/formatters';

export default function MaterialsPanel() {
  const { materials, saveMaterial, deleteMaterial, showToast } = useErp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    category: 'Acrílicos y Rígidos',
    format: '1.22x2.44',
    cost: 0,
    pricePerSqm: 20000,
    unit: 'm²',
  });

  const categories = useMemo(
    () => ['Todos', ...new Set(materials.map((m) => m.category))],
    [materials]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (category !== 'Todos' && m.category !== category) return false;
      if (!q) return true;
      return `${m.name} ${m.category} ${m.format}`.toLowerCase().includes(q);
    });
  }, [materials, category, search]);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveMaterial(form);
    setModalOpen(false);
    showToast(form.id ? 'Material actualizado' : 'Material agregado al Tarifario');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-red-600" />
            Tarifario de Materiales e Insumos ({materials.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Actualiza costos y precios de venta en CLP; se reflejan al instante en el Cotizador y la
            Web Pública.
          </p>
        </div>

        <button
          onClick={() => {
            setForm({
              id: '',
              name: '',
              category: 'Acrílicos y Rígidos',
              format: '1.22x2.44',
              cost: 0,
              pricePerSqm: 20000,
              unit: 'm²',
            });
            setModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Material
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                category === cat
                  ? 'bg-red-600 border-red-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar material..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-600"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-left">Material</th>
              <th className="py-3 px-4 text-left">Categoría</th>
              <th className="py-3 px-4 text-center">Formato</th>
              <th className="py-3 px-4 text-right">Costo Ref.</th>
              <th className="py-3 px-4 text-right">Precio Venta</th>
              <th className="py-3 px-4 text-center">Unidad</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-semibold text-slate-900">{m.name}</td>
                <td className="py-3 px-4 text-slate-600">{m.category}</td>
                <td className="py-3 px-4 text-center font-mono text-slate-500">{m.format}</td>
                <td className="py-3 px-4 text-right font-mono text-slate-500">
                  {formatCLP(m.cost)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                  {formatCLP(m.pricePerSqm)}
                </td>
                <td className="py-3 px-4 text-center text-slate-700">{m.unit}</td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => {
                        setForm(m);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar ${m.name} del tarifario?`)) {
                          deleteMaterial(m.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-bold text-slate-900 text-lg">
                {form.id ? 'Editar Material' : 'Nuevo Material'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                required
                placeholder="Nombre del material *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                >
                  <option value="Acrílicos y Rígidos">Acrílicos y Rígidos</option>
                  <option value="Telas PVC & Banners">Telas PVC & Banners</option>
                  <option value="Vinilos & Adhesivos">Vinilos & Adhesivos</option>
                  <option value="Letreros & Cajas de Luz">Letreros & Cajas de Luz</option>
                </select>
                <input
                  type="text"
                  placeholder="Formato (ej: 1.22x2.44)"
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Costo (CLP)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Precio Venta</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.pricePerSqm}
                    onChange={(e) => setForm({ ...form, pricePerSqm: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Unidad</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                  >
                    <option value="m²">m²</option>
                    <option value="unidad">unidad</option>
                    <option value="tira">tira</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Guardar Material
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
