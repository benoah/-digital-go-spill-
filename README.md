# Digital Go Spill 🎲

Velkommen til Digital Go Spill! Dette er en moderne, nettbasert implementering av det klassiske strategispillet Go. Prosjektet fokuserer på en engasjerende brukeropplevelse med et interaktivt 3D-spillbrett og sanntidsinteraksjon.

## Kjernefunksjoner ✨

* **13x13 Spillbrett:** Klassisk størrelse for et engasjerende spill.
* **Interaktivt 3D-spillbrett:** Visualisert med Three.js for en moderne følelse.
* **To-spiller modus:** Spill mot en annen person i sanntid.
* **Tilskuerfunksjon:** Andre kan se pågående spill uten å delta.
* **Sanntidschat:** Kommuniser med motspilleren din under spillet.
* **Nøyaktig Spillogikk:** Implementering av Go-regler, inkludert fangst, Ko og spillets slutt, håndtert av en dedikert spillmotor (`goEngine.ts`).
* **Containerisert Applikasjon:** Levert med Docker for enkelt oppsett og portabilitet.

## Teknologistabel 💻

* **Frontend:** Next.js, React, Three.js, TypeScript
* **Backend:** Node.js, Express, Socket.IO, TypeScript
* **Database:** PostgreSQL
* **Containerisering:** Docker, Docker Compose
* **Spillmotor:** Egendefinert logikk skrevet i TypeScript (`goEngine.ts`)

## Kom i Gang (Oppsett med Docker) 🚀

Følg disse stegene for å bygge og kjøre applikasjonen lokalt.

### Forutsetninger

* [Git](https://git-scm.com/) installert.
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (eller Docker Engine og Docker Compose CLI) installert og kjørende.

### Kjøre Applikasjonen

1.  **Klon repositoryet:**
    ```bash
    git clone [https://github.com/benoah/-digital-go-spill-.git](https://github.com/benoah/-digital-go-spill-.git)
    ```
2.  **Naviger til prosjektmappen:**
    ```bash
    cd -digital-go-spill-
    ```
3.  **Bygg Docker-images og start containerne:**
    ```bash
    docker-compose up --build
    ```
    Dette kan ta noen minutter første gangen, da Docker-images må lastes ned og bygges.

4.  **Åpne applikasjonen i nettleseren:**
    Når containerne kjører, er applikasjonen tilgjengelig på [http://localhost:3000](http://localhost:3000).

### Stoppe Applikasjonen

1.  Trykk `Ctrl+C` i terminalvinduet der `docker-compose up` kjører.
2.  Fjern containerne og nettverkene som ble opprettet:
    ```bash
    docker-compose down
    ```

## Utvikling (uten Docker Compose) 🛠️

Hvis du ønsker å jobbe direkte med kildekoden for frontend eller backend utenfor Docker Compose-flyten:

1.  **Installer avhengigheter:**
    ```bash
    npm install
    ```
2.  **For å starte frontend-utviklingsserveren (Next.js med Turbopack):**
    ```bash
    npm run dev
    ```
    Frontend vil da være tilgjengelig på [http://localhost:3000](http://localhost:3000) (standard Next.js port).

3.  **For å starte backend-serveren (Socket.IO med tsx for live reload):**
    ```bash
    npm run server:dev
    ```
    Socket.IO-serveren vil starte (vanligvis på port 3001 som definert i dine skript/Docker-konfigurasjon).

*Merk: For full funksjonalitet, inkludert databaseinteraksjon og sømløs kommunikasjon mellom frontend og backend slik det er satt opp i produksjonsliknende modus, anbefales det å bruke Docker Compose-oppsettet beskrevet ovenfor.*

## Dokumentasjon 📄

For en detaljert gjennomgang av arkitektur, designvalg, implementeringsdetaljer, og mer, se den fullstendige tekniske rapporten for dette prosjektet.
_(Hvis du har rapporten tilgjengelig online, kan du legge inn en lenke her.)_

## Kjente Begrensninger og Fremtidige Muligheter 🔮

Dette prosjektet har en solid kjernefunksjonalitet, men det er alltid rom for forbedringer:

* **Kjente Begrensninger:**
    * Mangler brukerautentisering og autorisasjon.
    * Ingen innebygd poengberegning ved spillets slutt.
    * Enkel "førstemann til mølla"-logikk for spillere.
* **Mulige Fremtidige Forbedringer:**
    * Implementere en AI-motstander.
    * Automatisk poengberegning.
    * Brukerprofiler og autentisering.
    * Lobby-system for å finne og utfordre spillere.

---

Laget av benoah.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
