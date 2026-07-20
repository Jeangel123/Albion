import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Spinner, EmptyState } from '../components/ui';

export default function RulesPage() {
  const [rules, setRules] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_config').select('community_rules').eq('id', 1).maybeSingle();
      setRules(data?.community_rules ?? null);
    })();
  }, []);

  if (rules === null) return <Spinner className="py-20" />;
  if (!rules) return <EmptyState icon={ScrollText} title="Sin reglas" />;

  return (
    <div className="container-app max-w-2xl py-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-900 dark:text-white">Reglas de la comunidad</h1>
      <div className="card p-6">
        <div className="space-y-3">
          {rules.split('\n').filter(Boolean).map((line, i) => (
            <p key={i} className="text-sm text-ink-700 dark:text-ink-200">{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
