'use strict';

const adminDashboard = require('./admin-dashboard');
const adminLeads = require('./admin-leads');
const adminMigrate = require('./admin-migrate');
const adminOrders = require('./admin-orders');
const adminProducts = require('./admin-products');
const adminSuppliers = require('./admin-suppliers');
const auth = require('./auth');
const catalog = require('./catalog');
const createPreference = require('./create-preference');
const mercadopagoWebhook = require('./mercadopago-webhook');
const newsletter = require('./newsletter');
const orderLookup = require('./order');
const { sendJson } = require('./_http');

function routeApi(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;

  if (pathname === '/api/create-preference') return createPreference(req, res);
  if (pathname === '/api/catalog') return catalog(req, res);
  if (pathname === '/api/order') return orderLookup(req, res);
  if (pathname === '/api/newsletter') return newsletter(req, res);
  if (pathname === '/api/auth') return auth(req, res);
  if (pathname === '/api/admin-dashboard') return adminDashboard(req, res);
  if (pathname === '/api/admin-leads') return adminLeads(req, res);
  if (pathname === '/api/admin-migrate') return adminMigrate(req, res);
  if (pathname === '/api/admin-orders') return adminOrders(req, res);
  if (pathname === '/api/admin-products') return adminProducts(req, res);
  if (pathname === '/api/admin-suppliers') return adminSuppliers(req, res);
  if (pathname === '/api/mercadopago-webhook' || pathname === '/api/webhook' || pathname === '/webhook' || pathname === '/') {
    return mercadopagoWebhook(req, res);
  }

  return sendJson(res, 404, { error: 'Rota nao encontrada.' });
}

module.exports = routeApi;
