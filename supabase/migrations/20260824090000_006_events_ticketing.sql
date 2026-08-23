/* ClubOS Events & Ticketing + demo data */

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  venue text,
  address text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  capacity integer CHECK (capacity IS NULL OR capacity >= 0),
  banner_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','completed')),
  sales_open_at timestamptz,
  sales_close_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  member_price numeric(12,2) CHECK (member_price IS NULL OR member_price >= 0),
  quantity_available integer CHECK (quantity_available IS NULL OR quantity_available >= 0),
  max_per_order integer NOT NULL DEFAULT 10 CHECK (max_per_order > 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  purchaser_name text NOT NULL,
  purchaser_email text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NZD',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','void','free')),
  payment_provider text,
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES event_ticket_types(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES event_orders(id) ON DELETE SET NULL,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  attendee_name text NOT NULL,
  attendee_email text,
  qr_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','cancelled','refunded','used')),
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  checkin_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_org_start_idx ON events(organisation_id, start_at);
CREATE INDEX IF NOT EXISTS event_ticket_types_event_idx ON event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS event_orders_event_idx ON event_orders(event_id);
CREATE INDEX IF NOT EXISTS event_tickets_event_idx ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS event_tickets_qr_idx ON event_tickets(qr_token);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select ON events;
CREATE POLICY events_select ON events FOR SELECT USING (user_in_org(organisation_id) OR is_platform_admin());
DROP POLICY IF EXISTS events_manage ON events;
CREATE POLICY events_manage ON events FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS event_ticket_types_select ON event_ticket_types;
CREATE POLICY event_ticket_types_select ON event_ticket_types FOR SELECT USING (user_in_org(organisation_id) OR is_platform_admin());
DROP POLICY IF EXISTS event_ticket_types_manage ON event_ticket_types;
CREATE POLICY event_ticket_types_manage ON event_ticket_types FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS event_orders_select ON event_orders;
CREATE POLICY event_orders_select ON event_orders FOR SELECT USING (user_in_org(organisation_id) OR is_platform_admin());
DROP POLICY IF EXISTS event_orders_manage ON event_orders;
CREATE POLICY event_orders_manage ON event_orders FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS event_tickets_select ON event_tickets;
CREATE POLICY event_tickets_select ON event_tickets FOR SELECT USING (user_in_org(organisation_id) OR is_platform_admin());
DROP POLICY IF EXISTS event_tickets_manage ON event_tickets;
CREATE POLICY event_tickets_manage ON event_tickets FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- Demo events
INSERT INTO events (id, organisation_id, title, description, venue, address, start_at, end_at, capacity, status, sales_open_at, sales_close_at)
VALUES
('11111111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Club Awards Night','Annual club celebration, dinner and player awards.','Harbour View Function Centre','10 Quay Street, Auckland', now() + interval '21 days', now() + interval '21 days 4 hours',180,'published',now()-interval '14 days',now()+interval '20 days'),
('22222222-2222-4222-8222-222222222222','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Family Sports Day','A free family day with junior games, BBQ and activities.','Demo Sports Club Grounds','123 Sports Avenue, Auckland',now()+interval '35 days',now()+interval '35 days 6 hours',300,'published',now()-interval '7 days',now()+interval '34 days'),
('33333333-3333-4333-8333-333333333333','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Fundraising Dinner','Fundraising dinner supporting new junior equipment.','Grand Hall','88 Queen Street, Auckland',now()+interval '60 days',now()+interval '60 days 4 hours',120,'draft',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_ticket_types (id,organisation_id,event_id,name,description,price,member_price,quantity_available,max_per_order,sort_order)
VALUES
('aaaa1111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111','Adult','Adult admission including dinner',65,55,140,8,1),
('aaaa2222-2222-4222-8222-222222222222','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111','Junior','Under 18 admission',30,25,40,8,2),
('bbbb1111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','22222222-2222-4222-8222-222222222222','Free Registration','Family Sports Day registration',0,0,300,10,1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_orders (id,organisation_id,event_id,member_id,purchaser_name,purchaser_email,total_amount,currency,payment_status,payment_provider,payment_reference)
SELECT 'cccc1111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111',m.id,'James Wilson','james.wilson@example.com',110,'NZD','paid','stripe','DEMO-STRIPE-001'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_orders (id,organisation_id,event_id,member_id,purchaser_name,purchaser_email,total_amount,currency,payment_status)
SELECT 'cccc2222-2222-4222-8222-222222222222','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','22222222-2222-4222-8222-222222222222',m.id,'Sarah Connors','sarah.connors@example.com',0,'NZD','free'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000002'
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_tickets (id,organisation_id,event_id,ticket_type_id,order_id,member_id,attendee_name,attendee_email,qr_token,status)
SELECT 'dddd1111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111','aaaa1111-1111-4111-8111-111111111111','cccc1111-1111-4111-8111-111111111111',m.id,'James Wilson','james.wilson@example.com','CLUBOS-DEMO-VALID-001','valid'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_tickets (id,organisation_id,event_id,ticket_type_id,order_id,member_id,attendee_name,attendee_email,qr_token,status,checked_in_at,checkin_method)
SELECT 'dddd2222-2222-4222-8222-222222222222','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111','aaaa1111-1111-4111-8111-111111111111','cccc1111-1111-4111-8111-111111111111',m.id,'Michael Chen','michael.chen@example.com','CLUBOS-DEMO-USED-002','used',now()-interval '10 minutes','qr'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000003'
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_tickets (id,organisation_id,event_id,ticket_type_id,order_id,member_id,attendee_name,attendee_email,qr_token,status)
SELECT 'dddd3333-3333-4333-8333-333333333333','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','22222222-2222-4222-8222-222222222222','bbbb1111-1111-4111-8111-111111111111','cccc2222-2222-4222-8222-222222222222',m.id,'Sarah Connors','sarah.connors@example.com','CLUBOS-DEMO-FAMILY-003','valid'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000002'
ON CONFLICT (id) DO NOTHING;
