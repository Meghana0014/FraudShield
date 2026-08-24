const { calculateRisk } = require('../riskEngine');
const { generateAIExplanation } = require('./aiProvider');

function buildFallbackExplanation(risk) {
  if (!risk.reasons || risk.reasons.length === 0) {
    return 'This transaction appears consistent with normal payment behavior and does not show elevated risk indicators.';
  }

  const summary = risk.reasons.slice(0, 4).join(', ');

  if (risk.level === 'HIGH') {
    return `High-risk transaction detected. The combination of ${summary.toLowerCase()} increases the risk profile and may require additional verification.`;
  }

  if (risk.level === 'MEDIUM') {
    return `This transaction shows moderate risk because of ${summary.toLowerCase()}. A brief verification step is recommended before funds move.`;
  }

  return `This transaction appears generally safe. The available indicators are consistent with normal payment behavior, though ${summary.toLowerCase()} should still be reviewed.`;
}

function getDecision(risk) {
  if (risk.level === 'LOW') return 'CONTINUE';
  if (risk.level === 'MEDIUM') return 'VERIFY';
  return 'BLOCK';
}

async function analyzeTransaction(transaction = {}) {
  const risk = calculateRisk(transaction);
  const aiExplanation = await generateAIExplanation(transaction, risk);
  const explanation = aiExplanation || buildFallbackExplanation(risk);

  return {
    success: true,
    risk: {
      score: risk.score,
      level: risk.level,
      reasons: risk.reasons,
      recommendation: risk.recommendation,
      explanation
    },
    decision: getDecision(risk),
    aiUsed: Boolean(aiExplanation)
  };
}

module.exports = {
  analyzeTransaction,
  buildFallbackExplanation,
  getDecision
};
