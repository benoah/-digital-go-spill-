    #!/bin/bash
    set -e # Avslutt umiddelbart hvis en kommando feiler
    
    echo "--- [INIT SCRIPT V4] Starting explicit database and user setup ---"
    
    # $POSTGRES_USER, $POSTGRES_PASSWORD, $POSTGRES_DB er satt av Docker Compose
    
    # Kjør psql som standard 'postgres' superbruker.
    # Koble til standard 'postgres' databasen for å kunne opprette roller og databaser.
    psql -v ON_ERROR_STOP=1 --username "postgres" --dbname "postgres" <<-EOSQL
        -- Sjekk om brukeren eksisterer
        DO \$\$
        BEGIN
           IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
              RAISE NOTICE 'Role ${POSTGRES_USER} does not exist. Creating role...';
              CREATE ROLE "${POSTGRES_USER}" WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
              RAISE NOTICE 'Role ${POSTGRES_USER} created with password.';
           ELSE
              RAISE NOTICE 'Role ${POSTGRES_USER} already exists. Altering password.';
              ALTER ROLE "${POSTGRES_USER}" WITH PASSWORD '${POSTGRES_PASSWORD}';
              RAISE NOTICE 'Password for role ${POSTGRES_USER} altered.';
           END IF;
        END
        \$\$;

        -- Sjekk om databasen eksisterer
        -- Vi kan ikke bruke IF NOT EXISTS direkte på CREATE DATABASE her uten videre
        -- Koble til postgres-databasen for å sjekke om $POSTGRES_DB eksisterer
        -- Hvis ikke, opprett den og sett eier
        -- Dette er litt mer robust enn å stole på at entrypoint alltid gjør det.
        SELECT pg_catalog.pg_database.datname FROM pg_catalog.pg_database WHERE datname = '${POSTGRES_DB}';
        -- For å faktisk opprette hvis den ikke finnes (litt mer kompleks SQL for å gjøre betinget):
        -- Dette er en måte, men psql har ikke enkel IF NOT EXISTS for CREATE DATABASE.
        -- Docker entrypoint skal ha håndtert dette, men vi legger inn en sjekk.
        -- En annen metode er å prøve å koble til, og hvis det feiler, opprette.

        -- Vi stoler på at Docker entrypoint har opprettet databasen $POSTGRES_DB.
        -- Hvis ikke, feiler GRANT ALL PRIVILEGES nedenfor.
        -- Alternativt, koble til postgres-db og kjør:
        -- PERFORM 1 FROM pg_database WHERE datname = '${POSTGRES_DB}';
        -- IF NOT FOUND THEN
        --    CREATE DATABASE "${POSTGRES_DB}" OWNER "${POSTGRES_USER}";
        --    RAISE NOTICE 'Database ${POSTGRES_DB} created and owned by ${POSTGRES_USER}.';
        -- ELSE
        --    RAISE NOTICE 'Database ${POSTGRES_DB} already exists.';
        -- END IF;
        -- (Dette krever en PL/pgSQL blokk eller lignende)

        -- Forutsetter at $POSTGRES_DB allerede er opprettet av Docker-entrypoint (som loggen din viser med "CREATE DATABASE")
        GRANT ALL PRIVILEGES ON DATABASE "${POSTGRES_DB}" TO "${POSTGRES_USER}";
        RAISE NOTICE 'All privileges granted on database ''${POSTGRES_DB}'' to user ''${POSTGRES_USER}''.';

        -- Koble til den spesifikke databasen for å gi rettigheter på schema public
        \c "${POSTGRES_DB}" "${POSTGRES_USER}" 
        -- Passord for POSTGRES_USER må være satt korrekt for at \c skal fungere med brukerbytte
        -- Alternativt, kjør følgende som 'postgres' brukeren, og spesifiser databasen:
        -- psql -v ON_ERROR_STOP=1 --username "postgres" --dbname "${POSTGRES_DB}" <<-EOSQL_GRANT
        --    GRANT ALL ON SCHEMA public TO "${POSTGRES_USER}";
        --    RAISE NOTICE 'Privileges on schema public granted to ${POSTGRES_USER} in ${POSTGRES_DB}.';
        -- EOSQL_GRANT

        -- Enklere: Utfør dette som postgres-brukeren etter \c til $POSTGRES_DB, eller direkte
        -- hvis psql-sesjonen allerede er som postgres og koblet til $POSTGRES_DB
        GRANT ALL ON SCHEMA public TO "${POSTGRES_USER}";
        RAISE NOTICE 'Privileges on schema public granted to ${POSTGRES_USER} in ${POSTGRES_DB}.';


        SELECT 'Init script (v4) completed for user ''${POSTGRES_USER}'' on database ''${POSTGRES_DB}''' AS completion_status;
    EOSQL

    echo "--- [INIT SCRIPT V4] Database setup attempt finished ---"