const analysisForm = document.getElementById('analysisForm');
const resultState = document.getElementById('resultState');
const transactionTableBody = document.getElementById('transactionTableBody');
const verificationModal = document.getElementById('verificationModal');
const verifyBtn = document.getElementById('verifyBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const analyzeBtn = document.getElementById('analyzeBtn');

const metricEls = {
  totalTransactions: document.getElementById('totalTransactions'),
  safeTransactions: document.getElementById('safeTransactions'),
  flaggedTransactions: document.getElementById('flaggedTransactions'),
  blockedTransactions: document.getElementById('blockedTransactions')
};

function renderRiskBadge(level) {
  const map = {
    LOW: 'risk-low',
    MEDIUM: 'risk-medium',
    HIGH: 'risk-high'
  };

  return map[level] || 'risk-medium';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(amount || 0));
}

function renderResult(data) {
  if (!data || !data.risk) {
    return;
  }

  const { risk, decision, paymentStatus } = data;
  const score = Math.max(0, Math.min(100, Number(risk.score) || 0));
  const meterWidth = `${score}%`;

  resultState.className = 'result-state result-card';
  resultState.innerHTML = `
    <div class="risk-header">
      <p class="risk-title">AI Risk Analysis</p>
      <div class="risk-badge ${renderRiskBadge(risk.level)}">${risk.level} Risk</div>
    </div>
    <div class="risk-score">${score} <span style="font-size: 1.6rem; color: #9cb7d1;">/ 100</span></div>
    <div class="risk-meter"><div class="risk-meter-bar" style="width: ${meterWidth};"></div></div>
    <div class="risk-details">
      <span class="section-label">Reasons</span>
    </div>
    <div class="reason-list">
      <ul>
        ${(risk.reasons || []).map((reason) => `<li>${reason}</li>`).join('') || '<li>No specific risk factors detected.</li>'}
      </ul>
    </div>
    <div class="section-label">AI Recommendation</div>
    <div class="recommendation-box">${risk.explanation || risk.recommendation}</div>
    <div class="status-box">
      ${decision === 'CONTINUE' ? '<button class="action-btn primary" id="continuePaymentBtn" type="button">Continue to Payment</button>' : ''}
      ${decision === 'VERIFY' ? '<button class="action-btn warning" id="verifyTriggerBtn" type="button">Verify Transaction</button>' : ''}
      ${decision === 'BLOCK' ? '<button class="action-btn blocked" type="button" disabled>Payment Held</button>' : ''}
    </div>
    <div class="status-box">
      <div class="status-tag ${paymentStatus === 'SAFE' ? 'safe' : paymentStatus === 'VERIFICATION' ? 'verification' : 'blocked'}">${paymentStatus}</div>
    </div>
  `;

  const continueBtn = document.getElementById('continuePaymentBtn');
  const verifyTriggerBtn = document.getElementById('verifyTriggerBtn');

  if (continueBtn) {
    continueBtn.addEventListener('click', () => handleContinuePayment(data));
  }

  if (verifyTriggerBtn) {
    verifyTriggerBtn.addEventListener('click', () => {
      openModal();
    });
  }
}

async function fetchDashboardStats() {
  try {
    const response = await fetch('/api/statistics');
    const data = await response.json();
    if (!data.success) return;

    const { stats } = data;
    metricEls.totalTransactions.textContent = stats.totalTransactions || 0;
    metricEls.safeTransactions.textContent = stats.safeTransactions || 0;
    metricEls.flaggedTransactions.textContent = stats.flaggedTransactions || 0;
    metricEls.blockedTransactions.textContent = stats.blockedTransactions || 0;
  } catch (error) {
    console.error('Statistics fetch failed:', error);
  }
}

