import { Notice, AIAnalysis } from '../types';

export const exportAnalysisToPdf = (notice: Notice, analysis: AIAnalysis) => {
  const printWindow = window.open('', '_blank', 'width=900,height=950');
  if (!printWindow) {
    alert('Tillåt popup-fönster i din webbläsare för att exportera/skriva ut PDF.');
    return;
  }

  const escapeHtml = (unsafe?: string | null) => {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const rolesHtml = (analysis.requestedRoles || [])
    .map((item, idx) => {
      const isObj = typeof item === 'object' && item !== null;
      const roleTitle = isObj ? (item as any).role : `Roll ${idx + 1}`;
      const reqs = isObj ? (item as any).requirements : String(item);
      return `
        <div class="role-card">
          <div class="role-title">👤 ${escapeHtml(roleTitle)}</div>
          <div class="role-reqs">${escapeHtml(reqs)}</div>
        </div>
      `;
    })
    .join('');

  const requiredDocsHtml = (analysis.requiredSubmissionDocuments || [])
    .map(doc => `<li class="doc-item">☑ ${escapeHtml(doc)}</li>`)
    .join('');

  const keyReqsHtml = (analysis.keyRequirements || [])
    .map(req => `<li>${escapeHtml(req)}</li>`)
    .join('');

  const opportunitiesHtml = (analysis.opportunities || [])
    .map(opp => `<li>${escapeHtml(opp)}</li>`)
    .join('');

  const risksHtml = (analysis.risksAndChallenges || [])
    .map(risk => `<li>${escapeHtml(risk)}</li>`)
    .join('');

  const questionsHtml = (analysis.clarificationQuestions || [])
    .map((q, idx) => `<li><strong>${idx + 1}.</strong> ${escapeHtml(q)}</li>`)
    .join('');

  const docSourcesHtml = (analysis.documentSources || [])
    .map(doc => `<span class="source-badge">📄 ${escapeHtml(doc)}</span>`)
    .join('');

  const printHtml = `
    <!DOCTYPE html>
    <html lang="sv">
    <head>
      <meta charset="UTF-8">
      <title>Anbudsanalys - ${escapeHtml(notice.title)}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 24px;
          line-height: 1.5;
          font-size: 13px;
        }
        .header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 16px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header-title h1 {
          margin: 0 0 6px 0;
          font-size: 20px;
          color: #0f172a;
          font-weight: 800;
        }
        .header-title h2 {
          margin: 0;
          font-size: 14px;
          color: #2563eb;
          font-weight: 600;
        }
        .score-box {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 10px 16px;
          text-align: center;
          min-width: 120px;
        }
        .score-value {
          font-size: 24px;
          font-weight: 900;
          color: ${analysis.fitScore >= 70 ? '#15803d' : '#b45309'};
        }
        .score-label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.5px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .card-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 4px;
        }
        .card-value {
          font-size: 12px;
          font-weight: 600;
          color: #0f172a;
        }
        .section {
          margin-bottom: 18px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #1e3a8a;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .summary-box {
          background: #f8fafc;
          border-left: 4px solid #3b82f6;
          padding: 12px;
          border-radius: 0 8px 8px 0;
          font-size: 13px;
          color: #1e293b;
          white-space: pre-line;
        }
        .role-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 8px;
        }
        .role-title {
          font-weight: 700;
          font-size: 12px;
          color: #1e3a8a;
          margin-bottom: 4px;
        }
        .role-reqs {
          font-size: 12px;
          color: #334155;
          white-space: pre-line;
        }
        ul {
          margin: 0;
          padding-left: 18px;
        }
        li {
          margin-bottom: 4px;
          font-size: 12px;
          color: #334155;
        }
        .doc-item {
          list-style: none;
          padding: 4px 0;
          font-weight: 500;
        }
        .source-badge {
          display: inline-block;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 11px;
          margin: 2px 4px 2px 0;
        }
        .badge-verified {
          display: inline-block;
          background: #dcfce7;
          border: 1px solid #86efac;
          color: #166534;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          margin-top: 4px;
        }
        .footer {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 10px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
        .print-btn-bar {
          background: #1e293b;
          color: white;
          padding: 12px 24px;
          margin: -24px -24px 24px -24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-print {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .btn-print:hover {
          background: #1d4ed8;
        }
        @media print {
          .print-btn-bar {
            display: none !important;
          }
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-btn-bar">
        <span>📄 Förhandsgranskning av AI-Anbudsanalys</span>
        <button class="btn-print" onclick="window.print()">🖨️ Spara som PDF / Skriv ut</button>
      </div>

      <div class="header">
        <div class="header-title">
          <h1>ANBUDSANALYS & KRAVPROFIL</h1>
          <h2>${escapeHtml(notice.title)}</h2>
          ${
            analysis.isDocumentGrounded
              ? '<span class="badge-verified">✓ Verifierad mot förfrågningsunderlag</span>'
              : '<span style="font-size:11px; color:#64748b;">Källa: TED Europa sammandrag</span>'
          }
        </div>
        <div class="score-box">
          <div class="score-value">${analysis.fitScore}%</div>
          <div class="score-label">Matchning</div>
        </div>
      </div>

      <!-- Metadata Grid -->
      <div class="grid-2">
        <div class="card">
          <div class="card-label">Upphandlande Myndighet</div>
          <div class="card-value">${escapeHtml(notice.buyer || '-')}</div>
        </div>
        <div class="card">
          <div class="card-label">TED Publikationsnummer</div>
          <div class="card-value">${escapeHtml(notice.publicationNumber || '-')}</div>
        </div>
        <div class="card">
          <div class="card-label">Ort & Land</div>
          <div class="card-value">${escapeHtml(notice.city || 'Ej angiven')}, ${escapeHtml(notice.country || 'Sverige')}</div>
        </div>
        <div class="card">
          <div class="card-label">Sista Anbudsdag (Deadline)</div>
          <div class="card-value" style="color: #dc2626; font-weight: 700;">${escapeHtml(notice.deadline || 'Ej angiven')}</div>
        </div>
      </div>

      <!-- Key Figures Grid -->
      <div class="grid-3">
        <div class="card">
          <div class="card-label">Förväntad omsättning / Värde</div>
          <div class="card-value">${escapeHtml(analysis.estimatedValueOrBudget || notice.estimatedValueFormatted || 'Enligt underlag')}</div>
        </div>
        <div class="card">
          <div class="card-label">Avtalsperiod / Arbetets början-slut</div>
          <div class="card-value">${escapeHtml(analysis.projectDuration || 'Enligt förfrågningsunderlag')}</div>
        </div>
        <div class="card">
          <div class="card-label">Avtalsvillkor</div>
          <div class="card-value">${escapeHtml(analysis.standardContractTerms || 'Standardavtal / ABK09')}</div>
        </div>
      </div>

      <!-- Document sources -->
      ${
        analysis.documentSources && analysis.documentSources.length > 0
          ? `
        <div class="section">
          <div class="section-title">📁 Granskade förfrågningshandlingar (${analysis.documentSources.length} st)</div>
          <div>${docSourcesHtml}</div>
        </div>
      `
          : ''
      }

      <!-- Executive Summary -->
      <div class="section">
        <div class="section-title">📝 Sammanfattning av uppdraget</div>
        <div class="summary-box">${escapeHtml(analysis.summary)}</div>
      </div>

      <!-- Requested roles -->
      ${
        rolesHtml
          ? `
        <div class="section">
          <div class="section-title">👥 Eftersökta roller & Kompetenskrav</div>
          <div>${rolesHtml}</div>
        </div>
      `
          : ''
      }

      <!-- Submission Documents -->
      ${
        requiredDocsHtml
          ? `
        <div class="section">
          <div class="section-title">📦 Handlingar & Bilagor som ska lämnas in</div>
          <ul style="list-style:none; padding-left:0;">${requiredDocsHtml}</ul>
        </div>
      `
          : ''
      }

      <!-- Key Requirements & Opportunities Grid -->
      <div class="grid-2">
        ${
          keyReqsHtml
            ? `
          <div class="section">
            <div class="section-title">🎯 Viktiga krav & Kvalificering</div>
            <ul>${keyReqsHtml}</ul>
          </div>
        `
            : ''
        }
        ${
          opportunitiesHtml
            ? `
          <div class="section">
            <div class="section-title">💡 Möjligheter & Styrkor</div>
            <ul>${opportunitiesHtml}</ul>
          </div>
        `
            : ''
        }
      </div>

      <!-- Risks & Strategy Grid -->
      <div class="grid-2">
        ${
          risksHtml
            ? `
          <div class="section">
            <div class="section-title">⚠️ Risker & Utmaningar</div>
            <ul>${risksHtml}</ul>
          </div>
        `
            : ''
        }
        ${
          analysis.recommendedBidStrategy
            ? `
          <div class="section">
            <div class="section-title">🚀 Rekommenderad Anbudsstrategi</div>
            <div style="font-size:12px; color:#334155;">${escapeHtml(analysis.recommendedBidStrategy)}</div>
          </div>
        `
            : ''
        }
      </div>

      <!-- Questions -->
      ${
        questionsHtml
          ? `
        <div class="section">
          <div class="section-title">❓ Frågor att ställa till upphandlaren</div>
          <ul style="list-style:none; padding-left:0;">${questionsHtml}</ul>
        </div>
      `
          : ''
      }

      <!-- Links -->
      <div class="section" style="font-size: 11px; color: #64748b; background: #f8fafc; padding: 10px; border-radius: 8px;">
        <div><strong>TED-kungörelse:</strong> ${escapeHtml(notice.links?.tedHtml || 'TED Europa')}</div>
        ${notice.links?.submission ? `<div><strong>Anbudsinlämning:</strong> ${escapeHtml(notice.links.submission)}</div>` : ''}
      </div>

      <div class="footer">
        <span>TED Upphandlingsbevakare — AI-Anbudsanalys</span>
        <span>Utskriven: ${new Date().toLocaleString('sv-SE')}</span>
      </div>

      <script>
        // Auto open print dialog after load
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
};
