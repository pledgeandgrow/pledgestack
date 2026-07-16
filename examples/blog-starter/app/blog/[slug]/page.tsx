const posts: Record<string, { title: string; date: string; content: string }> = {
  'getting-started': {
    title: 'Getting Started with PledgeStack',
    date: '2026-07-15',
    content: 'PledgeStack is a full-stack React framework powered by PledgePack...',
  },
  'pledge-system': {
    title: 'Understanding the Pledge System',
    date: '2026-07-14',
    content: 'The Pledge System replaces use client/use server directives...',
  },
  'rust-bundler': {
    title: 'Why Rust for Build Tooling',
    date: '2026-07-13',
    content: 'Rust + Zig provides zero-cost abstractions and raw speed...',
  },
};

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = posts[params.slug];
  if (!post) return <p>Post not found</p>;

  return (
    <article>
      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <time className="text-sm text-gray-500 mb-6 block">{post.date}</time>
      <p className="text-gray-700 leading-relaxed">{post.content}</p>
    </article>
  );
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = posts[params.slug];
  return {
    title: post ? `${post.title} — PledgeStack Blog` : 'Not Found — PledgeStack Blog',
    description: post?.content.slice(0, 160),
  };
}

export function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}
