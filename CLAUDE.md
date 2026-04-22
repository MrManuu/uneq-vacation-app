# UNEQ Vacation App — Projektkontext

## Kontext
Bewerbungsprojekt für UNEQ Consulting — der Arbeitgeber prüft damit, wie gut der Bewerber KI-Tools zur Umsetzung einsetzen kann.
**Deadline: 27.04.2026 (Montag)**

### Pflichtanforderungen
1. App läuft auf einem angemieteten Server, erreichbar über eigene (Sub-)Domain
2. Benutzerverwaltung mit Login
3. Läuft in Docker (Dockerfile + docker-compose im Repo)
4. CSV-Export der Urlaubsanträge
5. Quellcode auf GitHub
6. Corporate Identity (CI) von UNEQ Consulting berücksichtigt (Brand Guideline PDF wurde übergeben)

### Bewusst offen gelassen (soll eigenständig gelöst werden)
- Absicherung der Anwendung
- Schutz der Verbindung (HTTPS)
- Passwortspeicherung
- Datenbankwahl
- Umgang mit Nutzereingaben (Validierung)

## Stack
- **Backend:** FastAPI (Python 3.12) — liegt in `/backend`
- **Frontend:** React + TypeScript + Vite + TailwindCSS — liegt in `/frontend`
- **Datenbank:** PostgreSQL 16
- **Auth:** JWT (HTTP-only Cookie) + bcrypt
- **Infra:** Docker + docker-compose, nginx als Reverse Proxy, Let's Encrypt SSL
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`)
- **Server:** VPS — Hetzner CX22 (~4€/Monat) oder Hostinger KVM 2 ($8.99/Monat, bereits für KI-Agenten geplant) — Entscheidung noch offen

## UNEQ Brand (Corporate Identity)
- Dunkel: `#2B2931`
- Peach-Akzent: `#FAB784`
- Gold/Trennlinie: `#FBB040`
- Teal: `#00A79D`
- Schriften: **Mulish** (primär), **Montserrat** (Überschriften)

## Rollen & Features
- **employee:** Urlaub beantragen, eigene Anträge + Status sehen, Resttage sehen
- **manager:** Anträge genehmigen/ablehnen, Team-Kalender mit Überschneidungserkennung
- **admin:** Nutzerverwaltung, Manager-Zuweisung (m:n), alle obigen Rechte
- 30 Urlaubstage/Jahr (Arbeitstage Mo–Fr)
- CSV-Export für Manager

## Deployment-Status
- [ ] GitHub Repository angelegt
- [ ] Hetzner VPS gebucht
- [ ] Domain/A-Record konfiguriert
- [ ] Docker auf Server installiert
- [ ] SSL-Zertifikat (Let's Encrypt) eingerichtet
- [ ] App live unter https://[domain]

## Initialer Admin-Account
- E-Mail: `admin@uneq.de`
- Passwort: `admin1234` (beim ersten Login ändern!)

## Wichtige Entscheidungen
- Arbeitstage (Mo–Fr) statt Kalendertage für Urlaubszählung
- HTTP-only Cookies für JWT (kein localStorage — XSS-Schutz)
- Rate Limiting auf Login-Endpoint (5 req/min via slowapi + nginx)
- Seed-Script erstellt automatisch Admin beim ersten Start

## Pflicht bei jeder Session: README.md aktualisieren
Das README.md ist öffentlich sichtbar im GitHub-Repo und dokumentiert den Arbeitsprozess für den Arbeitgeber.
**Am Ende jeder Session immer aktualisieren:**
- Neuen Eintrag unter "Session-Log" hinzufügen (Datum + was wurde gemacht/entschieden)
- Deployment-Status-Tabelle am Ende aktualisieren (⏳ → ✅)
- Offene Entscheidungen eintragen oder abhaken

## Nächste offene Schritte
Deployment (Schritt 1–6 in DEPLOYMENT.md beschrieben).
Nach Deployment: UI-Feedback einarbeiten.
