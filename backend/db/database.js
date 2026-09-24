/**
 * ReimbursePro Database Layer
 * -----------------------------------------------------------------------
 * Uses lowdb (a lightweight embedded JSON database) so the entire project
 * runs with zero external services (no Postgres/Mongo install required).
 *
 * PRODUCTION NOTE:
 * For a real 5,000+ employee enterprise deployment, replace this adapter
 * with PostgreSQL (via Prisma/Sequelize) or MongoDB. The service layer
 * (routes/*.js) is written against this `db` object's simple API
 * (db.get(collection), .find(), .push(), .write()) so swapping the
 * storage engine later only requires changing this file.
 * -----------------------------------------------------------------------
 */
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const file = path.join(__dirname, 'db.json');
const adapter = new FileSync(file);
const db = low(adapter);

db.defaults({
  users: [],
  expenses: [],
  approvalChains: [],
  categories: [],
  notifications: [],
  auditLog: []
}).write();

module.exports = db;
