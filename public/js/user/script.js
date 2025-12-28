const emailLog = document.querySelector('.form__input[type="email"]');
const passwordLog = document.querySelector('.form__input[type="password"]');
const otpLog = document.querySelector(".otpLog");

const errUsernameReg = document.querySelector(".errusernameReg");
const errEmailReg = document.querySelector(".erremailReg");
const errPhoneReg = document.querySelector(".errphoneReg");
const errPassReg = document.querySelector(".errpassReg");
const errCPassReg = document.querySelector(".errcpassReg");
const errOtpReg = document.querySelector(".errotpReg");

const errEmailLog = document.querySelector(".erremailphoneLog");
const errPassLog = document.querySelector(".errpassLog");
const errOtpLog = document.querySelector(".errotpLog");

const reOtpAlertReg = document.querySelector(".reotpalertReg");
const reOtpButtonReg = document.querySelector(".reotpbuttonReg");

const reOtpAlertLog = document.querySelector(".reotpalertLog");
const reOtpButtonLog = document.querySelector(".reotpbuttonLog");

const btnOtpReg = document.querySelector(".btnotpReg");
const getOtpTextReg = document.querySelector(".getotptextReg");
const getOtpLoaderReg = document.querySelector("#getotploaderReg");

const btnVerifyReg = document.querySelector(".btnverifyReg");
const getVerifyTextReg = document.querySelector(".getverifytextReg");
const getVerifyLoaderReg = document.querySelector("#getverifyloaderReg");

const btnOtpLog = document.querySelector(".btnotpLog");
const getOtpTextLog = document.querySelector(".getotptextLog");
const getOtpLoaderLog = document.querySelector("#getotploaderLog");

const btnVerifyLog = document.querySelector(".btnverifyLog");
const getVerifyTextLog = document.querySelector(".getverifytextLog");
const getVerifyLoaderLog = document.querySelector("#getverifyloaderLog");

const createaccountTxt = document.querySelector(".create-accountTxt");
const loginaccountTxt = document.querySelector(".login-accountTxt");
const loginSection = document.querySelector(".login");
const registerSection = document.querySelector(".register");
const introSection = document.querySelector(".login-reg-intro");

const loginRegBreadcrumb = document.querySelector(".login-reg-breadcrumb");

const eyeIcon = document.querySelectorAll(".eye-icon");
const forgotPassText = document.querySelector(".forgotTxt");

// Direct login button elements
const btnLoginDirect = document.querySelector(".btnLoginDirect");
const loginDirectText = document.querySelector(".loginDirectText");
const loginDirectLoader = document.querySelector("#loginDirectLoader");

createaccountTxt.addEventListener("click", () => {
  introSection.style.display = "none";
  loginSection.style.display = "none";
  registerSection.style.display = "block";
});

loginaccountTxt.addEventListener("click", () => {
  introSection.style.display = "none";
  loginSection.style.display = "block";
  registerSection.style.display = "none";
});

// loginRegBreadcrumb.addEventListener("click", () => {
//   introSection.style.display = "flex";
//   loginSection.style.display = "none";
//   registerSection.style.display = "none";
// });

