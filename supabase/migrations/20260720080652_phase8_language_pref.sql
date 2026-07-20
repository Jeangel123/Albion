/*
# Phase 8 — Multilenguaje: language preference on profiles

## Overview
Adds a `language` column to the profiles table so each user can store their
preferred interface language. The column is nullable and defaults to 'es'
(Spanish), matching the app's primary language.

## Security
No new RLS policies needed — the existing profile UPDATE policy already
allows users to update their own row, which now includes `language`.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'es';