async function fetchTransactions() {
  try {
    const response = await fetch('/api/transactions');
    const data = await response.json();
    if (!data.success || !Array.isArray(data.transactions)) {
      return;
    }

    if (!data.transactions.length) {
      transactionTableBody.innerHTML = '<tr><td colspan="7" class="empty-row">No transactions yet.</td></tr>';
      return;
    }

    transactionTableBody.innerHTML = data.transactions.map((row) => `
      <tr>
        <td>${row.date}</td>
        <td>${row.time}</td>
        <td>${row.recipient}</td>
        <td>${formatCurrency(row.amount)}</td>
        <td>${row.riskScore}</td>
        <td>${row.riskLevel}</td>
        <td><span class="status-tag ${row.paymentStatus === 'SAFE' ? 'safe' : row.paymentStatus === 'VERIFICATION' ? 'verification' : 'blocked'}">${row.paymentStatus}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Transactions fetch failed:', error);
  }
}

async function submitAnalysis(payload) {
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = '🤖 AI is analyzing your transaction...';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to analyze transaction. Please try again.');
    }

    renderResult(data);
    await fetchTransactions();
    await fetchDashboardStats();
  } catch (error) {
    resultState.className = 'result-state empty-state';
    resultState.innerHTML = `
      <div class="empty-icon">⚠️</div>
      <h3>Unable to analyze transaction</h3>
      <p>${error.message || 'Please try again.'}</p>
    `;
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '🔍 Analyze Payment';
  }
}

function getFormPayload() {
  return {
    amount: Number(document.getElementById('amount').value),
    recipient: document.getElementById('recipient').value.trim(),
    recipientStatus: document.getElementById('recipientStatus').value,
    paymentMethod: document.getElementById('paymentMethod').value,
    transactionFrequency: document.getElementById('transactionFrequency').value,
    deviceStatus: document.getElementById('deviceStatus').value,
    locationStatus: document.getElementById('locationStatus').value
  };
}

analysisForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = getFormPayload();
  await submitAnalysis(payload);
});

async function handleContinuePayment(data) {
  const amount = Number(document.getElementById('amount').value);

  if (!amount || amount <= 0) {
    alert('Enter a valid amount before proceeding.');
    return;
  }

  try {
    const orderResponse = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'INR', receipt: `fraudshield_${Date.now()}` })
    });

    const orderData = await orderResponse.json();
    if (!orderData.success) {
      throw new Error(orderData.message || 'Unable to create Razorpay order.');
    }

    const options = {
      key: orderData.order.key || 'rzp_test_dummy',
      amount: orderData.order.amount,
      currency: orderData.order.currency,
      name: 'FraudShield',
      description: 'Secure test payment',
      order_id: orderData.order.id,
      handler: async function (response) {
        const verifyResponse = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            expected_order_id: orderData.order.id
          })
        });

        const verifyData = await verifyResponse.json();
        if (verifyData.success) {
          alert('✅ Payment successful');
        } else {
          alert('❌ Payment failed');
        }
      },
      theme: {
        color: '#4fd1c5'
      }
    };

    if (typeof Razorpay === 'undefined') {
      alert('Razorpay checkout is not available in this environment. Test payment flow is simulated.');
      return;
    }

    const razorpayInstance = new Razorpay(options);
    razorpayInstance.open();
  } catch (error) {
    alert(`❌ Payment failed: ${error.message}`);
  }
}

function openModal() {
  verificationModal.classList.remove('hidden');
  verificationModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  verificationModal.classList.add('hidden');
  verificationModal.setAttribute('aria-hidden', 'true');
}

closeModalBtn.addEventListener('click', closeModal);
verificationModal.addEventListener('click', (event) => {
  if (event.target === verificationModal) closeModal();
});

verifyBtn.addEventListener('click', async () => {
  const recipient = document.getElementById('verificationRecipient').value.trim();
  const amount = Number(document.getElementById('verificationAmount').value);

  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationType: 'demo', recipient, amount })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Demo verification failed.');
    }

    alert('✅ Verification passed. The transaction is approved for the demo flow.');
    closeModal();
  } catch (error) {
    alert(`❌ ${error.message}`);
  }
});

fetchTransactions();
fetchDashboardStats();
