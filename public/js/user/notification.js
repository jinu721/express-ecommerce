document
  .querySelector(".iconClearNotification")
  .addEventListener("click", async () => {
    try {
      const response = await fetch("/notifications", {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.val) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: data.msg,
        });
      }else{
        window.location.href = '/notifications';
      }
    } catch (err) {
      console.log(err);
    }
  });
