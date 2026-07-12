'use strict';

const adminDashboard = require('./admin-dashboard');
const adminCampaigns = require('./admin-campaigns');
const adminCoupons = require('./admin-coupons');
const adminCustomers = require('./admin-customers');
const adminLeads = require('./admin-leads');
const adminMigrate = require('./admin-migrate');
const adminOrders = require('./admin-orders');
const adminProducts = require('./admin-products');
const adminReports = require('./admin-reports');
const adminReviews = require('./admin-reviews');
const adminSuppliers = require('./admin-suppliers');
const abandonedCart = require('./abandoned-cart');
const auth = require('./auth');
const campaigns = require('./campaigns');
const catalog = require('./catalog');
const createPreference = require('./create-preference');
const customerOrders = require('./customer-orders');
const mercadopagoWebhook = require('./mercadopago-webhook');
const newsletter = require('./newsletter');
const orderLookup = require('./order');
const reviews = require('./reviews');
const shipping = require('./shipping');
const { sendJson } = require('./_http');

function routeApi(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;

  if (pathname === '/api/create-preference') return createPreference(req, res);
  if (pathname === '/api/campaigns') return campaigns(req, res);
  if (pathname === '/api/catalog') return catalog(req, res);
  if (pathname === '/api/order') return orderLookup(req, res);
  if (pathname === '/api/shipping') return shipping(req, res);
  if (pathname === '/api/reviews') return reviews(req, res);
  if (pathname === '/api/customer-orders') return customerOrders(req, res);
  if (pathname === '/api/newsletter') return newsletter(req, res);
  if (pathname === '/api/auth') return auth(req, res);
  if (pathname === '/api/abandoned-cart') return abandonedCart(req, res);
  if (pathname === '/api/admin-campaigns') return adminCampaigns(req, res);
  if (pathname === '/api/admin-dashboard') return adminDashboard(req, res);
  if (pathname === '/api/admin-coupons') return adminCoupons(req, res);
  if (pathname === '/api/admin-customers') return adminCustomers(req, res);
  if (pathname === '/api/admin-leads') return adminLeads(req, res);
  if (pathname === '/api/admin-migrate') return adminMigrate(req, res);
  if (pathname === '/api/admin-orders') return adminOrders(req, res);
  if (pathname === '/api/admin-products') return adminProducts(req, res);
  if (pathname === '/api/admin-reports') return adminReports(req, res);
  if (pathname === '/api/admin-reviews') return adminReviews(req, res);
  if (pathname === '/api/admin-suppliers') return adminSuppliers(req, res);
  if (pathname === '/api/mercadopago-webhook' || pathname === '/api/webhook' || pathname === '/webhook' || pathname === '/') {
    return mercadopagoWebhook(req, res);
  }

  return sendJson(res, 404, { error: 'Rota nao encontrada.' });
}

module.exports = routeApi;
