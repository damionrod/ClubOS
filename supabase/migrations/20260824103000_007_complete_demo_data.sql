/* ClubOS complete demo dataset and test-support tables.
   Run AFTER migrations 001-006. Idempotent where practical. */

-- ------------------------------------------------------------------
-- Repair/link existing demo auth users to profiles and Demo Sports Club
-- ------------------------------------------------------------------
INSERT INTO profiles (id,email,first_name,last_name,is_platform_admin)
SELECT id,email,
       COALESCE(raw_user_meta_data->>'first_name','Demo'),
       COALESCE(raw_user_meta_data->>'last_name','User'),
       email='platform.admin@clubos.example'
FROM auth.users
WHERE email IN ('owner@demosportsclub.example','secretary@demosportsclub.example','treasurer@demosportsclub.example','teammanager@demosportsclub.example','readonly@demosportsclub.example','platform.admin@clubos.example','member@demosportsclub.example')
ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name,
 is_platform_admin=(profiles.is_platform_admin OR EXCLUDED.is_platform_admin);

INSERT INTO organisation_users (organisation_id,user_id,role_id,is_owner,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',p.id,r.id,(p.email='owner@demosportsclub.example'),'active'
FROM profiles p
JOIN roles r ON r.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
 AND r.name=CASE p.email
   WHEN 'owner@demosportsclub.example' THEN 'Organisation Owner'
   WHEN 'secretary@demosportsclub.example' THEN 'Secretary'
   WHEN 'treasurer@demosportsclub.example' THEN 'Treasurer'
   WHEN 'teammanager@demosportsclub.example' THEN 'Team Manager'
   WHEN 'readonly@demosportsclub.example' THEN 'Read Only Administrator'
   WHEN 'member@demosportsclub.example' THEN 'Member' END
WHERE p.email IN ('owner@demosportsclub.example','secretary@demosportsclub.example','treasurer@demosportsclub.example','teammanager@demosportsclub.example','readonly@demosportsclub.example','member@demosportsclub.example')
ON CONFLICT (organisation_id,user_id) DO UPDATE SET role_id=EXCLUDED.role_id,status='active',is_owner=EXCLUDED.is_owner;

INSERT INTO user_roles (organisation_id,user_id,role_id)
SELECT ou.organisation_id,ou.user_id,ou.role_id FROM organisation_users ou
WHERE ou.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND ou.role_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE members m SET user_id=p.id FROM profiles p
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
AND ((m.member_number='DSC-000001' AND p.email='owner@demosportsclub.example')
  OR (m.member_number='DSC-000005' AND p.email='teammanager@demosportsclub.example')
  OR (m.member_number='DSC-000002' AND p.email='member@demosportsclub.example'));

-- ------------------------------------------------------------------
-- Rich member information
-- ------------------------------------------------------------------
INSERT INTO member_emergency_contacts (organisation_id,member_id,full_name,relationship,mobile,email,sort_order)
SELECT m.organisation_id,m.id,x.full_name,x.relationship,x.mobile,x.email,0
FROM members m JOIN (VALUES
 ('DSC-000001','Anna Wilson','Spouse','+64 21 555 1010','anna.wilson@example.com'),
 ('DSC-000002','Peter Connors','Father','+64 21 555 1020','peter.connors@example.com'),
 ('DSC-000003','Grace Chen','Spouse','+64 21 555 1030','grace.chen@example.com'),
 ('DSC-000007','Rachel Walker','Mother','+64 21 555 1070','rachel.walker@example.com'),
 ('DSC-000008','Mark Smith','Father','+64 21 555 1080','mark.smith@example.com'),
 ('DSC-000013','Elena Garcia','Mother','+64 21 555 1130','elena.garcia@example.com')
) x(member_number,full_name,relationship,mobile,email) ON x.member_number=m.member_number
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
AND NOT EXISTS (SELECT 1 FROM member_emergency_contacts e WHERE e.member_id=m.id AND e.full_name=x.full_name);

INSERT INTO member_guardians (organisation_id,member_id,full_name,relationship,email,mobile,address,same_address_as_child,is_primary,is_legal_guardian,is_billing_contact,is_emergency_contact)
SELECT m.organisation_id,m.id,x.full_name,x.relationship,x.email,x.mobile,x.address,true,true,true,true,true
FROM members m JOIN (VALUES
 ('DSC-000007','Rachel Walker','Mother','rachel.walker@example.com','+64 21 555 1070','23 Hill Street, Wellington'),
 ('DSC-000008','Mark Smith','Father','mark.smith@example.com','+64 21 555 1080','67 Park Road, Wellington'),
 ('DSC-000013','Elena Garcia','Mother','elena.garcia@example.com','+64 21 555 1130','18 Nelson Street, Wellington'),
 ('DSC-000014','Daniel Lee','Father','daniel.lee@example.com','+64 21 555 1140','30 Cook Street, Wellington')
) x(member_number,full_name,relationship,email,mobile,address) ON x.member_number=m.member_number
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
AND NOT EXISTS (SELECT 1 FROM member_guardians g WHERE g.member_id=m.id AND g.full_name=x.full_name);

INSERT INTO member_medical_information (organisation_id,member_id,medical_conditions,allergies,medication,existing_injuries,accessibility_requirements,dietary_requirements,emergency_notes)
SELECT m.organisation_id,m.id,x.cond,x.allergy,x.med,x.injury,x.access,x.diet,x.notes
FROM members m JOIN (VALUES
 ('DSC-000001','Asthma','Penicillin','Salbutamol inhaler as required','Previous right ankle sprain',NULL,'No special requirements','Inhaler kept in sports bag'),
 ('DSC-000007','Mild exercise-induced asthma',NULL,'Preventer inhaler',NULL,NULL,'Nut-free preference','Guardian to be contacted for breathing difficulty'),
 ('DSC-000008',NULL,'Peanuts','EpiPen',NULL,NULL,'Strict peanut allergy','EpiPen carried at all times'),
 ('DSC-000013',NULL,NULL,NULL,'Recovering left wrist strain',NULL,'Vegetarian',NULL)
) x(member_number,cond,allergy,med,injury,access,diet,notes) ON x.member_number=m.member_number
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ON CONFLICT (member_id) DO UPDATE SET medical_conditions=EXCLUDED.medical_conditions,allergies=EXCLUDED.allergies,medication=EXCLUDED.medication,
existing_injuries=EXCLUDED.existing_injuries,accessibility_requirements=EXCLUDED.accessibility_requirements,dietary_requirements=EXCLUDED.dietary_requirements,emergency_notes=EXCLUDED.emergency_notes;

INSERT INTO custom_fields (organisation_id,label,help_text,field_type,options,section,display_order,is_mandatory,member_editable,is_application_field,is_renewal_field,is_profile_field,sensitivity)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.label,x.help,x.ft,x.opts::jsonb,x.section,x.ord,x.mand,true,true,true,true,x.sens
FROM (VALUES
 ('T-shirt Size','Used for club apparel','select','["XS","S","M","L","XL","2XL"]','club_details',1,false,'general'),
 ('Primary Sport','Main sport played','select','["Cricket","Netball","Football","Badminton"]','club_details',2,true,'general'),
 ('Photo Consent','Consent to club photography','boolean','[]','consent',3,true,'sensitive'),
 ('Volunteer Interests','Areas where the member can help','multiselect','["Coaching","Events","Fundraising","Committee","Transport"]','club_details',4,false,'general')
) x(label,help,ft,opts,section,ord,mand,sens)
WHERE NOT EXISTS (SELECT 1 FROM custom_fields c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.label=x.label);

INSERT INTO custom_field_values (organisation_id,member_id,custom_field_id,value)
SELECT m.organisation_id,m.id,c.id,
CASE c.label WHEN 'T-shirt Size' THEN CASE m.member_number WHEN 'DSC-000001' THEN 'L' WHEN 'DSC-000002' THEN 'M' ELSE 'S' END
 WHEN 'Primary Sport' THEN CASE WHEN m.member_number IN ('DSC-000001','DSC-000003','DSC-000005','DSC-000007','DSC-000013') THEN 'Cricket' ELSE 'Netball' END
 WHEN 'Photo Consent' THEN 'true'
 WHEN 'Volunteer Interests' THEN CASE m.member_number WHEN 'DSC-000001' THEN 'Events,Committee' WHEN 'DSC-000002' THEN 'Fundraising' ELSE 'Events' END END
FROM members m CROSS JOIN custom_fields c
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.organisation_id=m.organisation_id
AND m.member_number IN ('DSC-000001','DSC-000002','DSC-000007')
ON CONFLICT (member_id,custom_field_id) DO UPDATE SET value=EXCLUDED.value;

INSERT INTO member_activity (organisation_id,member_id,activity_type,description,metadata)
SELECT m.organisation_id,m.id,x.typ,x.des,x.meta::jsonb
FROM members m JOIN (VALUES
 ('DSC-000001','award','Received Club Service Award 2025','{"award":"Club Service Award 2025"}'),
 ('DSC-000001','payment','Paid 2026/27 Senior membership','{"amount":220,"method":"Stripe"}'),
 ('DSC-000001','event','Purchased Awards Night ticket','{"event":"Club Awards Night"}'),
 ('DSC-000002','volunteer','Volunteered at junior registration day','{"hours":4}'),
 ('DSC-000007','team','Selected for Junior Cricket','{"team":"Junior Cricket"}')
) x(member_number,typ,des,meta) ON x.member_number=m.member_number
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
AND NOT EXISTS (SELECT 1 FROM member_activity a WHERE a.member_id=m.id AND a.description=x.des);

-- Applications in different workflow states
INSERT INTO membership_applications (organisation_id,membership_type_id,first_name,last_name,email,mobile,date_of_birth,address_line1,city,region,postcode,country,status,submitted_at,reviewer_notes,custom_field_data)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',mt.id,x.fn,x.ln,x.email,x.mobile,x.dob::date,x.addr,'Wellington','Wellington','6011','NZ',x.status,now()-x.age::interval,x.notes,x.custom::jsonb
FROM membership_types mt JOIN (VALUES
 ('Junior','Noah','Fernando','noah.fernando@example.com','+64 21 666 0001','2012-05-11','14 Tawa Street','submitted','3 days','Guardian consent attached','{"Primary Sport":"Cricket","Photo Consent":true}'),
 ('Senior','Aisha','Khan','aisha.khan@example.com','+64 21 666 0002','1994-09-02','9 Harbour View','under_review','5 days','Identity checked','{"Primary Sport":"Netball","T-shirt Size":"M"}'),
 ('Social','Ben','Roberts','ben.roberts@example.com','+64 21 666 0003','1981-01-26','88 Main Road','approved','8 days','Approved by secretary','{"Volunteer Interests":["Events"]}')
) x(type,fn,ln,email,mobile,dob,addr,status,age,notes,custom) ON mt.name=x.type AND mt.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE NOT EXISTS (SELECT 1 FROM membership_applications a WHERE a.organisation_id=mt.organisation_id AND a.email=x.email);

INSERT INTO membership_renewals (organisation_id,member_id,membership_id,status,renewal_open_date,due_date,grace_period_days,expiry_date,fee_amount,last_reminder_sent)
SELECT ms.organisation_id,ms.member_id,ms.id,x.status,CURRENT_DATE-30,CURRENT_DATE+x.due,14,CURRENT_DATE+x.exp,mt.annual_fee,now()-interval '5 days'
FROM memberships ms JOIN members m ON m.id=ms.member_id JOIN membership_types mt ON mt.id=ms.membership_type_id
JOIN (VALUES ('DSC-000009','overdue',-10,4),('DSC-000015','due',7,21),('DSC-000001','paid',300,314)) x(member_number,status,due,exp) ON m.member_number=x.member_number
WHERE NOT EXISTS (SELECT 1 FROM membership_renewals r WHERE r.membership_id=ms.id AND r.status=x.status);

-- Team membership assignments
INSERT INTO team_members (organisation_id,team_id,member_id,season,role)
SELECT t.organisation_id,t.id,m.id,t.season,x.role
FROM teams t JOIN (VALUES
 ('Premier Cricket','DSC-000001','player'),('Premier Cricket','DSC-000003','captain'),('Premier Cricket','DSC-000005','manager'),
 ('Junior Cricket','DSC-000007','player'),('Junior Cricket','DSC-000013','player'),('Premier Netball','DSC-000002','player'),('Premier Netball','DSC-000004','captain')
) x(team,member_number,role) ON t.name=x.team
JOIN members m ON m.organisation_id=t.organisation_id AND m.member_number=x.member_number
WHERE t.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------
-- Extended demo module tables
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS club_finance_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 member_id uuid REFERENCES members(id) ON DELETE SET NULL, reference text NOT NULL, transaction_type text NOT NULL,
 description text, amount numeric(12,2) NOT NULL, currency text DEFAULT 'NZD', provider text, status text DEFAULT 'paid', occurred_at timestamptz DEFAULT now(), UNIQUE(organisation_id,reference));
