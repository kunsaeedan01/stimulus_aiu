Stimulus AIU - Publication Incentive SystemStimulus AIU is a web-based platform designed for Astana International University (AIU) to manage and automate the application process for research publication incentives (KPI). It allows researchers to submit publication details and administrators to validate and approve incentives.🏗 Tech StackFrontend: React.js, TailwindCSS, AxiosBackend: Django, Django REST Framework (DRF)Database: PostgreSQLInfrastructure: Docker, Docker Compose, Nginx (Reverse Proxy)📂 Project StructureThis project follows a Monorepo structure:stimulus_aiu/
├── docker-compose.yml       # Orchestrates all services (Frontend, Backend, DB)
├── .env                     # Environment variables (Not committed to Git)
├── stimulus_aiu_backend/    # Django API source code
│   ├── Dockerfile           # Backend build instructions
│   └── requirements.txt     # Python dependencies
└── stimulus_aiu_frontend/   # React source code
    ├── Dockerfile           # Frontend build instructions
    └── nginx/               # Nginx configuration (routing logic)
🚀 Getting Started (Local Development)Follow these steps to run the application on your local machine (Laptop).PrerequisitesDocker & Docker Compose installed.Git installed.1. Clone the Repositorygit clone [https://github.com/kunsaeedan01/stimulus_aiu.git](https://github.com/kunsaeedan01/stimulus_aiu.git)
cd stimulus_aiu
2. Configure Environment VariablesCreate a .env file in the root directory:# On Mac/Linux
touch .env
# On Windows, create a new text file named .env
Paste the Local Configuration into .env:# --- LOCAL DEVELOPMENT .ENV ---
DEBUG=True
DJANGO_SECRET_KEY=dev-secret-key
DJANGO_ALLOWED_HOSTS=localhost 127.0.0.1

# Database (Internal Docker Networking)
POSTGRES_DB=stimulus_aiu_db
POSTGRES_USER=stimulus_admin
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Ports (Localhost)
CORS_ALLOWED_ORIGINS=http://localhost:8090 [http://127.0.0.1:8090](http://127.0.0.1:8090)
CSRF_TRUSTED_ORIGINS=http://localhost:8090 [http://127.0.0.1:8090](http://127.0.0.1:8090)
3. Run the Applicationdocker compose up --build
Frontend: Access at http://localhost:8090Backend API: Access at http://localhost:8010Admin Panel: Access at http://localhost:8090/admin🌐 Production Deployment (Server)The production server uses a specific port configuration to avoid conflicts with other university services.Server Port MappingServiceInternal PortExternal (Host) PortNginx (Web)808090Backend API80008010PostgreSQL54325436Deployment StepsConnect via SSH:ssh user@YOUR_SERVER_IP
cd /path/to/stimulus_aiu
Pull Latest Changes:git pull origin main
Update Production .env:Ensure your server .env file uses the Production Configuration:# --- PRODUCTION .ENV ---
DEBUG=False
DJANGO_SECRET_KEY= <YOUR_SECURE_RANDOM_KEY>
DJANGO_ALLOWED_HOSTS=localhost 127.0.0.1 86.107.198.107

# Database
POSTGRES_DB=stimulus_aiu_db
POSTGRES_USER=stimulus_admin
POSTGRES_PASSWORD= <YOUR_SECURE_DB_PASSWORD>
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Trusted Origins (CRITICAL for Login/Admin)
CORS_ALLOWED_ORIGINS=[http://86.107.198.107:8090](http://86.107.198.107:8090)
CSRF_TRUSTED_ORIGINS=[http://86.107.198.107:8090](http://86.107.198.107:8090)
Build and Run:Note: The server uses the older Docker Compose v1.docker-compose up --build -d
🛠 Maintenance Cheat SheetUseful commands for managing the application on the server.🔄 Updates & RebuildsRun this sequence whenever you push new code to GitHub.# 1. Get new code
git pull origin main

# 2. Rebuild and restart containers in background
docker-compose up --build -d

# 3. Check status
docker-compose ps
🔍 Viewing Logs# Follow logs for all services
docker-compose logs -f

# Follow logs for specific service
docker-compose logs -f backend   # Django
docker-compose logs -f frontend  # Nginx/React
docker-compose logs -f db        # Database
🗄 Database Management# Apply Database Migrations
docker-compose exec backend python manage.py migrate

# Create a Superuser (Admin)
docker-compose exec backend python manage.py createsuperuser

# Collect Static Files (Fixes white screen/missing CSS)
docker-compose exec backend python manage.py collectstatic --no-input
🛑 Troubleshooting400 Bad Request: Check DJANGO_ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS in .env.Network Error (Frontend): Ensure Axios baseURL is set to / (relative path) so Nginx handles the routing.White Screen: Ensure STATIC_URL in Django settings is /django_static/ to avoid conflicts with React paths.
