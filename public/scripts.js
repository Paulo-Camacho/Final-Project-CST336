document.addEventListener('DOMContentLoaded', () => {
  // ============================
  // EDIT FOOD MODAL
  // ============================
  const editButtons = document.querySelectorAll('.editFoodBtn');
  const modalElement = document.getElementById('editFoodModal');
  const modal = new bootstrap.Modal(modalElement);

  editButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('editFoodId').value = btn.dataset.id;
      document.getElementById('editFoodName').value = btn.dataset.name;
      document.getElementById('editFoodCalories').value = btn.dataset.calories;
      document.getElementById('editFoodProtein').value = btn.dataset.protein;
      document.getElementById('editFoodCarbs').value = btn.dataset.carbs;
      document.getElementById('editFoodFat').value = btn.dataset.fat;
      document.getElementById('editFoodSodium').value = btn.dataset.sodium;

      modal.show();
    });
  });

  // ============================
  // FOOD SEARCH (API)
  // ============================
  const searchForm = document.getElementById('foodSearchForm');
  const searchInput = document.getElementById('foodSearchInput');
  const resultsList = document.getElementById('searchResults');

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const query = searchInput.value.trim();
    if (!query) return;

    const res = await fetch(`/searchFood?query=${encodeURIComponent(query)}`);
    const foods = await res.json();

    resultsList.innerHTML = '';

    if (foods.length === 0) {
      resultsList.innerHTML = `<div class="list-group-item">No results found.</div>`;
      return;
    }

    foods.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'list-group-item list-group-item-action';
      div.style.cursor = 'pointer';
      div.textContent = `${item.name} — ${item.calories} cal`;

      div.addEventListener('click', async () => {
        const insertRes = await fetch('/addFoodFromSearch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });

        if (insertRes.ok) {
          alert(`${item.name} added!`);
          window.location.reload();
        } else {
          alert('Error adding food.');
        }
      });

      resultsList.appendChild(div);
    });
  });
});
