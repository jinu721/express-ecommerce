const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const downloadBtn = document.querySelector(".btnDownloadPdf");
const errorMsg = document.getElementById("error-msg");

// Updated selectors for new UI
const dateButtons = document.querySelectorAll(".report-btn");
const customDateInputs = document.getElementById("customDateInputs");

let selectedRange = "daily";

function updateActiveButton(selectedButton) {
  dateButtons.forEach((btn) => btn.classList.remove("active"));
  selectedButton.classList.add("active");
}

// Set default active button
const defaultButton = document.querySelector('[data-range="daily"]');
if (defaultButton) {
  updateActiveButton(defaultButton);
}

dateButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const range = btn.getAttribute("data-range");
    updateActiveButton(btn);
    selectedRange = range;
    
    if (range === "custom") {
      customDateInputs.classList.add("show");
    } else {
      customDateInputs.classList.remove("show");
      console.log(`Fetching data for ${range} range`);
      loadDashboardStats(range);
    }
  });
});

let topSellingProductsChartInstance = null;
let topSellingCategoriesChartInstance = null;
let topSellingBrandsChartInstance = null;
let lineChartWithDotsInstance = null;

// Function to load dashboard stats into the new UI
async function loadDashboardStats(range = 'daily') {
  try {
    const response = await fetch(`/admin/dashboard/data?range=${range}`);
    const data = await response.json();
    
    if (data.val && data.dashboard) {
      const dashboard = data.dashboard;
      
      // Update stat cards
      document.getElementById('totalUsers').textContent = dashboard.usersCount || 0;
      document.getElementById('totalProducts').textContent = dashboard.productsCount || 0;
      document.getElementById('totalOrders').textContent = dashboard.ordersCount || 0;
      document.getElementById('totalRevenue').textContent = `₹${(dashboard.totalRevenue || 0).toLocaleString()}`;
      
      // Update charts with new data
      updateCharts(dashboard);
      
      Toast.success('Dashboard Updated', `Data loaded for ${range} period`);
    } else {
      Toast.error('Data Load Failed', data.msg || 'Failed to load dashboard data');
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    Toast.error('Error', 'Failed to load dashboard data');
  }
}

// Function to update all charts
function updateCharts(dashboard) {
  updateTopSellingProductsChart(dashboard.topSellingProducts || []);
  updateTopSellingCategoriesChart(dashboard.topSellingCategories || []);
  updateTopSellingBrandsChart(dashboard.topSellingBrands || []);
  updateVisitorChart(dashboard.vistors || []);
}

// Update top selling products chart
function updateTopSellingProductsChart(products) {
  const ctx = document.getElementById("topSellingChart");
  if (!ctx) return;
  
  if (topSellingProductsChartInstance) {
    topSellingProductsChartInstance.destroy();
  }
  
  const generateRandomColor = () =>
    `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`;
  
  topSellingProductsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: products.map((prod) => prod.product?.name || 'Unknown'),
      datasets: [{
        label: "Sales Quantity",
        data: products.map((prod) => prod.totalQuantity || 0),
        backgroundColor: products.map(() => generateRandomColor()),
        borderColor: products.map(() => generateRandomColor()),
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
    },
  });
}

// Update top selling categories chart
function updateTopSellingCategoriesChart(categories) {
  const ctx = document.getElementById("topSellingCategoriesChart");
  if (!ctx) return;
  
  if (topSellingCategoriesChartInstance) {
    topSellingCategoriesChartInstance.destroy();
  }
  
  const generateRandomColor = () =>
    `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`;
  
  topSellingCategoriesChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: categories.map((cat) => cat.category || 'Unknown'),
      datasets: [{
        label: "Sales Quantity",
        data: categories.map((cat) => cat.totalQuantity || 0),
        backgroundColor: categories.map(() => generateRandomColor()),
        borderColor: categories.map(() => generateRandomColor()),
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
    },
  });
}

// Update top selling brands chart
function updateTopSellingBrandsChart(brands) {
  const ctx = document.getElementById("topSellingBrandsChart");
  if (!ctx) return;
  
  if (topSellingBrandsChartInstance) {
    topSellingBrandsChartInstance.destroy();
  }
  
  const generateRandomColor = () =>
    `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`;
  
  topSellingBrandsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: brands.map((brand) => brand.brand || 'Unknown'),
      datasets: [{
        label: "Sales Quantity",
        data: brands.map((brand) => brand.totalQuantity || 0),
        backgroundColor: brands.map(() => generateRandomColor()),
        borderColor: brands.map(() => generateRandomColor()),
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
    },
  });
}

