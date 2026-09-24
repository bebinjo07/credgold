-- ==============================================================================
-- Seed Data for Gold Loan & Pawn Management System
-- ==============================================================================

-- 1. Insert Initial Users (Passwords hashed for: 'Admin@123' and 'Staff@123')
INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Rajesh Verma (Owner)', 'admin@swarnapawn.com', '+919876543210', '$2b$10$wT48L8iB5eQ9CqD11cOzO.Z6Oq4aUjB8tSg4ZsmwFpQ1v2K9bXzGy', 'ADMIN', true),
    ('22222222-2222-2222-2222-222222222222', 'Suresh Kumar (Appraiser)', 'staff@swarnapawn.com', '+919876543211', '$2b$10$wT48L8iB5eQ9CqD11cOzO.Z6Oq4aUjB8tSg4ZsmwFpQ1v2K9bXzGy', 'STAFF', true)
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Sample Customers
INSERT INTO customers (id, full_name, phone, alternate_phone, email, address, kyc_type, kyc_number, created_by)
VALUES
    ('33333333-3333-3333-3333-333333333331', 'Anand Ramesh', '+919840123456', '+919840999888', 'anand.ramesh@example.com', '42, Temple Street, Mylapore, Chennai', 'AADHAAR', '678912345678', '11111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333332', 'Priya Sundaram', '+919840765432', NULL, 'priya.s@example.com', '15, Gandhi Road, T. Nagar, Chennai', 'PAN', 'ABCDE1234F', '11111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333333', 'Mohammed Farooq', '+919840334455', '+919840112233', 'farooq.m@example.com', '88, Anna Salai, Royapettah, Chennai', 'AADHAAR', '987654321098', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (kyc_type, kyc_number) DO NOTHING;

-- 3. Insert Loans
-- Loan 1: Active
INSERT INTO loans (
    id, loan_number, customer_id, principal_amount, monthly_interest_rate_pct, 
    loan_term_months, start_date, due_date, status, 
    total_interest_accrued, total_interest_paid, total_principal_paid, outstanding_principal, 
    created_by
) VALUES (
    '44444444-4444-4444-4444-444444444441',
    'GL-2026-0001',
    '33333333-3333-3333-3333-333333333331',
    150000.00,
    1.75,
    12,
    CURRENT_DATE - INTERVAL '65 days',
    CURRENT_DATE + INTERVAL '300 days',
    'ACTIVE',
    5250.00,
    2625.00,
    0.00,
    150000.00,
    '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (loan_number) DO NOTHING;

-- Loan 2: Overdue (Interest not paid for 2+ months)
INSERT INTO loans (
    id, loan_number, customer_id, principal_amount, monthly_interest_rate_pct, 
    loan_term_months, start_date, due_date, status, 
    total_interest_accrued, total_interest_paid, total_principal_paid, outstanding_principal, 
    created_by
) VALUES (
    '44444444-4444-4444-4444-444444444442',
    'GL-2026-0002',
    '33333333-3333-3333-3333-333333333332',
    75000.00,
    2.00,
    6,
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE - INTERVAL '5 days',
    'OVERDUE',
    4500.00,
    1500.00,
    0.00,
    75000.00,
    '22222222-2222-2222-2222-222222222222'
) ON CONFLICT (loan_number) DO NOTHING;

-- 4. Insert Pledged Items (Collateral in Vault)
INSERT INTO pledged_items (
    id, loan_id, metal_type, item_description, karat, purity_pct,
    gross_weight_grams, stone_weight_grams, market_rate_per_gram, appraised_value, packet_number, status
) VALUES 
    (
        '55555555-5555-5555-5555-555555555551',
        '44444444-4444-4444-4444-444444444441',
        'GOLD',
        '22K Traditional Mango Necklace',
        '22K',
        91.60,
        32.450,
        2.200,
        6850.00,
        207212.00,
        'VBX-101',
        'IN_VAULT'
    ),
    (
        '55555555-5555-5555-5555-555555555552',
        '44444444-4444-4444-4444-444444444442',
        'GOLD',
        'Pair of 22K Solid Gold Bangles',
        '22K',
        91.60,
        18.600,
        0.000,
        6850.00,
        116715.00,
        'VBX-102',
        'IN_VAULT'
    )
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Sample Payments
INSERT INTO payments (
    id, loan_id, receipt_number, payment_date, amount_paid, interest_portion, principal_portion, penalty_portion, payment_mode, received_by, whatsapp_receipt_sent
) VALUES (
    '66666666-6666-6666-6666-666666666661',
    '44444444-4444-4444-4444-444444444441',
    'REC-2026-0001',
    CURRENT_DATE - INTERVAL '35 days',
    2625.00,
    2625.00,
    0.00,
    0.00,
    'UPI',
    '11111111-1111-1111-1111-111111111111',
    true
) ON CONFLICT (receipt_number) DO NOTHING;
