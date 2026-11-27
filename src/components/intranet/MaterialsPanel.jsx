import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, Edit3, Trash2, X, AlertTriangle, Minus } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatCLP } from '../../lib/formatters';
import { useModalClose } from '../../lib/useModalClose';

const STOCK_STORAGE_KEY = 'olivar_bodega_stock_v1';
const readStockMap = () => {
  try {
    return JSON.parse(localStorage.getItem(STOCK_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

export default function MaterialsPanel() {
  const { materials, saveMaterial, deleteMaterial, showToast } = useErp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [stockMap, setStockMap] = useState(() => readStockMap());
  const [modalOpen, setModalOpen] = useState(false);

  const getStockEntry = (m) => {
    if (m.stock !== null && m.stock !== undefined) {
      return { stock: Number(m.stock) || 0, minStock: Number(m.minStock ?? 3) };
    }
    return stockMap[m.id] || null;
  };

  const updateStock = (m, nextStock, nextMinStock = undefined) => {
    const current = getStockEntry(m) || { stock: 0, minStock: 3 };
    const cleanStock = Math.max(0, Math.round(Number(nextStock) || 0));
    const cleanMin =
      nextMinStock !== undefined ? Math.max(0, Math.round(Number(nextMinStock) || 0)) : current.minStock;
    setStockMap((prev) => {
      const updated = {
        ...prev,
        [m.id]: { stock: cleanStock, minStock: cleanMin },
      };
      try {
        localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage quota
      }
      return updated;
    });
    saveMaterial({ ...m, stock: cleanStock, minStock: cleanMin }).catch(() => {});
  };

  const lowStockItems = useMemo(() => {
    return materials.filter((m) => {
      const s = getStockEntry(m);
      return s && s.minStock > 0 && s.stock <= s.minStock;
    });
  }, [materials, stockMap]);
  const { handleClose: requestCloseModal, handleBackdropClick } = useModalClose(
    modalOpen,
    () => setModalOpen(false),
    { confirm: true, message: '¿Cerrar ficha de material? Los cambios no guardados se perderán.' }
  );
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
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-red-600 shrink-0" />
            <span>Tarifario de Materiales e Insumos ({materials.length})</span>
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
          className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Material
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition whitespace-nowrap shrink-0 ${
                category === cat
                  ? 'bg-red-600 border-red-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
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

      {lowStockItems.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Alerta de Bodega:</strong> {lowStockItems.length}{' '}
              {lowStockItems.length === 1 ? 'material está' : 'materiales están'} en stock mínimo o
              agotado ({lowStockItems.map((m) => `${m.name}: ${getStockEntry(m)?.stock ?? 0}`).join(' · ')}).
            </span>
          </div>
        </div>
      )}

      {/* Vista Tarjetas en Móvil */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((m) => {
          const st = getStockEntry(m);
          const hasStock = st !== null;
          const isOut = hasStock && st.stock === 0;
          const isLow = hasStock && st.stock > 0 && st.stock <= st.minStock;
          return (
          <div
            key={m.id}
            className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {m.category}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1 break-words">{m.name}</h3>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Formato: {m.format} · Unidad: {m.unit}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => {
                    setForm(m);
                    setModalOpen(true);
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  aria-label="Editar material"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`¿Eliminar ${m.name} del tarifario?`)) {
                      deleteMaterial(m.id);
                    }
                  }}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200"
                  aria-label="Eliminar material"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">
                  Costo: <strong className="font-mono text-slate-700">{formatCLP(m.cost)}</strong>
                </span>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateStock(m, (st?.stock ?? 0) - 1)}
                    className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 inline-flex items-center justify-center"
                    aria-label="Restar stock"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      isOut
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : isLow
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : hasStock
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    Stock: {hasStock ? st.stock : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateStock(m, (st?.stock ?? 0) + 1)}
                    className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 inline-flex items-center justify-center"
                    aria-label="Sumar stock"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <span className="font-mono font-extrabold text-emerald-700 text-sm">
                {formatCLP(m.pricePerSqm)} / {m.unit}
              </span>
            </div>
          </div>
          );
        })}
      </div>

      {/* Vista Tabla en Tablet / Desktop */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-left">Material</th>
              <th className="py-3 px-4 text-left">Categoría</th>
              <th className="py-3 px-4 text-center">Formato</th>
              <th className="py-3 px-4 text-right">Costo Ref.</th>
              <th className="py-3 px-4 text-right">Precio Venta</th>
              <th className="py-3 px-4 text-center">Unidad</th>
              <th className="py-3 px-4 text-center">Bodega / Stock</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((m) => {
              const st = getStockEntry(m);
              const hasStock = st !== null;
              const isOut = hasStock && st.stock === 0;
              const isLow = hasStock && st.stock > 0 && st.stock <= st.minStock;
              return (
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
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateStock(m, (st?.stock ?? 0) - 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center"
                      title="Restar 1"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span
                      className={`min-w-[54px] px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                        isOut
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : isLow
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : hasStock
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                      title={hasStock ? `Mínimo alerta: ${st.minStock}` : 'Haz clic en + para activar control de stock'}
                    >
                      {hasStock ? st.stock : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateStock(m, (st?.stock ?? 0) + 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center"
                      title="Sumar 1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <form
            onSubmit={handleSave}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-bold text-slate-900 text-lg">
                {form.id ? 'Editar Material' : 'Nuevo Material'}
              </h3>
              <button
                type="button"
                onClick={requestCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-700"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                <div className="col-span-2 sm:col-span-1">
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
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Stock Bodega (opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Sin control"
                    value={form.stock ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stock: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Stock Mínimo (alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minStock ?? 3}
                    onChange={(e) =>
                      setForm({ ...form, minStock: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-mono text-slate-900"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={requestCloseModal}
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
