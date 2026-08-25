# Boxing Frontend Application

A Next.js 14 React TypeScript frontend for an AI-powered boxing coach application, with Docker support for easy deployment.

## 🏗️ Architecture

This application follows a 3-layer architecture:
- **Layer 1: Directive** - SOPs in Markdown (for AI agent guidance)
- **Layer 2: Orchestration** - You (the AI agent/human developer)
- **Layer 3: Execution** - Deterministic Python scripts (in `execution/` directory)

## 🐳 Docker Deployment

The application includes Docker support for both frontend and backend services.

### Prerequisites
- Docker and Docker Compose installed
- Supabase account (for authentication and data)
- Google Gemini API key (for backend AI features)

### Quick Start with Docker Compose

1. **Copy environment example**
   ```bash
   cp docker-compose.env.example .env
   ```

2. **Edit `.env` file** and add your actual values:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `GEMINI_API_KEY`: Your Google Gemini API key

3. **Start the application**
   ```bash
   docker compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

### Docker Compose Services

- **backend**: Node.js/Express API server running on port 8080
- **frontend**: Next.js application running on port 3000

### Environment Variables

The `.env` file should contain:

```env
# Supabase Configuration (Frontend)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini API Key (Backend)
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development Without Docker

For local development outside of Docker:

#### Frontend
```bash
cd frontend
cp .env.example .env.local  # or use existing .env.local
pnpm install
pnpm dev
```

#### Backend
```bash
cd backend
cp .env.example .env  # or use existing .env
pnpm install
pnpm dev
```

### Production Deployment

For production, consider:
- Using a reverse proxy (nginx, traefik)
- Setting up proper SSL/TLS
- Configuring logging and monitoring
- Using Docker secrets for sensitive data

## 📁 Project Structure

```
.
├── backend/              # Node.js/Express API server
├── frontend/             # Next.js React TypeScript application
├── docker-compose.yaml   # Docker compose configuration
├── docker-compose.env.example  # Environment variables template
├── DOCKER_MANUAL.md      # Detailed Docker usage guide
└── README.md             # This file
```

## 🔐 Security Notes

- **Never commit `.env` files** to version control
- The `.gitignore` files in both frontend and backend exclude environment files
- Docker compose setup uses environment variables passed at runtime
- Consider using secret management systems in production (AWS Secrets Manager, HashiCorp Vault, etc.)

## 🛠️ Technologies

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Google Gemini AI
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS
- **Containerization**: Docker, Docker Compose

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Google Gemini AI Documentation](https://ai.google.dev/)

---

*Built with ❤️ for boxing enthusiasts and AI fitness applications.*