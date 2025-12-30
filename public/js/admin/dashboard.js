// Dashboard JavaScript with Chart.js integration
let currentRange = 'daily';

// Chart instances
let topSellingProductsChartInstance = null;
let topSellingCategoriesChartInstance = null;
let topSellingBrandsChartInstance = null;
let revenueTrendChartInstance = null;
let orderStatusChartInstance = null;

// Filter button handling
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentRange = this.dataset.range;
    
    const customInputs = document.getElementById('customDateInputs');
    if (currentRange === 'custom') {
      customInputs.classList.add('show');
    } else {
      customInputs.classList.remove('show');
    }
  });
});

// Load dashboard data
async function loadDashboard() {
  try {
    let url = `/admin/dashboard/data?range=${currentRange}`;
    
    if (currentRange === 'custom') {
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;
      
      if (!startDate || !endDate) {
        Toast.error('Error', 'Please select both start and end dates');
        return;
      }
      
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    
    console.log('Loading dashboard data from:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Dashboard data received:', data);
    
    if (data.val) {
      updateDashboard(data.dashboard);
      updateCharts(data.dashboard);
      Toast.success('Dashboard Updated', `Data loaded for ${currentRange} period`);
    } else {
      console.error('Dashboard data error:', data.msg);
      Toast.error('Error', data.msg || 'Failed to load dashboard data');
    }
  } catch (error) {
    console.error('Dashboard load error:', error);
    Toast.error('Error', 'Failed to load dashboard data: ' + error.message);
  }
}

// Update dashboard with data
function updateDashboard(dashboard) {
  document.getElementById('totalUsers').textContent = dashboard.usersCount || 0;
  document.getElementById('totalProducts').textContent = dashboard.productsCount || 0;
  document.getElementById('totalOrders').textContent = dashboard.ordersCount || 0;
  document.getElementById('totalRevenue').textContent = `₹${(dashboard.totalRevenue || 0).toLocaleString()}`;
  document.getElementById('totalSales').textContent = dashboard.totalSalesCount || 0;
  document.getElementById('pendingMoney').textContent = `₹${(dashboard.totalPendingMoney || 0).toLocaleString()}`;
  document.getElementById('activeOffers').textContent = dashboard.offersCount || 0;
  document.getElementById('lowStock').textContent = dashboard.lowStockCount || 0;
  
  // Update categories with better display
  const categoriesGrid = document.getElementById('categoriesGrid');
  categoriesGrid.innerHTML = '';
  
  if (dashboard.categories && dashboard.categories.length > 0) {
    dashboard.categories.slice(0, 8).forEach(category => { // Show top 8 categories
      const categoryCard = document.createElement('div');
      categoryCard.className = 'category-card';
      categoryCard.innerHTML = `
        <h4>${category.name}</h4>
        <p>${category.productCount} products</p>
        ${category.productCount === 0 ? '<small class="text-warning">No products</small>' : ''}
      `;
      categoriesGrid.appendChild(categoryCard);
    });
  } else {
    categoriesGrid.innerHTML = '<div class="col-12"><p class="text-muted text-center">No categories found</p></div>';
  }
  
  // Show additional stats if available
  if (dashboard.couponDiscounts > 0) {
    console.log(`Total coupon discounts: ₹${dashboard.couponDiscounts.toLocaleString()}`);
  }
}

// Update all charts
function updateCharts(dashboard) {
  console.log('Updating charts with data:', {
    topSellingProducts: dashboard.topSellingProducts?.length || 0,
    topSellingCategories: dashboard.topSellingCategories?.length || 0,
    topSellingBrands: dashboard.topSellingBrands?.length || 0,
    revenueTrend: dashboard.revenueTrend?.length || 0,
    orderStatusDistribution: dashboard.orderStatusDistribution?.length || 0
  });
  
  try {
    updateTopSellingProductsChart(dashboard.topSellingProducts || []);
  } catch (error) {
    console.error('Error updating products chart:', error);
  }
  
  try {
    updateTopSellingCategoriesChart(dashboard.topSellingCategories || []);
  } catch (error) {
    console.error('Error updating categories chart:', error);
  }
  
  try {
    updateTopSellingBrandsChart(dashboard.topSellingBrands || []);
  } catch (error) {
    console.error('Error updating brands chart:', error);
  }
  
  try {
    updateRevenueTrendChart(dashboard.revenueTrend || []);
  } catch (error) {
    console.error('Error updating revenue chart:', error);
  }
  
  try {
    updateOrderStatusChart(dashboard.orderStatusDistribution || []);
  } catch (error) {
    console.error('Error updating order status chart:', error);
  }
}

// Generate random colors for charts
function generateColors(count) {
  const colors = [
    'rgba(79, 70, 229, 0.8)',
    'rgba(5, 150, 105, 0.8)',
    'rgba(220, 38, 38, 0.8)',
    'rgba(234, 88, 12, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(14, 165, 233, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(239, 68, 68, 0.8)'
  ];
  
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

// Update top selling products chart
function updateTopSellingProductsChart(products) {
  const ctx = document.getElementById("topSellingChart");
  if (!ctx) return;
  
  if (topSellingProductsChartInstance) {
    topSellingProductsChartInstance.destroy();
  }
  
  // Handle empty data
  if (!products || products.length === 0) {
    const parent = ctx.parentElement;
    const noDataMsg = parent.querySelector('.no-data-message');
    if (!noDataMsg) {
      const msg = document.createElement('div');
      msg.className = 'no-data-message text-center text-muted py-4';
      msg.innerHTML = '<i class="fas fa-chart-bar fa-2x mb-2"></i><br>No data available';
      parent.appendChild(msg);
    }
    return;
  }
  
  // Remove no data message if exists
  const parent = ctx.parentElement;
  const noDataMsg = parent.querySelector('.no-data-message');
  if (noDataMsg) noDataMsg.remove();
  
  const labels = products.map(item => {
    const name = item.productName || 'Unknown Product';
    return name.length > 20 ? name.substring(0, 20) + '...' : name;
  });
  const data = products.map(item => item.totalQuantity || 0);
  const colors = generateColors(products.length);
  
  topSellingProductsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Quantity Sold",
        data: data,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('0.8', '1')),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              const index = context[0].dataIndex;
              return products[index]?.productName || 'Unknown Product';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        },
        x: {
          ticks: {
            maxRotation: 45
          }
        }
      }
    }
  });
}

