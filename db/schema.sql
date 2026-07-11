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

create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_payment_events_provider_payment_id on payment_events(provider_payment_id);

alter table products add column if not exists sku text;
alter table products add column if not exists stock_quantity integer not null default 0;
alter table products add column if not exists featured boolean not null default false;

alter table orders add column if not exists shipping_method text;
alter table orders add column if not exists carrier text;
alter table orders add column if not exists tracking_code text;
alter table orders add column if not exists admin_notes text;
alter table orders add column if not exists discount_code text;
alter table orders add column if not exists discount_amount numeric(10,2) not null default 0;

create index if not exists idx_products_active on products(active);
create index if not exists idx_products_stock_quantity on products(stock_quantity);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_newsletter_created_at on newsletter_subscribers(created_at desc);
