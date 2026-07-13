-- WhatsFlow AI — full Supabase schema
--
-- HOW TO RUN THIS:
--   1. Go to supabase.com -> your project -> SQL Editor (left sidebar)
--   2. Paste this entire file
--   3. Click "Run"
--   4. Go to "Table Editor" (left sidebar) -> you'll see every table below listed there
--
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.
--
-- Security note: Row Level Security (RLS) is enabled on every table with NO
-- policies attached. That means the `anon` key gets "permission denied" on
-- all of these tables — only the `service_role` key (used server-side only,
-- never sent to the browser) can read/write. This is intentional: it stops
-- your data from being publicly readable even if the anon key ever leaks.

-- ============================================================================
-- Auth: users & sessions
-- ============================================================================

create table if not exists users (
  id text primary key,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  company_name text,
  phone text,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_id_idx on sessions(user_id);

-- ============================================================================
-- Contacts / conversations / messages
-- ============================================================================

create table if not exists contacts (
  id text primary key,
  name text not null,
  phone text not null,
  email text,
  tags text[] not null default '{}',
  status text not null default 'lead',
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  attributes jsonb not null default '{}'
);
create index if not exists contacts_phone_idx on contacts(phone);

create table if not exists conversations (
  id text primary key,
  contact_id text not null references contacts(id) on delete cascade,
  status text not null default 'open',
  unread int not null default 0,
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  assigned_to text
);
create index if not exists conversations_contact_id_idx on conversations(contact_id);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  contact_id text not null references contacts(id) on delete cascade,
  direction text not null,
  type text not null,
  text text not null default '',
  status text not null,
  timestamp timestamptz not null default now(),
  wamid text,
  template_name text,
  via text,
  error text
);
create index if not exists messages_conversation_id_idx on messages(conversation_id);

-- ============================================================================
-- Templates / campaigns / automation / flows
-- ============================================================================

create table if not exists templates (
  id text primary key,
  name text not null,
  category text not null,
  language text not null default 'en_US',
  status text not null default 'pending',
  body text not null,
  variable_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id text primary key,
  name text not null,
  type text not null,
  status text not null default 'draft',
  template_name text,
  audience_tag text,
  recipient_count int not null default 0,
  stats jsonb not null default '{"sent":0,"delivered":0,"read":0,"failed":0,"clicked":0}',
  created_at timestamptz not null default now(),
  scheduled_at timestamptz
);

