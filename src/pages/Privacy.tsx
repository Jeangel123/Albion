import { Shield } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Recopilación de datos',
    body: 'Imperio recopila los datos que nos proporcionas directamente: nombre de usuario, correo electrónico, foto de perfil, biografía y enlaces sociales. También registramos datos de actividad como publicaciones, comentarios, votos y transacciones.',
  },
  {
    title: '2. Uso de la información',
    body: 'Utilizamos tu información para proporcionar y mejorar nuestros servicios, personalizar tu experiencia, comunicarnos contigo, garantizar la seguridad y prevenir abusos del sistema.',
  },
  {
    title: '3. Compartir datos',
    body: 'No vendemos ni alquilamos tus datos personales. Compartimos información con nuestro proveedor de infraestructura (Supabase) únicamente para el funcionamiento del servicio. Podemos divulgar datos cuando sea requerido por ley.',
  },
  {
    title: '4. Cookies y almacenamiento local',
    body: 'Utilizamos almacenamiento local del navegador para recordar tus preferencias de tema, idioma y sesión. No utilizamos cookies de seguimiento de terceros.',
  },
  {
    title: '5. Seguridad',
    body: 'Implementamos Row Level Security (RLS) en todas las tablas de la base de datos. Las contraseñas se almacenan cifradas mediante el proveedor de autenticación. Solo el propietario puede acceder a sus datos privados.',
  },
  {
    title: '6. Tus derechos',
    body: 'Puedes acceder, modificar o eliminar tus datos personales en cualquier momento desde la página de Ajustes. Para solicitar la eliminación completa de tu cuenta, contacta a soporte.',
  },
  {
    title: '7. Retención de datos',
    body: 'Mantenemos tus datos mientras tu cuenta esté activa. Tras la eliminación de la cuenta, los datos se eliminan permanentemente en un plazo de 30 días, salvo cuando la ley exija conservarlos.',
  },
  {
    title: '8. Cambios en esta política',
    body: 'Podemos actualizar esta política ocasionalmente. Te notificaremos sobre cambios significativos mediante un anuncio en la plataforma.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="container-app max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-gold-100 to-gold-50 p-3 dark:from-gold-950/50 dark:to-ink-900">
          <Shield className="h-6 w-6 text-gold-600 dark:text-gold-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Política de privacidad</h1>
          <p className="text-sm text-ink-500">Última actualización: julio 2026</p>
        </div>
      </div>
      <div className="card-medieval p-6 space-y-5">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Tu privacidad es importante para nosotros. Esta política describe cómo Imperio recopila, usa y protege tus datos personales.
        </p>
        {SECTIONS.map((s, i) => (
          <div key={i}>
            <h2 className="font-display text-base font-semibold text-gold-700 dark:text-gold-400">{s.title}</h2>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
