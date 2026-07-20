/*
# Phase 10.8 — Add onboarding_completed to profiles

Adds a boolean column to track whether a user has completed the onboarding
(interests selection) flow. Defaults to false for existing users.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
