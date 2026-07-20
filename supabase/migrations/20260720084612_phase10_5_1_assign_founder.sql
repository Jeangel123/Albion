/*
# Phase 10.5.1 — Asignación del rol Founder al usuario Savier

## Verificación previa
- Se verificó que el username 'Savier' y el email 'jeanguelb@gmail.com'
  pertenecen al mismo usuario (id: e7eb4d61-3e1f-4f16-a2bc-1629a1a939d2).

## Seguridad
- Esta migración asigna el rol 'founder' al usuario verificado.
- El rol founder es el nivel máximo: no puede ser asignado desde la UI.
- Solo el founder puede gestionar roles superiores (supreme_admin, admin).
- La acción queda registrada en audit_log.

## Prevención de auto-asignación
- El frontend (Admin.tsx) filtra 'founder' del selector de roles para
  usuarios no-founder, y el guard canChangeRole requiere isSupremeAdmin.
- Esta migración es la ÚNICA vía legítima de asignar el rol founder.
*/

DO $$
DECLARE
  v_user_id uuid := 'e7eb4d61-3e1f-4f16-a2bc-1629a1a939d2';
  v_username text;
  v_email text;
BEGIN
  -- Verificación de seguridad: username y email deben coincidir
  SELECT p.username, u.email INTO v_username, v_email
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = v_user_id;

  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado con id %', v_user_id;
  END IF;

  IF lower(v_username) <> 'savier' OR v_email <> 'jeanguelb@gmail.com' THEN
    RAISE EXCEPTION 'Verificación fallida: username=%, email=%', v_username, v_email;
  END IF;

  -- Asignar rol founder
  UPDATE profiles
  SET role = 'founder', updated_at = now()
  WHERE id = v_user_id;

  -- Registrar en audit_log
  INSERT INTO audit_log (admin_id, action, target_type, target_id, details, result)
  VALUES (
    v_user_id,
    'assign_founder_role',
    'profile',
    v_user_id,
    format('Asignación inicial del rol founder a %s (%s)', v_username, v_email),
    'success'
  );
END $$;

-- Restricción: nadie puede cambiar su propio rol a founder vía UPDATE
-- (protección adicional a nivel de BD mediante trigger)
CREATE OR REPLACE FUNCTION prevent_self_founder_promotion()
RETURNS trigger AS $$
BEGIN
  -- Si un usuario intenta asignarse 'founder' a sí mismo, bloquear
  IF NEW.role = 'founder' AND OLD.role <> 'founder' AND NEW.id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes asignarte el rol founder a ti mismo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_self_founder ON profiles;
CREATE TRIGGER trg_prevent_self_founder
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_founder_promotion();
