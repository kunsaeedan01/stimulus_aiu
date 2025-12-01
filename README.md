# Stimulus AIU - Publication Incentive System

**Stimulus AIU** is a web-based platform designed for **Astana International University (AIU)** to automate the application process for research publication incentives (KPI). It simplifies the submission of scientific articles and streamlines the validation workflow for university administrators.

## 🏗 Tech Stack

* **Frontend:** React.js, TailwindCSS, Axios
* **Backend:** Django, Django REST Framework (DRF)
* **Database:** PostgreSQL
* **Infrastructure:** Docker, Docker Compose, Nginx (Reverse Proxy)

---

## 📂 Project Structure

This project follows a Monorepo structure. All services are orchestrated via Docker Compose from the root directory.

```text
stimulus_aiu/
├── docker-compose.yml       # Service orchestration (Frontend, Backend, DB)
├── .env                     # Environment variables (Ignored by Git)
├── stimulus_aiu_backend/    # Django API source code
│   ├── Dockerfile           # Backend build instructions
│   ├── manage.py
│   └── requirements.txt
└── stimulus_aiu_frontend/   # React source code
    ├── Dockerfile           # Frontend build instructions
    ├── package.json
    └── nginx/               # Nginx configuration (Reverse Proxy)
