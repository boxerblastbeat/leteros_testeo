import React, { useState } from 'react';
import { Lock, X, ShieldCheck, Database, MessageCircle } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { COMPANY_INFO } from '../../data/company';
import { useModalClose } from '../../lib/useModalClose';

const LAST_EMAIL_KEY = 'olivar_last_login_email';
const DEFAULT_LOGIN_DOMAIN = 'letrerosolivar.com';

const normalizeLoginIdentifier = (raw) => {
  const clean = String(raw || '').trim().toLowerCase();
  if (!clean) return '';
  return clean.includes('@') ? clean : `${clean}@${DEFAULT_LOGIN_DOMAIN}`;
};

export default function LoginModal({ open, onClose, onSuccess }) {
  const { signIn, isCloud } = useErp();
  const [identifier, setIdentifier] = useState(() => {
    try {
      return localStorage.getItem(LAST_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { handleClose, handleBackdropClick } = useModalClose(open, onClose, { confirm: false });

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const resolvedEmail = normalizeLoginIdentifier(identifier);
      await signIn(resolvedEmail, password);
      try {
        localStorage.setItem(LAST_EMAIL_KEY, identifier.trim());
      } catch {
        // ignore
      }
      setPassword('');
      onSuccess?.();
    } catch (err) {
      setError(err?.message || 'Credenciales inválidas');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
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
            type="button"
            onClick={handleClose}
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
                : 'Acceso restringido a personal autorizado de Letreros Olivar.'}
            </span>
          </div>

          {isCloud && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Usuario o correo
              </label>
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                placeholder="Ej: taller, ventas o correo@letrerosolivar.com"
              />
              {identifier.trim() && !identifier.includes('@') && (
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Ingresará como: {normalizeLoginIdentifier(identifier)}
                </p>
              )}
            </div>
          )}

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

          <div className="pt-2 border-t border-slate-100 text-center">
            <a
              href={`https://wa.me/${COMPANY_INFO.whatsapp}?text=${encodeURIComponent(
                `Hola, necesito una contraseña temporal para mi usuario de la Intranet (${identifier.trim() || 'mi cuenta'}).`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>¿Necesitas clave temporal? Contactar al Administrador</span>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