// Update top selling categories chart
function updateTopSellingCategoriesChart(categories) {
  const ctx = document.getElementById("topSellingCategoriesChart");
  if (!ctx) return;
  
  if (topSellingCategoriesChartInstance) {
    topSellingCategoriesChartInstance.destroy();
  }
  
  // Handle empty data
  if (!categories || categories.length === 0) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    const parent = ctx.parentElement;
    const noDataMsg = parent.querySelector('.no-data-message');
    if (!noDataMsg) {
      const msg = document.createElement('div');
      msg.className = 'no-data-message text-center text-muted py-4';
      msg.innerHTML = '<i class="fas fa-chart-pie fa-2x mb-2"></i><br>No data available';
      parent.appendChild(msg);
    }
    return;
  }
  
  // Remove no data message if exists
  const parent = ctx.parentElement;
  const noDataMsg = parent.querySelector('.no-data-message');
  if (noDataMsg) noDataMsg.remove();
  
  const labels = categories.map(item => item.categoryName || 'Unknown Category');
  const data = categories.map(item => item.totalQuantity || 0);
  const colors = generateColors(categories.length);
  
  topSellingCategoriesChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Update top selling brands chart
function updateTopSellingBrandsChart(brands) {
  const ctx = document.getElementById("topSellingBrandsChart");
  if (!ctx) return;
  
  if (topSellingBrandsChartInstance) {
    topSellingBrandsChartInstance.destroy();
  }
  
  // Handle empty data
  if (!brands || brands.length === 0) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    const parent = ctx.parentElement;
    const noDataMsg = parent.querySelector('.no-data-message');
    if (!noDataMsg) {
      const msg = document.createElement('div');
      msg.className = 'no-data-message text-center text-muted py-4';
      msg.innerHTML = '<i class="fas fa-chart-area fa-2x mb-2"></i><br>No data available';
      parent.appendChild(msg);
    }
    return;
  }
  
  // Remove no data message if exists
  const parent = ctx.parentElement;
  const noDataMsg = parent.querySelector('.no-data-message');
  if (noDataMsg) noDataMsg.remove();
  
  const labels = brands.map(item => item.brandName || 'Unknown Brand');
  const data = brands.map(item => item.totalQuantity || 0);
  const colors = generateColors(brands.length);
  
  topSellingBrandsChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Update revenue trend chart
