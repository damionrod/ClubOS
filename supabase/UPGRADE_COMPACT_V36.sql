
BEGIN;

-- ClubOS Compact v36
-- Public event orders now create ticket rows immediately so admins can see
-- every ordered ticket under the event, even while payment is pending.

-- Allow tickets to exist in a pending-payment state.
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname
  INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.event_tickets'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.event_tickets DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

ALTER TABLE public.event_tickets
  ADD CONSTRAINT event_tickets_status_check
  CHECK (status IN ('pending_payment','valid','cancelled','refunded','used'));

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
  v_ticket_status text;
BEGIN
  IF trim(COALESCE(p_purchaser_name,''))='' OR trim(COALESCE(p_purchaser_email,''))='' THEN
    RAISE EXCEPTION 'Purchaser name and email are required';
  END IF;

  SELECT * INTO v_event
  FROM events
  WHERE id=p_event_id AND status='published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event is not available for public ticket sales';
  END IF;

  IF v_event.sales_open_at IS NOT NULL AND v_event.sales_open_at > now() THEN
    RAISE EXCEPTION 'Ticket sales have not opened yet';
  END IF;

  IF v_event.sales_close_at IS NOT NULL AND v_event.sales_close_at < now() THEN
    RAISE EXCEPTION 'Ticket sales have closed';
  END IF;

  SELECT COALESCE(currency,'NZD')
  INTO v_currency
  FROM organisation_settings
  WHERE organisation_id=v_event.organisation_id
  LIMIT 1;

  FOR item IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_items,'[]'::jsonb))
  LOOP
    q := COALESCE((item->>'quantity')::integer,0);
    IF q <= 0 THEN
      CONTINUE;
    END IF;

    SELECT * INTO tt
    FROM event_ticket_types
    WHERE id=(item->>'ticket_type_id')::uuid
      AND event_id=p_event_id
      AND is_active=true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'A selected ticket type is unavailable';
    END IF;

    IF q > tt.max_per_order THEN
      RAISE EXCEPTION 'Quantity exceeds the maximum allowed for %', tt.name;
    END IF;

    v_total := v_total + (tt.price * q);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_items,'[]'::jsonb)) x
    WHERE COALESCE((x->>'quantity')::integer,0)>0
  ) THEN
    RAISE EXCEPTION 'Select at least one ticket';
  END IF;

  INSERT INTO event_orders(
    organisation_id,
    event_id,
    purchaser_name,
    purchaser_email,
    total_amount,
    currency,
    payment_status,
    payment_provider
  )
  VALUES(
    v_event.organisation_id,
    p_event_id,
    trim(p_purchaser_name),
    lower(trim(p_purchaser_email)),
    v_total,
    v_currency,
    CASE WHEN v_total=0 THEN 'free' ELSE 'pending' END,
    CASE WHEN v_total=0 THEN 'free' ELSE NULL END
  )
  RETURNING id INTO v_order_id;

  v_ticket_status := CASE WHEN v_total=0 THEN 'valid' ELSE 'pending_payment' END;

  -- Create the actual ticket rows for ALL orders immediately.
  -- Pending-payment tickets cannot be checked in because their status is not valid.
  FOR item IN
    SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    q := COALESCE((item->>'quantity')::integer,0);
    IF q <= 0 THEN
      CONTINUE;
    END IF;

    SELECT * INTO tt
    FROM event_ticket_types
    WHERE id=(item->>'ticket_type_id')::uuid
      AND event_id=p_event_id
      AND is_active=true;

    FOR i IN 1..q LOOP
      INSERT INTO event_tickets(
        organisation_id,
        event_id,
        ticket_type_id,
        order_id,
        attendee_name,
        attendee_email,
        status
      )
      VALUES(
        v_event.organisation_id,
        p_event_id,
        tt.id,
        v_order_id,
        trim(p_purchaser_name),
        lower(trim(p_purchaser_email)),
        v_ticket_status
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total_amount', v_total,
    'currency', v_currency,
    'payment_status', CASE WHEN v_total=0 THEN 'free' ELSE 'pending' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_event_order(uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_event_order(uuid,text,text,jsonb) TO anon, authenticated;

-- Backfill ticket rows for older pending orders that currently have no tickets.
DO $$
DECLARE
  o record;
  tt record;
  i integer;
BEGIN
  FOR o IN
    SELECT eo.*
    FROM public.event_orders eo
    WHERE NOT EXISTS (
      SELECT 1 FROM public.event_tickets et WHERE et.order_id = eo.id
    )
  LOOP
    -- If an old order has no stored item breakdown, attach one pending ticket
    -- to the first active ticket type so the order is visible in admin reporting.
    SELECT ett.*
    INTO tt
    FROM public.event_ticket_types ett
    WHERE ett.event_id = o.event_id
      AND ett.is_active = true
    ORDER BY ett.sort_order, ett.created_at
    LIMIT 1;

    IF tt.id IS NOT NULL THEN
      INSERT INTO public.event_tickets(
        organisation_id,
        event_id,
        ticket_type_id,
        order_id,
        attendee_name,
        attendee_email,
        status
      )
      VALUES(
        o.organisation_id,
        o.event_id,
        tt.id,
        o.id,
        o.purchaser_name,
        o.purchaser_email,
        CASE
          WHEN o.payment_status IN ('paid','free') THEN 'valid'
          ELSE 'pending_payment'
        END
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
