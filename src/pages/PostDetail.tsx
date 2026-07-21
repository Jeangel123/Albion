import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PostCard } from '../components/PostCard';
import { Spinner, EmptyState } from '../components/ui';
import type { Post, Profile } from '../lib/types';

type PostWithAuthor = Post & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank'> };

export default function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank)').eq('id', id).maybeSingle();
      setPost(data as PostWithAuthor | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Spinner className="py-20" />;
  if (!post) return <EmptyState icon={MessageCircle} title="Publicación no encontrada" action={{ to: '/', label: 'Inicio' }} />;

  return (
    <div className="container-app max-w-2xl py-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4" /> Volver</Link>
      <PostCard post={post} author={post.author} />
    </div>
  );
}
