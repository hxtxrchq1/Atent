-- =============================================
-- Atent Initial Schema & Deterministic Seeds
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) NOT NULL,
    relationship VARCHAR(32) NOT NULL,
    priority_order INT NOT NULL,
    is_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL,
    trigger_source VARCHAR(32) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_reason TEXT
);

CREATE TABLE IF NOT EXISTS telemetry_points (
    id BIGSERIAL PRIMARY KEY,
    alert_id VARCHAR(64) REFERENCES alert_sessions(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    accuracy_meters REAL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for low-latency queries during active emergency
CREATE INDEX IF NOT EXISTS idx_telemetry_alert ON telemetry_points(alert_id, recorded_at DESC);

-- Deterministic Mock Seeds for Sandbox Testing
INSERT INTO users (id, email, full_name, phone_number)
VALUES ('usr_seed_001', 'demo.user@atent.local', 'Usuario Demo Atent', '+51987654321')
ON CONFLICT (id) DO NOTHING;

INSERT INTO emergency_contacts (id, user_id, name, phone_number, relationship, priority_order)
VALUES 
    ('cnt_seed_001', 'usr_seed_001', 'Contacto Mamá', '+51999888111', 'FAMILY', 1),
    ('cnt_seed_002', 'usr_seed_001', 'Contacto Hermano', '+51999888222', 'FAMILY', 2)
ON CONFLICT (id) DO NOTHING;
