// TN BRRRR Deal Analyzer
// Buy, rehab, rent, refinance, repeat: one-property analysis.

function rehabCostPerSqft(level) {
  if (level === "light") return 20;
  if (level === "medium") return 30;
  if (level === "full") return 40;
  return 30;
}

function loanDownPayment(price, type) {
  if (type === "203k") return price * 0.035;
  return price * 0.10; // conventional rehab
}

function monthlyPayment(principal, annualRatePct, years = 30) {
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (r * principal) / (1 - Math.pow(1 + r, -n));
}

function money(n) {
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.round(Math.abs(n)).toLocaleString("en-US");
}

function pct(n) {
  return (n * 100).toFixed(1) + "%";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function readNumber(id) {
  const v = Number(document.getElementById(id).value);
  return Number.isFinite(v) ? v : NaN;
}

function analyze(d) {
  const rehab = d.sqft * rehabCostPerSqft(d.rehabLevel);
  const allIn = d.price + rehab + d.closing;
  const equity = d.arv - allIn;

  // 70% rule: max offer = 70% of ARV minus rehab
  const maxOffer = d.arv * 0.7 - rehab;

  // Refinance at the chosen LTV of ARV
  const refiLoan = d.arv * (d.ltv / 100);
  const cashLeftIn = allIn - refiLoan; // negative = cash pulled out beyond what was put in
  const refiPayment = monthlyPayment(refiLoan, d.rate);
  const cashFlow = d.rent - refiPayment - d.opex;
  const cashOnCash = cashLeftIn > 0 ? (cashFlow * 12) / cashLeftIn : null;

  // Purchase-phase loan comparison (purchase + rehab financed together)
  const financed = d.price + rehab;
  const loans = ["203k", "conventional"].map(type => {
    const down = loanDownPayment(financed, type);
    const payment = monthlyPayment(financed - down, d.rate);
    return { type, down, payment, cashToClose: down + d.closing };
  });

  return { rehab, allIn, equity, maxOffer, refiLoan, cashLeftIn, refiPayment, cashFlow, cashOnCash, loans };
}

function verdict(r, d) {
  const notes = [];
  if (d.price <= r.maxOffer) notes.push({ ok: true, text: "Price is within the 70% rule." });
  else notes.push({ ok: false, text: "Price is above the 70% rule max offer of " + money(r.maxOffer) + "." });
  if (r.cashFlow >= 200) notes.push({ ok: true, text: "Cash flows " + money(r.cashFlow) + "/mo after refinance." });
  else if (r.cashFlow >= 0) notes.push({ ok: null, text: "Thin cash flow of " + money(r.cashFlow) + "/mo after refinance." });
  else notes.push({ ok: false, text: "Loses " + money(-r.cashFlow) + "/mo after refinance." });
  if (r.cashLeftIn <= 0) notes.push({ ok: true, text: "Refinance returns all of your cash." });
  else notes.push({ ok: null, text: money(r.cashLeftIn) + " stays in the deal after refinance." });
  return notes;
}

function render(d, r) {
  const notes = verdict(r, d).map(n => {
    const cls = n.ok === true ? "good" : n.ok === false ? "bad" : "warn";
    return `<li class="${cls}">${escapeHtml(n.text)}</li>`;
  }).join("");

  const loanRows = r.loans.map(l => `
    <tr>
      <th scope="row">${l.type === "203k" ? "FHA 203k" : "Conventional rehab"}</th>
      <td>${money(l.down)}</td>
      <td>${money(l.cashToClose)}</td>
      <td>${money(l.payment)}</td>
    </tr>`).join("");

  return `
    <h2>Deal in ${escapeHtml(d.county || "your county")} County</h2>
    <ul class="verdict">${notes}</ul>

    <div class="stats">
      <div class="stat"><span>All-in cost</span><b>${money(r.allIn)}</b></div>
      <div class="stat"><span>Equity at ARV</span><b class="${r.equity >= 0 ? "pos" : "neg"}">${money(r.equity)}</b></div>
      <div class="stat"><span>Monthly cash flow</span><b class="${r.cashFlow >= 0 ? "pos" : "neg"}">${money(r.cashFlow)}</b></div>
      <div class="stat"><span>Cash-on-cash return</span><b>${r.cashOnCash === null ? "Infinite" : pct(r.cashOnCash)}</b></div>
    </div>

    <h3>Breakdown</h3>
    <dl class="rows">
      <dt>Purchase price</dt><dd>${money(d.price)}</dd>
      <dt>Rehab (${d.sqft.toLocaleString("en-US")} sq ft × $${rehabCostPerSqft(d.rehabLevel)})</dt><dd>${money(r.rehab)}</dd>
      <dt>Closing &amp; holding</dt><dd>${money(d.closing)}</dd>
      <dt>70% rule max offer</dt><dd>${money(r.maxOffer)}</dd>
      <dt>Refinance loan (${d.ltv}% of ARV)</dt><dd>${money(r.refiLoan)}</dd>
      ${r.cashLeftIn > 0
        ? `<dt>Cash left in deal</dt><dd>${money(r.cashLeftIn)}</dd>`
        : `<dt>Extra cash out at refinance</dt><dd>${money(-r.cashLeftIn)}</dd>`}
      <dt>Refinance payment (30 yr, ${d.rate}%)</dt><dd>${money(r.refiPayment)}</dd>
      <dt>Rent − payment − expenses</dt><dd>${money(d.rent)} − ${money(r.refiPayment)} − ${money(d.opex)}</dd>
    </dl>

    <h3>Purchase loan comparison</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Loan</th><th>Down payment</th><th>Cash to close</th><th>Monthly payment</th></tr></thead>
        <tbody>${loanRows}</tbody>
      </table>
    </div>`;
}

function runAnalysis(e) {
  if (e) e.preventDefault();
  const d = {
    county: document.getElementById("county").value.trim(),
    price: readNumber("price"),
    sqft: readNumber("sqft"),
    arv: readNumber("arv"),
    rent: readNumber("rent"),
    rehabLevel: document.getElementById("rehabLevel").value,
    closing: readNumber("closing"),
    opex: readNumber("opex"),
    rate: readNumber("rate"),
    ltv: readNumber("ltv")
  };

  const err = document.getElementById("formError");
  const required = ["price", "sqft", "arv", "rent", "closing", "opex", "rate", "ltv"];
  const bad = required.filter(k => !Number.isFinite(d[k]) || d[k] < 0);
  if (bad.length || d.price === 0 || d.arv === 0) {
    err.textContent = "Enter a purchase price, ARV and other numbers of zero or more, then try again.";
    err.hidden = false;
    return;
  }
  err.hidden = true;

  document.getElementById("results").innerHTML = render(d, analyze(d));
}

document.getElementById("dealForm").addEventListener("submit", runAnalysis);
document.querySelectorAll("#dealForm input, #dealForm select").forEach(el => {
  el.addEventListener("input", () => { document.getElementById("formError").hidden = true; });
});
runAnalysis();
