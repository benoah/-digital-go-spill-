-- Tabell for å lagre spillstatus
CREATE TABLE IF NOT EXISTS games (
    id VARCHAR(255) PRIMARY KEY,
    board_state JSONB NOT NULL,
    current_player SMALLINT NOT NULL CHECK (current_player IN (1, 2)),
    status VARCHAR(50) NOT NULL DEFAULT 'waiting_for_players' CHECK (status IN ('waiting_for_players', 'in_progress', 'finished', 'aborted')),
    ko_point JSONB,
    board_state_before_opponent_move JSONB,
    captured_by_black INTEGER NOT NULL DEFAULT 0,
    captured_by_white INTEGER NOT NULL DEFAULT 0,
    consecutive_passes SMALLINT NOT NULL DEFAULT 0,
    is_game_over BOOLEAN NOT NULL DEFAULT FALSE,
    players JSONB NOT NULL DEFAULT '[]',
    game_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
SELECT 'Games table and index attempted.' AS result_games;


-- Tabell for å lagre chat-meldinger
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id SERIAL PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    sender_socket_id VARCHAR(255),
    sender_display_name VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_game_id ON chat_messages(game_id);
SELECT 'Chat messages table and index attempted.' AS result_chat;