// Direct login button handler
btnLoginDirect.addEventListener("click", (e) => {
  e.preventDefault();
  const usernameOrEmail = document.querySelector(".username-email");
  const passwordInpLog = document.querySelector(".passwordLog");
  
  // Basic validation
  if (!usernameOrEmail.value.trim()) {
    errEmailLog.style.display = "flex";
    errEmailLog.textContent = "Please enter your username or email";
    return;
  }
  
  if (!passwordInpLog.value.trim()) {
    errPassLog.style.display = "flex";
    errPassLog.textContent = "Please enter your password";
    return;
  }
  
  // Hide error messages
  errEmailLog.style.display = "none";
  errPassLog.style.display = "none";
  
  // Show loader
  loginDirectText.style.display = "none";
  loginDirectLoader.style.display = "flex";
  
  const userInfo = {
    usernameOrEmail: usernameOrEmail.value.trim(),
    password: passwordInpLog.value
  };
  
  let sendReq = async () => {
    try {
      const resData = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userInfo),
      });
      const parsedData = await resData.json();
      
      // Hide loader
      loginDirectText.style.display = "flex";
      loginDirectLoader.style.display = "none";
      
      if (!parsedData.val) {
        if (parsedData.type === "username" || parsedData.type === "email") {
          errEmailLog.style.display = "flex";
          errEmailLog.textContent = parsedData.msg;
        } else if (parsedData.type === "password") {
          errPassLog.style.display = "flex";
          errPassLog.textContent = parsedData.msg;
        } else if (parsedData.type === "ban") {
          Swal.fire({
            icon: "error",
            title: "Account Banned",
            text: parsedData.msg,
          });
        }
      } else {
        // Success - redirect based on role
        const redirectUrl = parsedData.redirectUrl || "/";
        window.location.href = redirectUrl;
      }
    } catch (err) {
      console.log(err);
      // Hide loader on error
      loginDirectText.style.display = "flex";
      loginDirectLoader.style.display = "none";
      errEmailLog.style.display = "flex";
      errEmailLog.textContent = "An error occurred. Please try again.";
    }
  };
  sendReq();
});

btnOtpReg.addEventListener("click", (e) => {
  e.preventDefault();
  const usernameReg = document.querySelector(".username");
  const emailReg = document.querySelector(".email");
  const phoneReg = document.querySelector(".phone");
  const passwordReg = document.querySelector(".pass");
  const cpasswordReg = document.querySelector(".cpass");
  const otpReg = document.querySelector(".otpReg");
  const usernamePattern = /^[a-zA-Z0-9_]+$/;
  const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let isValid = true;
  const phonePattern = /^\+[0-9]+$/;
  if (!usernamePattern.test(usernameReg.value)) {
    errUsernameReg.style.display = "flex";
    errUsernameReg.textContent =
      "Username must contain only letters, numbers, and underscores (_).";
    isValid = false;
  } else if (!emailPattern.test(emailReg.value)) {
    errUsernameReg.style.display = "none";
    errEmailReg.style.display = "flex";
    errEmailReg.textContent = "Please enter a valid email address.";
    isValid = false;
  } else if (!phonePattern.test(phoneReg.value)) {
    errEmailReg.style.display = "none";
    errPhoneReg.style.display = "flex";
    errPhoneReg.textContent =
      "Phone number must start with '+' followed by numbers.";
    isValid = false;
  } else if (!passwordPattern.test(passwordReg.value)) {
    errPhoneReg.style.display = "none";
    errPassReg.style.display = "flex";
    errPassReg.textContent =
      "Password must be at least 8 characters long, include uppercase, lowercase, a number, and a special character.";
    isValid = false;
  } else if (cpasswordReg.value.length === 0) {
    errPassReg.style.display = "none";
    errCPassReg.style.display = "flex";
    errCPassReg.textContent = "Confirm password cannot be empty.";
    isValid = false;
  } else if (cpasswordReg.value !== passwordReg.value) {
    errCPassReg.style.display = "flex";
    errCPassReg.textContent =
      "Password and confirm password should be the same.";
    isValid = false;
  } else {
    errCPassReg.style.display = "none";
  }
  if (isValid) {
    errUsernameReg.style.display = "none";
    errEmailReg.style.display = "none";
    errPhoneReg.style.display = "none";
    errPassReg.style.display = "none";
    errCPassReg.style.display = "none";
    getOtpTextReg.style.display = "none";
    getOtpLoaderReg.style.display = "flex";
    const userInfo = {
      username: usernameReg.value,
      email: emailReg.value,
      phone: phoneReg.value,
      pass: passwordReg.value,
      isLogin: false,
    };
    console.log(userInfo);
    let sendReq = async () => {
      try {
        const resData = await fetch("/request-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfo),
        });
        const parsedData = await resData.json();
        if (!parsedData.val) {
          if (parsedData.type === "username") {
            errUsernameReg.style.display = "flex";
            errUsernameReg.textContent = parsedData.msg;
            getOtpTextReg.style.display = "flex";
            getOtpLoaderReg.style.display = "none";
          } else if (parsedData.type === "email") {
            errEmailReg.style.display = "flex";
            errEmailReg.textContent = parsedData.msg;
            getOtpTextReg.style.display = "flex";
            getOtpLoaderReg.style.display = "none";
          }
        } else {
          usernameReg.style.display = "none";
          passwordReg.style.display = "none";
          emailReg.style.display = "none";
          phoneReg.style.display = "none";
          passwordReg.style.display = "none";
          cpasswordReg.style.display = "none";
          btnOtpReg.style.display = "none";
          btnVerifyReg.style.display = "flex";
          eyeIcon.forEach((elem) => {
            elem.style.display = "none";
          });
          otpReg.style.display = "flex";
          startCountdown(59);
        }
      } catch (err) {
        console.log(err);
      }
    };
    sendReq();
  }
});