create table if not exists automation_rules (
  id text primary key,
  name text not null,
  enabled boolean not null default true,
  trigger_type text not null,
  keywords text[] not null default '{}',
  match_type text not null default 'contains',
  response_type text not null default 'text',
  response_text text,
  response_template text,
  priority int not null default 1,
  triggered_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists flows (
  id text primary key,
  name text not null,
  enabled boolean not null default true,
  trigger text not null,
  keywords text[] not null default '{}',
  steps jsonb not null default '[]',
  enrolled_count int not null default 0,
  completed_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists scheduled_jobs (
  id text primary key,
  flow_id text references flows(id) on delete cascade,
  flow_name text not null,
  contact_id text references contacts(id) on delete cascade,
  step_index int not null default 0,
  message text not null,
  run_at timestamptz not null,
  status text not null default 'pending'
);

-- ============================================================================
-- Integrations & settings
-- ============================================================================

create table if not exists integrations (
  id text primary key,
  key text not null unique,
  name text not null,
  description text not null default '',
  category text not null default 'Other',
  connected boolean not null default false,
  connected_at timestamptz,
  account_label text,
  credentials jsonb
);

create table if not exists settings (
  id int primary key default 1,
  business_name text not null default '',
  business_email text not null default '',
  website text not null default '',
  whatsapp_number text not null default '',
  auto_reply_enabled boolean not null default true,
  sandbox_mode boolean not null default true,
  wa_access_token text,
  wa_phone_number_id text,
  wa_business_account_id text,
  wa_verify_token text,
  constraint settings_singleton check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists activity_events (
  id text primary key,
  type text not null,
  text text not null,
  timestamp timestamptz not null default now()
);

-- ============================================================================
-- Chatbots
-- ============================================================================

create table if not exists chatbots (
  id text primary key,
  name text not null,
  enabled boolean not null default false,
  flow_json jsonb not null default '{"nodes":[],"edges":[]}',
  created_at timestamptz not null default now(),
  triggered_count int not null default 0
);

create table if not exists chatbot_sessions (
  id text primary key,
  chatbot_id text not null references chatbots(id) on delete cascade,
  contact_id text not null references contacts(id) on delete cascade,
  current_node_id text,
  waiting_for_reply boolean not null default false,
  collected_data jsonb not null default '{}',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed boolean not null default false
);

create table if not exists media_files (
  id text primary key,
  filename text not null,
  type text not null,
  size bigint not null default 0,
  url text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Reminders / support
-- ============================================================================

create table if not exists reminders (
  id text primary key,
  title text not null,
  note text,
  due_at timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists support_tickets (
  id text primary key,
  subject text not null,
  message text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists support_replies (
  id text primary key,
  ticket_id text not null references support_tickets(id) on delete cascade,
  from_role text not null,
  text text not null,
  at timestamptz not null default now()
);
create index if not exists support_replies_ticket_id_idx on support_replies(ticket_id);

-- ============================================================================
-- Groups / transactions / commerce / forms
-- ============================================================================

create table if not exists groups (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists group_contacts (
  group_id text not null references groups(id) on delete cascade,
  contact_id text not null references contacts(id) on delete cascade,
  primary key (group_id, contact_id)
);

create table if not exists transactions (
  id text primary key,
  contact_id text references contacts(id) on delete set null,
  contact_name text not null,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  method text not null default 'Card',
  reference text not null,
  created_at timestamptz not null default now()
);

create table if not exists wa_forms (
  id text primary key,
  name text not null,
  description text,
  published boolean not null default false,
  submission_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists wa_form_fields (
  id text primary key,
  form_id text not null references wa_forms(id) on delete cascade,
  label text not null,
  type text not null,
  required boolean not null default false,
  options text[],
  position int not null default 0
);
create index if not exists wa_form_fields_form_id_idx on wa_form_fields(form_id);

create table if not exists form_submissions (
  id text primary key,
  form_id text not null references wa_forms(id) on delete cascade,
  data jsonb not null default '{}',
  submitted_at timestamptz not null default now()
);

create table if not exists canned_messages (
  id text primary key,
  shortcut text not null,
  text text not null,
  category text not null default 'General',
  created_at timestamptz not null default now()
);

create table if not exists tag_defs (
  id text primary key,
  name text not null unique,
  color text not null default '#2563eb',
  created_at timestamptz not null default now()
);

create table if not exists custom_fields (
  id text primary key,
  key text not null,
  label text not null,
  type text not null default 'text',
  created_at timestamptz not null default now()
);

create table if not exists webhook_events (
  id text primary key,
  source text not null,
  event text not null,
  summary text not null,
  payload jsonb,
  status text not null default 'processed',
  received_at timestamptz not null default now()
);

create table if not exists products (
  id text primary key,
  name text not null,
  sku text not null,
  price numeric not null,
  currency text not null default 'USD',
  stock int not null default 0,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  contact_id text references contacts(id) on delete set null,
  contact_name text not null,
  total numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id text references products(id) on delete set null,
  name text not null,
  qty int not null default 1,
  price numeric not null
);
create index if not exists order_items_order_id_idx on order_items(order_id);

create table if not exists faqs (
  id text primary key,
  question text not null,
  answer text not null,
  category text not null default 'General',
  enabled boolean not null default true,
  triggered_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- AI assistant / organizations / API keys / billing
-- ============================================================================

create table if not exists ai_assistant_config (
  id int primary key default 1,
  enabled boolean not null default true,
  model text not null default 'gpt-4o-mini',
  system_prompt text not null default '',
  temperature numeric not null default 0.6,
  tone text not null default 'friendly',
  fallback_to_human boolean not null default true,
  constraint ai_assistant_singleton check (id = 1)
);
insert into ai_assistant_config (id) values (1) on conflict (id) do nothing;

create table if not exists organizations (
  id text primary key,
  name text not null,
  plan text not null default 'Starter',
  created_at timestamptz not null default now()
);

create table if not exists org_members (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now()
);
create index if not exists org_members_org_id_idx on org_members(org_id);

create table if not exists api_keys (
  id text primary key,
  name text not null,
  key text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  scopes text[] not null default '{}',
  revoked boolean not null default false
);

create table if not exists billing_info (
  id int primary key default 1,
  plan text not null default 'Growth',
  price_monthly numeric not null default 79,
  currency text not null default 'USD',
  renewal_date timestamptz not null default (now() + interval '30 days'),
  messages_used int not null default 0,
  messages_limit int not null default 25000,
  payment_method_last4 text not null default '4242',
  constraint billing_singleton check (id = 1)
);
insert into billing_info (id) values (1) on conflict (id) do nothing;

create table if not exists invoices (
  id text primary key,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'paid',
  date timestamptz not null default now(),
  plan_label text not null
);

-- ============================================================================
-- Row Level Security — deny-all by default (service_role bypasses RLS
-- automatically; anon/authenticated get no access unless you add policies)
-- ============================================================================

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'users','sessions','contacts','conversations','messages','templates',
      'campaigns','automation_rules','flows','scheduled_jobs','integrations',
      'settings','activity_events','chatbots','chatbot_sessions','media_files',
      'reminders','support_tickets','support_replies','groups','group_contacts',
      'transactions','wa_forms','wa_form_fields','form_submissions',
      'canned_messages','tag_defs','custom_fields','webhook_events','products',
      'orders','order_items','faqs','ai_assistant_config','organizations',
      'org_members','api_keys','billing_info','invoices'
    ])
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
