import BASE_URL from '../../../../backend/server/config';

export async function getHolidays() {
  const res = await fetch(`${BASE_URL}/holiday_list/holiday_list_get.php`);
  const data = await res.json();
  console.log('GET holidays response:', data); // ✅ Log fetched data
  if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch holidays');
  return data.data;
}

export async function createHoliday(holiday) {
  const res = await fetch(`${BASE_URL}/holiday_list/holiday_list_create.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(holiday),
  });
  return res.json();
}

export async function updateHoliday(holiday) {
  const res = await fetch(`${BASE_URL}/holiday_list/holiday_list_update.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(holiday),
  });
  return res.json();
}

export async function deleteHoliday(id) {
  const res = await fetch(`${BASE_URL}/holiday_list/holiday_list_delete.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holiday_id: id }),
  });
  return res.json();
}
