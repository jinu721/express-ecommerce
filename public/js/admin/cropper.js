let cropper;
let croppedImages = [];
let croppedImageFile;
let isCropped = false;

function previewAndCrop(event, isMultiple) {
  const files = event.target.files;
  if (isMultiple) {
    croppedImages = [];
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const cropPreview = document.getElementById(`cropPreview${index}`);
        cropPreview.src = reader.result;
        cropPreview.style.display = 'block';
        document.getElementById('cropButton').style.display = 'inline-block';

        if (cropper) cropper.destroy();
        cropper = new Cropper(cropPreview, {
          aspectRatio: NaN,
          viewMode: 0,
          scalable: true,
          zoomable: true,
        });
      };
      reader.readAsDataURL(file);
    });

  } else { 
    const file = files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const cropPreview = document.getElementById('cropPreview');
        cropPreview.src = reader.result;
        cropPreview.style.display = 'block';
        document.getElementById('cropButton').style.display = 'inline-block';

        if (cropper) cropper.destroy();
        cropper = new Cropper(cropPreview, {
          aspectRatio: NaN,
          viewMode: 0,
          scalable: true,
          zoomable: true,
        });
      };
      reader.readAsDataURL(file);
    }
  }
}

function startCropping(isMultiple) {
  if (cropper) {
    if (isMultiple) {
      const canvases = Array.from(document.querySelectorAll('.crop-preview')).map((cropPreview) => cropper.getCroppedCanvas());
      croppedImages = canvases.map((canvas) => canvas.toBlob((blob) => new File([blob], 'cropped_image.jpg', { type: 'image/jpeg' })));
      console.log("Cropped Multiple Images Ready:", croppedImages);
      document.getElementById("cropPreview").style.display = "none";
      document.getElementById("cropButton").style.display = "none";
    } else {
      const canvas = cropper.getCroppedCanvas();
      canvas.toBlob((blob) => {
        croppedImageFile = new File([blob], 'cropped_image.jpg', { type: 'image/jpeg' });
        isCropped = true;
        console.log("Cropped Single Image Ready:", croppedImageFile);
      });
    }

    document.getElementById("cropPreview").style.display = "none";
    document.getElementById("cropButton").style.display = "none";
    cropper.destroy();
    cropper = null;
  }
}
