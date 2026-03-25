// 1. Data Initialization: Load from LocalStorage or set as empty array
let trips = JSON.parse(localStorage.getItem('nz_trips')) || [];

// 2. Selector Initialization: Generate Year/Month/Day options
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

    ySel.options[0].disabled = true;
    mSel.options[0].disabled = true;
    dSel.options[0].disabled = true;

    years.forEach(y => ySel.add(new Option(y, y)));
    for (let i = 1; i <= 12; i++) mSel.add(new Option(i, i));
    for (let i = 1; i <= 31; i++) dSel.add(new Option(i, i));
  });
}

// 3. Add Travel Record
function addTrip() {
  const dy = document.getElementById('depY').value;
  const dm = document.getElementById('depM').value;
  const dd = document.getElementById('depD').value;
  const ay = document.getElementById('arrY').value;
  const am = document.getElementById('arrM').value;
  const ad = document.getElementById('arrD').value;

  // Validation: Ensure all fields are selected
  if (!dy || !dm || !dd || !ay || !am || !ad) {
    alert("Please select complete Departure and Return dates.");
    return;
  }

  const depDateStr = `${dy}-${dm}-${dd}`;
  const arrDateStr = `${ay}-${am}-${ad}`;
  const depDate = new Date(depDateStr);
  const arrDate = new Date(arrDateStr);

  // Logic Check: Return date must be after Departure
  if (depDate >= arrDate) {
    alert("Error: Return date must be after departure date.");
    return;
  }

  // Save to memory
  trips.push({ dep: depDateStr, arr: arrDateStr });

  // Persist and Refresh UI
  saveAndRender();

  // Reset Selectors to placeholders
  ['depY', 'depM', 'depD', 'arrY', 'arrM', 'arrD'].forEach(id => {
    document.getElementById(id).value = "";
  });
}

// 4. Persistence Layer
function saveAndRender() {
  localStorage.setItem('nz_trips', JSON.stringify(trips));
  render();
}

// 5. Core Calculation & UI Rendering
function render() {
  const y = document.getElementById('appY').value;
  const m = document.getElementById('appM').value;
  const d = document.getElementById('appD').value;
  const container = document.getElementById('progressContainer');

  if (!y || !m || !d) {
    container.innerHTML = `
      <div class="card prog-card">
          <h3>Year 2 (Last 12 months)</h3>
          <div class="days-hero">0 <small>Days</small></div>
          <div class="status-tag">⏳ PENDING</div>
      </div>
      <div class="card prog-card">
          <h3>Year 1 (13-24 months ago)</h3>
          <div class="days-hero">0 <small>Days</small></div>
          <div class="status-tag">⏳ PENDING</div>
      </div>`;
    updateHistoryList();
    return;
  }

  const appDate = new Date(`${y}-${m}-${d}`);

  // Define 12-month rolling windows
  const year2Start = new Date(appDate);
  year2Start.setFullYear(appDate.getFullYear() - 1);
  const year1Start = new Date(year2Start);
  year1Start.setFullYear(year2Start.getFullYear() - 1);

  const getInNZDays = (start, end) => {
    let daysOutside = 0;

    trips.forEach(t => {
      const dep = new Date(t.dep);
      const arr = new Date(t.arr);

      if (isNaN(dep.getTime()) || isNaN(arr.getTime())) return;

      const overlapStart = new Date(Math.max(dep, start));
      const overlapEnd = new Date(Math.min(arr, end));

      if (overlapStart < overlapEnd) {
        // Calculate total days of overlap
        const diffTime = overlapEnd - overlapStart;

        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // INZ Logic: Departure/Arrival days count as days in NZ. 
        // Only subtract full days spent entirely outside NZ.
        daysOutside += Math.max(0, diffDays - 1);
      }
    });

    const totalDaysInPeriod = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const finalInNZ = totalDaysInPeriod - daysOutside;

    return Math.max(0, Math.floor(finalInNZ));
  };

  const daysY2 = getInNZDays(year2Start, appDate);
  const daysY1 = getInNZDays(year1Start, year2Start);

  container.innerHTML = `
    <div class="card prog-card">
        <h3>Year 2 (Last 12 months)</h3>
        <div class="days-hero">${daysY2} <small>Days</small></div>
        <div class="status-tag">${daysY2 >= 184 ? '✅ QUALIFIED' : '⏳ IN PROGRESS'}</div>
    </div>
    <div class="card prog-card">
        <h3>Year 1 (13-24 months ago)</h3>
        <div class="days-hero">${daysY1} <small>Days</small></div>
        <div class="status-tag">${daysY1 >= 184 ? '✅ QUALIFIED' : '⏳ IN PROGRESS'}</div>
    </div>`;

  updateHistoryList();
}

// 6. Travel History List Management
function updateHistoryList() {
  let listHtml = '';
  // Use spread operator to sort without mutating the original array
  const sortedTrips = [...trips].sort((a, b) => new Date(b.dep) - new Date(a.dep));

  sortedTrips.forEach((t) => {
    // Reference original index for accurate deletion
    const originalIndex = trips.indexOf(t);
    listHtml += `
      <div class="trip-item">
          <div class="trip-info">✈️ Out: ${t.dep}<br>🛬 Back: ${t.arr}</div>
          <div class="action-links">
              <button class="del-link" onclick="deleteTrip(${originalIndex})">Delete</button>
          </div>
      </div>`;
  });
  document.getElementById('tripList').innerHTML = listHtml || '<p style="color:#999; padding:10px;">No records found.</p>';
}

function deleteTrip(i) {
  trips.splice(i, 1);
  saveAndRender();
}

function clearData() {
  if (confirm("Are you sure you want to delete all records?")) {
    trips = [];
    saveAndRender();
  }
}

// Bootstrap Application
window.onload = () => {
  initSelectors();
  render();
};

// Re-calculate when target application date changes
document.querySelectorAll('#appY, #appM, #appD').forEach(s => {
  s.onchange = render;
});