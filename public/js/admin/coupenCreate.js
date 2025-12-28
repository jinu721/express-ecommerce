document.getElementById('submitButton').addEventListener('click', () => {
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
  const couponCode = document.getElementById('couponCode').value.trim();
  const discountValue = document.getElementById('discountValue').value.trim();
  const validFrom = document.getElementById('validFrom').value;
  const validUntil = document.getElementById('validUntil').value;
  const usageLimit = document.getElementById('usageLimit').value.trim();
  const minPurchase = document.getElementById('minPurchase').value.trim();
  const maxDiscount = document.getElementById('maxDiscount').value.trim();


  if (!couponCode) {
    document.getElementById('couponCodeError').textContent = 'Coupon Code is required!';
    return;
  } else if ((!discountValue || (!/^\d+(\.\d+)?$/.test(discountValue) && !/^\d+%$/.test(discountValue)))) {
    document.getElementById('discountValueError').textContent = 'Enter a valid Discount Value!';
    return;
  } else if (!validFrom) {
    document.getElementById('validFromError').textContent = 'Valid From date is required!';
    return;
  } else if (!validUntil) {
    document.getElementById('validUntilError').textContent = 'Valid Until date is required!';
    return;
  }else if (!minPurchase || isNaN(minPurchase) || minPurchase <= 0) {
    document.getElementById('minPurchaseError').textContent = 'Enter a valid Minimum Purchase amount!';
    return;
  } else if (!maxDiscount || isNaN(maxDiscount) || maxDiscount <= 0) {
    document.getElementById('maxDiscountError').textContent = 'Enter a valid Maximum Discount amount!';
    return;
  }else if (new Date(validFrom) >= new Date(validUntil)) {
    document.getElementById('validUntilError').textContent = 'Valid Until must be after Valid From!';
    return;
  } else if (!usageLimit || isNaN(usageLimit) || usageLimit <= 0) {
    document.getElementById('usageLimitError').textContent = 'Enter a valid Usage Limit!';
    return;
  }

  const data = {
    couponCode,
    discountValue: discountValue,
    validFrom,
    validUntil,
    usageLimit: Number(usageLimit),
    minPurchase: Number(minPurchase),
    maxDiscount: Number(maxDiscount),
  };

  async function createCoupon() {
    try {
      const response = await fetch('/admin/coupons/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const dataResponse = await response.json();
      console.log(dataResponse);
      if (dataResponse.val) {
        showToast('Coupon created successfully!', 'success');
        setTimeout(() => {
          window.location.href = "/admin/coupons";
        }, 2000);
      } else {
        if(dataResponse.isCodeError){
          console.log('hii')
          document.getElementById('couponCodeError').textContent = dataResponse.msg;
          return
        }else{
          showToast(dataResponse.msg || 'Failed to create coupon', 'error');
        }
      }
    } catch (err) {
      console.error('Create coupon error:', err);
      showToast('Something went wrong. Please try again.', 'error');
    }
  }

// Toast function for admin
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
    max-width: 300px;
  `;
  
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    info: '#17a2b8',
    warning: '#ffc107'
  };
  
  toast.style.backgroundColor = colors[type] || colors.info;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 100);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
  createCoupon();
});


function generateCouponCode() {
    const brand = "SYMTERON";
    const randomLetters = Math.random().toString(36).substring(2, 4).toUpperCase(); 
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); 
    return `${brand}-${randomLetters}${randomNumbers}`;
  }
  
  document.getElementById('generateCouponBtn').addEventListener('click', () => {
    const couponCode = generateCouponCode();
    document.getElementById('couponCode').value = couponCode;
  });
  
  