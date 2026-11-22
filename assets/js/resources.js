const resourceList = document.querySelector('.resource-list');
const resources = Array.from(resourceList.children, row => ({
  row,
  date: row.querySelector('time[datetime]')?.dateTime || ''
}));

resources.sort((a, b) => b.date.localeCompare(a.date));
resourceList.append(...resources.map(resource => resource.row));
