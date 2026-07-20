/*
# Phase 5 — Economy RLS: wallet updates, transaction inserts, frame purchases

## Overview
Adds missing RLS policies for the economy system:
- wallets: users can INSERT (auto-create on first earn) and UPDATE (balance changes) their own wallet.
- transactions: users can INSERT their own transaction records.
- reputation_log: users can INSERT their own reputation log entries.

## Security
- All policies scope to `auth.uid() = user_id`.
- No user can modify another user's wallet or transactions.
*/

-- === wallets ===
DROP POLICY IF EXISTS "insert_wallet" ON wallets;
CREATE POLICY "insert_wallet"
ON wallets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_wallet" ON wallets;
CREATE POLICY "update_wallet"
ON wallets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- === transactions ===
DROP POLICY IF EXISTS "insert_tx" ON transactions;
CREATE POLICY "insert_tx"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- === reputation_log ===
DROP POLICY IF EXISTS "insert_replog" ON reputation_log;
CREATE POLICY "insert_replog"
ON reputation_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
