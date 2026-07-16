const posts = [
  { slug: 'getting-started', title: 'Getting Started with PledgeStack', date: '2026-07-15' },
  { slug: 'pledge-system', title: 'Understanding the Pledge System', date: '2026-07-14' },
  { slug: 'rust-bundler', title: 'Why Rust for Build Tooling', date: '2026-07-13' },
];

export default function BlogList() {
  return (
    <ul className="space-y-4">
      {posts.map((post) => (
        <li key={post.slug}>
          <a href={`/blog/${post.slug}`} className="block rounded-lg border p-4 hover:border-gray-400">
            <h3 className="text-lg font-semibold">{post.title}</h3>
            <time className="text-sm text-gray-500">{post.date}</time>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}
