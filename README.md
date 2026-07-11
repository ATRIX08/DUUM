# DUUM - loja com Checkout Pro

Projeto de loja DUUM com vitrine, sacola, checkout e integracao inicial com Mercado Pago Checkout Pro.

## O que ja funciona
- Pagina inicial responsiva
- Catalogo e filtros
- Detalhes dos produtos
- Carrinho salvo no navegador
- Resumo de checkout
- Criacao de preferencia no Mercado Pago pelo backend
- Webhook inicial para receber notificacoes do Mercado Pago
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

## Antes de vender de verdade
1. Troque WhatsApp, e-mail, CNPJ, razao social e endereco.
2. Substitua as imagens e produtos pelos itens autorizados pelo fornecedor.
3. Crie um backend seguro para precos, pedidos e estoque. Nao confie nos valores do JavaScript do navegador.
4. Troque as credenciais de teste por credenciais de producao somente quando tudo estiver validado.
5. Salve pedidos e webhooks em um banco de dados antes de vender em producao.
6. Integre a API do fornecedor e confirme estoque antes de cobrar.
7. Use banco de dados com permissoes por usuario, logs e backups.
8. Configure autenticacao em dois fatores no e-mail, dominio, Vercel, gateway e banco.
9. Contrate dominio proprio e publique apenas por HTTPS.
10. Revise politicas com profissional juridico/contabil conforme sua operacao.

## Publicar
- Configure `MERCADOPAGO_ACCESS_TOKEN` nas variaveis de ambiente da hospedagem.
- Configure `PUBLIC_BASE_URL` com o dominio final, por exemplo `https://duum.com.br`.
- Configure `MERCADOPAGO_WEBHOOK_SECRET` com a assinatura secreta gerada na tela de Webhooks.
- Configure `DATABASE_URL` com a conexao PostgreSQL de producao.
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
