import { BookOpen } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Aceptación de los términos',
    body: 'Al crear una cuenta o usar Imperio, aceptas estos términos y condiciones. Si no estás de acuerdo, no debes utilizar la plataforma.',
  },
  {
    title: '2. Elegibilidad',
    body: 'Debes tener al menos 13 años para crear una cuenta. Los menores de 18 años deben contar con el consentimiento de un padre o tutor legal.',
  },
  {
    title: '3. Conducta del usuario',
    body: 'Te comprometes a no publicar contenido ofensivo, ilegal, difamatorio o que infrinja derechos de terceros. Está prohibido el acoso, el spam, la suplantación de identidad y cualquier forma de discriminación.',
  },
  {
    title: '4. Contenido del usuario',
    body: 'Mantienes la propiedad del contenido que publicas. Nos otorgas una licencia no exclusiva para mostrar y distribuir tu contenido dentro de la plataforma. Eres responsable de lo que publicas.',
  },
  {
    title: '5. Moderación',
    body: 'El equipo de administración se reserva el derecho de eliminar contenido, suspender o banear cuentas que violen las normas de la comunidad o estos términos.',
  },
  {
    title: '6. Sistema de reputación y rangos',
    body: 'Los puntos de reputación y rangos se asignan automáticamente según tu actividad. El sistema de recompensas (monedas, marcos) puede modificarse en cualquier momento. No se permite la manipulación del sistema.',
  },
  {
    title: '7. Propiedad intelectual',
    body: 'El diseño, código, logos y marca de Imperio son propiedad del proyecto. Albion Online es una marca registrada de Sandbox Interactive GmbH; Imperio no está afiliado ni patrocinado por ellos.',
  },
  {
    title: '8. Limitación de responsabilidad',
    body: 'Imperio se ofrece "tal cual". No garantizamos disponibilidad continua ni ausencia de errores. No somos responsables por daños indirectos derivados del uso de la plataforma.',
  },
  {
    title: '9. Terminación',
    body: 'Puedes eliminar tu cuenta en cualquier momento. Podemos suspender o terminar cuentas que violen estos términos o por motivos de seguridad.',
  },
  {
    title: '10. Cambios a los términos',
    body: 'Podemos actualizar estos términos ocasionalmente. Los cambios significativos se anunciarán en la plataforma. El uso continuado constituye aceptación de los nuevos términos.',
  },
];

export default function TermsPage() {
  return (
    <div className="container-app max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-gold-100 to-gold-50 p-3 dark:from-gold-950/50 dark:to-ink-900">
          <BookOpen className="h-6 w-6 text-gold-600 dark:text-gold-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Términos y condiciones</h1>
          <p className="text-sm text-ink-500">Última actualización: julio 2026</p>
        </div>
      </div>
      <div className="card-medieval p-6 space-y-5">
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
