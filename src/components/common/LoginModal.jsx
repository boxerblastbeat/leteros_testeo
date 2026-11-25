import React, { useState } from 'react';
import { Lock, X, ShieldCheck, Database } from 'lucide-react';
import { useErp } from '../../context/ErpContext';

export default function LoginModal({ open, onClose, onSuccess }) {
  const { signIn, isCloud } = useErp();
  const [email, setEmail] = useState('contacto@letrerosolivar.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      setPassword('');
      onSuccess?.();
    } catch (err) {
      setError(err?.message || 'Credenciales inválidas');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-500">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-white text-lg">Acceso Intranet ERP</h3>
              <p className="text-xs text-zinc-400">Taller y Administración · Letreros Olivar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div
            className={`text-xs px-3 py-2.5 rounded-xl border flex items-center gap-2 ${
              isCloud
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-200'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>
              {isCloud
                ? 'Conectado a Supabase Auth (PostgreSQL en la nube).'
                : 'Modo Local Demo activo. Clave de prueba: olivar2026'}
            </span>
          </div>

          {isCloud && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Correo corporativo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                placeholder="contacto@letrerosolivar.com"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Contraseña</label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
              placeholder={isCloud ? '••••••••' : 'olivar2026'}
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? 'Verificando...' : 'Ingresar a Intranet'}
          </button>
        </form>
      </div>
    </div>
  );
}
