import { useState } from 'react';
import { Mail, Send, MessageSquare, ExternalLink } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

export default function ContactPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      push({ type: 'error', message: 'Asunto y mensaje son obligatorios' });
      return;
    }
    setSending(true);
    const { error } = await supabase.from('contact_messages').insert({
      user_id: profile?.id ?? null,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSending(false);
    if (error) {
      push({ type: 'error', message: 'No se pudo enviar. Inténtalo más tarde.' });
      return;
    }
    push({ type: 'success', message: 'Mensaje enviado. Te responderemos pronto.' });
    setSubject('');
    setMessage('');
  }

  return (
    <div className="container-app max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-gold-100 to-gold-50 p-3 dark:from-gold-950/50 dark:to-ink-900">
          <Mail className="h-6 w-6 text-gold-600 dark:text-gold-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Contacto</h1>
          <p className="text-sm text-ink-500">¿Tienes dudas o sugerencias? Escríbenos</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a href="https://discord.gg/imperio" target="_blank" rel="noopener noreferrer" className="card-medieval card-hover p-4 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-gold-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Discord</p>
            <p className="text-xs text-ink-500">Únete a la comunidad</p>
          </div>
          <ExternalLink className="h-4 w-4 text-ink-400" />
        </a>
        <a href="mailto:soporte@imperio.app" className="card-medieval card-hover p-4 flex items-center gap-3">
          <Mail className="h-5 w-5 text-gold-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Correo</p>
            <p className="text-xs text-ink-500">soporte@imperio.app</p>
          </div>
          <ExternalLink className="h-4 w-4 text-ink-400" />
        </a>
      </div>

      <form onSubmit={submit} className="card-medieval mt-4 space-y-4 p-6">
        <div>
          <label className="label">Asunto</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input"
            placeholder="¿Sobre qué nos escribes?"
            maxLength={120}
          />
        </div>
        <div>
          <label className="label">Mensaje</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="input resize-none"
            placeholder="Cuéntanos en detalle..."
            maxLength={2000}
          />
        </div>
        <button disabled={sending} className="btn-primary">
          <Send className="h-4 w-4" /> {sending ? 'Enviando...' : 'Enviar mensaje'}
        </button>
      </form>
    </div>
  );
}
