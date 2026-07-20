import { useState } from 'react';
import {
  ClipboardCheck, User, Shield, Gavel, Crown, Check, Circle, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { isStaff, isFounder } from '../lib/permissions';

type CheckState = 'pending' | 'ok' | 'fail';
type CheckItem = { id: string; label: string; state: CheckState };

const USER_CHECKS: CheckItem[] = [
  { id: 'reg', label: 'Registro de cuenta nueva', state: 'pending' },
  { id: 'login', label: 'Inicio de sesión', state: 'pending' },
  { id: 'profile', label: 'Edición de perfil (avatar, bio, banner)', state: 'pending' },
  { id: 'post', label: 'Crear / editar / eliminar publicación', state: 'pending' },
  { id: 'comm', label: 'Crear y unirse a comunidad', state: 'pending' },
  { id: 'chat', label: 'Enviar mensaje en chat de comunidad', state: 'pending' },
  { id: 'report', label: 'Reportar contenido con categoría', state: 'pending' },
  { id: 'council', label: 'Crear y votar propuesta del Consejo', state: 'pending' },
  { id: 'shop', label: 'Comprar marco en tienda', state: 'pending' },
  { id: 'wallet', label: 'Ver monedero y transacciones', state: 'pending' },
];

const MOD_CHECKS: CheckItem[] = [
  { id: 'rep', label: 'Ver reportes en cola de moderación', state: 'pending' },
  { id: 'sanction', label: 'Aplicar advertencia / suspensión', state: 'pending' },
  { id: 'resolve', label: 'Resolver y descartar reportes', state: 'pending' },
  { id: 'audit', label: 'Consultar audit_log (solo lectura)', state: 'pending' },
];

const ADMIN_CHECKS: CheckItem[] = [
  { id: 'users', label: 'Gestión de usuarios (suspender, cambiar rol)', state: 'pending' },
  { id: 'econ', label: 'Ajustar economía (recompensas, monedas)', state: 'pending' },
  { id: 'guilds', label: 'Verificar gremios y alianzas', state: 'pending' },
  { id: 'comm-manage', label: 'Gestionar comunidades', state: 'pending' },
  { id: 'config', label: 'Configuración de plataforma', state: 'pending' },
];

const FOUNDER_CHECKS: CheckItem[] = [
  { id: 'full', label: 'Control completo del panel', state: 'pending' },
  { id: 'roles', label: 'Gestión de roles superiores', state: 'pending' },
  { id: 'maint', label: 'Modo mantenimiento', state: 'pending' },
  { id: 'global', label: 'Configuración global (nombre, logo, banner)', state: 'pending' },
];

function CheckList({ items, setItems }: { items: CheckItem[]; setItems: (i: CheckItem[]) => void }) {
  function cycle(id: string) {
    setItems(items.map((i) => i.id === id ? { ...i, state: i.state === 'pending' ? 'ok' : i.state === 'ok' ? 'fail' : 'pending' } : i));
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.id}>
          <button
            onClick={() => cycle(item.id)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-ink-50 dark:hover:bg-ink-800/50"
          >
            {item.state === 'ok' && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
            {item.state === 'fail' && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
            {item.state === 'pending' && <Circle className="h-4 w-4 shrink-0 text-ink-300 dark:text-ink-600" />}
            <span className={item.state === 'ok' ? 'text-ink-800 dark:text-ink-100' : item.state === 'fail' ? 'text-red-600 dark:text-red-400' : 'text-ink-600 dark:text-ink-300'}>
              {item.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RoleCard({
  icon: Icon, title, subtitle, accent, items, setItems,
}: {
  icon: typeof User; title: string; subtitle: string; accent: string;
  items: CheckItem[]; setItems: (i: CheckItem[]) => void;
}) {
  const done = items.filter((i) => i.state === 'ok').length;
  const failed = items.filter((i) => i.state === 'fail').length;
  return (
    <div className="card-medieval p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <p className="text-xs text-ink-500">{subtitle}</p>
        </div>
        <span className={`chip text-xs ${failed > 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : done === items.length ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
          {done}/{items.length}
        </span>
      </div>
      <CheckList items={items} setItems={setItems} />
    </div>
  );
}

export default function BetaTestGuidePage() {
  const { profile } = useAuth();
  const [userItems, setUserItems] = useState(USER_CHECKS);
  const [modItems, setModItems] = useState(MOD_CHECKS);
  const [adminItems, setAdminItems] = useState(ADMIN_CHECKS);
  const [founderItems, setFounderItems] = useState(FOUNDER_CHECKS);

  const showStaff = profile && isStaff(profile.role);
  const showFounder = profile && isFounder(profile.role);

  return (
    <div className="container-app max-w-4xl py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gold-100 p-3 dark:bg-gold-950">
          <ClipboardCheck className="h-6 w-6 text-gold-600 dark:text-gold-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Guía de pruebas — Beta cerrada</h1>
          <p className="text-sm text-ink-500">Verifica cada módulo antes del lanzamiento. Pulsa cada ítem para marcarlo.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RoleCard
          icon={User} title="Usuario normal" subtitle="Flujo base de la plataforma"
          accent="bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
          items={userItems} setItems={setUserItems}
        />
        {showStaff && (
          <RoleCard
            icon={Shield} title="Moderador" subtitle="Moderación y reportes"
            accent="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
            items={modItems} setItems={setModItems}
          />
        )}
        {showStaff && (
          <RoleCard
            icon={Gavel} title="Admin" subtitle="Gestión y economía"
            accent="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
            items={adminItems} setItems={setAdminItems}
          />
        )}
        {showFounder && (
          <RoleCard
            icon={Crown} title="Founder" subtitle="Control supremo"
            accent="bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
            items={founderItems} setItems={setFounderItems}
          />
        )}
      </div>

      <div className="card-medieval mt-6 p-5">
        <h2 className="mb-2 font-display text-base font-semibold">Notas de seguridad</h2>
        <ul className="space-y-1.5 text-sm text-ink-600 dark:text-ink-300">
          <li>• RLS activado en las 41 tablas de la base de datos.</li>
          <li>• Rutas protegidas: /admin y /moderacion requieren staff.</li>
          <li>• El rol founder no puede autoasignarse desde la UI.</li>
          <li>• Solo el founder puede gestionar roles superiores.</li>
          <li>• Todas las acciones de moderación se registran en audit_log.</li>
        </ul>
      </div>
    </div>
  );
}
