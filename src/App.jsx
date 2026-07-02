import { useState, useRef, useEffect } from 'react';
import { usePersistentState, usePersistentFlag } from './usePersistentState.js';
import {
  IconHome, IconFilePlus, IconFiles, IconBuilding, IconUsers, IconHelmet,
  IconTransfer, IconFileText, IconChevronDown, IconChevronRight, IconArrowRight,
  IconArrowLeft, IconSparkle, IconInfo, IconDownload, IconShare, IconCopy,
  IconRefresh, IconSave, IconPlus, IconUpload, IconCheck,
} from './Icons.jsx';

// ── Constantes ────────────────────────────────────────────────────────────────
const TIPO_LABEL = {
  previa:       'REUNIÓN PREVIA AL COMIENZO DE LA OBRA',
  contratista:  'REUNIÓN INICIAL CON LA EMPRESA CONTRATISTA',
  subcontrata:  'REUNIÓN POR INICIO DE TRABAJOS EN OBRA DE EMPRESA SUBCONTRATISTA',
  coordinacion: 'REUNIÓN PARA COORDINAR ACTIVIDADES EN LA OBRA',
};
const TIPO_SUB = {
  previa:       '(promotor, dirección facultativa y coordinador)',
  contratista:  '(contratista y coordinador)',
  subcontrata:  '',
  coordinacion: '',
};
const TIPO_SHORT = {
  previa:'Reunión previa', contratista:'Inicial contratista',
  subcontrata:'Inicio tajo', coordinacion:'Coordinación',
};
const SPINNERS = [
  'Analizando normativa vigente...',
  'Identificando riesgos del tajo...',
  'Generando instrucciones de seguridad...',
  'Redactando el acta...',
];

// ── Generador de DOCX ─────────────────────────────────────────────────────────
async function exportarDocx(actaTxt, obraActiva, css) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          AlignmentType, WidthType, BorderStyle, HeadingLevel,
          ShadingType } = await import('docx');
  const { saveAs } = await import('file-saver');

  const o = obraActiva || {};

  // Paleta de colores corporativa
  const BLUE    = '1B3A5C';
  const ORANGE  = 'E8620A';
  const BGCELL  = 'F0F4F8';

  const borderNone = {
    top:    { style: BorderStyle.NONE, size: 0 },
    bottom: { style: BorderStyle.NONE, size: 0 },
    left:   { style: BorderStyle.NONE, size: 0 },
    right:  { style: BorderStyle.NONE, size: 0 },
  };
  const borderThin = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    left:   { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    right:  { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  };

  // Fila de la tabla de obra
  const obraRow = (label, value) => new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        borders: borderThin,
        shading: { type: ShadingType.SOLID, color: BGCELL, fill: BGCELL },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: 18, font: 'Arial' })],
        })],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        borders: borderThin,
        children: [new Paragraph({
          children: [new TextRun({ text: value || '—', size: 18, font: 'Arial' })],
        })],
      }),
    ],
  });

  // Parsear el texto del acta en líneas → párrafos Word formateados
  const lines = actaTxt.split('\n');
  const contentParagraphs = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      contentParagraphs.push(new Paragraph({ children: [], spacing: { after: 80 } }));
      continue;
    }

    // Detectar secciones en mayúsculas (ANTECEDENTES:, ORDEN DEL DÍA:, etc.)
    const isSection = /^[A-ZÁÉÍÓÚÜÑ\s\d\.]+:?\s*$/.test(line) && line.length < 80;
    // Detectar numeración de puntos del orden del día (1., 2., etc.)
    const isNumbered = /^\d+\.\s+/.test(line);
    // Detectar guiones / viñetas
    const isBullet = /^[-•·]\s+/.test(line) || /^[a-z]\)\s+/i.test(line);
    // Detectar línea de firma
    const isFirma = /^Fdo\.|^El (coordinador|jefe|recurso|encargado|promotor|director)/i.test(line);

    if (isSection) {
      contentParagraphs.push(new Paragraph({
        children: [new TextRun({ text: line, bold: true, size: 20, color: BLUE, font: 'Arial' })],
        spacing: { before: 240, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE } },
      }));
    } else if (isNumbered) {
      contentParagraphs.push(new Paragraph({
        children: [new TextRun({ text: line, size: 19, font: 'Arial', color: '111827' })],
        spacing: { before: 120, after: 40 },
        indent: { left: 360 },
      }));
    } else if (isBullet) {
      contentParagraphs.push(new Paragraph({
        children: [new TextRun({ text: line, size: 18, font: 'Arial' })],
        spacing: { before: 60, after: 40 },
        indent: { left: 720, hanging: 360 },
      }));
    } else if (isFirma) {
      contentParagraphs.push(new Paragraph({
        children: [new TextRun({ text: line, size: 18, font: 'Arial', bold: false })],
        spacing: { before: 200, after: 40 },
      }));
    } else {
      contentParagraphs.push(new Paragraph({
        children: [new TextRun({ text: line, size: 18, font: 'Arial' })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 60, after: 60 },
      }));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 18 },
          paragraph: { spacing: { line: 280 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1134, bottom: 907, left: 1247, right: 1134 }, // ~2cm márgenes
        },
      },
      children: [
        // ── Cabecera azul ───────────────────────────────────────────────────
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({
            children: [
              new TableCell({
                borders: borderNone,
                shading: { type: ShadingType.SOLID, color: BLUE, fill: BLUE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: css.nombre || 'Coordinador SyS', bold: true, size: 18, color: 'FFFFFF', font: 'Arial' })], spacing: { before: 80, after: 20 } }),
                  new Paragraph({ children: [new TextRun({ text: css.cargo || 'arquitecto técnico', size: 16, color: 'DDDDDD', font: 'Arial' })], spacing: { before: 0, after: 80 } }),
                ],
              }),
              new TableCell({
                borders: borderNone,
                shading: { type: ShadingType.SOLID, color: BLUE, fill: BLUE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'coordinación de seguridad y salud en fase de ejecución', italics: true, size: 16, color: 'DDDDDD', font: 'Arial' })],
                    spacing: { before: 120, after: 80 },
                  }),
                ],
              }),
            ],
          })],
        }),

        // ── Franja naranja ──────────────────────────────────────────────────
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({
            children: [new TableCell({
              borders: borderNone,
              shading: { type: ShadingType.SOLID, color: ORANGE, fill: ORANGE },
              children: [new Paragraph({ children: [new TextRun({ text: ' ', size: 8 })] })],
            })],
          })],
        }),
        new Paragraph({ children: [], spacing: { after: 120 } }),

        // ── Tabla de datos de la obra ────────────────────────────────────────
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            obraRow('obra:', o.nombre),
            obraRow('situación:', o.situacion),
            obraRow('promotor:', o.promotor),
            obraRow('dirección facultativa:', o.df),
            obraRow('coordinador SyS:', css.nombre),
            obraRow('contratista:', o.contratista),
          ],
        }),
        new Paragraph({ children: [], spacing: { after: 200 } }),

        // ── Contenido del acta ───────────────────────────────────────────────
        ...contentParagraphs,

        // ── Pie de página ────────────────────────────────────────────────────
        new Paragraph({ children: [], spacing: { before: 400 } }),
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
          children: [new TextRun({
            text: `${css.nombre || '—'} — Coordinador de Seguridad y Salud — ${new Date().toLocaleDateString('es-ES')}`,
            size: 14, color: '999999', font: 'Arial',
          })],
          spacing: { before: 80 },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const fecha = new Date().toISOString().slice(0, 10);
  saveAs(blob, `acta-sys-${fecha}.docx`);
}

