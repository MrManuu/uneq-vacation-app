# UNEQ Vacation App

Urlaubsverwaltungs-Webanwendung für UNEQ Consulting — gebaut im Rahmen eines Bewerbungsprozesses.

---

## Projektziel

Eine interne Web-App, mit der Mitarbeitende Urlaub beantragen und Vorgesetzte diesen genehmigen oder ablehnen können. Inklusive Team-Kalender, Überschneidungserkennung und CSV-Export.

---

## Tech-Stack & Begründung

| Schicht | Technologie | Warum |
|---|---|---|
| Backend | **FastAPI** (Python 3.12) | Schnelle Entwicklung, automatische OpenAPI-Docs, starke Typsicherheit via Pydantic, async-fähig |
| Frontend | **React + TypeScript + Vite + TailwindCSS** | Industriestandard für SPAs, hervorragend für dashboardartige UIs, schnelles Build-System |
| Datenbank | **PostgreSQL 16** | ACID-konform, zuverlässig für relationale Daten mit m:n-Beziehungen, bewährt in Produktion |
| Auth | **JWT (HTTP-only Cookie) + bcrypt** | Kein Session-State im Backend, Passwörter sicher gehasht, XSS-Schutz durch HTTP-only |
| Reverse Proxy | **nginx** | Terminiert SSL, leitet auf Backend/Frontend weiter, Rate Limiting |
| SSL | **Let's Encrypt (Certbot)** | Kostenlos, automatisch erneuerbar |
| Server | **VPS** (Hetzner oder Hostinger) | Günstiger Einstieg, volle Kontrolle, Docker-fähig |
| CI/CD | **GitHub Actions** | Direkt integriert, lint → typecheck → build → deploy auf main |
| Design | **UNEQ Corporate Identity** | Farben, Schriften und Logosprache aus der Brand Guideline übernommen |

---

## Features

### Mitarbeitende
- Login / Logout
- Urlaub beantragen (mit Arbeitstage-Berechnung Mo–Fr)
- Eigene Anträge + Status einsehen
- Resturlaub im laufenden Jahr sehen (30 Tage/Jahr)
- Pending-Anträge stornieren

### Vorgesetzte
- Alle Anträge ihrer Mitarbeitenden einsehen
- Anträge genehmigen oder ablehnen
- Team-Kalender mit Überschneidungserkennung
- Resttage-Übersicht je Mitarbeiter
- CSV-Export der Urlaubsanträge

### Admin
- Nutzer anlegen, bearbeiten, löschen
- Rollen zuweisen (Mitarbeiter / Vorgesetzter / Admin)
- Vorgesetzte zuordnen (m:n — ein Mitarbeiter kann mehrere Vorgesetzte haben)

---

## Sicherheit

Folgende Punkte wurden bewusst und eigenständig berücksichtigt:

- **HTTPS-only** — HTTP leitet automatisch auf HTTPS um
- **HTTP-only Cookies** für JWT — kein Zugriff via JavaScript (XSS-Schutz)
- **bcrypt** für Passwort-Hashing (kein MD5/SHA1)
- **CORS** eingeschränkt auf die eigene Domain
- **Rate Limiting** auf dem Login-Endpoint (5 Anfragen/Minute via nginx + slowapi)
- **SQL Injection** verhindert durch SQLAlchemy ORM (keine raw queries)
- **Input-Validierung** via Pydantic (Backend) und TypeScript (Frontend)
- **Security-Header** in nginx (X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy)
- **Passwort-Mindestlänge** (8 Zeichen) serverseitig erzwungen

---

## Projektstruktur

```
.
├── backend/                   # FastAPI-Anwendung
│   ├── app/
│   │   ├── main.py            # App-Einstieg, Middleware
│   │   ├── models.py          # SQLAlchemy-Modelle
│   │   ├── schemas.py         # Pydantic-Schemas
│   │   ├── auth.py            # JWT + bcrypt
│   │   ├── utils.py           # Arbeitstage-Berechnung
│   │   ├── seed.py            # Initialer Admin-Account
│   │   └── routers/           # auth, users, vacations, export
│   └── Dockerfile
├── frontend/                  # React + TypeScript
│   ├── src/
│   │   ├── pages/             # Login, Dashboard, Anträge, Team, Admin
│   │   ├── components/        # Layout, Logo, ProtectedRoute
│   │   ├── store/             # Zustand (Auth-State)
│   │   └── api/               # Axios-Client
│   └── Dockerfile
├── nginx/                     # Reverse Proxy + SSL-Konfiguration
├── .github/workflows/ci.yml   # GitHub Actions CI/CD
├── docker-compose.yml
└── .env.example
```

---

## Setup & Deployment

Voraussetzungen: VPS mit Ubuntu 22.04, eigene Domain, GitHub-Repository.

Detaillierte Anleitung: siehe [DEPLOYMENT.md](DEPLOYMENT.md).

Schnellstart lokal:
```bash
cp .env.example .env
docker compose up -d
```
App läuft auf `http://localhost`. Login: `admin@uneq.de` / siehe `.env`

### Demo-Accounts (Live-System)

| Rolle | Name | E-Mail |
|---|---|---|
| Admin | Admin | `admin@uneq.de` |
| Vorgesetzter | Max Schmietendorf | `pk@uneq.de` |
| Vorgesetzter | Tobias Zulauf | `test3@uneq.de` |
| Mitarbeiter | Manuel Birghan | `m.birghan@web.de` |
| Mitarbeiter | Philipp Krombusch | `test@uneq.de` |
| Mitarbeiter | Flavia Polotzek | `test2@uneq.de` |

