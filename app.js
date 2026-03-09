function rehabCost(level) { if (level === "light") return 20; if (level === "medium") return 30; if (level === "full") return 40; return 30; }

function loanDownPayment(price, type) { if (type === "203k") return price * 0.035; if (type === "conventional") return price * 0.10; return price * 0.10; }

function monthlyPayment(principal, rate=0.065, years=30) { let r = rate / 12; let n = years * 12; return (r * principal) / (1 - (1 + r)**(-n)); }

function runAnalysis() { let county = document.getElementById("county").value; let minPrice = Number(document.getElementById("minPrice").value); let maxPrice = Number(document.getElementById("maxPrice").value); let rehabLevel = document.getElementById("rehabLevel").value;

let rehab = rehabCost(rehabLevel);

let properties = [ { price: minPrice + 5000, sqft: 1400, arv: minPrice + 70000, rent: 1350 }, { price: (minPrice + maxPrice)/2, sqft: 1500, arv: (minPrice + maxPrice)/2 + 65000, rent: 1400 }, { price: maxPrice - 5000, sqft: 1600, arv: maxPrice + 60000, rent: 1500 } ];

let output = <h2>Deals in ${county}</h2>;

properties.forEach(p => { let reno = p.sqft * rehab; let allIn = p.price + reno + 6000; let equity = p.arv - allIn;

let dp203k = loanDownPayment(p.price, "203k"); let dpConv = loanDownPayment(p.price, "conventional");

let payment203k = monthlyPayment(p.price - dp203k); let paymentConv = monthlyPayment(p.price - dpConv);

output += `

Price: $${p.price}
Rehab: $${reno}
All-In: $${allIn}
ARV: $${p.arv}
Equity: $${equity}

203k Payment: $${payment203k.toFixed(0)}
Conventional Payment: $${paymentConv.toFixed(0)}
Rent: $${p.rent}
`; });
document.getElementById("results").innerHTML = output; }
