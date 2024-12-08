const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const downloadBtn = document.querySelector(".btnDownloadPdf");
const errorMsg = document.getElementById("error-msg");

const dateButtons = document.querySelectorAll(".btnDateRange");
const customDateInputs = document.getElementById("customDateInputs");

let selectedRange = "daily";

function updateActiveButton(selectedButton) {
  dateButtons.forEach((btn) => btn.classList.remove("btn-primary"));
  dateButtons.forEach((btn) => btn.classList.add("btn-outline-primary"));
  selectedButton.classList.remove("btn-outline-primary");
  selectedButton.classList.add("btn-primary");
}
const defaultButton = document.querySelector('[data-range="daily"]');
updateActiveButton(defaultButton);
dateButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const range = btn.getAttribute("data-range");

    updateActiveButton(btn);

    selectedRange = range;
    if (range === "custom") {
      customDateInputs.style.display = "flex";
    } else {
      customDateInputs.style.display = "none";
      console.log(`Fetching data for ${range} range`);
      fetchData(`/admin/dashboard/data?range=${range}`);
    }
  });
});

let topSellingProductsChartInstance = null;
let topSellingCategoriesChartInstance = null;
let topSellingBrandsChartInstance = null;
let lineChartWithDotsInstance = null;



async function fetchData(url) {
  const dashboardData = document.querySelector(".dashboardData");
  dashboardData.innerHTML = "";
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
    if (data.val) {
      dashboardData.innerHTML = `
              <div class="row">
                <div class="col-sm-4 grid-margin">
                  <div class="card">
                    <div class="card-body">
                      <h5>Revenue</h5>
                      <div class="row">
                        <div class="col-8 col-sm-12 col-xl-8 my-auto">
                          <div class="d-flex d-sm-block d-md-flex align-items-center">
                            <h2 class="mb-0">&#8377;${data.dashboard.totalRevenue}</h2>
                          </div>
                        </div>
                        <div class="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                          <i class="icon-lg mdi mdi-codepen text-primary ml-auto"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-sm-4 grid-margin">
                  <div class="card">
                    <div class="card-body">
                      <h5>Pending money</h5>
                      <div class="row">
                        <div class="col-8 col-sm-12 col-xl-8 my-auto">
                          <div class="d-flex d-sm-block d-md-flex align-items-center">
                            <h2 class="mb-0">&#8377;${data.dashboard.totalPendingMoney}</h2>
                          </div>
                        </div>
                        <div class="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                          <i class="icon-lg mdi mdi-wallet-travel text-danger ml-auto"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-sm-4 grid-margin">
                  <div class="card">
                    <div class="card-body">
                      <h5>Overall discount</h5>
                      <div class="row">
                        <div class="col-8 col-sm-12 col-xl-8 my-auto">
                          <div class="d-flex d-sm-block d-md-flex align-items-center">
                            <h2 class="mb-0">&#8377;${data.dashboard.totalDiscounts}</h2>
                          </div>
                        </div>
                        <div class="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                          <i class="icon-lg mdi mdi-monitor text-success ml-auto"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
        <div class="row">
          <div class="col-xl-3 col-sm-6 grid-margin stretch-card">
            <div class="card">
              <div class="card-body">
                <div class="row">
                  <div class="col-9">
                    <div class="d-flex align-items-center align-self-start">
                      <h3 class="mb-0">${data.dashboard.usersCount}</h3>
                    </div>
                  </div>
                </div>
                <h6 class="text-muted font-weight-normal">Total Users</h6>
              </div>
            </div>
          </div>
          <div class="col-xl-3 col-sm-6 grid-margin stretch-card">
            <div class="card">
              <div class="card-body">
                <div class="row">
                  <div class="col-9">
                    <div class="d-flex align-items-center align-self-start">
                      <h3 class="mb-0">${data.dashboard.productsCount}</h3>
                    </div>
                  </div>
                </div>
                <h6 class="text-muted font-weight-normal">Total Products</h6>
              </div>
            </div>
          </div>
          <div class="col-xl-3 col-sm-6 grid-margin stretch-card">
            <div class="card">
              <div class="card-body">
                <div class="row">
                  <div class="col-9">
                    <div class="d-flex align-items-center align-self-start">
                      <h3 class="mb-0">${data.dashboard.ordersCount}</h3>
                    </div>
                  </div>
                </div>
                <h6 class="text-muted font-weight-normal">Total Orders</h6>
              </div>
            </div>
          </div>
          <div class="col-xl-3 col-sm-6 grid-margin stretch-card">
            <div class="card">
              <div class="card-body">
                <div class="row">
                  <div class="col-9">
                    <div class="d-flex align-items-center align-self-start">
                      <h3 class="mb-0">${data.dashboard.categories.length}</h3>
                    </div>
                  </div>
                </div>
                <h6 class="text-muted font-weight-normal">Total Categories</h6>
              </div>
            </div>
          </div>
        </div>

        `;
        const generateRandomColor = () =>
          `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`;
        
        const generateRandomBorderColor = () =>
          `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`;

        const topSellingProductsCtx = document
          .getElementById("topSellingChart")
          .getContext("2d");
        if (topSellingProductsChartInstance) {
          topSellingProductsChartInstance.destroy();
        }
        topSellingProductsChartInstance = new Chart(topSellingProductsCtx, {
          type: "bar",
          data: {
            labels: data.dashboard.topSellingProducts.map((prod) => prod.product.name),
            datasets: [
              {
                label: "Sales Quantity",
                data: data.dashboard.topSellingProducts.map((prod) => prod.totalQuantity),
                backgroundColor: data.dashboard.topSellingProducts.map(generateRandomColor),
                borderColor: data.dashboard.topSellingProducts.map(generateRandomBorderColor),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true },
            },
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true },
            },
          },
        });
        
        const topSellingCategoriesCtx = document
          .getElementById("topSellingCategoriesChart")
          .getContext("2d");
        if (topSellingCategoriesChartInstance) {
          topSellingCategoriesChartInstance.destroy();
        }
        topSellingCategoriesChartInstance = new Chart(topSellingCategoriesCtx, {
          type: "bar",
          data: {
            labels: data.dashboard.topSellingCategories.map((cat) => cat.category),
            datasets: [
              {
                label: "Sales Quantity",
                data: data.dashboard.topSellingCategories.map((cat) => cat.totalQuantity),
                backgroundColor: data.dashboard.topSellingCategories.map(generateRandomColor),
                borderColor: data.dashboard.topSellingCategories.map(generateRandomBorderColor),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true },
            },
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true },
            },
          },
        });
        
        const topSellingBrandsCtx = document
          .getElementById("topSellingBrandsChart")
          .getContext("2d");
        if (topSellingBrandsChartInstance) {
          topSellingBrandsChartInstance.destroy();
        }
        topSellingBrandsChartInstance = new Chart(topSellingBrandsCtx, {
          type: "bar",
          data: {
            labels: data.dashboard.topSellingBrands.map((brand) => brand.brand),
            datasets: [
              {
                label: "Sales Quantity",
                data: data.dashboard.topSellingBrands.map((brand) => brand.totalQuantity),
                backgroundColor: data.dashboard.topSellingBrands.map(generateRandomColor),
                borderColor: data.dashboard.topSellingBrands.map(generateRandomBorderColor),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true },
            },
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true },
            },
          },
        });

      const visitorData = data.dashboard?.vistors || [];
      if (visitorData.length === 0) {
        console.error("No visitor data available.");
        return;
      }

      const dates = visitorData.map((data) => {
        const date = new Date(data.date);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      });

      const uniqueVisitors = visitorData.map(
        (data) => data.uniqueVisitors || 0
      );
      const totalViews = visitorData.map((data) => data.totalViews || 0);

      const canvas = document.getElementById("lineChartWithDots");
      if (!canvas) {
        console.error("Canvas element with ID 'lineChartWithDots' not found.");
        return;
      }

      const ctx = canvas.getContext("2d");

      if (lineChartWithDotsInstance) {
        lineChartWithDotsInstance.destroy();
      }

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
          plugins: {
            legend: { display: true },
          },
          scales: {
            x: {
              type: "category",
              title: { display: true, text: "Date" },
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: "Count" },
            },
          },
        },
      });
    } else {
      console.log(data.msg);
    }
  } catch (err) {
    console.log(err);
  }
}

document.querySelector(".btnDownloadPdf").addEventListener("click", () => {});

fetchData(`/admin/dashboard/data?range=${selectedRange}`);

downloadBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";
  downloadBtn.disabled = true;

  if (selectedRange === "custom") {
    if (!startDateInput.value || !endDateInput.value) {
      errorMsg.textContent =
        "Both start and end dates are required for custom range.";
      downloadBtn.disabled = false;
      return;
    }

    if (new Date(startDateInput.value) >= new Date(endDateInput.value)) {
      errorMsg.textContent = "Start date must be earlier than end date.";
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

    console.log(requestData);

    const response = await fetch("/admin/dashboard/download-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "SalesReport.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      const { msg } = await response.json();
      errorMsg.textContent = msg || "Failed to download report.";
    }
  } catch (err) {
    errorMsg.textContent = "An error occurred while processing the request.";
    console.error(err);
  } finally {
    downloadBtn.disabled = false;
  }
});
