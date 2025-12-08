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
        }
      });

      resultsList.appendChild(div);
    });
  });

  // ============================
  // SCROLL TO TOP BUTTON
  // ============================

  // Create the button dynamically
  const scrollBtn = document.createElement('button');
  scrollBtn.id = 'scrollTopBtn';
  scrollBtn.innerHTML = '↑ Top';
  scrollBtn.style.position = 'fixed';
  scrollBtn.style.bottom = '20px';
  scrollBtn.style.right = '20px';
  scrollBtn.style.padding = '10px 15px';
  scrollBtn.style.background = '#ffc107';
  scrollBtn.style.border = 'none';
  scrollBtn.style.borderRadius = '8px';
  scrollBtn.style.fontWeight = 'bold';
  scrollBtn.style.cursor = 'pointer';
  scrollBtn.style.display = 'none'; // hidden by default
  scrollBtn.style.zIndex = '9999';

  document.body.appendChild(scrollBtn);

  // Show/hide button when scrolling
  window.addEventListener('scroll', () => {
    if (window.scrollY > 250) {
      scrollBtn.style.display = 'block';
    } else {
      scrollBtn.style.display = 'none';
    }
  });

  // Smooth scroll back to top
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ============================
// SHOW ALL FOODS AS JSON
// ============================
const showJsonBtn = document.getElementById('showJsonBtn');
const jsonOutput = document.getElementById('jsonOutput');

showJsonBtn.addEventListener('click', async () => {
  const res = await fetch('/api/foods');
  const data = await res.json();

  jsonOutput.style.display = 'block';
  jsonOutput.textContent = JSON.stringify(data, null, 2);
});
