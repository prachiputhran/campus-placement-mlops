// ── PDF.js worker ─────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── Extract text from PDF ─────────────────────────────────────
async function extractText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(it => it.str).join(' ') + '\n';
  }
  return text.toLowerCase();
}

// ── CGPA extractor ────────────────────────────────────────────
function getCGPA(text) {
  // matches "cgpa: 8.14" or "cgpa 8.1"
  const m1 = text.match(/cgpa[\s:]*([0-9]+\.?[0-9]*)/i);
  if (m1) { const v = parseFloat(m1[1]); if (v > 0 && v <= 10) return v; }

  // matches "8.14 / 10" or "8.1/10"
  const m2 = text.match(/([0-9]+\.[0-9]+)\s*\/\s*10/);
  if (m2) { const v = parseFloat(m2[1]); if (v > 0 && v <= 10) return v; }

  // matches percentage like "81%" → convert to 10-pt scale
  const m3 = text.match(/([0-9]{2,3}\.?[0-9]*)\s*%/);
  if (m3) { const v = parseFloat(m3[1]); if (v > 10) return parseFloat((v / 10).toFixed(2)); }

  // matches "score / grade / aggregate" near a decimal number
  const m4 = text.match(/(?:score|grade|gpa|aggregate|marks)[^\d]*([7-9]\.[0-9]+|10\.0)/i);
  if (m4) { const v = parseFloat(m4[1]); if (v > 0 && v <= 10) return v; }

  return 0;
}

// ── Skills list ───────────────────────────────────────────────
const SKILLS = [
  'python', 'java', 'sql', 'docker',
  'machine learning', 'html', 'css', 'javascript',
  'c++', 'c#', 'typescript', 'react', 'nodejs',
  'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'matplotlib',
  'scikit-learn', 'opencv',
  'aws', 'azure', 'gcp', 'git', 'linux',
  'mongodb', 'mysql', 'postgresql', 'redis', 'firebase',
  'flask', 'django', 'fastapi', 'spring',
  'deep learning', 'nlp', 'computer vision',
  'data science', 'data analysis', 'devops', 'cloud computing',
  'power bi', 'tableau', 'excel',
  'mlflow', 'github actions', 'kubernetes', 'terraform',
];