CREATE TABLE IF NOT EXISTS club_communications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 subject text NOT NULL, audience text, channel text DEFAULT 'email', sent_count int DEFAULT 0, open_rate numeric(5,2), status text DEFAULT 'draft', sent_at timestamptz);
CREATE TABLE IF NOT EXISTS governance_motions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 title text NOT NULL, proposed_by text, meeting_name text, motion_text text, outcome text, status text DEFAULT 'open', meeting_date date);
CREATE TABLE IF NOT EXISTS club_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 title text NOT NULL, category text, version text, review_date date, status text DEFAULT 'current', visibility text DEFAULT 'members');
CREATE TABLE IF NOT EXISTS merchandise_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 name text NOT NULL, sku text, price numeric(10,2), stock_qty int DEFAULT 0, status text DEFAULT 'active', UNIQUE(organisation_id,sku));
CREATE TABLE IF NOT EXISTS donations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 member_id uuid REFERENCES members(id) ON DELETE SET NULL, donor_name text, campaign text, amount numeric(12,2), provider text, status text DEFAULT 'received', donated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS organisation_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 company_name text NOT NULL, contact_name text, category text, email text, phone text, status text DEFAULT 'active');
CREATE TABLE IF NOT EXISTS club_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 title text NOT NULL, counterparty text, start_date date, expiry_date date, annual_value numeric(12,2), status text DEFAULT 'active');
CREATE TABLE IF NOT EXISTS club_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 title text NOT NULL, owner_name text, category text, due_date date, priority text DEFAULT 'normal', status text DEFAULT 'open');
CREATE TABLE IF NOT EXISTS privacy_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 reference text NOT NULL, requester_name text, request_type text, received_at date, due_date date, status text DEFAULT 'open', UNIQUE(organisation_id,reference));
CREATE TABLE IF NOT EXISTS compliance_register (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 requirement text NOT NULL, authority text, owner_name text, due_date date, status text DEFAULT 'current');
CREATE TABLE IF NOT EXISTS support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
 reference text UNIQUE NOT NULL, subject text NOT NULL, priority text DEFAULT 'normal', status text DEFAULT 'open', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS platform_usage_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 snapshot_date date NOT NULL DEFAULT CURRENT_DATE, member_count int, email_count int, event_scans int, storage_mb int, api_calls int, UNIQUE(organisation_id,snapshot_date));

