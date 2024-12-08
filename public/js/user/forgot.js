


// ~~~~~~~~~~ forgot password section ~~~~~~~~~~~


// Select all input fields

// Select all error messages
const emailErrorForgot = document.querySelector('.erremailForgot');
const passwordErrorForgot = document.querySelector('.errpassForgot');
const confirmPasswordErrorForgot = document.querySelector('.errcpassForgot');
const otpErrorForgot = document.querySelector('.errotpForgot');

// Select OTP-related elements
const resendOtpAlertForgot = document.querySelector('.reotpalertForgot');
const resendOtpButtonForgot = document.querySelector('.reotpbuttonForgot');
const btnpasswordForgot = document.querySelector('.btnForgot');
const btnverifyOtp = document.querySelector('.btnverifyForgot');
const passwordTextForgot = document.querySelector('.getotptextForgot');
const passwordLoaderForgot = document.querySelector('.getotploaderForgot');
const verifyOtpButtonForgot = document.querySelector('.getverifytextForgot');
const otpTextForgot = document.querySelector('.getverifytextForgot');
const otpLoaderForgot = document.querySelector('.getverifyloaderForgot');
const btnChangePassForgot = document.querySelector('.btnChangePassForgot');
const ChangePassTextForgot = document.querySelector('.ChangePassTextForgot');
const ChangePassloaderForgot = document.querySelector('.ChangePassloaderForgot');
const toggleEyeIcon = document.querySelectorAll('.toggleEye');

// Validation patterns
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;


console.log(btnpasswordForgot)

btnpasswordForgot.addEventListener("click", (e) => {
  const emailFieldForgot= document.querySelector('.emailForgot');
  const passwordFieldForgot = document.querySelector('.newpassForgot');
  const confirmPasswordFieldForgot = document.querySelector('.newcpassForgot');
  const otpFieldForgot = document.querySelector('.otpForgot');
  e.preventDefault();
  let isValid = true;
  if (!emailPattern.test(emailFieldForgot.value)) {
    emailErrorForgot.style.display = "block";
    emailErrorForgot.textContent = "Please enter a valid email address.";
    isValid = false;
  } else {
    emailErrorForgot.style.display = "none";
  }

  if (isValid) {
    passwordTextForgot.style.display = "none";
    passwordLoaderForgot.style.display = "flex";
    const userInfo = {
      email: emailFieldForgot.value,
    };
  
    let sendReq = async () => {
      try {
        const resData = await fetch("/forgot-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfo),
        });
        
        const parsedData = await resData.json();
  
        if (!parsedData.val) {
          emailErrorForgot.style.display = "block";
          emailErrorForgot.textContent = parsedData.msg;
          passwordTextForgot.style.display = "flex";
          passwordLoaderForgot.style.display = "none";
        } else {
            passwordTextForgot.style.display = "flex";
            passwordLoaderForgot.style.display = "none";
            emailErrorForgot.style.display = "none";
            emailFieldForgot.style.display = "none";
            btnpasswordForgot.style.display = "none";
            otpFieldForgot.style.display = "block";
            btnverifyOtp.style.display = "block";
            resendOtpAlertForgot.style.display = "block";
            startCountdownForgot(59);
        }
      } catch (err) {
        console.log("Error in updating profile:", err);
      }
    };
    sendReq();
  }
  
});

btnverifyOtp.addEventListener("click", (e) => {
  const emailFieldForgot= document.querySelector('.emailForgot');
  const passwordFieldForgot = document.querySelector('.newpassForgot');
  const confirmPasswordFieldForgot = document.querySelector('.newcpassForgot');
  const otpFieldForgot = document.querySelector('.otpForgot');
  e.preventDefault();
  let isValid = true;
  if (otpFieldForgot.value==="") {
    otpErrorForgot.style.display = "block";
    otpErrorForgot.textContent = "Input field should be not empty.";
    isValid = false;
  } else {
    otpErrorForgot.style.display = "none";
  }

  if (isValid) {
    otpTextForgot.style.display = "none";
    otpLoaderForgot.style.display = "flex";
    const userInfo = {
      otp: otpFieldForgot.value,
      email: emailFieldForgot.value,
    };
  
    let sendReq = async () => {
      try {
        const resData = await fetch("/forgot-verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfo),
        });
        
        const parsedData = await resData.json();
  
        if (!parsedData.val) {
          otpErrorForgot.style.display = "block";
          otpErrorForgot.textContent = parsedData.msg;
          otpTextForgot.style.display = "flex";
          otpLoaderForgot.style.display = "none";
        } else {
            otpTextForgot.style.display = "flex";
            otpLoaderForgot.style.display = "none";
            otpErrorForgot.style.display = "none";
            otpFieldForgot.style.display = "none";
            btnverifyOtp.style.display = "none";
            resendOtpAlertForgot.style.display = "none";
            resendOtpButtonForgot.style.display = "none";
            passwordFieldForgot.style.display = "block";
            confirmPasswordFieldForgot.style.display = "block";
            btnChangePassForgot.style.display = "block";
            resendOtpButtonForgot.style.display = "none";
            toggleEyeIcon.forEach(elem=>{
              elem.style.display = "block";
            })
        }
      } catch (err) {
        console.log("Error in updating profile:", err);
      }
    };
    sendReq();
  }
  
});

