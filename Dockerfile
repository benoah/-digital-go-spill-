# Steg 1: Velg et passende Node.js base-image
# Bruker en LTS-versjon av Node.js. 'alpine' er mindre, men kan mangle noen verktøy.
# 'bookworm' (basert på Debian) er mer komplett.
FROM node:20-bookworm-slim AS base

# Sett arbeidsmappen inne i containeren
WORKDIR /app

# Steg 2: Installer avhengigheter
# Kopier package.json og package-lock.json (eller yarn.lock)
COPY package*.json ./

# Installer ALLE avhengigheter, inkludert devDependencies,
# da 'tsx' og 'concurrently' (som vi vil bruke) er devDependencies.
# For et rent produksjonsimage kunne man kjørt `npm ci --omit=dev` senere.
RUN npm install

# Steg 3: Kopier resten av applikasjonskoden
COPY . .

# Steg 4: Bygg Next.js-applikasjonen for produksjon
# Dette genererer .next-mappen med den optimaliserte builden.
RUN npm run build

# Steg 5: Definer hvordan applikasjonen skal kjøres
# Vi bruker 'concurrently' for å starte både Next.js-serveren (for frontend)
# og din Socket.IO-server (server/socketServer.ts med tsx).

# Miljøvariabler som kan settes i docker-compose.yml
ENV NODE_ENV=production
ENV PORT=3000
ENV SOCKET_PORT=3001
# DATABASE_URL vil bli satt fra docker-compose.yml
# NEXT_PUBLIC_SOCKET_SERVER_URL vil bli satt fra docker-compose.yml (for klienten)

# Eksponer portene applikasjonen vil lytte på
EXPOSE 3000 3001

# Kommandoen for å starte applikasjonen
# "npm:start" -> kjører "next start -p 3000" (fra package.json)
# "npm:server:start" -> kjører "tsx server/socketServer.js" (eller .ts, fra package.json)
# "-k" dreper andre kommandoer hvis en feiler.
# "-s first" betyr at containeren avsluttes når den første prosessen (Next.js) avsluttes.
# "--names" gir navn til prosessene i outputen fra concurrently.
CMD ["npx", "concurrently", "-k", "-s", "first", "--names", "NEXT,SOCKET", "npm:start", "npm:server:start"]