---

## Arbeitsweise & Entscheidungslog

Dieses Projekt wird in Zusammenarbeit mit **Claude Code (Anthropic)** entwickelt.
Der Mensch gibt Anforderungen und Kontext vor, Claude Code setzt technisch um und begründet Entscheidungen.

### Session-Log

#### Session 2 — 22.04.2026
- GitHub-Repository angelegt und gesamten Code gepusht (MrManuu/uneq-vacation-app)
- Hostinger KVM 2 VPS gebucht (Ubuntu 24.04, IP 72.61.186.62)
- Domain birghan-dev.de gekauft, A-Record urlaub.birghan-dev.de → 72.61.186.62 gesetzt
- Traefik (Hostinger-Standard) entfernt, eigenes nginx eingerichtet
- Mehrere Build-Fehler behoben: npm ci → npm install, TypeScript unused imports, partialize-Tippfehler, bcrypt-Kompatibilität (passlib + bcrypt==4.0.1), DB-Initialisierung in FastAPI lifespan verschoben
- SSL-Zertifikat via Let's Encrypt (Certbot) erfolgreich ausgestellt
- Hostinger Firewall für Port 80/443 konfiguriert
- **App live unter https://urlaub.birghan-dev.de**
- CI/CD-Pipeline (GitHub Actions) vollständig grün: ruff, mypy, TypeScript-Build, Docker-Build
- Team-Kalender erweitert: ausstehende Anträge gelb dargestellt, NRW-Feiertage ausgegraut, alle Teammitglieder inkl. Vorgesetzte sichtbar, Kalender immer angezeigt
- Vorgesetzte genehmigen eigenen Urlaub jetzt automatisch beim Eintragen
- Team-Tab für alle Rollen zugänglich (Mitarbeiter sehen ihr Team)
- Bugfix: Nutzer löschen schlug fehl wenn offene Urlaubsanträge vorhanden waren (SQLAlchemy passive_deletes)
- Passwort-Änderungsfunktion für alle Nutzer eingebaut (Klick auf Nutzername im Header öffnet Modal)
- Mobile-Optimierung: Hamburger-Menü, Card-Layouts für Tabellen (Anträge, Nutzerverwaltung)
- Bezeichnung "Ausstehend" durchgehend zu "Beantragt" umbenannt
- Team-Kalender: alle Nutzer sehen jetzt alle Kollegen (nicht nur eigenes Team)
- Überschneidungen im Kalender als diagonaler Farbverlauf (grün/gelb + rot) statt komplett rot dargestellt
- Navigation: Tab "Team" in "Teamkalender" umbenannt, Legende-Reihenfolge angepasst (Beantragt vor Genehmigt)
- Urlaubsarten eingeführt: Bezahlter Urlaub, Elternzeit, Sonderurlaub (bezahlt/unbezahlt), Überstundenabbau — nur Bezahlter Urlaub zählt gegen das 30-Tage-Kontingent
- Login-Fehlermeldung auf Deutsch: "E-Mail oder Passwort ist falsch"
- Fortschrittsbalken auf der Übersicht dreigeteilt: Genommen (grün), Beantragt (gelb), Frei (grau)
- Bugfix: Beantragte Tage werden jetzt korrekt vom verfügbaren Kontingent abgezogen
- Nutzerverwaltung: Sortierung nach Rolle (Admin → Vorgesetzte → Mitarbeiter), innerhalb der Gruppe alphabetisch
- Bugfix: Login-Fehlermeldung wurde durch Interceptor unterdrückt — wird jetzt korrekt angezeigt

#### Session 1 — 21.04.2026
- Aufgabenbeschreibung und Brand Guideline (CI) analysiert
- Tech-Stack festgelegt und begründet (FastAPI, React, PostgreSQL, Hetzner/Hostinger)
- Gesamtes Backend implementiert: Modelle, Auth, alle API-Routen, CSV-Export
- Gesamtes Frontend implementiert: alle Seiten (Login, Dashboard, Anträge, Genehmigungen, Team-Kalender, Admin)
- Docker-Setup vollständig: Dockerfiles, docker-compose, nginx mit SSL-Vorbereitung
- GitHub Actions CI/CD eingerichtet (lint → typecheck → build → auto-deploy)
- UNEQ Corporate Identity (Farben, Schriften, Logo) im Frontend umgesetzt
- Preview-HTML für visuelle Vorabansicht erstellt
- Deployment-Guide dokumentiert
- **Offene Entscheidung:** Hostinger KVM 2 vs. Hetzner CX22 als Server-Anbieter
- **Nächster Schritt:** GitHub-Repo anlegen → VPS buchen → deployen

---

## Pflichtanforderungen — Erfüllungsstatus

| Anforderung | Status |
|---|---|
| Läuft auf eigenem Server mit (Sub-)Domain | ✅ https://urlaub.birghan-dev.de |
| Benutzerverwaltung mit Login | ✅ |
| Läuft in Docker (Dockerfile + docker-compose) | ✅ |
| CSV-Export der Urlaubsanträge | ✅ |
| Quellcode auf GitHub | ✅ github.com/MrManuu/uneq-vacation-app |
| Corporate Identity berücksichtigt | ✅ |
