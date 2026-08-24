async function generateAIExplanation(transaction, risk) {
  if (!process.env.AI_API_KEY) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a fraud risk assistant for a fintech product. Explain suspicious payment patterns in a safe, non-absolute way. Do not claim a transaction is definitely fraudulent. Keep the answer concise and human-readable.'
          },
          {
            role: 'user',
            content: `Analyze this transaction for fraud risk: Amount: ${transaction.amount}, Recipient: ${transaction.recipient || 'Unknown'}, Recipient status: ${transaction.recipientStatus}, Payment method: ${transaction.paymentMethod}, Frequency: ${transaction.transactionFrequency}, Device: ${transaction.deviceStatus}, Location: ${transaction.locationStatus}. Risk score: ${risk.score}. Reasons: ${risk.reasons.join(', ')}.`
          }
        ],
        temperature: 0.4
      })
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    return typeof message === 'string' ? message.trim() : null;
  } catch (error) {
    console.warn('AI provider unavailable, using fallback explanation.', error.message);
    return null;
  }
}

module.exports = {
  generateAIExplanation
};
