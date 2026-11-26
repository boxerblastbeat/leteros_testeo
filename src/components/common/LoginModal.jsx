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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-slate-900 text-lg">Acceso Intranet ERP</h3>
              <p className="text-xs text-slate-500">Taller y Administración · Letreros Olivar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div
            className={`text-xs px-3 py-2.5 rounded-xl border flex items-center gap-2 ${
              isCloud
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>
              {isCloud
                ? 'Conectado a Supabase Auth (PostgreSQL en la nube).'
                : 'Faltan variables de Supabase (.env) en este entorno.'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Correo corporativo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
              placeholder="contacto@letrerosolivar.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contraseña</label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-red-600/20"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? 'Verificando...' : 'Ingresar a Intranet'}
          </button>
        </form>
      </div>
    </div>
  );
}