btnChangePassForgot.addEventListener("click", (e) => {
  const emailFieldForgot= document.querySelector('.emailForgot');
  const passwordFieldForgot = document.querySelector('.newpassForgot');
  const confirmPasswordFieldForgot = document.querySelector('.newcpassForgot');
  const otpFieldForgot = document.querySelector('.otpForgot');
  e.preventDefault();
  let isValid = true;
  if (!passwordPattern.test(passwordFieldForgot.value)) {
    passwordErrorForgot.style.display = "block";
    passwordErrorForgot.textContent = "Password must be at least 8 characters long, include uppercase, lowercase, a number, and a special character.";
    isValid = false;
  } else if(confirmPasswordFieldForgot.value!==passwordFieldForgot.value){
    confirmPasswordErrorForgot.style.display = "block";
    confirmPasswordErrorForgot.textContent = "Password and confirm password should be same.";
    isValid = false;
  }else {
    passwordErrorForgot.style.display = "none";
    confirmPasswordErrorForgot.style.display = "none";
  }
  if (isValid) {
    ChangePassTextForgot.style.display = "none";
    ChangePassloaderForgot.style.display = "flex";
    const userInfo = {
      password: passwordFieldForgot.value,
      email: emailFieldForgot.value,
    };
  
    let sendReq = async () => {
      try {
        const resData = await fetch("/forgot-password", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfo),
        });
        
        const parsedData = await resData.json();
  
        if (!parsedData.val) {
          passwordErrorForgot.style.display = "block";
          passwordErrorForgot.textContent = parsedData.msg;
          ChangePassTextForgot.style.display = "flex";
          ChangePassloaderForgot.style.display = "none";
        } else {
            ChangePassTextForgot.style.display = "none";
            ChangePassloaderForgot.style.display = "flex";
            window.location.href = '/';
        }
      } catch (err) {
        console.log("Error in updating profile:", err);
      }
    };
    sendReq();
  }
  
});

resendOtpButtonForgot.addEventListener('click',(e)=>{
  const emailFieldForgot= document.querySelector('.emailForgot');
  const passwordFieldForgot = document.querySelector('.newpassForgot');
  const confirmPasswordFieldForgot = document.querySelector('.newcpassForgot');
  const otpFieldForgot = document.querySelector('.otpForgot');
  e.preventDefault();
  let isValid = true;
  if (!emailPattern.test(emailFieldForgot.value)) {
    emailErrorForgot.style.display = "block";
    emailErrorForgot.textContent = "Please enter a valid email address.";
    isValid = false;
  } else {
    emailErrorForgot.style.display = "none";
  }

  if (isValid) {
    passwordTextForgot.style.display = "none";
    passwordLoaderForgot.style.display = "flex";
    const userInfo = {
      email: emailFieldForgot.value,
    };
  
    let sendReq = async () => {
      try {
        const resData = await fetch("/forgot-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfo),
        });
        
        const parsedData = await resData.json();
  
        if (!parsedData.val) {
          emailErrorForgot.style.display = "block";
          emailErrorForgot.textContent = parsedData.msg;
          passwordTextForgot.style.display = "flex";
          passwordLoaderForgot.style.display = "none";
        } else {
            passwordTextForgot.style.display = "flex";
            passwordLoaderForgot.style.display = "none";
            emailErrorForgot.style.display = "none";
            emailFieldForgot.style.display = "none";
            btnpasswordForgot.style.display = "none";
            otpFieldForgot.style.display = "block";
            btnverifyOtp.style.display = "block";
            resendOtpAlertForgot.style.display = "block";
            startCountdownForgot(59);
        }
      } catch (err) {
        console.log("Error in updating profile:", err);
      }
    };
    sendReq();
  }
  
})

function startCountdownForgot(duration) {
    resendOtpAlertForgot.style.display = "flex";
    resendOtpButtonForgot.style.display = "none";
    let countdownTime = duration; 
    
    const timerDisplay = document.querySelector(".timerForgot");
    timerDisplay.textContent = `0:${countdownTime < 10 ? '0' : ''}${countdownTime}`;
    
    const countdownInterval = setInterval(() => {
      countdownTime--; 
      const minutes = Math.floor(countdownTime / 60);
      const seconds = countdownTime % 60;
      timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      if (countdownTime <= 0) {
        clearInterval(countdownInterval);
        timerDisplay.textContent = "0:00"; 
        resendOtpAlertForgot.style.display = "none";
        resendOtpButtonForgot.style.display = "flex";
      }
    }, 1000); 
  }



  function toggleEye(inputId, iconElement) {
    const passwordInput = document.getElementById(inputId);
    const isPassword = passwordInput.getAttribute("type") === "password";
    passwordInput.setAttribute("type", isPassword ? "text" : "password");
    iconElement.classList.toggle("fa-eye");
    iconElement.classList.toggle("fa-eye-slash");
  }
  