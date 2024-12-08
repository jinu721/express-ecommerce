document.getElementById('submitButton').addEventListener('click', (e) => {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    

    const couponId = e.target.getAttribute('data-id');

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
    } else if (!minPurchase || isNaN(minPurchase) || minPurchase <= 0) {
      document.getElementById('minPurchaseError').textContent = 'Enter a valid Minimum Purchase amount!';
      return;
    } else if (!maxDiscount || isNaN(maxDiscount) || maxDiscount <= 0) {
      document.getElementById('maxDiscountError').textContent = 'Enter a valid Maximum Discount amount!';
      return;
    } else if (new Date(validFrom) >= new Date(validUntil)) {
      document.getElementById('validUntilError').textContent = 'Valid Until must be after Valid From!';
      return;
    } else if (!usageLimit || isNaN(usageLimit) || usageLimit <= 0) {
      document.getElementById('usageLimitError').textContent = 'Enter a valid Usage Limit!';
      return;
    }
  
    const data = {
      couponCode,
      discountValue,
      validFrom,
      validUntil,
      usageLimit: Number(usageLimit),
      minPurchase: Number(minPurchase),
      maxDiscount: Number(maxDiscount),
    };
  
    async function updateCoupon() {
      try {
        const response = await fetch(`/admin/coupons/update/${couponId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        const dataResponse = await response.json();
        if (dataResponse.val) {
          window.location.href = "/admin/coupons";
        } else {
          if (dataResponse.isCodeError) {
            document.getElementById('couponCodeError').textContent = dataResponse.msg;
          } else {
            console.log(dataResponse.msg);
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
    updateCoupon();
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
  


  document.querySelector('.')