// 1. Data Initialization: Load from LocalStorage or set as empty array
let trips = JSON.parse(localStorage.getItem('nz_trips')) || [];
let editIndex = -1;

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

  // Robust date string format (YYYY-MM-DD)
  const depDateStr = `${dy}-${dm}-${dd}`;
  const arrDateStr = `${ay}-${am}-${ad}`;

  // Use numeric constructor for better cross-browser compatibility
  const depDate = new Date(parseInt(dy), parseInt(dm) - 1, parseInt(dd));
  const arrDate = new Date(parseInt(ay), parseInt(am) - 1, parseInt(ad));

  // Logic Check: Return date must be after Departure
  if (depDate >= arrDate) {
    alert("Error: Return date must be after departure date.");
    return;
  }

  if (editIndex > -1) {
    trips[editIndex] = {
      dep: depDateStr,
      arr: arrDateStr
    };
    editIndex = -1;
    document.querySelector('.primary-btn').innerText = "Add Travel Record";
  } else {
    // Save to memory
    trips.push({ dep: depDateStr, arr: arrDateStr });
  }

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

  // Save Target App Date to LocalStorage
  if (y && m && d) {
    localStorage.setItem('nz_app_date', JSON.stringify({ y, m, d }));
  }

  // Display 0 days if Application Date is not fully selected
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

  // Create Date object using numeric parameters to prevent NaN
  const appDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));

  // Final validation before continuing
  if (isNaN(appDate.getTime())) return;

  // Define 12-month rolling windows based on Application Date
  const year2Start = new Date(appDate);
  year2Start.setFullYear(appDate.getFullYear() - 1);

  const year1Start = new Date(year2Start);
  year1Start.setFullYear(year2Start.getFullYear() - 1);

  // Helper function to calculate days in NZ within a period
  const getInNZDays = (start, end) => {
    if (!(start instanceof Date) || isNaN(start.getTime()) ||
      !(end instanceof Date) || isNaN(end.getTime())) {
      return 0;
    }

    let daysOutside = 0;

    trips.forEach(t => {
      // Parse stored travel dates
      const partsD = t.dep.split('-');
      const partsA = t.arr.split('-');
      const dep = new Date(parseInt(partsD[0]), parseInt(partsD[1]) - 1, parseInt(partsD[2]));
      const arr = new Date(parseInt(partsA[0]), parseInt(partsA[1]) - 1, parseInt(partsA[2]));

      if (isNaN(dep.getTime()) || isNaN(arr.getTime())) return;

      // Calculate intersection between the trip and the current window
      const overlapStart = new Date(Math.max(dep, start));
      const overlapEnd = new Date(Math.min(arr, end));

      if (overlapStart < overlapEnd) {
        const diffTime = overlapEnd - overlapStart;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // INZ Rule: Departure and Arrival days are counted as days IN New Zealand.
        // Subtract only the days spent entirely outside (diffDays - 1).
        daysOutside += Math.max(0, diffDays - 1);
      }
    });

    // Calculate total days in the period (e.g. 365)
    const totalDaysInPeriod = Math.round((end - start) / (1000 * 60 * 60 * 24));

    // Calculate final days in NZ
    const finalInNZ = totalDaysInPeriod - daysOutside;

    return isNaN(finalInNZ) ? 0 : Math.max(0, Math.floor(finalInNZ));
  };

  const daysY2 = getInNZDays(year2Start, appDate);
  const daysY1 = getInNZDays(year1Start, year2Start);

  // Update Progress Cards with calculated results
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
  // Use spread operator to sort without mutating the original trips array
  const sortedTrips = [...trips].sort((a, b) => {
    return new Date(b.dep.replace(/-/g, '/')) - new Date(a.dep.replace(/-/g, '/'));
  });

  sortedTrips.forEach((t) => {
    const originalIndex = trips.indexOf(t);
    listHtml += `
      <div class="trip-item">
          <div class="trip-info">✈️ Out: ${t.dep}<br>🛬 Back: ${t.arr}</div>
          <div class="action-links">
              <button class="edit-link" onclick="editTrip(${originalIndex})">Edit</button>
              <button class="del-link" onclick="deleteTrip(${originalIndex})">Delete</button>
          </div>
      </div>`;
  });
  document.getElementById('tripList').innerHTML = listHtml || '<p style="color:#999; padding:10px;">No records found.</p>';
}

// Function to populate selectors with existing trip data for editing
function editTrip(index) {
  editIndex = index;
  const trip = trips[index];

  // Split the stored date strings (YYYY-MM-DD)
  const dParts = trip.dep.split('-');
  const aParts = trip.arr.split('-');

  // Set selectors to the trip's current values
  document.getElementById('depY').value = dParts[0];
  document.getElementById('depM').value = parseInt(dParts[1]);
  document.getElementById('depD').value = parseInt(dParts[2]);
  document.getElementById('arrY').value = aParts[0];
  document.getElementById('arrM').value = parseInt(aParts[1]);
  document.getElementById('arrD').value = parseInt(aParts[2]);

  // Change the button text to notify user they are in edit mode
  document.querySelector('.primary-btn').innerText = "Update Record";

  // Scroll to top so user sees the populated selectors
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Remove a specific record and update storage/UI
function deleteTrip(i) {
  trips.splice(i, 1);
  saveAndRender();
}

// Clear all records from storage after confirmation
function clearData() {
  if (confirm("Are you sure you want to delete all records?")) {
    trips = [];
    localStorage.removeItem('nz_app_date');

    // Reset target Date selectors to placeholders
    document.getElementById('appY').value = "";
    document.getElementById('appM').value = "";
    document.getElementById('appD').value = "";

    saveAndRender();
  }
}

// Bootstrap Application on page load
window.onload = () => {
  initSelectors();

  // Load saved App Date from LocalStorage
  const savedAppDate = JSON.parse(localStorage.getItem('nz_app_date'));
  if (savedAppDate) {
    document.getElementById('appY').value = savedAppDate.y;
    document.getElementById('appM').value = savedAppDate.m;
    document.getElementById('appD').value = savedAppDate.d;
  }
  render();
};

// Re-calculate results whenever the Application Date selectors change
document.querySelectorAll('#appY, #appM, #appD').forEach(s => {
  s.onchange = render;
});