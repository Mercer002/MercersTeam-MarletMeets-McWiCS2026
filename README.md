
# MercersTeam-MarletMeets-McWiCS2026

Project scaffold for the MarletMeets app. This repository contains starter code and instructions to get a local PostgreSQL database running and a small test script that verifies connectivity.

Sections added in this repo:
- Database setup (PostgreSQL local install / Docker)
- `.env.template` describing required environment variables
- `scripts/connect_db.py` — a tiny Python script that tests a connection to Postgres

Quick checklist (owner: Zach Olsen — Database)

- [ ] Create GitHub repo (this repo can be pushed to GitHub and then invite the team)
- [ ] Set up PostgreSQL database locally (Homebrew or Docker recommended)
- [ ] Create `.env` from `.env.template` and supply credentials
- [ ] Share repo access with team via GitHub (add collaborators or team)

Deliverable: Working database connection. Follow the steps below to verify.

## Local PostgreSQL setup (macOS - Homebrew)

1. Install Homebrew (if you don't have it):

	https://brew.sh/

2. Install and start Postgres:

	```bash
	brew install postgresql
	brew services start postgresql
	```

3. Create a DB and user for the project (example):

	```bash
	psql postgres
	# inside psql:
	CREATE USER marlet WITH PASSWORD 'changeme';
	CREATE DATABASE marlet_dev OWNER marlet;
	\q
	```

## Alternative: Run Postgres with Docker

If you prefer Docker, run:

```bash
docker run --name marlet-postgres -e POSTGRES_USER=marlet -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=marlet_dev -p 5432:5432 -d postgres:15
```

## Environment variables

Copy `.env.template` to `.env` at the repo root and fill in the values (do not commit `.env` with secrets).

Required variables (present in `.env.template`):

- PG_HOST
- PG_PORT
- PG_DB
- PG_USER
- PG_PASSWORD

## Install and run the DB connection test (Python)

1. Create a virtualenv and install deps:

	```bash
	python3 -m venv .venv
	source .venv/bin/activate
	pip install -r requirements.txt
	```

2. Copy `.env.template` to `.env` and edit with your DB values.

3. Run the test script:

	```bash
	python scripts/connect_db.py
	```

If the connection succeeds the script will create a tiny test table, insert and read back a row, then clean up and print a success message.

## Creating the GitHub repository and sharing access

1. Create a new repository on GitHub named `MercersTeam-MarletMeets-McWiCS2026` (or push this local repo to an existing remote):

	```bash
	git init
	git add .
	git commit -m "initial: add db test scripts and docs"
	git branch -M main
	git remote add origin git@github.com:<your-org-or-username>/MercersTeam-MarletMeets-McWiCS2026.git
	git push -u origin main
	```

2. Invite team members or add them as collaborators via the GitHub repo Settings -> Manage access. For teams within an organization, add the GitHub team or individual accounts with Write access.

## Notes

- This repo includes a safe, minimal DB connection test. It does not include application code yet.
- Keep secrets out of Git. Use GitHub Secrets or your CI secret store for deployment credentials.

```