reOtpButtonReg.addEventListener("click", (e) => {
  e.preventDefault();
  const usernameReg = document.querySelector(".username");
  const emailReg = document.querySelector(".email");
  const phoneReg = document.querySelector(".phone");
  const passwordReg = document.querySelector(".pass");
  const cpasswordReg = document.querySelector(".cpass");
  const otpReg = document.querySelector(".otpReg");
  const userInfo = {
    username: usernameReg.value,
    email: emailReg.value,
    phone: phoneReg.value,
    pass: passwordReg.value,
  };
  let sendReq = async () => {
    try {
      const resData = await fetch("/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userInfo),
      });
      const parsedData = await resData.json();
      startCountdown(59);
    } catch (err) {
      console.log(err);
    }
  };
  sendReq();
});

btnVerifyReg.addEventListener("click", (e) => {
  e.preventDefault();
  const usernameReg = document.querySelector(".username");
  const emailReg = document.querySelector(".email");
  const phoneReg = document.querySelector(".phone");
  const passwordReg = document.querySelector(".pass");
  const otpReg = document.querySelector(".otpReg");
  if (otpReg.value.length === 0) {
    errOtpReg.style.display = "flex";
    errOtpReg.textContent = "Input field should be not empty.";
  } else {
    getVerifyTextReg.style.display = "none";
    getVerifyLoaderReg.style.display = "flex";
    const userInfo = {
      username: usernameReg.value,
      email: emailReg.value,
      phone: phoneReg.value,
      password: passwordReg.value,
      otp: otpReg.value,
    };
    let sendReq = async () => {
      try {
        const resData = await fetch("/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfo),
        });
        const parsedData = await resData.json();
        console.log(parsedData);
        if (!parsedData.val) {
          getVerifyTextReg.style.display = "flex";
          getVerifyLoaderReg.style.display = "none";
          errOtpReg.style.display = "flex";
          errOtpReg.textContent = parsedData.msg;
        } else {
          errOtpReg.style.display = "none";
          reOtpAlertReg.style.display = "none";
          reOtpButtonReg.style.display = "none";
          getVerifyTextReg.style.display = "flex";
          getVerifyLoaderReg.style.display = "none";
          window.location.href = "/";
        }
      } catch (err) {
        console.log(err);
      }
    };
    sendReq();
  }
});

