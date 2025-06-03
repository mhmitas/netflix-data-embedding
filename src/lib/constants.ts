export const markdownContent = `
# Netflix Data Embedding API

A Node.js/TypeScript API for generating text embeddings using the [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) model via [@xenova/transformers](https://www.npmjs.com/package/@xenova/transformers), with optional PostgreSQL integration.

## Features

- REST API for generating embeddings from text.
- Health check endpoint (verifies database connectivity).
- Embedding endpoint for batch text input.
- Ready for deployment on Vercel.
- Written in TypeScript.

## Project Structure

\`\`\`
.
├── src/
│   ├── index.ts           # Express API entrypoint
│   └── lib/
│       ├── embedding.ts   # Embedding model logic
│       └── db.ts          # PostgreSQL connection and query helper
├── .env                   # Environment variables (not committed)
├── package.json
├── tsconfig.json
├── vercel.json
└── ...
\`\`\`

## Setup

1. **Clone the repository**

2. **Install dependencies**
   \`\`\`sh
   pnpm install
   # or
   npm install
   \`\`\`

3. **Configure environment variables**

   Create a \`.env\` file in the root directory:

   \`\`\`
   DATABASE_URL=postgres://user:password@host:port/database
   PORT=5000
   \`\`\`

4. **Build the project**
   \`\`\`sh
   pnpm build
   # or
   npm run build
   \`\`\`

5. **Run the server**
   \`\`\`sh
   pnpm start
   # or
   npm start
   \`\`\`

   For development with hot-reloading:
   \`\`\`sh
   pnpm dev
   # or
   npm run dev
   \`\`\`

## API Endpoints

### Health Check

- **GET** \`/health\`
- Returns \`200 OK\` if the server and database are reachable.

### Embedding Endpoint

- **POST** \`/embed-query\`
- **Body:** JSON object with a \`texts\` array of strings.
  \`\`\`json
  {
    "texts": ["example sentence 1", "example sentence 2"]
  }
  \`\`\`
- **Response:**
  \`\`\`json
  {
    "input_texts": [...],
    "model": "Xenova/all-MiniLM-L6-v2",
    "timestamp": "...",
    "embeddings": [[...], [...]]
  }
  \`\`\`

## Deployment

- Ready for [Vercel](https://vercel.com/) deployment (see [\`vercel.json\`](vercel.json)).

## License

ISC

---

**Maintainer:** _Mahfuzul Hoque Mitas_
`;
