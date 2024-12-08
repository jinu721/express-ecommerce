
document.querySelector('.resultContainer').addEventListener('click', async (event) => {
  if (event.target.classList.contains('btn-ban')) {
    const elem = event.target; 
    try {
      const userId = elem.getAttribute('data-id');
      const res = await fetch(`/admin/users/ban/?id=${userId}&val=${elem.textContent}`);
      const data = await res.json();
      console.log(data);
      if (data.val) {
        if (elem.textContent === "Ban") {
          elem.classList.replace("badge-outline-danger", "badge-outline-primary");
          elem.textContent = "Unban";
        } else {
          elem.classList.replace("badge-outline-primary", "badge-outline-danger");
          elem.textContent = "Ban";
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
});

let debounceTimer;

function searchDebouncing() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchData();
  }, 300);
}

async function searchData() {
  const query = document.querySelector('.searchUsers').value.trim();
  console.log(query);
  const resultsContainer = document.querySelector('.resultContainer');
  resultsContainer.innerHTML = '';
  try {
    const response = await fetch(`/admin/users/search?key=${query}`);
    const data = await response.json();
    if (data.val) {
      console.log(data.users);
      data.users.forEach((item) => {
        const productHTML = `
        <tr>
          <td>${item.username}</td>
          <td>${item.email}</td>
          <td>${item.role}</td>
          <td>28:10:2024</td>
          <td>
            <div data-id="${item._id}" class="badge ${item.isDeleted ? 'badge-outline-primary' : 'badge-outline-danger'} btn-ban">
              ${item.isDeleted ? 'Unban' : 'Ban'}
            </div>
          </td>
        </tr>
        `;
        resultsContainer.innerHTML += productHTML;
      });
    } else {
      console.log(data.msg);
    }
  } catch (err) {
    console.log(err);
  }
}

