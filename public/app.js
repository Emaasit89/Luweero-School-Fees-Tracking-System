(function () {
  function drawFallback(canvas, labels, values, color) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.clientWidth;
    const height = canvas.height = Number(canvas.getAttribute('height')) || 180;
    const max = Math.max(...values, 1);
    ctx.clearRect(0, 0, width, height);
    labels.forEach((label, index) => {
      const x = 18 + index * ((width - 36) / labels.length);
      const barWidth = Math.max(16, ((width - 50) / labels.length) - 10);
      const barHeight = (values[index] / max) * (height - 42);
      ctx.fillStyle = color;
      ctx.fillRect(x, height - 24 - barHeight, barWidth, barHeight);
      ctx.fillStyle = '#17211b';
      ctx.font = '12px Arial';
      ctx.fillText(label, x, height - 7);
    });
  }

  const payload = document.getElementById('dashboard-data');
  if (!payload) return;
  const data = JSON.parse(payload.textContent);
  const gradeLabels = data.byGrade.map((row) => row.grade);
  const gradePaid = data.byGrade.map((row) => row.paid);
  const methodLabels = data.methods.map((row) => row.method);
  const methodAmounts = data.methods.map((row) => row.amount);

  if (window.Chart) {
    new Chart(document.getElementById('gradeChart'), {
      type: 'bar',
      data: { labels: gradeLabels, datasets: [{ label: 'Collected', data: gradePaid, backgroundColor: '#166534' }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (value) => 'UGX ' + Number(value).toLocaleString() } } } }
    });
    new Chart(document.getElementById('methodChart'), {
      type: 'doughnut',
      data: { labels: methodLabels, datasets: [{ data: methodAmounts, backgroundColor: ['#166534', '#b7791f', '#1f5f8b'] }] },
      options: { responsive: true }
    });
  } else {
    drawFallback(document.getElementById('gradeChart'), gradeLabels, gradePaid, '#166534');
    drawFallback(document.getElementById('methodChart'), methodLabels, methodAmounts, '#b7791f');
  }
}());
