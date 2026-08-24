-- ClubOS Compact v17 upgrade
-- Admin member editing/audit uses existing members + audit_logs tables.
-- Adds public event links, public event checkout RPCs, and event banner storage.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS public_slug text;
CREATE UNIQUE INDEX IF NOT EXISTS events_public_slug_uidx ON public.events(public_slug) WHERE public_slug IS NOT NULL;

UPDATE public.events
SET public_slug = regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g') || '-' || substr(replace(id::text,'-',''),1,6)
WHERE public_slug IS NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-banners','event-banners',true,8388608,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=true, file_size_limit=8388608, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "event_banners_insert" ON storage.objects;
CREATE POLICY "event_banners_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='event-banners' AND public.user_in_org(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "event_banners_update" ON storage.objects;
CREATE POLICY "event_banners_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='event-banners' AND public.user_in_org(((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id='event-banners' AND public.user_in_org(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "event_banners_delete" ON storage.objects;
CREATE POLICY "event_banners_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='event-banners' AND public.user_in_org(((storage.foldername(name))[1])::uuid));

CREATE OR REPLACE FUNCTION public.get_public_event(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'venue', e.venue,
    'address', e.address,
    'start_at', e.start_at,
    'end_at', e.end_at,
    'banner_url', e.banner_url,
    'currency', COALESCE(os.currency,'NZD'),
    'organisation_name', o.trading_name,
    'ticket_types', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', tt.id,
        'name', tt.name,
        'description', tt.description,
        'price', tt.price,
        'quantity_available', tt.quantity_available,
        'max_per_order', tt.max_per_order
      ) ORDER BY tt.sort_order, tt.name)
      FROM event_ticket_types tt
      WHERE tt.event_id=e.id AND tt.is_active=true
    ), '[]'::jsonb)
  ) INTO result
  FROM events e
  JOIN organisations o ON o.id=e.organisation_id
  LEFT JOIN organisation_settings os ON os.organisation_id=e.organisation_id
  WHERE e.public_slug=p_slug AND e.status='published'
    AND (e.sales_open_at IS NULL OR e.sales_open_at <= now())
    AND (e.sales_close_at IS NULL OR e.sales_close_at >= now())
  LIMIT 1;
  IF result IS NULL THEN RAISE EXCEPTION 'Published event not found or ticket sales are closed'; END IF;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.create_public_event_order(
  p_event_id uuid,
  p_purchaser_name text,
  p_purchaser_email text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_order_id uuid;
  v_total numeric(12,2) := 0;
  v_currency text := 'NZD';
  item jsonb;
  tt event_ticket_types%ROWTYPE;
  q integer;
  i integer;
BEGIN
  IF trim(COALESCE(p_purchaser_name,''))='' OR trim(COALESCE(p_purchaser_email,''))='' THEN RAISE EXCEPTION 'Purchaser name and email are required'; END IF;
  SELECT * INTO v_event FROM events WHERE id=p_event_id AND status='published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Event is not available for public ticket sales'; END IF;
  IF v_event.sales_open_at IS NOT NULL AND v_event.sales_open_at > now() THEN RAISE EXCEPTION 'Ticket sales have not opened yet'; END IF;
  IF v_event.sales_close_at IS NOT NULL AND v_event.sales_close_at < now() THEN RAISE EXCEPTION 'Ticket sales have closed'; END IF;
  SELECT COALESCE(currency,'NZD') INTO v_currency FROM organisation_settings WHERE organisation_id=v_event.organisation_id LIMIT 1;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items,'[]'::jsonb)) LOOP
    q := COALESCE((item->>'quantity')::integer,0);
    IF q <= 0 THEN CONTINUE; END IF;
    SELECT * INTO tt FROM event_ticket_types WHERE id=(item->>'ticket_type_id')::uuid AND event_id=p_event_id AND is_active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'A selected ticket type is unavailable'; END IF;
    IF q > tt.max_per_order THEN RAISE EXCEPTION 'Quantity exceeds the maximum allowed for %', tt.name; END IF;
    v_total := v_total + (tt.price * q);
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p_items,'[]'::jsonb)) x WHERE COALESCE((x->>'quantity')::integer,0)>0) THEN RAISE EXCEPTION 'Select at least one ticket'; END IF;

  INSERT INTO event_orders(organisation_id,event_id,purchaser_name,purchaser_email,total_amount,currency,payment_status,payment_provider)
  VALUES(v_event.organisation_id,p_event_id,trim(p_purchaser_name),lower(trim(p_purchaser_email)),v_total,v_currency,CASE WHEN v_total=0 THEN 'free' ELSE 'pending' END,CASE WHEN v_total=0 THEN 'free' ELSE NULL END)
  RETURNING id INTO v_order_id;

  -- Free orders can issue tickets immediately. Paid orders remain pending until a payment-provider webhook confirms payment.
  IF v_total=0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      q := COALESCE((item->>'quantity')::integer,0);
      IF q <= 0 THEN CONTINUE; END IF;
      SELECT * INTO tt FROM event_ticket_types WHERE id=(item->>'ticket_type_id')::uuid AND event_id=p_event_id AND is_active=true;
      FOR i IN 1..q LOOP
        INSERT INTO event_tickets(organisation_id,event_id,ticket_type_id,order_id,attendee_name,attendee_email,status)
        VALUES(v_event.organisation_id,p_event_id,tt.id,v_order_id,trim(p_purchaser_name),lower(trim(p_purchaser_email)),'valid');
      END LOOP;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('order_id',v_order_id,'total_amount',v_total,'currency',v_currency,'payment_status',CASE WHEN v_total=0 THEN 'free' ELSE 'pending' END);
END; $$;

REVOKE ALL ON FUNCTION public.get_public_event(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_public_event_order(uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_event(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_event_order(uuid,text,text,jsonb) TO anon, authenticated;
