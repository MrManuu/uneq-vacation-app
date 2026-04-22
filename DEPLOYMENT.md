# Deployment Guide

## Voraussetzungen

- VPS mit Ubuntu 22.04 — **Hetzner CX22** (~4€/Monat) oder **Hostinger KVM 1/2** ($8.99/Monat)
  - Hostinger: beim Erstellen als OS "Ubuntu 22.04" wählen, Rechenzentrum EU
  - Hetzner: Location Nürnberg oder Falkenstein, OS Ubuntu 22.04
- Domain / Subdomain mit A-Record auf Server-IP
- GitHub Repository mit SSH-Key als Secret

## Server einrichten

```bash
# Docker installieren
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Repo klonen
git clone https://github.com/<user>/<repo>.git /opt/vacation-app
cd /opt/vacation-app

# .env anlegen
cp .env.example .env
nano .env  # Werte ausfüllen
```

## SSL-Zertifikat (Let's Encrypt)

```bash
# Erst HTTP-only starten (für ACME-Challenge)
docker compose up -d nginx certbot

# Zertifikat anfordern
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d urlaub.yourdomain.de \
  --email your@email.de --agree-tos --no-eff-email

# Alle Services starten
docker compose up -d
```

## GitHub Actions Secrets

| Secret | Beschreibung |
|---|---|
| `SERVER_HOST` | IP oder Hostname des Servers |
| `SERVER_USER` | SSH-Nutzer (z. B. `root`) |
| `SERVER_SSH_KEY` | Privater SSH-Key |

## Initialer Admin-Nutzer

Beim ersten Start wird automatisch angelegt:
- **E-Mail:** `admin@uneq.de`
- **Passwort:** `admin1234`

**Bitte sofort nach dem ersten Login ändern!**