// Update visitor chart
function updateVisitorChart(visitors) {
  const ctx = document.getElementById("lineChartWithDots");
  if (!ctx) return;
  
  if (lineChartWithDotsInstance) {
    lineChartWithDotsInstance.destroy();
  }
  
  if (visitors.length === 0) {
    console.log("No visitor data available");
    return;
  }
  
  const dates = visitors.map((data) => {
    const date = new Date(data.date);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  });
  
  const uniqueVisitors = visitors.map((data) => data.uniqueVisitors || 0);
  const totalViews = visitors.map((data) => data.totalViews || 0);
  
  lineChartWithDotsInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Unique Visitors",
          data: uniqueVisitors,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: false,
          pointRadius: 5,
          pointBackgroundColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Total Views",
          data: totalViews,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: false,
          pointBackgroundColor: "rgba(255, 99, 132, 1)",
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        x: { type: "category", title: { display: true, text: "Date" } },
        y: { beginAtZero: true, title: { display: true, text: "Count" } },
      },
    },
  });
}

// Load initial data immediately on page load
document.addEventListener('DOMContentLoaded', function() {
  // Show loading state
  const statsCards = document.querySelectorAll('.stat-value');
  statsCards.forEach(card => {
    card.textContent = 'Loading...';
  });
  
  // Load data immediately
  loadDashboardStats(selectedRange);
});

// Enhanced download function for multiple formats
async function downloadReport(format) {
  const errorMsg = document.getElementById("error-msg");
  const startDateInput = document.getElementById("start-date");
  const endDateInput = document.getElementById("end-date");
  
  if (errorMsg) errorMsg.textContent = "";

  if (selectedRange === "custom") {
    if (!startDateInput.value || !endDateInput.value) {
      if (errorMsg) errorMsg.textContent = "Both start and end dates are required for custom range.";
      return;
    }

    if (new Date(startDateInput.value) >= new Date(endDateInput.value)) {
      if (errorMsg) errorMsg.textContent = "Start date must be earlier than end date.";
      return;
    }
  }

  try {
    const requestData = { range: selectedRange, format: format };
    if (selectedRange === "custom") {
      requestData.startDate = startDateInput.value;
      requestData.endDate = endDateInput.value;
    }

    const response = await fetch("/admin/dashboard/download-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let filename = `SalesReport`;
      let extension = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
      a.download = `${filename}.${extension}`;
      
      document.body.appendChild(a);
      a.click(); 
      document.body.removeChild(a);  
      window.URL.revokeObjectURL(url);
      
      Toast.success('Download Complete', `${format.toUpperCase()} report downloaded successfully`);
    } else {
      const { msg } = await response.json();
      if (errorMsg) errorMsg.textContent = msg || "Failed to download report.";
      Toast.error('Download Failed', msg || "Failed to download report.");
    }
  } catch (err) {
    const errorMessage = "An error occurred while processing the request.";
    if (errorMsg) errorMsg.textContent = errorMessage;
    Toast.error('Error', errorMessage);
    console.error(err);
  }
}

// PDF download button event listener
if (downloadBtn) {
  downloadBtn.addEventListener("click", async () => {
    if (errorMsg) errorMsg.textContent = "";
    downloadBtn.disabled = true;

    if (selectedRange === "custom") {
      if (!startDateInput.value || !endDateInput.value) {
        if (errorMsg) errorMsg.textContent = "Both start and end dates are required for custom range.";
        downloadBtn.disabled = false;
        return;
      }

      if (new Date(startDateInput.value) >= new Date(endDateInput.value)) {
        if (errorMsg) errorMsg.textContent = "Start date must be earlier than end date.";
        downloadBtn.disabled = false;
        return;
      }
    }

    try {
      const requestData = { range: selectedRange };
      if (selectedRange === "custom") {
        requestData.startDate = startDateInput.value;
        requestData.endDate = endDateInput.value;
      }

      const response = await fetch("/admin/dashboard/download-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SalesReport.pdf`;  
        document.body.appendChild(a);
        a.click(); 
        document.body.removeChild(a);  
        window.URL.revokeObjectURL(url);
        
        Toast.success('Download Complete', 'PDF report downloaded successfully');
      } else {
        const { msg } = await response.json();
        if (errorMsg) errorMsg.textContent = msg || "Failed to download report.";
        Toast.error('Download Failed', msg || "Failed to download report.");
      }
    } catch (err) {
      const errorMessage = "An error occurred while processing the request.";
      if (errorMsg) errorMsg.textContent = errorMessage;
      Toast.error('Error', errorMessage);
      console.error(err);
    } finally {
      downloadBtn.disabled = false;
    }
  });
}