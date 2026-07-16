# PledgeStack Examples

Community-driven example apps for PledgeStack.

| Example | Description |
|---------|-------------|
| [blog-starter](./blog-starter/) | Blog with static generation, dynamic routes, and MDX |
| [with-tailwindcss](./with-tailwindcss/) | Tailwind CSS v4 integration |
| [with-auth](./with-auth/) | Authentication with cookies and middleware |
| [basic-api-routes](./basic-api-routes/) | REST API routes with CRUD operations |

## Using an Example

```bash
# Clone the repo
git clone https://github.com/pledgelabs/pledgestack.git
cd pledgestack/examples/blog-starter

# Install and run
pnpm install
pnpm dev
```

## Creating a New Example

1. Create a directory under `examples/` with a descriptive name (use `with-*` prefix for integrations)
2. Include a `README.md` explaining the example
3. Include a `package.json` with `pledgestack` and `pledgepack` as dependencies
4. Keep it minimal — examples should demonstrate one concept clearly
5. Add your example to the table above
