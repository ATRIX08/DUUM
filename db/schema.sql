create table if not exists customers (
  id bigserial primary key,
  name text not null,
  email text,
  phone text,
  cep text,
  address text,
  number text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists customer_accounts (
  id bigserial primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists suppliers (
  id bigserial primary key,
  name text not null,
  contact_name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id integer primary key,
  name text not null,
  category text,
  price numeric(10,2) not null,
  old_price numeric(10,2),
  image_url text,
  description text,
  active boolean not null default true,
  supplier_id bigint references suppliers(id),
  supplier_sku text,
  supplier_cost numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  customer_id bigint references customers(id),
  status text not null default 'pending_payment',
  payment_status text not null default 'pending',
  total_amount numeric(10,2) not null,
  currency text not null default 'BRL',
  mercado_pago_preference_id text,
  mercado_pago_payment_id text,
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id integer references products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null
);

create table if not exists payment_events (
  id bigserial primary key,
  provider text not null,
  provider_payment_id text,
  topic text,
  order_id text references orders(id),
  status text,
  status_detail text,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  id bigserial primary key,
  email text not null unique,
  source text,
  coupon_code text,
  created_at timestamptz not null default now()
);

create table if not exists coupons (
  id bigserial primary key,
  code text not null unique,
  type text not null default 'percent',
  value numeric(10,2) not null,
  min_order_amount numeric(10,2) not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaigns (
  id bigserial primary key,
  title text not null,
  subtitle text,
  image_url text,
  cta_label text,
  cta_url text,
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_reviews (
  id bigserial primary key,
  product_id integer not null references products(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists password_reset_tokens (
  id bigserial primary key,
  account_id bigint not null references customer_accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists abandoned_carts (
  id bigserial primary key,
  email text not null,
  customer_name text,
  phone text,
  cart jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  coupon_code text,
  status text not null default 'open',
  recovery_token text not null unique,
  last_seen_at timestamptz not null default now(),
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_events (
  id bigserial primary key,
  level text not null default 'info',
  source text not null,
  message text not null,
  order_id text references orders(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table app_events add column if not exists level text not null default 'info';
alter table app_events add column if not exists source text not null default 'app';
alter table app_events add column if not exists message text not null default 'Evento';
alter table app_events add column if not exists order_id text references orders(id);
alter table app_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_events add column if not exists created_at timestamptz not null default now();

create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_payment_events_provider_payment_id on payment_events(provider_payment_id);

alter table products add column if not exists sku text;
alter table products add column if not exists stock_quantity integer not null default 0;
alter table products add column if not exists featured boolean not null default false;
alter table products add column if not exists sizes text not null default 'P,M,G,GG';
alter table products add column if not exists size_stock jsonb not null default '{}'::jsonb;
alter table products add column if not exists gallery_urls jsonb not null default '[]'::jsonb;

alter table orders add column if not exists shipping_method text;
alter table orders add column if not exists shipping_fee numeric(10,2) not null default 0;
alter table orders add column if not exists carrier text;
alter table orders add column if not exists tracking_code text;
alter table orders add column if not exists admin_notes text;
alter table orders add column if not exists discount_code text;
alter table orders add column if not exists discount_amount numeric(10,2) not null default 0;

create index if not exists idx_products_active on products(active);
create index if not exists idx_products_stock_quantity on products(stock_quantity);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_newsletter_created_at on newsletter_subscribers(created_at desc);
create index if not exists idx_customer_accounts_customer_id on customer_accounts(customer_id);
create index if not exists idx_coupons_active on coupons(active);
create index if not exists idx_campaigns_active on campaigns(active);
create index if not exists idx_product_reviews_product_id on product_reviews(product_id);
create index if not exists idx_product_reviews_approved on product_reviews(approved);
create index if not exists idx_password_reset_tokens_account_id on password_reset_tokens(account_id);
create index if not exists idx_abandoned_carts_email on abandoned_carts(email);
create index if not exists idx_abandoned_carts_status on abandoned_carts(status);
create index if not exists idx_app_events_created_at on app_events(created_at desc);
create index if not exists idx_app_events_level on app_events(level);

insert into coupons (code, type, value, min_order_amount, active)
values ('DUUM10', 'percent', 10, 0, true)
on conflict (code) do nothing;

insert into campaigns (title, subtitle, image_url, cta_label, cta_url, active)
values (
  'Frete gratis acima de R$ 199',
  'Aproveite a curadoria DUUM com entrega rastreada e pagamento seguro.',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1400&q=84',
  'Ver novidades',
  '#novidades',
  true
)
on conflict do nothing;
