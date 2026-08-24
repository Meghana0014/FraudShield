const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateRisk } = require('../riskEngine');

test('calculates low risk for safe transactions', () => {
  const result = calculateRisk({
    amount: 500,
    recipientStatus: 'known',
    paymentMethod: 'UPI',
    transactionFrequency: 'normal',
    deviceStatus: 'known',
    locationStatus: 'normal'
  });

  assert.equal(result.level, 'LOW');
  assert.ok(result.score >= 0 && result.score <= 30);
});

test('calculates high risk for suspicious transactions', () => {
  const result = calculateRisk({
    amount: 25000,
    recipientStatus: 'new',
    paymentMethod: 'UPI',
    transactionFrequency: 'very frequent',
    deviceStatus: 'new',
    locationStatus: 'unusual'
  });

  assert.equal(result.level, 'HIGH');
  assert.ok(result.score >= 71 && result.score <= 100);
});
