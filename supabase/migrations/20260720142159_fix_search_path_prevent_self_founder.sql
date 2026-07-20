-- Add search_path to the last remaining SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.prevent_self_founder_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.role = 'founder' AND OLD.role <> 'founder' AND NEW.id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes asignarte el rol founder a ti mismo';
  END IF;
  RETURN NEW;
END;
$function$;
