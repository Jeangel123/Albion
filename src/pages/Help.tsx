import { useState } from 'react';
import { HelpCircle, ChevronDown, Mail, MessageSquare, BookOpen, Shield, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';

const FAQ_ITEMS = [
  { q: '¿Cómo creo un gremio?', a: 'Ve a la sección "Gremios" y pulsa "Crear gremio". Necesitas una cuenta verificada. Completa el nombre, descripción y actividades principales.' },
  { q: '¿Cómo subo de rango?', a: 'Participa activamente: publica, comenta, recibe reacciones, crea eventos y comunidades. Cada acción suma puntos de reputación que determinan tu rango medieval.' },
  { q: '¿Qué son las monedas de oro?', a: 'Las monedas se ganan al participar en la comunidad. Puedes canjearlas en la tienda por marcos de avatar únicos.' },
  { q: '¿Cómo funciona el Consejo del Reino?', a: 'Es el sistema de feedback. Propón ideas, vota las de otros usuarios y el equipo de administración revisará las más populares.' },
  { q: '¿Puedo cambiar mi idioma?', a: 'Sí. Ve a Ajustes > Idioma de la interfaz. Disponible en español, inglés y portugués.' },
  { q: '¿Cómo reporto contenido inapropiado?', a: 'Usa el botón "Reportar" en cualquier publicación o perfil. Nuestro equipo de moderación revisará el reporte.' },
  { q: '¿Cómo contacto al soporte?', a: 'Visita nuestra página de contacto o únete a nuestro servidor de Discord oficial.' },
];

export default function HelpPage() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="container-app max-w-3xl py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-gold-100 to-gold-50 p-3 dark:from-gold-950/50 dark:to-ink-900">
          <HelpCircle className="h-6 w-6 text-gold-600 dark:text-gold-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Centro de ayuda</h1>
          <p className="text-sm text-ink-500">Encuentra respuestas a las preguntas más frecuentes</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/contacto" className="card-medieval card-hover p-4">
          <Mail className="h-5 w-5 text-gold-500" />
          <p className="mt-2 text-sm font-semibold">Contacto</p>
          <p className="text-xs text-ink-500">Escríbenos directamente</p>
        </Link>
        <Link to="/terminos" className="card-medieval card-hover p-4">
          <BookOpen className="h-5 w-5 text-gold-500" />
          <p className="mt-2 text-sm font-semibold">Términos</p>
          <p className="text-xs text-ink-500">Condiciones de uso</p>
        </Link>
        <Link to="/privacidad" className="card-medieval card-hover p-4">
          <Shield className="h-5 w-5 text-gold-500" />
          <p className="mt-2 text-sm font-semibold">Privacidad</p>
          <p className="text-xs text-ink-500">Política de datos</p>
        </Link>
        <Link to="/reglas" className="card-medieval card-hover p-4">
          <MessageSquare className="h-5 w-5 text-gold-500" />
          <p className="mt-2 text-sm font-semibold">Reglas</p>
          <p className="text-xs text-ink-500">Normas de la comunidad</p>
        </Link>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Preguntas frecuentes</h2>
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="card-medieval overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <span className="text-sm font-medium text-ink-900 dark:text-white">{item.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-gold-500 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && (
              <div className="animate-fade-in px-4 pb-4 text-sm text-ink-600 dark:text-ink-300">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