-- RLS for extended org tables
DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['club_finance_transactions','club_communications','governance_motions','club_documents','merchandise_products','donations','organisation_contacts','club_contracts','club_tasks','privacy_requests','compliance_register','platform_usage_snapshots'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('DROP POLICY IF EXISTS demo_org_access ON %I',t);
 EXECUTE format('CREATE POLICY demo_org_access ON %I FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin())',t);
END LOOP;
END $$;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_support_access ON support_tickets;
CREATE POLICY demo_support_access ON support_tickets FOR ALL USING (organisation_id IS NULL OR user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (organisation_id IS NULL OR user_in_org(organisation_id) OR is_platform_admin());

-- Seed extended modules
INSERT INTO club_finance_transactions (organisation_id,member_id,reference,transaction_type,description,amount,provider,status,occurred_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',m.id,x.ref,x.typ,x.des,x.amt,x.provider,x.status,now()-x.age::interval
FROM (VALUES
 ('DSC-000001','PAY-1042','membership','2026/27 Senior Membership',220.00,'Stripe','paid','2 days'),
 ('DSC-000002','PAY-1041','event','Awards Night Ticket',85.00,'POLi','paid','3 days'),
 ('DSC-000003','PAY-1039','merchandise','Club Playing Shirt',55.00,'Stripe','paid','6 days'),
 ('DSC-000009','PAY-1038','membership','2026/27 Senior Membership',220.00,'Bank transfer','pending','8 days')
) x(member_number,ref,typ,des,amt,provider,status,age)
LEFT JOIN members m ON m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number=x.member_number
ON CONFLICT (organisation_id,reference) DO UPDATE SET status=EXCLUDED.status;

INSERT INTO club_communications (organisation_id,subject,audience,sent_count,open_rate,status,sent_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.s,x.a,x.c,x.o,x.st,now()-x.age::interval FROM (VALUES
 ('AGM Notice 2026','Voting members',112,82.0,'sent','14 days'),('Awards Night Tickets','All members',158,74.0,'sent','2 days'),('Membership Renewal Reminder','Expiring members',38,61.0,'sent','6 days'),('Junior Training Update','Junior parents',0,NULL,'draft','0 days')) x(s,a,c,o,st,age)
WHERE NOT EXISTS (SELECT 1 FROM club_communications c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.subject=x.s);

INSERT INTO governance_motions (organisation_id,title,proposed_by,meeting_name,motion_text,outcome,status,meeting_date)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.t,x.p,x.m,x.txt,x.outcome,x.st,x.d::date FROM (VALUES
 ('Approve $500 club management system budget','Sarah Connors','AGM 2026','That the Club approve expenditure up to $500 for a club management system.','Passed','approved','2026-08-21'),
 ('Purchase junior cricket wickets','David Thompson','Committee Meeting','Approve purchase of replacement junior wickets.',NULL,'open','2026-09-03'),
 ('Increase senior subscription to $230','Robert Jones','Committee Meeting','Recommend revised annual senior subscription.',NULL,'open','2026-09-03')) x(t,p,m,txt,outcome,st,d)
WHERE NOT EXISTS (SELECT 1 FROM governance_motions g WHERE g.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND g.title=x.t);

INSERT INTO club_documents (organisation_id,title,category,version,review_date,status,visibility)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.t,x.c,x.v,x.d::date,x.s,x.vis FROM (VALUES
 ('Club Constitution 2026','Governance','2.0','2029-08-21','current','public'),('Member Protection Policy','Policy','1.4','2026-09-15','review_due','members'),('AGM Minutes 2026','Minutes','Final',NULL,'current','members'),('Privacy Policy','Compliance','1.2','2027-03-01','current','public')) x(t,c,v,d,s,vis)
WHERE NOT EXISTS (SELECT 1 FROM club_documents d WHERE d.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND d.title=x.t);

INSERT INTO merchandise_products (organisation_id,name,sku,price,stock_qty,status) VALUES
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Club Playing Shirt','CLS-SHIRT',55,24,'active'),('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Club Cap','CLS-CAP',25,9,'active'),('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Training Hoodie','CLS-HOOD',70,18,'active'),('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Junior Training Tee','CLS-JTEE',35,6,'active') ON CONFLICT (organisation_id,sku) DO UPDATE SET stock_qty=EXCLUDED.stock_qty,price=EXCLUDED.price;

INSERT INTO donations (organisation_id,member_id,donor_name,campaign,amount,provider,status,donated_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',m.id,x.n,x.c,x.a,x.p,'received',now()-x.age::interval
FROM (VALUES ('DSC-000001','James Wilson','Club Development',250.00,'Stripe','10 days'),(NULL,'Local Business Sponsor','Junior Equipment Fund',1000.00,'Bank transfer','19 days'),('DSC-000002','Sarah Connors','Junior Equipment Fund',100.00,'Stripe','4 days')) x(member_number,n,c,a,p,age)
LEFT JOIN members m ON m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number=x.member_number
WHERE NOT EXISTS (SELECT 1 FROM donations d WHERE d.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND d.donor_name=x.n AND d.amount=x.a);

INSERT INTO organisation_contacts (organisation_id,company_name,contact_name,category,email,phone,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.co,x.n,x.cat,x.e,x.p,'active' FROM (VALUES
 ('Wellington Sports Centre','Venue Manager','Venue','venue@example.com','04 555 2100'),('Cricket Supplies NZ','Matt Green','Supplier','matt@cricketsupplies.example','04 555 3900'),('Community Trust','Grants Team','Funder','grants@communitytrust.example','04 555 4800'),('Metro Accounting','Lisa Kumar','Professional services','lisa@metroaccounting.example','04 555 1500')) x(co,n,cat,e,p)
WHERE NOT EXISTS (SELECT 1 FROM organisation_contacts c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.company_name=x.co);

INSERT INTO club_contracts (organisation_id,title,counterparty,start_date,expiry_date,annual_value,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.t,x.c,x.s::date,x.e::date,x.v,x.st FROM (VALUES
 ('Ground Hire Agreement','Wellington Sports Centre','2025-09-01','2027-08-31',8400.00,'active'),('Uniform Supply','Cricket Supplies NZ','2026-01-01','2026-12-31',4500.00,'renewal_due'),('Website Hosting','Netlify','2026-07-01','2027-06-30',1200.00,'active')) x(t,c,s,e,v,st)
WHERE NOT EXISTS (SELECT 1 FROM club_contracts c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.title=x.t);

INSERT INTO club_tasks (organisation_id,title,owner_name,category,due_date,priority,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.t,x.o,x.c,x.d::date,x.p,x.s FROM (VALUES
 ('Update member register after AGM','Sarah Connors','Governance','2026-08-28','high','in_progress'),('Submit annual return','Sarah Connors','Compliance','2026-09-30','high','open'),('Review first aid kits','David Thompson','Health & Safety','2026-08-26','high','overdue'),('Reconcile event ticket sales','Robert Jones','Finance','2026-08-25','normal','open')) x(t,o,c,d,p,s)
WHERE NOT EXISTS (SELECT 1 FROM club_tasks t WHERE t.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND t.title=x.t);

INSERT INTO privacy_requests (organisation_id,reference,requester_name,request_type,received_at,due_date,status) VALUES
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','PR-0007','Sarah Connors','Access request','2026-08-14','2026-09-04','open') ON CONFLICT (organisation_id,reference) DO NOTHING;
INSERT INTO compliance_register (organisation_id,requirement,authority,owner_name,due_date,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.r,x.a,x.o,x.d::date,x.s FROM (VALUES
 ('Incorporated society annual return','Companies Office','Sarah Connors','2026-09-30','due_soon'),('Financial statements approval','Club Constitution','Robert Jones','2026-08-21','complete'),('Health & safety review','Club Policy','James Wilson','2026-10-01','current')) x(r,a,o,d,s)
WHERE NOT EXISTS (SELECT 1 FROM compliance_register c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.requirement=x.r);
INSERT INTO support_tickets (organisation_id,reference,subject,priority,status) VALUES
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','SUP-1027','POLi configuration','normal','waiting_customer'),
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','SUP-1028','Member import question','normal','open') ON CONFLICT (reference) DO NOTHING;
INSERT INTO platform_usage_snapshots (organisation_id,snapshot_date,member_count,email_count,event_scans,storage_mb,api_calls) VALUES
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',CURRENT_DATE,158,1248,214,720,18400) ON CONFLICT (organisation_id,snapshot_date) DO UPDATE SET member_count=EXCLUDED.member_count,email_count=EXCLUDED.email_count,event_scans=EXCLUDED.event_scans,storage_mb=EXCLUDED.storage_mb,api_calls=EXCLUDED.api_calls;

-- Ensure all modules are enabled for Demo Sports Club so every menu can be tested
INSERT INTO organisation_modules (organisation_id,module_id,is_enabled)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',id,true FROM modules
ON CONFLICT (organisation_id,module_id) DO UPDATE SET is_enabled=true;

-- Give Organisation Owner full module access
INSERT INTO role_module_access (role_id,module_id,access_level)
SELECT r.id,m.id,'full_admin' FROM roles r CROSS JOIN modules m
WHERE r.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name='Organisation Owner'
ON CONFLICT (role_id,module_id) DO UPDATE SET access_level='full_admin';

