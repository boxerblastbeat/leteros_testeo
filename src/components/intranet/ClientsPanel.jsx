import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, Edit3, Trash2, Phone, Mail, MapPin, X } from 'lucide-react';
import { useErp } from '../../context/ErpContext';

export default function ClientsPanel() {
  const { clients, saveClient, deleteClient, showToast } = useErp();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    rut: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    client_type: 'Empresa',
    notes: '',
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.rut, c.contact_name, c.phone, c.email, c.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [clients, search]);

  const openNew = () => {
    setForm({
      id: '',
      name: '',
      rut: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      client_type: 'Empresa',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setForm({
      id: c.id,
      name: c.name || '',
      rut: c.rut || '',
      contact_name: c.contact_name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      client_type: c.client_type || 'Empresa',
      notes: c.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await saveClient(form);
    setModalOpen(false);
    showToast(form.id ? 'Cliente actualizado' : 'Cliente agregado al Maestro');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" />
            Maestro de Clientes ({clients.length})
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Base centralizada de empresas y particulares disponible en 1 clic desde el Cotizador.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente o RUT..."
              className="pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>
          <button
            onClick={openNew}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                    {c.client_type || 'Empresa'}
                  </span>
                  <h3 className="font-bold text-white text-base mt-1.5">{c.name}</h3>
                  {c.rut && <p className="text-xs font-mono text-red-400">{c.rut}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar cliente ${c.name}?`)) {
                        deleteClient(c.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-zinc-400 pt-1">
                {c.contact_name && <div>Contacto: {c.contact_name}</div>}
                {c.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" />
                    {c.phone}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    {c.email}
                  </div>
                )}
                {c.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    {c.address}
                  </div>
                )}
              </div>
              {c.notes && <p className="text-xs text-zinc-500 italic pt-1">{c.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-bold text-white text-lg">
                {form.id ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Razón Social / Nombre *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
              <input
                type="text"
                placeholder="RUT"
                value={form.rut}
                onChange={(e) => setForm({ ...form, rut: e.target.value })}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
              <select
                value={form.client_type}
                onChange={(e) => setForm({ ...form, client_type: e.target.value })}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              >
                <option value="Empresa">Empresa</option>
                <option value="Particular">Particular</option>
                <option value="Institución">Institución</option>
              </select>
              <input
                type="text"
                placeholder="Persona de contacto"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Teléfono / WhatsApp"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Dirección comercial"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
              <textarea
                rows={2}
                placeholder="Notas comerciales..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Guardar Cliente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
