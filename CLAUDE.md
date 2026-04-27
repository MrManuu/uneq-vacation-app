# UNEQ Vacation App — Projektkontext

## Kontext
Bewerbungsprojekt für UNEQ Consulting — der Arbeitgeber prüft damit, wie gut der Bewerber KI-Tools zur Umsetzung einsetzen kann.
Bewerber: **Manuel Birghan** (GitHub: MrManuu, git email: m.birghan1@web.de)
Ansprechpartnerin bei UNEQ: **Flavia** (pk@uneq.de)

### Pflichtanforderungen (alle erfüllt ✅)
1. App läuft auf Server, erreichbar über eigene Domain
2. Benutzerverwaltung mit Login
3. Läuft in Docker (Dockerfile + docker-compose im Repo)
4. CSV-Export der Urlaubsanträge
5. Quellcode auf GitHub
6. Corporate Identity (CI) von UNEQ Consulting berücksichtigt

### Extras (über Pflicht hinaus implementiert)
- NRW-Feiertage im Teamkalender ausgegraut (mit Streifenmuster)
- Pending-Anträge gelb im Teamkalender sichtbar
- Team-Tab für alle Rollen zugänglich
- Manager genehmigt eigenen Urlaub direkt beim Eintragen
- Mobile-optimiert: Hamburger-Menü, responsive Card-Layouts
- Framer Motion Animationen: Seitenübergänge, Stat-Cards, Kalender, Modals
- Rate Limiting auf Login (5 req/min via slowapi + nginx)
- Security-Header in nginx
- HTTPS-only, HTTP-only JWT Cookies (kein localStorage)
- Passwort ändern direkt im Header

## Stack
- **Backend:** FastAPI (Python 3.12) — liegt in `/backend`
- **Frontend:** React + TypeScript + Vite + TailwindCSS + Framer Motion — liegt in `/frontend`
- **Datenbank:** PostgreSQL 16
- **Auth:** JWT (HTTP-only Cookie) + bcrypt
- **Infra:** Docker + docker-compose, nginx als Reverse Proxy, Let's Encrypt SSL
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`)

## Deployment (live)
- **Server:** Hostinger KVM 2, IP `72.61.186.62`, Ubuntu 24.04
- **App-Pfad:** `/opt/vacation-app`
- **Live-URL:** https://urlaub.birghan-dev.de
- **GitHub:** https://github.com/MrManuu/uneq-vacation-app

### Deploy-Kommando (IMMER mit --build, niemals nur restart!)
```bash
cd /opt/vacation-app && git pull && docker compose up -d --build frontend
# oder für Backend-Änderungen:
cd /opt/vacation-app && git pull && docker compose up -d --build backend
```
**Warum:** Der Code ist ins Docker-Image gebacken (`COPY . .` im Dockerfile). `restart` übernimmt keine Code-Änderungen — immer `--build` verwenden.

### Lokale Entwicklung
```bash
cd frontend && npm install && npm run dev
```
Damit der Login lokal funktioniert, muss `frontend/vite.config.ts` den Proxy auf die Live-URL zeigen:
```ts
target: 'https://urlaub.birghan-dev.de'  // für lokale Vorschau
target: 'http://localhost:8000'           // Standard (vor jedem Commit zurücksetzen!)
```

## UNEQ Brand (Corporate Identity)
- Dunkel: `#2B2931`
- Peach-Akzent: `#FAB784`
- Gold/Trennlinie: `#FBB040`
- Teal: `#00A79D`
- Schriften: **Mulish** (primär), **Montserrat** (Überschriften/`font-heading`)

## Rollen & Features
- **employee:** Urlaub beantragen, eigene Anträge + Status sehen, Resttage sehen
- **manager:** Anträge genehmigen/ablehnen, Team-Kalender, CSV-Export
- **admin:** Nutzerverwaltung, Manager-Zuweisung (m:n), alle obigen Rechte
- 30 Urlaubstage/Jahr (Arbeitstage Mo–Fr, keine Kalendertage)
- Seed-Script erstellt automatisch Admin beim ersten Start

## Demo-Accounts (Live-App)
| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | admin@uneq.de | admin1234 |
| Manager | pk@uneq.de | test1234 |
| Manager | test3@uneq.de | test1234 |
| Employee | m.birghan@web.de | test1234 |
| Employee | test@uneq.de | test1234 |
| Employee | test2@uneq.de | test1234 |

## Wichtige Architektur-Entscheidungen
- Arbeitstage (Mo–Fr) statt Kalendertage für Urlaubszählung
- HTTP-only Cookies für JWT (kein localStorage — XSS-Schutz)
- Rate Limiting auf Login-Endpoint (5 req/min via slowapi + nginx)
- NRW-Feiertage algorithmisch berechnet (Oster-Algorithmus), kein hardcoding
- m:n Beziehung Employee ↔ Manager (ein Mitarbeiter kann mehrere Vorgesetzte haben)

## Pflicht bei jeder Session: README.md aktualisieren
Das README.md ist öffentlich sichtbar im GitHub-Repo und dokumentiert den Arbeitsprozess für den Arbeitgeber.
**Am Ende jeder Session immer aktualisieren:**
- Neuen Eintrag unter "Session-Log" hinzufügen (Datum + was wurde gemacht/entschieden)
- Deployment-Status-Tabelle aktualisieren (⏳ → ✅)
