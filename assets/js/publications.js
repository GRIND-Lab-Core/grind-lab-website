(() => {
  const form = document.getElementById('pub-filters');
  const type = document.getElementById('pub-type');
  const year = document.getElementById('pub-year');
  const query = document.getElementById('pub-query');
  const count = document.getElementById('pub-count');
  const empty = document.getElementById('pub-empty');
  const additional = document.getElementById('pub-additional');
  const additionalCount = document.getElementById('additional-count');
  const groups = Array.from(document.querySelectorAll('.pub-year'), group => ({
    group,
    additional: additional.contains(group),
    records: Array.from(group.querySelectorAll('.pub-record'), row => ({
      row,
      text: (row.textContent + ' ' + (row.dataset.searchAlias || '')).toLowerCase()
    }))
  }));

  function filterPublications() {
    const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let cvMatches = 0;
    let otherMatches = 0;
    for (const { group, records, additional: isAdditional } of groups) {
      const allowedYear = !year.value || group.dataset.year === year.value;
      let matches = 0;
      for (const { row, text } of records) {
        const visible = allowedYear && (!type.value || row.dataset.type === type.value)
          && words.every(word => text.includes(word));
        row.hidden = !visible;
        if (visible) matches++;
      }
      group.hidden = matches === 0;
      if (isAdditional) otherMatches += matches;
      else cvMatches += matches;
    }
    count.textContent = cvMatches + (cvMatches === 1 ? ' CV entry' : ' CV entries')
      + ' · ' + otherMatches + (otherMatches === 1 ? ' additional work' : ' additional works');
    additionalCount.textContent = '(' + otherMatches + ')';
    additional.hidden = otherMatches === 0;
    additional.open = Boolean(otherMatches && (type.value || year.value || words.length));
    empty.hidden = cvMatches + otherMatches !== 0;
  }

  form.addEventListener('input', filterPublications);
  form.addEventListener('change', filterPublications);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', () => requestAnimationFrame(filterPublications));
  form.hidden = false;
  window.addEventListener('pageshow', filterPublications);
  filterPublications();
})();