function startCountdown(duration) {
  reOtpAlertReg.style.display = "flex";
  reOtpButtonReg.style.display = "none";
  let countdownTime = duration;

  const timerDisplay = document.querySelector(".timer");
  timerDisplay.textContent = `0:${
    countdownTime < 10 ? "0" : ""
  }${countdownTime}`;

  const countdownInterval = setInterval(() => {
    countdownTime--;
    const minutes = Math.floor(countdownTime / 60);
    const seconds = countdownTime % 60;
    timerDisplay.textContent = `${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
    if (countdownTime <= 0) {
      clearInterval(countdownInterval);
      timerDisplay.textContent = "0:00";
      reOtpAlertReg.style.display = "none";
      reOtpButtonReg.style.display = "flex";
    }
  }, 1000);
}

btnOtpLog.addEventListener("click", (e) => {
  e.preventDefault();
  const usernameOrEmail = document.querySelector(".username-email");
  const passwordInpLog = document.querySelector(".passwordLog");
  const otpLog = document.querySelector(".otpLog");
  getOtpTextLog.style.display = "none";
  getOtpLoaderLog.style.display = "flex";
  const userInfo = {
    usernameOrEmail: usernameOrEmail.value,
    password: passwordInpLog.value,
    isLogin: true,
  };
  console.log(userInfo);
  let sendReq = async () => {
    try {
      const resData = await fetch("/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userInfo),
      });
      const parsedData = await resData.json();
      if (!parsedData.val) {
        if (parsedData.type === "username" || parsedData.type === "email") {
          errEmailLog.style.display = "flex";
          errEmailLog.textContent = parsedData.msg;
          getOtpTextLog.style.display = "flex";
          getOtpLoaderLog.style.display = "none";
        } else if (parsedData.type === "password") {
          errPassLog.style.display = "flex";
          errPassLog.textContent = parsedData.msg;
          getOtpTextLog.style.display = "flex";
          getOtpLoaderLog.style.display = "none";
        }else if(parsedData.type === "ban"){
          getOtpTextLog.style.display = "flex";
          getOtpLoaderLog.style.display = "none";
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: parsedData.msg,
          });
        }
      } else {
        usernameOrEmail.style.display = "none";
        passwordInpLog.style.display = "none";
        btnOtpLog.style.display = "none";
        errPassLog.style.display = "none";
        errEmailLog.style.display = "none";
        btnVerifyLog.style.display = "flex";
        otpLog.style.display = "flex";
        eyeIcon.forEach((elem) => {
          elem.style.display = "none";
        });
        forgotPassText.style.display = "none";
        startCountdownLog(59);
      }
    } catch (err) {
      console.log(err);
    }
  };
  sendReq();
});

btnVerifyLog.addEventListener("click", (e) => {
  e.preventDefault();
  const usernameOrEmail = document.querySelector(".username-email");
  const passwordInpLog = document.querySelector(".passwordLog");
  const otpLog = document.querySelector(".otpLog");
  if (otpLog.value.length === 0) {
    errOtpLog.style.display = "flex";
    errOtpLog.textContent = "Input field should be not empty.";
  } else {
    getVerifyTextLog.style.display = "none";
    getVerifyLoaderLog.style.display = "flex";
    const userInfo = {
      usernameOrEmail: usernameOrEmail.value,
      password: passwordInpLog.value,
      otp: otpLog.value,
    };
    console.log(userInfo);
    let sendReq = async () => {
      try {
        const resData = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfo),
        });
        const parsedData = await resData.json();
        console.log(parsedData);
        if (!parsedData.val) {
          getVerifyTextLog.style.display = "flex";
          getVerifyLoaderLog.style.display = "none";
          errOtpLog.style.display = "flex";
          errOtpLog.textContent = parsedData.msg;
        } else {
          errOtpLog.style.display = "none";
          reOtpAlertLog.style.display = "none";
          reOtpButtonLog.style.display = "none";
          getVerifyTextLog.style.display = "flex";
          getVerifyLoaderLog.style.display = "none";
          window.location.href = "/";
        }
      } catch (err) {
        console.log(err);
      }
    };
    sendReq();
  }
});

function startCountdownLog(duration) {
  reOtpAlertLog.style.display = "flex";
  reOtpButtonLog.style.display = "none";
  let countdownTime = duration;

  const timerDisplay = document.querySelector(".timerLog");
  timerDisplay.textContent = `0:${
    countdownTime < 10 ? "0" : ""
  }${countdownTime}`;

  const countdownInterval = setInterval(() => {
    countdownTime--;
    const minutes = Math.floor(countdownTime / 60);
    const seconds = countdownTime % 60;
    timerDisplay.textContent = `${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
    if (countdownTime <= 0) {
      clearInterval(countdownInterval);
      timerDisplay.textContent = "0:00";
      reOtpAlertLog.style.display = "none";
      reOtpButtonLog.style.display = "flex";
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