function getSkills(text) {
  return SKILLS.filter(skill => {
    const escaped = skill.replace(/[+.#]/g, '\\$&');
    return new RegExp('\\b' + escaped + '\\b').test(text);
  });
}

// ── Project count ─────────────────────────────────────────────
function getProjects(text) {
  // find the projects section
  const section = text.match(/\bprojects?\b(.*?)(\bexperience\b|\beducation\b|\bskills?\b|\bresearch\b|\bleadership\b|\bcertifi\b|$)/is);
  if (section) {
    const chunk = section[1];

    // count bullet points — each project has ~3 bullets so divide by 3
    const bullets = (chunk.match(/[•\-\*]/g) || []).length;
    if (bullets >= 3) return Math.min(Math.round(bullets / 3), 8);

    // count title-style lines (capitalised, 10+ chars, no bullet at start)
    const titleLines = (chunk.match(/\n\s*[A-Z][A-Za-z ]{8,}\n/g) || []).length;
    if (titleLines > 0) return Math.min(titleLines, 8);
  }

  // last resort: count "project" mentions minus 1 for the heading itself
  const raw = (text.match(/\bproject\b/gi) || []).length;
  return Math.min(Math.max(raw - 1, 0), 5);
}

// ── Internship count ──────────────────────────────────────────
function getInternships(text) {
  const ct = (text.match(/\bintern(ship)?\b|\btrainee\b|\bsummer training\b|\bindustry training\b/gi) || []).length;
  // subtract 1 because the section heading "internships" itself matches
  return Math.min(Math.max(ct - 1, 0), 4);
}

// ── Certification check ───────────────────────────────────────
function hasCertifications(text) {
  const keywords = [
    'certification', 'certificate', 'certified',
    'coursera', 'udemy', 'nptel', 'edx',
    'ibm', 'google', 'microsoft', 'samsung', 'aws',
  ];
  return keywords.some(k => text.includes(k));
}

// ── Gender ────────────────────────────────────────────────────
function getGender(text) {
  if (text.includes('she') || text.includes('her') || text.includes('female')) return 'Female';
  return 'Male';
}

// ── Stream ────────────────────────────────────────────────────
function getStream(text) {
  if (text.includes('computer') || text.includes(' cs ') || text.includes(' it ')) return 'CS';
  if (text.includes('mechanical')) return 'Mechanical';
  if (text.includes('electrical')) return 'Electrical';
  if (text.includes('civil'))      return 'Civil';
  return 'CS';
}

// ── Suggestions engine ────────────────────────────────────────
function getSuggestions(features) {
  const suggestions = [];
  if (features.cgpa < 7)
    suggestions.push('Improve your CGPA above 7');
  if (features.skillsCount < 5)
    suggestions.push('Add more technical skills');
  if (features.projects < 2)
    suggestions.push('Work on more projects');
  if (features.internships < 1)
    suggestions.push('Gain internship experience');
  if (!features.cert)
    suggestions.push('Add certifications');
  return suggestions;
}

// ── Local scoring fallback (when API is offline) ──────────────
function localPredict(features) {
  let score = 0;
  score += (features.cgpa / 10)                        * 40; // max 40
  score += Math.min(features.skills_count / 10, 1)     * 25; // max 25
  score += Math.min(features.projects_count / 4, 1)    * 15; // max 15
  score += Math.min(features.internships_count / 2, 1) * 12; // max 12
  score += features.has_certification                  *  8; // max  8

  const probability = parseFloat(Math.min(score / 100, 0.97).toFixed(2));
  const prediction  = score >= 45 ? 1 : 0;
  return { prediction, probability };
}

// ── API call ──────────────────────────────────────────────────
async function predictFromAPI(features) {
  const response = await fetch('http://127.0.0.1:8000/predict-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('API returned ' + response.status);
  return await response.json();
}

// ── Main function ─────────────────────────────────────────────
async function analyzeResume() {
  const fileInput = document.getElementById('resume');
  const resultDiv = document.getElementById('result');

  if (!fileInput.files.length) {
    alert('Please upload a PDF');
    return;
  }

  // Loading UI
  resultDiv.innerHTML = `
    <div class="loader"></div>
    <p>Analyzing your resume...</p>
  `;

  const file = fileInput.files[0];

  let text;
  try {
    text = await extractText(file);
  } catch (e) {
    resultDiv.innerHTML = `<p style="color:#fc8181">❌ Could not read PDF. Make sure it is a text-based PDF, not a scanned image.</p>`;
    return;
  }

  if (text.trim().length < 50) {
    resultDiv.innerHTML = `<p style="color:#fc8181">❌ PDF appears to be image-based. Please use a text-based PDF resume.</p>`;
    return;
  }

  // Extract all features
  const skillsList = getSkills(text);
  const cgpa       = getCGPA(text);
  const projects   = getProjects(text);
  const interns    = getInternships(text);
  const cert       = hasCertifications(text);

  const features = {
    cgpa:               cgpa,
    skills_count:       skillsList.length,
    projects_count:     projects,
    internships_count:  interns,
    backlogs:           0,
    has_certification:  cert ? 1 : 0,
    gender:             getGender(text),
    stream:             getStream(text),
  };

  console.log('Features extracted:', features);

  // Try API first, fall back to local scoring if offline
  let result;
  try {
    result = await predictFromAPI(features);
    console.log('API result:', result);
  } catch (err) {
    console.warn('API offline, using local scoring:', err.message);
    result = localPredict(features);
  }

  // Build suggestions
  const suggestions = getSuggestions({
    cgpa:        features.cgpa,
    skillsCount: skillsList.length,
    projects:    features.projects_count,
    internships: features.internships_count,
    cert:        cert,
  });

  const confidence    = result.probability ? (result.probability * 100).toFixed(2) : 'N/A';
  const progressWidth = result.probability ? (result.probability * 100) : 0;

  // Render — your original layout, unchanged
  resultDiv.innerHTML = `
    <div class="result-box">

      <div class="${result.prediction == 1 ? 'placed' : 'not-placed'}">
        ${result.prediction == 1 ? '🎉 Placed' : '❌ Not Placed'}
      </div>

      <p><b>Confidence:</b> ${confidence}%</p>

      <div class="progress-bar">
        <div class="progress-fill" style="width:${progressWidth}%"></div>
      </div>

      <p><b>CGPA:</b> ${cgpa > 0 ? cgpa : 'Not detected'}</p>

      <p><b>Skills:</b></p>
      ${skillsList.map(s => `<span class="tag">${s}</span>`).join('')}

      <p><b>Projects:</b> ${features.projects_count}</p>
      <p><b>Internships:</b> ${features.internships_count}</p>

      <div class="suggestions">
        <b>Suggestions:</b>
        <ul>
          ${suggestions.length
            ? suggestions.map(s => `<li>${s}</li>`).join('')
            : '<li style="color:#76e4a7">✅ Strong profile! Keep it up.</li>'}
        </ul>
      </div>

      <canvas id="chart"></canvas>

    </div>
  `;

  // Chart — your original
  setTimeout(() => {
    const ctx = document.getElementById('chart');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['CGPA', 'Skills', 'Projects', 'Internships'],
        datasets: [{
          label: 'Profile Strength',
          data: [
            features.cgpa,
            features.skills_count,
            features.projects_count,
            features.internships_count,
          ],
          backgroundColor: [
            'rgba(99,179,237,0.7)',
            'rgba(118,228,167,0.7)',
            'rgba(246,173,85,0.7)',
            'rgba(252,129,129,0.7)',
          ],
          borderColor: ['#63b3ed','#76e4a7','#f6ad55','#fc8181'],
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: 'rgba(255,255,255,0.6)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { beginAtZero: true, ticks: { color: 'rgba(255,255,255,0.6)' }, grid: { color: 'rgba(255,255,255,0.07)' } }
        }
      }
    });
  }, 100);
}