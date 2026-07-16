export default function BlogPost({ params }: { params: { slug: string } }) {
  return (
    <article>
      <h1>Post: {params.slug}</h1>
      <p>This is a blog post.</p>
    </article>
  );
}
