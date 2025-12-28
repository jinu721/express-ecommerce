
document.querySelector('.resultContainer').addEventListener('click', async (event) => {
  if (event.target.classList.contains('btn-ban')) {
    const elem = event.target; 
    const userId = elem.getAttribute('data-id');
    const action = elem.textContent;
    
    // Show confirmation dialog
    const confirmed = await Toast.confirm({
      title: `${action} User`,
      message: `Are you sure you want to ${action.toLowerCase()} this user?`,
      confirmText: action,
      cancelText: 'Cancel',
      type: action === 'Ban' ? 'error' : 'warning'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/admin/users/ban/?id=${userId}&val=${action}`);
      const data = await res.json();
      
      if (data.val) {
        Toast.success('Success', data.msg || `User ${action.toLowerCase()}ned successfully`);
        
        if (action === "Ban") {
          elem.classList.replace("badge-danger", "badge-success");
          elem.textContent = "Unban";
        } else {
          elem.classList.replace("badge-success", "badge-danger");
          elem.textContent = "Ban";
        }
      } else {
        Toast.error('Error', data.msg || `Failed to ${action.toLowerCase()} user`);
      }
    } catch (err) {
      console.log(err);
      Toast.error('Error', 'Something went wrong');
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
        const isCurrentUser = data.currentAdminId && item._id === data.currentAdminId;
        const isAdmin = item.role === 'admin';
        
        const productHTML = `
        <tr>
          <td>
            ${item.username}
            ${isCurrentUser ? '<span class="badge badge-info ms-2">You</span>' : ''}
          </td>
          <td>${item.email}</td>
          <td>
            <span class="badge ${isAdmin ? 'badge-warning' : 'badge-outline-primary'}">
              ${item.role}
            </span>
          </td>
          <td>
            ${new Date(item.createdAt).toLocaleDateString()}
          </td>
          <td>
            ${isAdmin ? 
              '<span class="badge badge-secondary">Admin User</span>' :
              `<div data-id="${item._id}" class="badge ${item.isDeleted ? 'badge-success' : 'badge-danger'} btn-ban" style="cursor: pointer;">
                ${item.isDeleted ? 'Unban' : 'Ban'}
              </div>`
            }
          </td>
        </tr>
        `;
        resultsContainer.innerHTML += productHTML;
      });
    } else {
      console.log(data.msg);
      resultsContainer.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
    }
  } catch (err) {
    console.log(err);
    resultsContainer.innerHTML = '<tr><td colspan="5" class="text-center">Error loading users</td></tr>';
  }
}

