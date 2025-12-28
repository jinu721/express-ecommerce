let croppedImageFile;
let isCropped = false;
let cropper;
function previewAndCrop(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!["image/png", "image/jpg", "image/jpeg"].includes(file.type)) {
    const categoryUpdateImageError = document.querySelector(
      "#categoryImageError"
    );
    categoryUpdateImageError.style.display = "block";
    categoryUpdateImageError.textContent = "Only jpg, png, and jpeg allowed";
    return;
  }
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const cropPreview = document.getElementById("cropPreview");
      cropPreview.src = e.target.result;
      cropPreview.style.display = "block";
      document.getElementById("cropButton").style.display = "block";
      if (cropper) {
        cropper.destroy();
      }
      cropper = new Cropper(cropPreview, {
        aspectRatio: NaN,
        viewMode: 0,
        autoCropArea: 1,
        ready() {
          cropper.clear();
          cropper.crop();
        },
      });
    };
    reader.readAsDataURL(file);
  }
}
function startCropping() {
  const canvas = cropper.getCroppedCanvas();
  canvas.toBlob((blob) => {
    croppedImageFile = new File([blob], "croppedImage.png", {
      type: "image/png",
      lastModified: Date.now(),
    });
    isCropped = true;
    document.querySelector(".previewSection").style.display = "none";
  });
}

document
  .getElementById("categoryForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    document.querySelector("#categoryImageError").style.display = "none";
    const categoryName = document.getElementById("categoryName").value.trim();
    const categoryImage = document.getElementById("categoryImage");
    const nameError = document.getElementById("categoryNameError");
    const imageError = document.getElementById("categoryImageError");

    let isValid = true;
    if (!categoryName) {
      nameError.style.display = "block";
      nameError.textContent = "Enter the category name";
      isValid = false;
    } else {
      nameError.style.display = "none";
    }
    if (!categoryImage.files.length) {
      imageError.textContent = "Please upload an image file.";
      imageError.style.display = "block";
      isValid = false;
    } else {
      imageError.style.display = "none";
    }
    if (isValid) {
      const formData = new FormData();
      formData.append("categoryName", categoryName);
      if (isCropped && croppedImageFile) {
        formData.append("categoryImage", croppedImageFile);
      } else {
        formData.append("categoryImage", categoryImage.files[0]);
      }
      async function addData() {
        try {
          const response = await fetch("/admin/category/add", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (!data.val) {
            document.querySelector("#categoryNameError").style.display =
              "block";
            document.querySelector("#categoryNameError").textContent = data.msg;
            console.log(data.msg);
          } else {
            document.querySelector("#categoryNameError").style.display = "none";
            window.location.href = "/admin/categories";
          }
        } catch (err) {
          console.log("Error ::- " + err);
        }
      }
      addData();
    }
  });

const btnUnlist = document.querySelectorAll(".btnListAndUnlist");

btnUnlist.forEach((elem) => {
  elem.addEventListener("click", async () => {
    try {
      const categoryId = elem.getAttribute("data-id");
      const res = await fetch(
        `/admin/category/unlist?id=${categoryId}&val=${elem.textContent}`
      );
      const data = await res.json();
      console.log(data);
      if (data.val) {
        if (elem.textContent === "Unlist") {
          elem.classList.replace(
            "badge-outline-primary",
            "badge-outline-success"
          );
          elem.textContent = "List";
        } else {
          console.log(elem.textContent);
          elem.classList.replace(
            "badge-outline-success",
            "badge-outline-primary"
          );
          elem.textContent = "Unlist";
        }
      }
    } catch (err) {
      console.log(err);
    }
  });
});





