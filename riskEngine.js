function clampScore(score) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

function getLevel(score) {
  if (score <= 30) return 'LOW';
  if (score <= 70) return 'MEDIUM';
  return 'HIGH';
}

function normalize(value, fallback = '') {
  return String(value ?? fallback).trim().toLowerCase();
}

function calculateRisk(transaction = {}) {
  const payload = {
    amount: Number(transaction.amount) || 0,
    recipientStatus: normalize(transaction.recipientStatus, 'known'),
    paymentMethod: normalize(transaction.paymentMethod, 'UPI'),
    transactionFrequency: normalize(transaction.transactionFrequency, 'normal'),
    deviceStatus: normalize(transaction.deviceStatus, 'known'),
    locationStatus: normalize(transaction.locationStatus, 'normal')
  };

  let score = 0;
  const reasons = [];

  if (payload.amount <= 500) {
    score += 0;
  } else if (payload.amount <= 3000) {
    score += 8;
    reasons.push('Moderate transaction amount');
  } else if (payload.amount <= 10000) {
    score += 22;
    reasons.push('Elevated transaction amount');
  } else if (payload.amount <= 25000) {
    score += 38;
    reasons.push('Large transaction amount');
  } else {
    score += 55;
    reasons.push('Very large transaction amount');
  }

  if (payload.recipientStatus === 'new') {
    score += 18;
    reasons.push('New recipient');
  }

  if (payload.paymentMethod === 'card') {
    score += 8;
    reasons.push('Card payment increases verification requirements');
  } else if (payload.paymentMethod === 'net banking') {
    score += 10;
    reasons.push('Net banking payment has higher review risk');
  }

  if (payload.transactionFrequency === 'frequent') {
    score += 12;
    reasons.push('Frequent transaction pattern');
  } else if (payload.transactionFrequency === 'very frequent') {
    score += 22;
    reasons.push('Very frequent payment activity');
  }

  if (payload.deviceStatus === 'new') {
    score += 18;
    reasons.push('New device');
  }

  if (payload.locationStatus === 'unusual') {
    score += 20;
    reasons.push('Unusual location');
  }

  const finalScore = clampScore(score);
  const level = getLevel(finalScore);

  let recommendation = 'Transaction appears safe.';
  if (level === 'MEDIUM') {
    recommendation = 'Additional verification is recommended before processing the payment.';
  } else if (level === 'HIGH') {
    recommendation = 'Payment should be held until identity and transaction verification are completed.';
  }

  const uniqueReasons = [...new Set(reasons)].slice(0, 6);

  return {
    score: finalScore,
    level,
    reasons: uniqueReasons,
    recommendation
  };
}

module.exports = {
  calculateRisk,
  getLevel,
  clampScore
};
