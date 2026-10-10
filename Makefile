.PHONY: setup dev-server dev-web build-web

setup:
	python3 -m venv apps/server/.venv
	apps/server/.venv/bin/python -m pip install --upgrade pip
	apps/server/.venv/bin/python -m pip install -e apps/server
	cd apps/web && npm install

dev-server:
	apps/server/.venv/bin/uvicorn market_partner.main:app --app-dir apps/server --reload --host 127.0.0.1 --port 8000

dev-web:
	cd apps/web && npm run dev

build-web:
	cd apps/web && npm run build
