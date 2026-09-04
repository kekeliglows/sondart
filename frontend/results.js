import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.esm.js';

export function renderResults(data, containerId = 'results-container') {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container avec l'id ${containerId} introuvable.`);
  }

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  data.forEach((questionResult, index) => {
    const section = document.createElement('section');
    section.className = 'survey-result-section';

    const title = document.createElement('h2');
    title.textContent = `Question ${index + 1}: ${questionResult.question_texte}`;
    section.appendChild(title);

    if (!questionResult.options || questionResult.options.length === 0) {
      const noData = document.createElement('p');
      noData.textContent = 'Aucune réponse enregistrée pour cette question.';
      section.appendChild(noData);
      container.appendChild(section);
      return;
    }

    const canvas = document.createElement('canvas');
    const canvasId = `chart-${questionResult.question_id}`;
    canvas.id = canvasId;
    section.appendChild(canvas);
    container.appendChild(section);

    const labels = questionResult.options.map((option) => option.label);
    const counts = questionResult.options.map((option) => option.count);

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Nombre de réponses',
            data: counts,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              autoSkip: false,
            },
          },
          y: {
            beginAtZero: true,
            precision: 0,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  });
}