function updateRevenueTrendChart(revenueTrend) {
  const ctx = document.getElementById("revenueTrendChart");
  if (!ctx) return;
  
  if (revenueTrendChartInstance) {
    revenueTrendChartInstance.destroy();
  }
  
  // Handle empty data
  if (!revenueTrend || revenueTrend.length === 0) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    const parent = ctx.parentElement;
    const noDataMsg = parent.querySelector('.no-data-message');
    if (!noDataMsg) {
      const msg = document.createElement('div');
      msg.className = 'no-data-message text-center text-muted py-4';
      msg.innerHTML = '<i class="fas fa-chart-line fa-2x mb-2"></i><br>No data available';
      parent.appendChild(msg);
    }
    return;
  }
  
  // Remove no data message if exists
  const parent = ctx.parentElement;
  const noDataMsg = parent.querySelector('.no-data-message');
  if (noDataMsg) noDataMsg.remove();
  
  const labels = revenueTrend.map(item => {
    const date = new Date(item.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const data = revenueTrend.map(item => item.revenue || 0);
  
  revenueTrendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Revenue (₹)",
        data: data,
        borderColor: 'rgba(79, 70, 229, 1)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

// Update order status chart
function updateOrderStatusChart(orderStatus) {
  const ctx = document.getElementById("orderStatusChart");
  if (!ctx) return;
  
  if (orderStatusChartInstance) {
    orderStatusChartInstance.destroy();
  }
  
  // Handle empty data
  if (!orderStatus || orderStatus.length === 0) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    const parent = ctx.parentElement;
    const noDataMsg = parent.querySelector('.no-data-message');
    if (!noDataMsg) {
      const msg = document.createElement('div');
      msg.className = 'no-data-message text-center text-muted py-4';
      msg.innerHTML = '<i class="fas fa-chart-doughnut fa-2x mb-2"></i><br>No data available';
      parent.appendChild(msg);
    }
    return;
  }
  
  // Remove no data message if exists
  const parent = ctx.parentElement;
  const noDataMsg = parent.querySelector('.no-data-message');
  if (noDataMsg) noDataMsg.remove();
  
  const labels = orderStatus.map(item => {
    const status = item._id || 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  });
  const data = orderStatus.map(item => item.count || 0);
  const colors = generateColors(orderStatus.length);
  
  orderStatusChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Load dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
  loadDashboard();
});

// Download report function
async function downloadReport(format) {
  try {
    const startDate = currentRange === 'custom' ? document.getElementById('startDate').value : null;
    const endDate = currentRange === 'custom' ? document.getElementById('endDate').value : null;
    
    if (currentRange === 'custom' && (!startDate || !endDate)) {
      Toast.error('Error', 'Please select both start and end dates for custom range');
      return;
    }
    
    const requestData = {
      range: currentRange,
      format: format
    };
    
    if (currentRange === 'custom') {
      requestData.startDate = startDate;
      requestData.endDate = endDate;
    }
    
    Toast.info('Generating Report', `Preparing ${format.toUpperCase()} report...`);
    
    const response = await fetch('/admin/dashboard/download-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const filename = `SalesReport_${currentRange}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      Toast.success('Download Complete', `${format.toUpperCase()} report downloaded successfully`);
    } else {
      const errorData = await response.json();
      Toast.error('Download Failed', errorData.message || 'Failed to generate report');
    }
  } catch (error) {
    console.error('Download error:', error);
    Toast.error('Download Failed', 'An error occurred while downloading the report');
  }
}