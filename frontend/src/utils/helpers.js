export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getStatusBadge = (status) => {
  const map = {
    active: 'badge-success', inactive: 'badge-danger',
    paid: 'badge-success', pending: 'badge-warning', partial: 'badge-info', overdue: 'badge-danger',
    present: 'badge-success', absent: 'badge-danger', late: 'badge-warning',
  };
  return map[status?.toLowerCase()] || 'badge-info';
};

export const calculateAge = (dob) => {
  if (!dob) return 0;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / 31557600000);
};

export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