// ── Exportar PDF (ventana de impresión) ───────────────────────────────────────
function buildPDFHTML(txt, obraActiva, css) {
  const o = obraActiva || {};
  const filas = [
    ['obra:', o.nombre], ['situación:', o.situacion], ['promotor:', o.promotor],
    ['dirección facultativa:', o.df], ['coordinador SyS:', css.nombre], ['contratista:', o.contratista],
  ].map(([l, v]) =>
    `<tr><td style="border:.5px solid #ccc;padding:4px 8px;font-weight:bold;background:#f0f4f8;width:36%;font-size:8.5pt">${l}</td>
         <td style="border:.5px solid #ccc;padding:4px 8px;font-size:8.5pt">${v || '—'}</td></tr>`
  ).join('');

  // Formatear el cuerpo del acta con estilos
  const body = txt.split('\n').map(raw => {
    const line = raw.trim();
    if (!line) return '<p style="margin:4px 0"></p>';
    const isSection = /^[A-ZÁÉÍÓÚÜÑ\s\d\.]+:?\s*$/.test(line) && line.length < 80;
    const isNum     = /^\d+\.\s+/.test(line);
    const isBullet  = /^[-•]\s+/.test(line) || /^[a-z]\)\s+/i.test(line);
    const isFirma   = /^Fdo\.|^El (coordinador|jefe|recurso|encargado|promotor|director)/i.test(line);

    if (isSection)
      return `<p style="font-weight:bold;font-size:9.5pt;color:#1B3A5C;margin:14px 0 4px;border-bottom:1.5px solid #1B3A5C;padding-bottom:2px">${line}</p>`;
    if (isNum)
      return `<p style="margin:8px 0 2px;padding-left:18px;font-size:8.5pt">${line}</p>`;
    if (isBullet)
      return `<p style="margin:3px 0;padding-left:28px;font-size:8.5pt">${line}</p>`;
    if (isFirma)
      return `<p style="margin:14px 0 2px;font-size:8.5pt">${line}</p>`;
    return `<p style="margin:4px 0;text-align:justify;font-size:8.5pt;line-height:1.55">${line}</p>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Acta SyS</title>
<style>
  @page{margin:22mm 18mm 18mm 22mm}
  body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#111;margin:0}
  @media print{.noprint{display:none}}
</style></head><body>
<div class="noprint" style="position:fixed;top:10px;right:10px;z-index:99">
  <button onclick="window.print()" style="padding:9px 18px;background:#1B3A5C;color:#fff;border:none;border-radius:7px;font-size:13px;cursor:pointer;font-weight:600">
    🖨 Imprimir / Guardar PDF
  </button>
</div>
<div style="background:#1B3A5C;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
  <div>
    <div style="font-weight:bold;font-size:9.5pt">${css.nombre || 'Coordinador SyS'}</div>
    <div style="font-size:8pt;opacity:.8">${css.cargo || 'arquitecto técnico'}</div>
  </div>
  <div style="font-style:italic;font-size:8pt;opacity:.85">coordinación de seguridad y salud en fase de ejecución</div>
</div>
<div style="height:4px;background:repeating-linear-gradient(90deg,#E8620A 0,#E8620A 13px,#111 13px,#111 26px);margin-bottom:14px"></div>
<table style="width:100%;border-collapse:collapse;margin-bottom:18px">${filas}</table>
${body}
<div style="margin-top:36px;border-top:.5px solid #ccc;padding-top:6px;font-size:7pt;color:#999">
  ${css.nombre || '—'} — Coordinador de Seguridad y Salud — ${new Date().toLocaleDateString('es-ES')}
</div>
</body></html>`;
}

// ── PROMPT ─────────────────────────────────────────────────────────────────────
function buildPrompt({ tipoActa, wFecha, wEmpresa, wTajo, wAsist, wTajos, wIncid, pss, css, o }) {
  return `Eres el coordinador de seguridad y salud "${css.nombre || 'Manuel Sánchez Medina'}" (${css.cargo || 'arquitecto técnico'}), experto en normativa española de prevención de riesgos laborales en construcción.

DATOS DE LA OBRA:
- Obra: ${o.nombre || '—'}
- Situación: ${o.situacion || '—'}
- Promotor: ${o.promotor || '—'}
- Dirección Facultativa: ${o.df || '—'}
- Coordinador S&S: ${css.nombre || '—'} (${css.cargo || '—'})${css.tel ? ' · Tel: ' + css.tel : ''}
- Contratista: ${o.contratista || '—'}

TIPO DE ACTA: ${TIPO_LABEL[tipoActa] || tipoActa} ${TIPO_SUB[tipoActa] || ''}
Fecha: ${wFecha} — Lugar de la reunión: sede de la obra
Empresa/tajo convocado: ${wEmpresa || '—'} — Tajo: ${wTajo || '—'}
Asistentes: ${wAsist || '—'}
Trabajos actualmente en ejecución en obra: ${wTajos || 'No especificado'}
Riesgos singulares / aspectos especiales / incidencias: ${wIncid || 'Sin incidencias previas reseñables'}
${pss ? '\nEXTRACTO DEL PSS APROBADO:\n' + pss.slice(0, 1500) : ''}

GENERA EL ACTA COMPLETA DE SEGURIDAD Y SALUD siguiendo EXACTAMENTE esta estructura y formato. Usa texto plano (sin asteriscos, sin markdown, sin almohadillas). Usa MAYÚSCULAS para los títulos de sección. Separa cada sección con una línea en blanco.

═══════════════════════════════════════════════════════
ENCABEZAMIENTO
Redacta una cabecera con los datos de la obra en formato tabla de texto:
  obra:                    [nombre]
  situación:               [dirección]
  promotor:                [promotor]
  dirección facultativa:   [df]
  coordinador SyS:         [nombre css]
  contratista:             [contratista]
═══════════════════════════════════════════════════════

TÍTULO: "${TIPO_LABEL[tipoActa] || tipoActa} ${TIPO_SUB[tipoActa] || ''}"

En [municipio (provincia)], [fecha completa escrita]

ASISTENTES:

[Lista de asistentes en formato dos columnas: nombre a la izquierda, cargo a la derecha. Un asistente por línea]

ANTECEDENTES:

[Párrafo de motivación de la reunión. Cita el artículo 9 del R.D. 1627/1997 y el artículo 4 del R.D. 171/2004 según corresponda. 3-4 líneas máximo]

ORDEN DEL DÍA:

1. [primer punto]
2. [segundo punto]
3. [...]

[Para cada punto del orden del día, desarrollar así:]

1. TÍTULO DEL PUNTO EN MAYÚSCULAS.

[Desarrollo del punto: mínimo 4-6 líneas por punto. Para puntos de seguridad incluir:
- Riesgos específicos identificados para el tajo (caídas al mismo/distinto nivel, golpes, atrapamientos, riesgo eléctrico, etc.)
- Medidas preventivas concretas
- EPIs obligatorios con especificación técnica (casco EPI categoría II, arnés EN 361, etc.)
- Referencias normativas exactas (artículos concretos de RD 1627/1997, LPRL, RD 171/2004)
Para actas de coordinación añadir: distribución de zonas de trabajo para evitar interferencias]

[Si hay más puntos, continuar con la misma estructura]

RUEGOS Y PREGUNTAS:

[Dejar espacio en blanco con texto: "(Sin ruegos ni preguntas / espacio para anotaciones en el acta original)"]

CONCLUSIONES:

[Párrafo de cierre: los asistentes declaran conocer y comprometerse a aplicar las instrucciones. Cita el artículo 15.1.i de la Ley 31/1995 de Prevención de Riesgos Laborales]

FIRMAS:

[Para cada asistente, en dos columnas pares:]
El/La [rol],                              El/La [rol],
[empresa si aplica]                        [empresa si aplica]



Fdo. [nombre]                             Fdo. [nombre]`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [visited,  setVisited]  = usePersistentFlag('visited');
  const [obras,    setObras]    = usePersistentState('obras',   []);
  const [actas,    setActas]    = usePersistentState('actas',   []);
  const [obraIdx,  setObraIdx]  = usePersistentState('obraIdx', -1);
  const [css,      setCss]      = usePersistentState('css', { nombre: '', cargo: 'arquitecto técnico', tel: '' });

  const [screen,   setScreen]   = useState('home');
  const [toast,    setToast]    = useState('');

  // Wizard
  const [wizStep,  setWizStep]  = useState(0);
  const [tipoActa, setTipoActa] = useState('');
  const [wFecha,   setWFecha]   = useState(() => new Date().toISOString().slice(0, 10));
  const [wEmpresa, setWEmpresa] = useState('');
  const [wTajo,    setWTajo]    = useState('');
  const [wAsist,   setWAsist]   = useState('');
  const [wTajos,   setWTajos]   = useState('');
  const [wIncid,   setWIncid]   = useState('');
  const [actaTxt,  setActaTxt]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [spinnerMsg, setSpinnerMsg] = useState(SPINNERS[0]);
  const [exportingDocx, setExportingDocx] = useState(false);

  // Modales
  const [modal,      setModal]      = useState(null);
  const [detailActa, setDetailActa] = useState(null);

  // Nueva obra form
  const [noNombre, setNoNombre] = useState('');
  const [noDir,    setNoDir]    = useState('');
  const [noProm,   setNoProm]   = useState('');
  const [noDf,     setNoDf]     = useState('');
  const [noCont,   setNoCont]   = useState('');

  // PSS — guardado por índice de obra en localStorage
  function getPSS(idx) {
    try { return JSON.parse(localStorage.getItem(`cssObras_pss_${idx}`) || 'null') || ''; }
    catch { return ''; }
  }
  function savePSS(idx, texto) {
    try { localStorage.setItem(`cssObras_pss_${idx}`, JSON.stringify(texto)); } catch {}
  }
  const pssActual = obraIdx >= 0 ? getPSS(obraIdx) : '';

  // Install PWA
  const deferredInstall = useRef(null);
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => {
    const fn = (e) => { e.preventDefault(); deferredInstall.current = e; setCanInstall(true); };
    window.addEventListener('beforeinstallprompt', fn);
    return () => window.removeEventListener('beforeinstallprompt', fn);
  }, []);
  function installPWA() {
    if (!deferredInstall.current) { showToast('Usa el menú ⋮ del navegador para instalar'); return; }
    deferredInstall.current.prompt();
    deferredInstall.current.userChoice.then((r) => {
      if (r.outcome === 'accepted') showToast('✓ Instalando app...');
      deferredInstall.current = null; setCanInstall(false);
    });
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const obraActiva = obraIdx >= 0 ? obras[obraIdx] : null;

  // ── Obras ────────────────────────────────────────────────────────────────
  function crearObra() {
    if (!noNombre.trim()) { showToast('⚠ Introduce el nombre de la obra'); return; }
    const nueva = { nombre: noNombre.trim(), situacion: noDir.trim(), promotor: noProm.trim(), df: noDf.trim(), contratista: noCont.trim() };
    const next = [...obras, nueva];
    setObras(next);
    setObraIdx(next.length - 1);
    setNoNombre(''); setNoDir(''); setNoProm(''); setNoDf(''); setNoCont('');
    setModal(null);
    showToast('✓ Obra creada y seleccionada');
  }
  function selObra(idx) { setObraIdx(idx); setModal(null); showToast('✓ Obra activa: ' + obras[idx].nombre); }

  // ── PSS por obra ──────────────────────────────────────────────────────────
  function loadPSS(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const meta = `(PSS: ${f.name} · ${Math.round(f.size / 1024)} KB — cargado ${new Date().toLocaleDateString('es-ES')})`;
      savePSS(obraIdx, meta);
      showToast('✓ PSS guardado para esta obra');
    };
    reader.readAsText(f);
  }
  function deletePSS() { savePSS(obraIdx, ''); showToast('PSS eliminado de esta obra'); }

  // ── Wizard ────────────────────────────────────────────────────────────────
  function startWiz(tipo) {
    setTipoActa(tipo);
    setWFecha(new Date().toISOString().slice(0, 10));
    setWEmpresa(''); setWTajo(''); setWAsist(''); setWTajos(''); setWIncid('');
    setActaTxt('');
    setScreen('nueva');
    setWizStep(1);
  }
  function goStep(n) {
    if (n === 1 && !tipoActa) { showToast('⚠ Selecciona el tipo de acta'); return; }
    setWizStep(n);
    if (n === 3) generarActa();
  }

  async function generarActa() {
    setLoading(true); setActaTxt('');
    let si = 0;
    const iv = setInterval(() => setSpinnerMsg(SPINNERS[si++ % SPINNERS.length]), 1800);
    const o   = obraActiva || {};
    const pss = getPSS(obraIdx);
    const prompt = buildPrompt({ tipoActa, wFecha, wEmpresa, wTajo, wAsist, wTajos, wIncid, pss, css, o });

    try {
      const r = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(`HTTP ${r.status} — ${d?.error?.message || JSON.stringify(d)}`);
      const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
      setActaTxt(txt || 'Error al generar el acta.');
    } catch (e) {
      setActaTxt(
        'Error al generar el acta.\n\n' +
        'Detalle: ' + e.message + '\n\n' +
        'Revisa Vercel → Settings → Environment Variables → GEMINI_API_KEY y haz Redeploy.\n' +
        'Si el error menciona "quota" o "429", has alcanzado el límite diario gratuito; vuelve a intentarlo mañana.'
      );
    }
    clearInterval(iv); setLoading(false);
  }

  async function regenerar() { await generarActa(); }

  function guardarActa() {
    if (!actaTxt) return;
    const acta = { id: Date.now(), tipo: tipoActa, obraIdx, fecha: wFecha, empresa: wEmpresa, tajo: wTajo, texto: actaTxt };
    setActas([acta, ...actas]);
    showToast('✓ Acta guardada');
    setTimeout(() => setScreen('actas'), 900);
  }

  async function handleExportDocx(txt) {
    if (!txt) return;
    setExportingDocx(true);
    try {
      await exportarDocx(txt, obraActiva, css);
      showToast('✓ Documento Word descargado');
    } catch (e) {
      showToast('Error al generar Word: ' + e.message);
    }
    setExportingDocx(false);
  }

  function exportarPDF(txt) {
    if (!txt) return;
    const win = window.open('', '_blank');
    if (!win) { showToast('⚠ Permite ventanas emergentes para exportar PDF'); return; }
    win.document.write(buildPDFHTML(txt, obraActiva, css));
    win.document.close();
  }

  function copiarTexto(txt) {
    if (!txt) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(() => showToast('✓ Texto copiado al portapapeles'));
    } else {
      const ta = document.createElement('textarea'); ta.value = txt;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); showToast('✓ Texto copiado');
    }
  }
  async function compartirTexto(txt) {
    if (!txt) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'Acta SyS — ' + (obraActiva?.nombre || 'Obra'), text: txt }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    copiarTexto(txt);
  }

  const empSet = new Set(actas.filter(a => a.obraIdx === obraIdx && a.empresa).map(a => a.empresa));

  // ── Botones de exportación reutilizables ──────────────────────────────────
  function ExportButtons({ txt }) {
    return (
      <>
        <button className="btn primary" onClick={() => exportarPDF(txt)}>
          <IconDownload />Exportar PDF
        </button>
        <button className="btn primary" style={{ background: '#2563EB' }}
          onClick={() => handleExportDocx(txt)} disabled={exportingDocx}>
          <IconDownload />{exportingDocx ? 'Generando Word...' : 'Exportar Word (.docx)'}
        </button>
        <button className="btn secondary" onClick={() => compartirTexto(txt)}><IconShare />Compartir</button>
        <button className="btn secondary" onClick={() => copiarTexto(txt)}><IconCopy />Copiar texto</button>
      </>
    );
  }

  // ── Pantalla de bienvenida ────────────────────────────────────────────────
  if (!visited) {
    return (
      <div id="screen-welcome">
        <div className="welcome-icon">🦺</div>
        <h1>CSS Obras</h1>
        <div className="welcome-strip" />
        <p>Coordinación de Seguridad y Salud<br />en fase de ejecución.<br />Genera actas profesionales con IA.</p>
        <button className="btn primary" style={{ maxWidth: 280, fontSize: 15, padding: 14 }} onClick={() => setVisited(true)}>
          Comenzar
        </button>
      </div>
    );
  }

  // ── APP ───────────────────────────────────────────────────────────────────
  return (
    <div id="app-shell">
      <div className="topbar">
        <span style={{ fontSize: 21 }}>🦺</span>
        <div className="topbar-title">CSS Obras</div>
        <span className="topbar-badge">S&amp;S</span>
      </div>
      <div className="obra-strip" />

      <div className="screens">

        {/* ══ HOME ══ */}
        {screen === 'home' && (
          <div className="screen">
            {canInstall && (
              <div className="install-banner">
                <h3>📲 Instalar como app</h3>
                <p>Añade CSS Obras a tu pantalla de inicio para acceder sin navegador.</p>
                <button onClick={installPWA}>Instalar app</button>
              </div>
            )}
            <div className="obra-sel" onClick={() => setModal('obras')}>
              <div>
                <div className="obra-sel-name">{obraActiva ? obraActiva.nombre : 'Sin obra seleccionada'}</div>
                <div className="obra-sel-sub">
                  {obraActiva ? `${obraActiva.contratista || '—'} · ${obraActiva.situacion || '—'}` : 'Pulsa para seleccionar o añadir obra'}
                </div>
              </div>
              <IconChevronDown width={16} height={16} stroke="var(--muted)" />
            </div>
            <div className="stats">
              <div className="stat"><div className="stat-n">{actas.length}</div><div className="stat-l">Actas generadas</div></div>
              <div className="stat"><div className="stat-n">{empSet.size}</div><div className="stat-l">Empresas en obra</div></div>
            </div>
            <div className="sh">Generar nueva acta</div>
            <div className="card">
              <ListItem icon={<IconUsers />}    color="blue"   title="Reunión previa al inicio"    sub="Promotor, DF y coordinador"        onClick={() => startWiz('previa')} />
              <ListItem icon={<IconBuilding />} color="blue"   title="Reunión inicial contratista" sub="Instrucciones empresa principal"    onClick={() => startWiz('contratista')} />
              <ListItem icon={<IconHelmet />}   color="orange" title="Inicio tajo / subcontrata"   sub="Nueva empresa o tajo en obra"      onClick={() => startWiz('subcontrata')} />
              <ListItem icon={<IconTransfer />} color="orange" title="Coordinación de actividades" sub="Tajos concurrentes simultáneos"    onClick={() => startWiz('coordinacion')} />
            </div>
            <div className="sh">Últimas actas</div>
            <div className="card">
              {actas.length === 0
                ? <EmptyMsg text="Aún no hay actas. Pulsa en una opción de arriba." />
                : actas.slice(0, 3).map((a, i) => (
                    <ActaRow key={a.id} acta={a} onClick={() => { setDetailActa(a); setModal('detail'); }} />
                  ))
              }
            </div>
          </div>
        )}

        {/* ══ NUEVA ACTA ══ */}
        {screen === 'nueva' && (
          <div className="screen">
            <div className="step-bar">
              {[0,1,2,3].map(i => (
                <div key={i} className={`step-dot ${i < wizStep ? 'done' : ''} ${i === wizStep ? 'active' : ''}`} />
              ))}
            </div>

            {wizStep === 0 && (
              <div className="wstep">
                <h2>Tipo de acta</h2>
                <p className="wsub">¿Qué reunión quieres documentar?</p>
                <div className="chips">
                  {Object.entries({ previa:'Reunión previa inicio obra', contratista:'Inicial contratista', subcontrata:'Inicio tajo / subcontrata', coordinacion:'Coordinación actividades' }).map(([k, lbl]) => (
                    <div key={k} className={`chip ${tipoActa === k ? 'sel' : ''}`} onClick={() => setTipoActa(k)}>{lbl}</div>
                  ))}
                </div>
                <button className="btn primary" onClick={() => goStep(1)}><IconArrowRight />Continuar</button>
              </div>
            )}

            {wizStep === 1 && (
              <div className="wstep">
                <h2>Datos de la reunión</h2>
                <p className="wsub">Fecha, empresa implicada y asistentes</p>
                <label className="lbl">Fecha de la reunión</label>
                <input type="date" value={wFecha} onChange={e => setWFecha(e.target.value)} />
                <label className="lbl">Empresa / subcontrata</label>
                <input type="text" value={wEmpresa} onChange={e => setWEmpresa(e.target.value)} placeholder="Ej: Excavaciones Benalvalle SL" />
                <label className="lbl">Fase de obra o tajo</label>
                <input type="text" value={wTajo} onChange={e => setWTajo(e.target.value)} placeholder="Ej: Movimiento de tierras" />
                <label className="lbl">Asistentes — nombre y cargo, uno por línea</label>
                <textarea rows={4} value={wAsist} onChange={e => setWAsist(e.target.value)}
                  placeholder={'D. Ignacio Pastor García — Jefe de obra\nD. José A. Romero Montero — Recurso preventivo\nD. Pedro Benítez Muñoz — Encargado S&S subcontrata'} />
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn secondary" style={{ marginTop:0 }} onClick={() => goStep(0)}><IconArrowLeft />Atrás</button>
                  <button className="btn primary"   style={{ marginTop:0 }} onClick={() => goStep(2)}><IconArrowRight />Continuar</button>
                </div>
              </div>
            )}

            {wizStep === 2 && (
              <div className="wstep">
                <h2>Contexto de obra</h2>
                <p className="wsub">La IA usa estos datos para instrucciones y referencias normativas precisas</p>
                <label className="lbl">Trabajos actualmente en ejecución (todos los tajos)</label>
                <textarea value={wTajos} onChange={e => setWTajos(e.target.value)}
                  placeholder="Ej: Cimentación, ferralla, hormigonado losa, inicio mov. tierras zona 2" />
                <label className="lbl">Riesgos singulares, aspectos especiales o incidencias</label>
                <textarea value={wIncid} onChange={e => setWIncid(e.target.value)}
                  placeholder="Ej: Parcela en núcleo urbano, accesos angostos, servicios enterrados" />
                {pssActual && (
                  <div className="infobox" style={{ background:'#EAF3DE' }}>
                    <IconCheck style={{ stroke:'var(--green)' }} />
                    <p style={{ color:'var(--green)' }}>PSS cargado para esta obra: {pssActual}</p>
                  </div>
                )}
                <div className="infobox">
                  <IconInfo />
                  <p>La IA generará el acta con instrucciones específicas, EPIs, medidas preventivas y referencias exactas al RD 1627/1997, RD 171/2004 y LPRL.</p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn secondary" style={{ marginTop:0 }} onClick={() => goStep(1)}><IconArrowLeft />Atrás</button>
                  <button className="btn orange"    style={{ marginTop:0 }} onClick={() => goStep(3)}><IconSparkle />Generar con IA</button>
                </div>
              </div>
            )}

            {wizStep === 3 && (
              <div className="wstep">
                <h2>Acta generada</h2>
                <p className="wsub">Revisa el contenido antes de exportar o guardar</p>
                {loading ? (
                  <div className="spinner-wrap">
                    <div className="spinner" />
                    <p className="spinner-msg">{spinnerMsg}</p>
                  </div>
                ) : (
                  <>
                    <div className="ai-out">{actaTxt}</div>
                    <ExportButtons txt={actaTxt} />
                    <button className="btn secondary" onClick={regenerar}><IconRefresh />Regenerar</button>
                    <button className="btn green" onClick={guardarActa}><IconSave />Guardar en obra</button>
                  </>
                )}
                {!loading && (
                  <button className="btn secondary" style={{ marginTop:8 }} onClick={() => goStep(2)}><IconArrowLeft />Atrás</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ ACTAS ══ */}
        {screen === 'actas' && (
          <div className="screen">
            <div className="sh">Actas guardadas</div>
            <div className="card">
              {actas.length === 0
                ? <EmptyMsg text="No hay actas guardadas aún." />
                : actas.map(a => (
                    <ActaRow key={a.id} acta={a} onClick={() => { setDetailActa(a); setModal('detail'); }} />
                  ))
              }
            </div>
            <button className="btn orange" onClick={() => setScreen('nueva')}><IconPlus />Nueva acta</button>
          </div>
        )}

        {/* ══ OBRAS ══ */}
        {screen === 'obras' && (
          <div className="screen">
            <div className="sh">Mis obras</div>
            <div className="card">
              {obras.length === 0
                ? <EmptyMsg text="No hay obras. Añade la primera." />
                : obras.map((o, i) => (
                    <ListItem key={i} icon={<IconBuilding />} color={i === obraIdx ? 'orange' : 'blue'}
                      title={o.nombre} sub={o.contratista || '—'} onClick={() => selObra(i)}
                      pill={i === obraIdx ? { text:'Activa', color:'orange' } : { text:'Seleccionar', color:'blue' }} />
                  ))
              }
            </div>
            <button className="btn primary" onClick={() => setModal('nueva-obra')}><IconPlus />Añadir obra</button>

            <div className="sh" style={{ marginTop:20 }}>Mi perfil (CSS)</div>
            <div className="card">
              <label className="lbl">Nombre del coordinador</label>
              <input type="text" value={css.nombre} onChange={e => setCss({...css, nombre:e.target.value})} placeholder="Manuel Sánchez Medina" />
              <label className="lbl">Titulación / cargo</label>
              <input type="text" value={css.cargo}  onChange={e => setCss({...css, cargo:e.target.value})}  placeholder="arquitecto técnico" />
              <label className="lbl">Teléfono</label>
              <input type="text" value={css.tel}    onChange={e => setCss({...css, tel:e.target.value})}    placeholder="670 204 368" />
              <button className="btn primary" onClick={() => showToast('✓ Perfil guardado')}><IconSave />Guardar perfil</button>
            </div>

            <div className="sh">Plan de Seguridad y Salud</div>
            <div className="card">
              <div className="card-title">📄 PSS — {obraActiva ? obraActiva.nombre : 'Selecciona una obra primero'}</div>
              <div className="card-sub" style={{ marginBottom:10, lineHeight:1.5 }}>
                El PSS se guarda vinculado a cada obra y se incluye automáticamente al generar actas.
              </div>
              {pssActual ? (
                <>
                  <div style={{ background:'var(--green-bg)', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:12, color:'var(--green)', fontWeight:600 }}>
                    ✓ {pssActual}
                  </div>
                  <label htmlFor="pss-file" className="btn secondary" style={{ display:'flex', cursor:'pointer', marginTop:0 }}>
                    <IconUpload />Reemplazar PSS
                  </label>
                  <button className="btn danger" style={{ marginTop:6, background:'var(--red-bg)', color:'var(--red)', border:'1.5px solid #fca5a5' }}
                    onClick={deletePSS}>
                    Eliminar PSS de esta obra
                  </button>
                </>
              ) : (
                <label htmlFor="pss-file" className="btn primary" style={{ display:'flex', cursor:'pointer', marginTop:0 }}>
                  <IconUpload />Cargar PSS (PDF)
                </label>
              )}
              <input id="pss-file" type="file" accept=".pdf,.txt,.doc,.docx" style={{ display:'none' }} onChange={loadPSS} />
            </div>

            <div className="sh">Normativa de referencia</div>
            <div className="card">
              {[
                ['RD 1627/97',   'Disposiciones mínimas de seguridad y salud en obras de construcción'],
                ['RD 171/2004',  'Coordinación de actividades empresariales en centros de trabajo'],
                ['L 31/1995',    'Ley de Prevención de Riesgos Laborales (LPRL)'],
                ['RD 1215/97',   'Requisitos mínimos de seguridad para equipos de trabajo'],
                ['RD 614/2001',  'Protección frente al riesgo eléctrico'],
                ['RD 2177/2004', 'Trabajos temporales en altura — andamios y escaleras'],
              ].map(([code, desc]) => (
                <div className="norma" key={code}>
                  <span className="norma-code">{code}</span>
                  <div className="norma-desc">{desc}</div>
                </div>
              ))}
            </div>

            <div className="sh">Instalar como app</div>
            <div className="card">
              <div className="card-title">📲 Instalación PWA</div>
              <div className="card-sub" style={{ lineHeight:1.7, marginBottom:10 }}>
                <b>Android (Chrome):</b> Menú ⋮ → "Añadir a pantalla de inicio"<br />
                <b>iPhone/iPad (Safari):</b> Botón □↑ → "Añadir a pantalla de inicio"
              </div>
              {canInstall && <button className="btn primary" onClick={installPWA}><IconUpload />Instalar app</button>}
            </div>
          </div>
        )}
      </div>

      {/* NAV */}
      <nav className="nav">
        <NavBtn active={screen==='home'}   onClick={() => setScreen('home')}   icon={<IconHome />}     label="Inicio" />
        <NavBtn active={screen==='nueva'}  onClick={() => setScreen('nueva')}  icon={<IconFilePlus />} label="Nueva acta" />
        <NavBtn active={screen==='actas'}  onClick={() => setScreen('actas')}  icon={<IconFiles />}    label="Actas" />
        <NavBtn active={screen==='obras'}  onClick={() => setScreen('obras')}  icon={<IconBuilding />} label="Obras" />
      </nav>

      {/* MODALES */}
      {modal === 'obras' && (
        <Modal onClose={() => setModal(null)} title="Seleccionar obra activa">
          {obras.length === 0
            ? <EmptyMsg text="No hay obras. Añade una primero." />
            : obras.map((o, i) => (
                <ListItem key={i} icon={<IconBuilding />} color={i===obraIdx?'orange':'blue'}
                  title={o.nombre} sub={o.contratista||'—'} onClick={() => selObra(i)}
                  pill={i===obraIdx?{text:'Activa',color:'orange'}:{text:'Seleccionar',color:'blue'}} />
              ))
          }
          <button className="btn secondary" style={{ marginTop:12 }}
            onClick={() => { setModal('nueva-obra'); }}><IconPlus />Añadir obra</button>
        </Modal>
      )}

      {modal === 'nueva-obra' && (
        <Modal onClose={() => setModal(null)} title="Nueva obra">
          <label className="lbl">Nombre de la obra *</label>
          <input type="text" value={noNombre} onChange={e => setNoNombre(e.target.value)} placeholder="Ej: Edificio 24 viviendas Calle Mayor" />
          <label className="lbl">Situación / dirección</label>
          <input type="text" value={noDir}    onChange={e => setNoDir(e.target.value)}    placeholder="Calle Mayor 12, Estepona" />
          <label className="lbl">Promotor</label>
          <input type="text" value={noProm}   onChange={e => setNoProm(e.target.value)}   placeholder="Promotora Costa SL" />
          <label className="lbl">Dirección facultativa</label>
          <input type="text" value={noDf}     onChange={e => setNoDf(e.target.value)}     placeholder="Arq. García / Arq.Téc. López" />
          <label className="lbl">Contratista principal</label>
          <input type="text" value={noCont}   onChange={e => setNoCont(e.target.value)}   placeholder="Construcciones Acme SA" />
          <button className="btn primary"    onClick={crearObra}><IconCheck />Crear obra</button>
          <button className="btn secondary"  onClick={() => setModal(null)}>Cancelar</button>
        </Modal>
      )}

      {modal === 'detail' && detailActa && (
        <Modal onClose={() => setModal(null)} title={detailActa.tajo || TIPO_SHORT[detailActa.tipo] || 'Acta'}>
          <div className="ai-out" style={{ maxHeight:'46vh' }}>{detailActa.texto}</div>
          <ExportButtons txt={detailActa.texto} />
          <button className="btn secondary" style={{ marginTop:8 }} onClick={() => setModal(null)}>Cerrar</button>
        </Modal>
      )}

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────
function NavBtn({ active, onClick, icon, label }) {
  return <button className={`nav-btn ${active?'active':''}`} onClick={onClick}>{icon}{label}</button>;
}
function ListItem({ icon, color, title, sub, onClick, pill }) {
  return (
    <div className="li" onClick={onClick}>
      <div className={`li-icon ${color}`}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="li-title" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
        <div className="li-sub">{sub}</div>
      </div>
      {pill
        ? <span className={`pill ${pill.color}`}>{pill.text}</span>
        : <div className="li-arr"><IconChevronRight width={14} height={14} /></div>}
    </div>
  );
}
function ActaRow({ acta, onClick }) {
  return (
    <ListItem
      icon={<IconFileText />}
      color={['coordinacion','subcontrata'].includes(acta.tipo) ? 'orange' : 'blue'}
      title={acta.tajo || TIPO_SHORT[acta.tipo] || 'Acta'}
      sub={`${acta.fecha||'—'} · ${acta.empresa||'—'}`}
      onClick={onClick}
      pill={{ text:'✓', color:'green' }}
    />
  );
}
function EmptyMsg({ text }) {
  return <div style={{ textAlign:'center', padding:'20px 0', color:'var(--muted)', fontSize:13 }}>{text}</div>;
}
function Modal({ onClose, title, children }) {
  return (
    <div className="modal-bg" onClick={e => { if (e.target.classList.contains('modal-bg')) onClose(); }}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}
