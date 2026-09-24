-- ==============================================================================
-- Gold Loan / Pawn Shop Management System
-- PostgreSQL Database Schema & Migrations
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE loan_status AS ENUM ('ACTIVE', 'OVERDUE', 'CLOSED', 'DEFAULTED', 'AUCTIONED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metal_type AS ENUM ('GOLD', 'SILVER', 'PLATINUM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_status AS ENUM ('IN_VAULT', 'RELEASED', 'AUCTIONED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reminder_channel AS ENUM ('WHATSAPP', 'SMS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users & Staff Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STAFF',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(150),
    address TEXT NOT NULL,
    kyc_type VARCHAR(50) NOT NULL, -- 'AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'
    kyc_number VARCHAR(100) NOT NULL,
    kyc_document_url TEXT,
    customer_photo_url TEXT,
    is_verified BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customer_kyc UNIQUE (kyc_type, kyc_number)
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);

-- 3. Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. GL-2026-0001
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    principal_amount NUMERIC(12, 2) NOT NULL CHECK (principal_amount > 0),
    monthly_interest_rate_pct NUMERIC(5, 2) NOT NULL CHECK (monthly_interest_rate_pct >= 0), -- e.g. 1.50% to 2.50% monthly
    annual_interest_rate_pct NUMERIC(5, 2) GENERATED ALWAYS AS (monthly_interest_rate_pct * 12) STORED,
    loan_term_months INT NOT NULL DEFAULT 12,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    grace_period_days INT NOT NULL DEFAULT 7,
    status loan_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Financial tracking counters
    total_interest_accrued NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_interest_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_principal_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    outstanding_principal NUMERIC(12, 2) NOT NULL,
    
    closed_at TIMESTAMP WITH TIME ZONE,
    released_by UUID REFERENCES users(id),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
CREATE INDEX IF NOT EXISTS idx_loans_loan_number ON loans(loan_number);

-- 4. Pledged Items (Collateral / Vault Inventory)
CREATE TABLE IF NOT EXISTS pledged_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    metal_type metal_type NOT NULL DEFAULT 'GOLD',
    item_description VARCHAR(255) NOT NULL, -- e.g. 'Gold Necklace 22k with ruby stone'
    karat VARCHAR(10) NOT NULL, -- '24K', '22K', '18K', '14K', 'SILVER_925'
    purity_pct NUMERIC(5, 2) NOT NULL, -- e.g. 91.60 for 22k
    gross_weight_grams NUMERIC(8, 3) NOT NULL CHECK (gross_weight_grams > 0),
    stone_weight_grams NUMERIC(8, 3) NOT NULL DEFAULT 0.000 CHECK (stone_weight_grams >= 0),
    net_weight_grams NUMERIC(8, 3) GENERATED ALWAYS AS (gross_weight_grams - stone_weight_grams) STORED,
    market_rate_per_gram NUMERIC(10, 2) NOT NULL CHECK (market_rate_per_gram > 0),
    appraised_value NUMERIC(12, 2) NOT NULL, -- (net_weight * market_rate * purity / 100) or manual verified value
    packet_number VARCHAR(50) NOT NULL, -- Physical Vault Box/Packet Tag ID e.g. 'VB-A12'
    status item_status NOT NULL DEFAULT 'IN_VAULT',
    photo_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pledged_items_loan_id ON pledged_items(loan_id);
CREATE INDEX IF NOT EXISTS idx_pledged_items_status ON pledged_items(status);
CREATE INDEX IF NOT EXISTS idx_pledged_items_metal_type ON pledged_items(metal_type);

-- 5. Payments (Interest & Principal Repayments)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. REC-2026-0001
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    interest_portion NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    principal_portion NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    penalty_portion NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode payment_mode NOT NULL DEFAULT 'CASH',
    transaction_ref VARCHAR(100), -- UPI/Cheque/Bank ref ID
    received_by UUID NOT NULL REFERENCES users(id),
    whatsapp_receipt_sent BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- 6. Messaging & Reminder Logs
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel reminder_channel NOT NULL DEFAULT 'WHATSAPP',
    reminder_type VARCHAR(50) NOT NULL, -- 'MONTHLY_DUE', 'OVERDUE_ALERT', 'PAYMENT_RECEIPT', 'AUCTION_WARNING'
    recipient_phone VARCHAR(20) NOT NULL,
    template_name VARCHAR(100),
    message_body TEXT NOT NULL,
    external_message_id VARCHAR(150),
    status delivery_status NOT NULL DEFAULT 'QUEUED',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_loan_id ON reminder_logs(loan_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminder_logs(status);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_at ON reminder_logs(sent_at);

-- 7. Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_table VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger Function to auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_loans_updated_at ON loans;
CREATE TRIGGER trg_loans_updated_at BEFORE UPDATE ON loans FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_pledged_items_updated_at ON pledged_items;
CREATE TRIGGER trg_pledged_items_updated_at BEFORE UPDATE ON pledged_items FOR EACH ROW EXECUTE FUNCTION update_timestamp();
