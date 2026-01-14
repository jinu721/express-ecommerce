
let imageSelector;
let updateImageSelector;

document.addEventListener('DOMContentLoaded', function () {
  console.log("DOM loaded, initializing category.js...");

  const categoryModal = document.getElementById('productUploadModal');
  if (categoryModal) {
    imageSelector = new ImageSelector('imageSelector', {
      maxImages: 1,
      minImages: 1,
      allowCrop: true,
      aspectRatio: 1
    });
    window.imageSelector = imageSelector;
  }

  const updateModal = document.getElementById('categoryUpdateModal');
  if (updateModal) {
    updateImageSelector = new ImageSelector('updateImageSelector', {
      maxImages: 1,
      minImages: 1,
      allowCrop: true,
      aspectRatio: 1
    });
    window.updateImageSelector = updateImageSelector;
  }
});

async function openUpdateModal(id) {
  try {
    const loadingToast = Toast.info("Loading", "Fetching category details...", { duration: 0 });
    const response = await fetch(`/admin/category/data/${id}`);
    const result = await response.json();
    Toast.hide(loadingToast);

    if (result.val) {
      const category = result.category;
      document.getElementById('updateCategoryId').value = category._id;
      document.getElementById('updateCategoryName').value = category.name;

      updateImageSelector.clear();
      if (category.image) {
        updateImageSelector.loadImages([category.image.startsWith('/') ? category.image : '/' + category.image]);
      }

      const modal = new bootstrap.Modal(document.getElementById('categoryUpdateModal'));
      modal.show();
    } else {
      Toast.error("Error", result.msg);
    }
  } catch (error) {
    console.error(error);
    Toast.error("Error", "Failed to fetch category data");
  }
}

document.getElementById('categoryUpdateForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const id = document.getElementById('updateCategoryId').value;
  const name = document.getElementById('updateCategoryName').value.trim();
  const nameError = document.getElementById('updateCategoryNameError');

  if (!name) {
    nameError.style.display = "block";
    nameError.textContent = "Enter the category name";
    return;
  }
  nameError.style.display = "none";

  if (!updateImageSelector.validate()) return;

  const loadingToast = Toast.info("Updating", "Saving category changes...", { duration: 0 });

  try {
    const nameResponse = await fetch(`/admin/category/update/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryName: name }),
    });
    const nameData = await nameResponse.json();

    const images = updateImageSelector.images.filter(img => img !== null);
    if (images.length > 0 && images[0].file) {
      const imageFormData = new FormData();
      imageFormData.append("categoryImage", images[0].file);
      await fetch(`/update-category-image/${id}`, {
        method: "POST",
        body: imageFormData
      });
    }

    Toast.hide(loadingToast);
    if (nameData.val) {
      Toast.success("Success", "Category updated successfully");
      setTimeout(() => window.location.reload(), 1500);
    } else {
      Toast.error("Update Failed", nameData.msg);
    }
  } catch (error) {
    Toast.hide(loadingToast);
    console.error(error);
    Toast.error("Error", "Failed to update category");
  }
});

window.openUpdateModal = openUpdateModal;

document
  .getElementById("categoryForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    document.querySelector("#categoryImageError").style.display = "none";
    const categoryName = document.getElementById("categoryName").value.trim();
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

    // Validate image selector
    if (!imageSelector.validate()) {
      isValid = false;
    }

    if (isValid) {
      const formData = new FormData();
      formData.append("categoryName", categoryName);

      // Get images from image selector
      const imageFormData = imageSelector.getFormData('categoryImage');
      // ImageSelector.getFormData appends as categoryImage1, categoryImage2...
      // But the backend expects 'categoryImage' as a single file for upload.single('categoryImage')
      // OR it might handle field names.

      // Let's check how many images are there
      const images = imageSelector.images.filter(img => img !== null);
      if (images.length > 0 && images[0].file) {
        formData.append("categoryImage", images[0].file);
      }

      async function addData() {
        try {
          const loadingToast = Toast.info("Creating", "Adding new category...", { duration: 0 });
          const response = await fetch("/admin/category/add", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          Toast.hide(loadingToast);

          if (!data.val) {
            document.querySelector("#categoryNameError").style.display = "block";
            document.querySelector("#categoryNameError").textContent = data.msg;
            Toast.error("Error", data.msg);
          } else {
            Toast.success("Success", "Category added successfully");
            setTimeout(() => window.location.href = "/admin/categories", 1500);
          }
        } catch (err) {
          console.log("Error ::- " + err);
          Toast.error("Error", "Failed to add category");
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
        `/admin/category/unlist?id=${categoryId}&val=${elem.textContent.trim()}`
      );
      const data = await res.json();
      if (data.val) {
        if (elem.textContent.trim() === "Unlist") {
          elem.classList.replace("badge-outline-danger", "badge-outline-success");
          elem.textContent = "List";
          Toast.success("Unlisted", "Category has been unlisted");
        } else {
          elem.classList.replace("badge-outline-success", "badge-outline-danger");
          elem.textContent = "Unlist";
          Toast.success("Listed", "Category is now active");
        }
      }
    } catch (err) {
      console.log(err);
      Toast.error("Error", "Failed to update status");
    }
  });
});

async function deleteCategory(id, name) {
  const confirmed = await Toast.confirm({
    title: 'Permanently Delete Category?',
    message: `Are you sure you want to delete "${name}"? This action cannot be undone and will fail if products are associated with it.`,
    confirmText: 'Yes, Delete',
    cancelText: 'Cancel',
    type: 'error'
  });

  if (confirmed) {
    try {
      const response = await fetch(`/admin/category/delete/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.val) {
        Toast.success('Deleted', data.msg);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        Toast.error('Delete Failed', data.msg);
      }
    } catch (error) {
      console.error('Delete error:', error);
      Toast.error('Error', 'Failed to delete category');
    }
  }
}

window.deleteCategory = deleteCategory;
