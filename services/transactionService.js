const { insertTransaction, getAllTransactions, getStatistics } = require('../database/database');

function formatRiskState(riskLevel) {
  if (riskLevel === 'LOW') return 'SAFE';
  if (riskLevel === 'MEDIUM') return 'VERIFICATION';
  return 'BLOCKED';
}

async function saveTransactionEntry(transactionData, analysisResult) {
  const record = {
    createdAt: new Date().toISOString(),
    recipient: String(transactionData.recipient || 'Unknown').trim(),
    amount: Number(transactionData.amount) || 0,
    recipientStatus: String(transactionData.recipientStatus || 'unknown').toLowerCase(),
    paymentMethod: String(transactionData.paymentMethod || 'UPI').toUpperCase(),
    transactionFrequency: String(transactionData.transactionFrequency || 'normal').toLowerCase(),
    deviceStatus: String(transactionData.deviceStatus || 'unknown').toLowerCase(),
    locationStatus: String(transactionData.locationStatus || 'normal').toLowerCase(),
    riskScore: Number(analysisResult.risk.score) || 0,
    riskLevel: String(analysisResult.risk.level || 'LOW').toUpperCase(),
    paymentStatus: formatRiskState(String(analysisResult.risk.level || 'LOW').toUpperCase()),
    recommendation: String(analysisResult.risk.recommendation || 'Review required')
  };

  return insertTransaction(record);
}

async function getTransactions() {
  const rows = await getAllTransactions();
  return rows.map((row) => ({
    id: row.id,
    date: new Date(row.createdAt).toLocaleDateString('en-IN'),
    time: new Date(row.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    recipient: row.recipient,
    amount: Number(row.amount),
    riskScore: Number(row.riskScore),
    riskLevel: row.riskLevel,
    paymentStatus: row.paymentStatus
  }));
}

async function getDashboardStats() {
  const stats = await getStatistics();
  return stats;
}

module.exports = {
  saveTransactionEntry,
  getTransactions,
  getDashboardStats,
  formatRiskState
};
