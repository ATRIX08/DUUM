# DUUM - loja com Checkout Pro

Projeto de loja DUUM com vitrine, sacola, checkout Mercado Pago, banco PostgreSQL, painel admin, fornecedores e acompanhamento de pedidos.

## O que ja funciona
- Pagina inicial responsiva
- Catalogo e filtros
- Detalhes dos produtos
- Carrinho salvo no navegador
- Resumo de checkout
- Criacao de preferencia no Mercado Pago pelo backend
- Webhook para receber notificacoes do Mercado Pago
- Pedidos salvos no PostgreSQL
- Catalogo carregado pelo banco com fallback local
- Painel admin em `admin.html`
- Cadastro/edicao de produtos e fornecedores
- Listagem e atualizacao operacional de pedidos
- Pagina publica de acompanhamento em `pedido.html`
- Banner de cookies
- Pagina de politicas
- Cabecalhos de seguranca para Vercel
- Estrutura visual de confianca

## Rodar localmente
1. Copie `.env.example` para `.env`.
2. Cole seu Access Token de teste:

```env
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_de_teste
MERCADOPAGO_USE_SANDBOX=true
MERCADOPAGO_WEBHOOK_SECRET=assinatura_secreta_do_webhook
PUBLIC_BASE_URL=http://localhost:3000
PORT=3000
ADMIN_MIGRATION_SECRET=sua_chave_admin
```

3. Rode:

```bash
npm start
```

4. Abra `http://localhost:3000`.

Nunca coloque o Access Token dentro do HTML ou do JavaScript do navegador.

## Banco de dados
O projeto usa PostgreSQL por `DATABASE_URL`. Recomendado para Vercel: Neon ou Supabase.

Depois de configurar `DATABASE_URL`, rode:

```bash
npm run db:setup
```

Isso cria as tabelas principais e sincroniza os produtos atuais da DUUM.

Em producao na Vercel, tambem existe o endpoint protegido `POST /api/admin-migrate`, que deve ser usado apenas com `ADMIN_MIGRATION_SECRET` configurado.

Tabelas criadas:
- `customers`
- `suppliers`
- `products`
- `orders`
- `order_items`
- `payment_events`

## Painel admin
Abra:

```txt
https://seu-dominio.com/admin.html
```

Cole a chave configurada em `ADMIN_MIGRATION_SECRET`. O painel permite:
- Ver pedidos recentes
- Abrir detalhes do pedido
- Alterar status operacional
- Cadastrar e editar fornecedores
- Cadastrar e editar produtos

A chave admin nunca deve ser publicada no GitHub.

## Antes de vender de verdade
1. Troque WhatsApp, e-mail, CNPJ, razao social e endereco.
2. Substitua as imagens e produtos pelos itens autorizados pelo fornecedor.
3. Troque as credenciais de teste por credenciais de producao somente quando tudo estiver validado.
4. Integre a API do fornecedor e confirme estoque antes de cobrar, se a operacao for dropshipping.
5. Configure autenticacao em dois fatores no e-mail, dominio, Vercel, gateway e banco.
6. Contrate dominio proprio e publique apenas por HTTPS.
7. Revise politicas com profissional juridico/contabil conforme sua operacao.

## Publicar
- Configure `MERCADOPAGO_ACCESS_TOKEN` nas variaveis de ambiente da hospedagem.
- Configure `PUBLIC_BASE_URL` com o dominio final, por exemplo `https://duum.com.br`.
- Configure `MERCADOPAGO_WEBHOOK_SECRET` com a assinatura secreta gerada na tela de Webhooks.
- Configure `DATABASE_URL` com a conexao PostgreSQL de producao.
- Configure `ADMIN_MIGRATION_SECRET` para proteger o painel e a migracao.
- Configure no painel do Mercado Pago o webhook:

```txt
https://seu-dominio.com/api/mercadopago-webhook
```

- Em Vercel, as rotas dentro de `api/` funcionam como serverless functions.
- Em servidor Node/Render/Railway, rode `npm start`.

## Arquitetura recomendada para producao
- Frontend: Next.js
- Backend/API: Next.js Server Actions/Route Handlers ou NestJS
- Banco: PostgreSQL/Supabase
- Pagamento: Mercado Pago, Stripe, Pagar.me ou Asaas
- E-mails: Resend
- Imagens: Cloudinary
- Monitoramento: Sentry
- Protecao: Cloudflare + rate limiting
- Logistica: Melhor Envio e API do fornecedor

## Observacao de seguranca
Nenhum site pode ser garantido como "100% seguro". A seguranca depende tambem da configuracao da hospedagem, credenciais, integracoes, atualizacoes, operacao e testes continuos.
