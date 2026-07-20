import { ScrollText, Check, X } from 'lucide-react';
import { Spinner } from '../components/ui';

const ALLOWED = [
  'Contenido relacionado con Albion Online y videojuegos',
  'Arte, ilustraciones y creatividad de la comunidad',
  'Anime, fantasía y temática medieval',
  'Guías, tutoriales y debates constructivos',
  'Eventos, reclutamiento y organización de gremios',
];

const FORBIDDEN = [
  { label: 'Pornografía y contenido sexual explícito', emoji: '🔞' },
  { label: 'Contenido ilegal de cualquier tipo', emoji: '🚫' },
  { label: 'Acoso, amenazas o intimidación', emoji: '⚠️' },
  { label: 'Discurso de odio y discriminación', emoji: '🚫' },
  { label: 'Spam y publicidad no autorizada', emoji: '📨' },
  { label: 'Estafas o intentos de engaño', emoji: '🎭' },
  { label: 'Suplantación de identidad', emoji: '👤' },
  { label: 'Contenido que viole los términos de Albion Online', emoji: '📋' },
];

const SANCTIONS_INFO = [
  { type: 'Advertencia', desc: 'Aviso por primera infracción leve. Se registra en el historial.', emoji: '⚠️' },
  { type: 'Suspensión temporal', desc: 'Bloqueo temporal del acceso a la plataforma.', emoji: '⏸️' },
  { type: 'Bloqueo permanente', desc: 'Bloqueo definitivo de la cuenta.', emoji: '🔨' },
];

export default function RulesPage() {
  return (
    <div className="container-app max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gold-100 p-3 dark:bg-gold-950">
          <ScrollText className="h-6 w-6 text-gold-600 dark:text-gold-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Normas del Reino</h1>
          <p className="text-sm text-ink-500">Reglas de contenido y moderación de la comunidad</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-5 w-5" /> Contenido permitido
          </h2>
          <ul className="space-y-2">
            {ALLOWED.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-200">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-red-600 dark:text-red-400">
            <X className="h-5 w-5" /> Contenido prohibido
          </h2>
          <ul className="space-y-2">
            {FORBIDDEN.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-200">
                <span className="text-base">{item.emoji}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900 dark:text-white">Sistema de sanciones</h2>
          <div className="space-y-3">
            {SANCTIONS_INFO.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50">
                <span className="text-xl">{s.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{s.type}</p>
                  <p className="text-xs text-ink-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-purple-600 dark:text-purple-400">
            Moderación con IA
          </h2>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Imperio cuenta con un sistema de moderación asistida por IA llamado <strong className="text-purple-600 dark:text-purple-400">Vaelyra</strong>,
            que ayuda a detectar contenido sospechoso, spam y posibles infracciones. Toda acción tomada por Vaelyra
            es revisada y aprobada por un moderador humano antes de aplicarse.
          </p>
        </div>
      </div>
    </div>
  );
}
