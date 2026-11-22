/* Category and text search apply together. */
(() => {
  const filters = [...document.querySelectorAll('.filter-btn')];
  const cards = [...document.querySelectorAll('.news-card[data-category]')];
  const select = document.getElementById('news-category');
  const search = document.getElementById('news-search');
  const empty = document.getElementById('news-no-results');

  function showResults() {
    const category = select.value;
    for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === category));
    const term = search.value.trim().toLowerCase();
    for (const card of cards) {
      const matchesCategory = category === 'all' || category === card.dataset.category;
      card.hidden = !matchesCategory || !card.textContent.toLowerCase().includes(term);
    }
    empty.hidden = cards.some(card => !card.hidden);
  }

  for (const filter of filters) {
    filter.addEventListener('click', () => {
      select.value = filter.dataset.filter;
      showResults();
    });
  }
  select.addEventListener('change', showResults);
  search.addEventListener('input', showResults);
  showResults();
})();
