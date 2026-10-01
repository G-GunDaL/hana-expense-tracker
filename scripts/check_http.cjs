async function check() {
  try {
    const res = await fetch('http://127.0.0.1:3000/');
    const text = await res.text();
    console.log('HTTP Status:', res.status, res.statusText);
    console.log('HTML Length:', text.length);
    console.log('Contains Hana FinDash:', text.includes('Hana FinDash'));
    console.log('Contains Pretendard:', text.includes('Pretendard'));
    console.log('Contains manifest.json:', text.includes('manifest.json'));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
check();
