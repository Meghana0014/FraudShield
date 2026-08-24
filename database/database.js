const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'fraudshield.db');
const db = new sqlite3.Database(dbPath);

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          createdAt TEXT NOT NULL,
          recipient TEXT NOT NULL,
          amount REAL NOT NULL,
          recipientStatus TEXT NOT NULL,
          paymentMethod TEXT NOT NULL,
          transactionFrequency TEXT NOT NULL,
          deviceStatus TEXT NOT NULL,
          locationStatus TEXT NOT NULL,
          riskScore INTEGER NOT NULL,
          riskLevel TEXT NOT NULL,
          paymentStatus TEXT NOT NULL,
          recommendation TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }

        db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_createdAt ON transactions(createdAt)`, (indexErr) => {
          if (indexErr) {
            reject(indexErr);
            return;
          }
          resolve();
        });
      });
    });
  });
}

function insertTransaction(record) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO transactions (
        createdAt,
        recipient,
        amount,
        recipientStatus,
        paymentMethod,
        transactionFrequency,
        deviceStatus,
        locationStatus,
        riskScore,
        riskLevel,
        paymentStatus,
        recommendation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
      record.createdAt,
      record.recipient,
      record.amount,
      record.recipientStatus,
      record.paymentMethod,
      record.transactionFrequency,
      record.deviceStatus,
      record.locationStatus,
      record.riskScore,
      record.riskLevel,
      record.paymentStatus,
      record.recommendation
    ], function onInsert(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        id: this.lastID,
        ...record,
        createdAt: record.createdAt,
        paymentStatus: record.paymentStatus
      });
    });
  });
}

function getAllTransactions() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM transactions ORDER BY createdAt DESC', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getStatistics() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        COUNT(*) AS totalTransactions,
        SUM(CASE WHEN paymentStatus = 'SAFE' THEN 1 ELSE 0 END) AS safeTransactions,
        SUM(CASE WHEN paymentStatus = 'VERIFICATION' THEN 1 ELSE 0 END) AS flaggedTransactions,
        SUM(CASE WHEN paymentStatus = 'BLOCKED' THEN 1 ELSE 0 END) AS blockedTransactions
      FROM transactions
    `;

    db.get(query, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        totalTransactions: Number(row.totalTransactions || 0),
        safeTransactions: Number(row.safeTransactions || 0),
        flaggedTransactions: Number(row.flaggedTransactions || 0),
        blockedTransactions: Number(row.blockedTransactions || 0)
      });
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  insertTransaction,
  getAllTransactions,
  getStatistics
};
