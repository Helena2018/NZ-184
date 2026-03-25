// Load data from LocalStorage or initialize as empty array
let trips = JSON.parse(localStorage.getItem('nz_trips')) || [];

// Initialization: Generate Year/Month/Day options and set default values
function initSelectors() {
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032];
  const selectors = ['app', 'dep', 'arr'];

  selectors.forEach(prefix => {
    const ySel = document.getElementById(prefix + 'Y');
    const mSel = document.getElementById(prefix + 'M');
    const dSel = document.getElementById(prefix + 'D');

    if (!ySel || !mSel || !dSel) return;

    // Add Placeholder Options
    ySel.add(new Option("Year", "", true, true));
    mSel.add(new Option("Month", "", true, true));
    dSel.add(new Option("Day", "", true, true));

    // Disable the placeholders to force users to pick a real date
    ySel.options[0].disabled = true;
    mSel.options[0].disabled = true;
    dSel.options[0].disabled = true;

    years.forEach(y => ySel.add(new Option(y, y)));
    for (let i = 1; i <= 12; i++) mSel.add(new Option(i, i));
    for (let i = 1; i <= 31; i++) dSel.add(new Option(i, i));
  });
}

// Add new travel record
function addTrip() {
  // 1. Get all 6 selector values
  const dy = document.getElementById('depY').value;
  const dm = document.getElementById('depM').value;
  const dd = document.getElementById('depD').value;
  const ay = document.getElementById('arrY').value;
  const am = document.getElementById('arrM').value;
  const ad = document.getElementById('arrD').value;

  // 2. STAGE 1: Completeness Check
  // If any value is empty (still showing placeholder), stop and alert.
  if (!dy || !dm || !dd || !ay || !am || !ad) {
    alert("Please select complete Departure and Return dates.");
    return;
  }

  // 3. Combine into standard Date strings
  const depDateStr = `${dy}-${dm}-${dd}`;
  const arrDateStr = `${ay}-${am}-${ad}`;

  const depDate = new Date(depDateStr);
  const arrDate = new Date(arrDateStr);

  // 4. STAGE 2: Logic Check
  // Return date cannot be before or the same as Departure date.
  if (depDate >= arrDate) {
    alert("Error: Return date must be after departure date.");
    return;
  }

  // 5. STAGE 3: Save Data
  trips.push({ dep: depDateStr, arr: arrDateStr });

  // 6. Finalize: Save to LocalStorage and update UI
  saveAndRender();

  // 7. RESET Selectors: Set them back to placeholders
  // This provides a clean UI for the next entry
  const selectors = ['depY', 'depM', 'depD', 'arrY', 'arrM', 'arrD'];
  selectors.forEach(id => {
    document.getElementById(id).value = "";
  });
}

// Persist data to LocalStorage and update UI
function saveAndRender() {
  localStorage.setItem('nz_trips', JSON.stringify(trips));
  render();
}

// Core Logic: Dynamic Rolling Calculation based on "Target Application Date"
function render() {

  const y = document.getElementById('appY').value;
  const m = document.getElementById('appM').value;
  const d = document.getElementById('appD').value;

  if (!y || !m || !d) {
    document.getElementById('progressContainer').innerHTML = `
      <div class="card prog-card">
                <h3>Year 2 (Last 12 months)</h3>
                <div class="days-hero">0 <small style="font-size:14px; color:#999;">Days</small></div>
                <div class="status-tag">⏳ PENDING</div>
            </div>
            <div class="card prog-card">
                <h3>Year 1 (13-24 months ago)</h3>
                <div class="days-hero">0 <small style="font-size:14px; color:#999;">Days</small></div>
                <div class="status-tag">⏳ PENDING</div>
            </div>
    `;
    return;
  }


  const appDate = new Date(`${document.getElementById('appY').value}-${document.getElementById('appM').value}-${document.getElementById('appD').value}`);

  // Define two distinct 12-month windows
  const year2Start = new Date(appDate); year2Start.setFullYear(appDate.getFullYear() - 1);
  const year1Start = new Date(year2Start); year1Start.setFullYear(year2Start.getFullYear() - 1);

  const getInNZDays = (start, end) => {
    let daysOutside = 0;
    trips.forEach(t => {
      const d = new Date(t.dep);
      const a = new Date(t.arr);

      // Calculate overlap between the travel dates and the current 12-month period
      const overlapStart = new Date(Math.max(d, start));
      const overlapEnd = new Date(Math.min(a, end));

      if (overlapStart < overlapEnd) {
        // INZ Logic: Departure and Arrival days count as days in NZ. 
        // Therefore, we only subtract the full days spent entirely outside.
        daysOutside += (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24) - 1;
      }
    });
    const totalDaysInPeriod = (end - start) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor(totalDaysInPeriod - daysOutside));
  };

  const daysY2 = getInNZDays(year2Start, appDate);
  const daysY1 = getInNZDays(year1Start, year2Start);

  // Update Progress Cards HTML
  document.getElementById('progressContainer').innerHTML = `
        <div class="card prog-card">
            <h3>Year 2 (Last 12 months)</h3>
            <div class="days-hero">${daysY2} <small style="font-size:14px; color:#999;">Days</small></div>
            <div class="status-tag">${daysY2 >= 184 ? '✅ QUALIFIED' : '⏳ IN PROGRESS'}</div>
        </div>
        <div class="card prog-card">
            <h3>Year 1 (13-24 months ago)</h3>
            <div class="days-hero">${daysY1} <small style="font-size:14px; color:#999;">Days</small></div>
            <div class="status-tag">${daysY1 >= 184 ? '✅ QUALIFIED' : '⏳ IN PROGRESS'}</div>
        </div>
    `;

  // Update Travel History List HTML
  let listHtml = '';
  // Sort by latest departure date first
  trips.sort((a, b) => new Date(b.dep) - new Date(a.dep)).forEach((t, i) => {
    listHtml += `
            <div class="trip-item">
                <div class="trip-info">✈️ Out: ${t.dep}<br>🛬 Back: ${t.arr}</div>
                <div class="action-links">
                    <button class="del-link" onclick="deleteTrip(${i})">Delete</button>
                </div>
            </div>`;
  });
  document.getElementById('tripList').innerHTML = listHtml;
}

// Remove a specific record
function deleteTrip(i) {
  trips.splice(i, 1);
  saveAndRender();
}

// Clear all data with confirmation
function clearData() {
  if (confirm("Are you sure you want to delete all records?")) {
    trips = [];
    saveAndRender();
  }
}

// Bootstrap application on page load
window.onload = () => {
  initSelectors();
  render();
};

// Re-calculate results whenever the Application Date is changed
document.querySelectorAll('#appY, #appM, #appD').forEach(s => {
  s.onchange = render;
});