export default function HomePage() {
  const products = [
    { name: 'Wireless Headphones', category: 'Electronics', price: '$99.99', oldPrice: '$149.99', emoji: '🎧', rating: 4.8, reviews: 342 },
    { name: 'Smart Watch Pro', category: 'Electronics', price: '$199.99', oldPrice: null, emoji: '⌚', rating: 4.6, reviews: 189 },
    { name: 'Coffee Maker', category: 'Home', price: '$79.99', oldPrice: '$99.99', emoji: '☕', rating: 4.5, reviews: 256 },
    { name: 'Running Shoes', category: 'Sports', price: '$129.99', oldPrice: null, emoji: '👟', rating: 4.7, reviews: 421 },
    { name: 'Backpack Elite', category: 'Accessories', price: '$59.99', oldPrice: '$89.99', emoji: '🎒', rating: 4.4, reviews: 178 },
    { name: 'Desk Lamp', category: 'Home', price: '$39.99', oldPrice: null, emoji: '💡', rating: 4.3, reviews: 95 },
    { name: 'Mechanical Keyboard', category: 'Electronics', price: '$149.99', oldPrice: '$179.99', emoji: '⌨️', rating: 4.9, reviews: 567 },
    { name: 'Yoga Mat', category: 'Sports', price: '$29.99', oldPrice: null, emoji: '🧘', rating: 4.2, reviews: 134 },
  ];

  const filters = ['All', 'Electronics', 'Home', 'Sports', 'Accessories'];

  return (
    <div class="container">
      <div class="hero-banner">
        <h1>Summer Sale — Up to 40% Off</h1>
        <p>Discover amazing deals on premium products. Free shipping on orders over $50.</p>
        <a href="#" class="btn">Shop Now →</a>
      </div>

      <h2 class="section-title">Featured Products</h2>

      <div class="filters">
        {filters.map((f, i) => (
          <button class={`filter ${i === 0 ? 'active' : ''}`}>{f}</button>
        ))}
      </div>

      <div class="products">
        {products.map((p) => (
          <div class="product">
            <div class="img">{p.emoji}</div>
            <div class="body">
              <h3>{p.name}</h3>
              <div class="category">{p.category}</div>
              <div class="rating">
                <span class="stars">{'★'.repeat(Math.floor(p.rating))}</span>
                <span>{p.rating} ({p.reviews})</span>
              </div>
              <div>
                <span class="price">{p.price}</span>
                {p.oldPrice && <span class="old-price">{p.oldPrice}</span>}
              </div>
              <button class="add-btn">Add to Cart</button>
            </div>
          </div>
        ))}
      </div>

      <div class="features">
        <div class="feature">
          <div class="icon">🚚</div>
          <h4>Free Shipping</h4>
          <p>On orders over $50</p>
        </div>
        <div class="feature">
          <div class="icon">↩️</div>
          <h4>Easy Returns</h4>
          <p>30-day return policy</p>
        </div>
        <div class="feature">
          <div class="icon">🔒</div>
          <h4>Secure Payment</h4>
          <p>Encrypted checkout</p>
        </div>
        <div class="feature">
          <div class="icon">💬</div>
          <h4>24/7 Support</h4>
          <p>Always here to help</p>
        </div>
      </div>
    </div>
  );
}
