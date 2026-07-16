export default function HomePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Welcome to PledgeStack</h1>
      <p className="text-lg text-gray-600 mb-6">
        A full-stack React framework powered by PledgePack (Rust+Zig bundler).
      </p>
      <a
        href="/blog"
        className="inline-block rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800"
      >
        Read the Blog →
      </a>
    </div>
  );
}
