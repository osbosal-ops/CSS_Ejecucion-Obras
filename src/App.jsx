import { useState, useRef, useEffect } from 'react';
import { usePersistentState, usePersistentFlag } from './usePersistentState.js';
import {
  IconHome, IconFilePlus, IconFiles, IconBuilding, IconUsers, IconHelmet,
  IconTransfer, IconFileText, IconChevronDown, IconChevronRight, IconArrowRight,
  IconArrowLeft, IconSparkle, IconInfo, IconDownload, IconShare, IconCopy,
  IconRefresh, IconSave, IconPlus, IconUpload, IconCheck,
} from './Icons.jsx';

const TIPO_LABEL = {
  previa: 'REUNIÓN PREVIA AL COMIENZO DE LA OBRA (promotor, dirección facultativa y coordinador)',
  contratista: 'REUNIÓN INICIAL CON LA EMPRESA CONTRATISTA (contratista y coordinador)',
  subcontrata: 'REUNIÓN POR INICIO DE TRABAJOS EN OBRA DE EMPRESA SUBCONTRATISTA',
  coordinacion: 'REUNIÓN PARA COORDINAR ACTIVIDADES EN LA OBRA',
};
const TIPO_SHORT = {
  previa: 'Reunión previa', contratista: 'Inicial contratista',
  subcontrata: 'Inicio tajo', coordinacion: 'Coordinación',
};
const SPINNERS = [
  'Analizando normativa vigente...',
  'Identificando riesgos del tajo...',
  'Generando instrucciones de seguridad...',
  'Redactando el acta...',
];

export default function App() {
  const [visited, setVisited] = usePersistentFlag('visited');
  const [obras, setObras] = usePersistentState('obras', []);
  const [actas, setActas] = usePersistentState('actas', []);
  const [obraIdx, setObraIdx] = usePersistentState('obraIdx', -1);
  const [css, setCss] = usePersistentState('css', { nombre: '', cargo: 'arquitecto técnico', tel: '' });

  const [screen, setScreen] = useState('home');
  const [toast, setToast] = useState('');
  const [pss, setPss] = useState('');

  // Wizard
  const [wizStep, setWizStep] = useState(0);
  const [tipoActa, setTipoActa] = useState('');
  const [wFecha, setWFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [wEmpresa, setWEmpresa] = useState('');
  const [wTajo, setWTajo] = useState('');
  const [wAsist, setWAsist] = useState('');
  const [wTajos, setWTajos] = useState('');
  const [wIncid, setWIncid] = useState('');
  const [actaTxt, setActaTxt] = useState('');
  const [loading, setLoading] = useState(false);
  const [spinnerMsg, setSpinnerMsg] = useState(SPINNERS[0]);

  // Modales
  const [modal, setModal] = useState(null); // 'obras' | 'nueva-obra' | 'detail' | null
  const [detailActa, setDetailActa] = useState(null);

  // Nueva obra form
  const [noNombre, setNoNombre] = useState('');
  const [noDir, setNoDir] = useState('');
  const [noProm, setNoProm] = useState('');
  const [noDf, setNoDf] = useState('');
  const [noCont, setNoCont] = useState('');

  // Install PWA
  const deferredInstall = useRef(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferredInstall.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  function installPWA() {
    if (!deferredInstall.current) { showToast('Usa el menú ⋮ del navegador para instalar'); return; }
    deferredInstall.current.prompt();
    deferredInstall.current.userChoice.then((r) => {
      if (r.outcome === 'accepted') showToast('✓ Instalando app...');
      deferredInstall.current = null;
      setCanInstall(false);
    });
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  const obraActiva = obraIdx >= 0 ? obras[obraIdx] : null;

  // ── Obras ──────────────────────────────────────────────────────────────────
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

  function selObra(idx) {
    setObraIdx(idx);
    setModal(null);
    showToast('✓ Obra activa: ' + obras[idx].nombre);
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────
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
    setLoading(true);
    setActaTxt('');
    let si = 0;
    const interval = setInterval(() => { setSpinnerMsg(SPINNERS[si++ % SPINNERS.length]); }, 1800);

    const o = obraActiva || {};
    const prompt = `Eres el coordinador de seguridad y salud "${css.nombre || '—'}" (${css.cargo || 'arquitecto técnico'}), experto en normativa española de prevención de riesgos laborales en construcción.

DATOS DE LA OBRA:
- Obra: ${o.nombre || '—'}
- Situación: ${o.situacion || '—'}
- Promotor: ${o.promotor || '—'}
- Dirección Facultativa: ${o.df || '—'}
- Coordinador S&S: ${css.nombre || '—'} (${css.cargo || '—'})${css.tel ? ' · Tel: ' + css.tel : ''}
- Contratista: ${o.contratista || '—'}

TIPO DE ACTA: ${TIPO_LABEL[tipoActa] || tipoActa}
Fecha: ${wFecha} — Lugar: Estepona (Málaga)
Empresa/tajo: ${wEmpresa || '—'} — ${wTajo || '—'}
Asistentes: ${wAsist || '—'}
Trabajos en ejecución: ${wTajos || '—'}
Riesgos singulares / incidencias: ${wIncid || 'Sin incidencias previas'}
${pss ? '\nPSS: ' + pss : ''}

Genera el ACTA COMPLETA DE SEGURIDAD Y SALUD en español formal técnico-jurídico con:
1. Encabezamiento con tabla de datos de la obra
2. Título del tipo de reunión en mayúsculas
3. Lugar y fecha
4. ASISTENTES en dos columnas (nombre — cargo)
5. ANTECEDENTES con referencias a artículos del RD 1627/1997 y RD 171/2004
6. ORDEN DEL DÍA numerado
7. DESARROLLO de cada punto con: instrucciones específicas del CSS para el tajo, riesgos propios (caídas mismo/distinto nivel, golpes, atrapamientos, riesgo eléctrico, etc.), medidas preventivas concretas, EPIs obligatorios, procedimiento de emergencia, referencias normativas exactas
8. Si es coordinación: instrucciones para evitar interferencias entre empresas concurrentes según RD 171/2004
9. RUEGOS Y PREGUNTAS (caja vacía)
10. CONCLUSIONES con referencia al art. 15.1.i LPRL
11. FIRMAS de todos los asistentes con rol y espacio "Fdo."
Texto plano, sin markdown, mayúsculas para secciones.`;

    try {
      const r = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      const txt = d.content?.find((b) => b.type === 'text')?.text;
      setActaTxt(txt || 'Error al generar el acta.');
    } catch (e) {
      setActaTxt(
        'Error al conectar con el servidor.\n\n' +
        'Asegúrate de que la variable de entorno ANTHROPIC_API_KEY está configurada en Vercel (Settings → Environment Variables) y de que has hecho un Redeploy tras añadirla.\n\n' +
        'Error técnico: ' + e.message
      );
    }
    clearInterval(interval);
    setLoading(false);
  }

  function guardarActa() {
    if (!actaTxt) return;
    const acta = { id: Date.now(), tipo: tipoActa, obraIdx, fecha: wFecha, empresa: wEmpresa, tajo: wTajo, texto: actaTxt };
    setActas([acta, ...actas]);
    showToast('✓ Acta guardada');
    setTimeout(() => setScreen('actas'), 900);
  }

  function copiarTexto(txt) {
    if (!txt) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(() => showToast('✓ Texto copiado al portapapeles'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✓ Texto copiado');
    }
  }

  async function compartirTexto(txt) {
    if (!txt) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Acta SyS — ' + (obraActiva?.nombre || 'Obra'), text: txt });
        return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    copiarTexto(txt);
  }

  function buildPDFHTML(txt) {
    const o = obraActiva || {};
    const filas = [
      ['obra:', o.nombre || '—'], ['situación:', o.situacion || '—'], ['promotor:', o.promotor || '—'],
      ['dirección facultativa:', o.df || '—'], ['coordinador SyS:', css.nombre || '—'], ['contratista:', o.contratista || '—'],
    ].map(([l, v]) => `<tr><td style="border:.5px solid #ccc;padding:3px 7px;font-weight:bold;background:#f0f4f8;width:36%;font-size:8pt">${l}</td><td style="border:.5px solid #ccc;padding:3px 7px;font-size:8pt">${v}</td></tr>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Acta SyS</title>
<style>@page{margin:22mm 18mm 18mm 22mm}body{font-family:Arial,sans-serif;font-size:9pt;color:#111;margin:0}@media print{.noprint{display:none}}pre{white-space:pre-wrap;word-break:break-word;font-family:Arial,sans-serif;font-size:8.5pt;line-height:1.6}</style>
</head><body>
<div class="noprint" style="position:fixed;top:10px;right:10px;z-index:99">
  <button onclick="window.print()" style="padding:9px 18px;background:#1B3A5C;color:#fff;border:none;border-radius:7px;font-size:13px;cursor:pointer;font-weight:600">🖨 Imprimir / Guardar PDF</button>
</div>
<div style="background:#1B3A5C;color:#fff;padding:9px 13px">
  <strong style="font-size:9pt">${css.nombre || 'Coordinador SyS'}</strong>
  <span style="float:right;font-style:italic;font-size:8pt">coordinación de seguridad y salud en fase de ejecución</span><br>
  <span style="font-size:8pt">${css.cargo || 'arquitecto técnico'}</span>
</div>
<div style="height:4px;background:repeating-linear-gradient(90deg,#E8620A 0,#E8620A 13px,#111 13px,#111 26px);margin-bottom:12px"></div>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">${filas}</table>
<pre>${txt}</pre>
<div style="margin-top:36px;border-top:.5px solid #ccc;padding-top:6px;font-size:7pt;color:#999">${css.nombre || '—'} — Coordinador de Seguridad y Salud — ${new Date().toLocaleDateString('es-ES')}</div>
</body></html>`;
  }

  function exportarPDF(txt) {
    if (!txt) return;
    const win = window.open('', '_blank');
    if (!win) { showToast('⚠ Permite ventanas emergentes para exportar'); return; }
    win.document.write(buildPDFHTML(txt));
    win.document.close();
  }

  function loadPSS(e) {
    const f = e.target.files[0];
    if (!f) return;
    setPss(`(PSS: ${f.name} · ${Math.round(f.size / 1024)} KB)`);
    showToast('✓ PSS cargado. Se usará al generar actas.');
  }

  const empSet = new Set(actas.filter((a) => a.obraIdx === obraIdx && a.empresa).map((a) => a.empresa));

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

  return (
    <div id="app-shell">
      <div className="topbar">
        <span style={{ fontSize: 21 }}>🦺</span>
        <div className="topbar-title">CSS Obras</div>
        <span className="topbar-badge">S&amp;S</span>
      </div>
      <div className="obra-strip" />

      <div className="screens">
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
              <ListItem icon={<IconUsers />} color="blue" title="Reunión previa al inicio" sub="Promotor, DF y coordinador" onClick={() => startWiz('previa')} />
              <ListItem icon={<IconBuilding />} color="blue" title="Reunión inicial contratista" sub="Instrucciones empresa principal" onClick={() => startWiz('contratista')} />
              <ListItem icon={<IconHelmet />} color="orange" title="Inicio tajo / subcontrata" sub="Nueva empresa o tajo en obra" onClick={() => startWiz('subcontrata')} />
              <ListItem icon={<IconTransfer />} color="orange" title="Coordinación de actividades" sub="Tajos concurrentes simultáneos" onClick={() => startWiz('coordinacion')} />
            </div>

            <div className="sh">Últimas actas</div>
            <div className="card">
              {actas.length === 0 ? (
                <EmptyMsg text="Aún no hay actas. Pulsa en una opción de arriba." />
              ) : actas.slice(0, 3).map((a, i) => (
                <ActaRow key={a.id} acta={a} onClick={() => { setDetailActa(a); setModal('detail'); }} />
              ))}
            </div>
          </div>
        )}

        {screen === 'nueva' && (
          <div className="screen">
            <div className="step-bar">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`step-dot ${i < wizStep ? 'done' : ''} ${i === wizStep ? 'active' : ''}`} />
              ))}
            </div>

            {wizStep === 0 && (
              <div className="wstep">
                <h2>Tipo de acta</h2>
                <p className="wsub">¿Qué reunión quieres documentar?</p>
                <div className="chips">
                  {Object.entries({ previa: 'Reunión previa inicio obra', contratista: 'Inicial contratista', subcontrata: 'Inicio tajo / subcontrata', coordinacion: 'Coordinación actividades' }).map(([k, label]) => (
                    <div key={k} className={`chip ${tipoActa === k ? 'sel' : ''}`} onClick={() => setTipoActa(k)}>{label}</div>
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
                <input type="date" value={wFecha} onChange={(e) => setWFecha(e.target.value)} />
                <label className="lbl">Empresa / subcontrata</label>
                <input type="text" value={wEmpresa} onChange={(e) => setWEmpresa(e.target.value)} placeholder="Ej: Excavaciones Benalvalle SL" />
                <label className="lbl">Fase de obra o tajo</label>
                <input type="text" value={wTajo} onChange={(e) => setWTajo(e.target.value)} placeholder="Ej: Movimiento de tierras" />
                <label className="lbl">Asistentes — nombre y cargo, uno por línea</label>
                <textarea rows={4} value={wAsist} onChange={(e) => setWAsist(e.target.value)} placeholder={'D. Ignacio Pastor García — Jefe de obra\nD. José A. Romero Montero — Recurso preventivo'} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn secondary" style={{ marginTop: 0 }} onClick={() => goStep(0)}><IconArrowLeft />Atrás</button>
                  <button className="btn primary" style={{ marginTop: 0 }} onClick={() => goStep(2)}><IconArrowRight />Continuar</button>
                </div>
              </div>
            )}

            {wizStep === 2 && (
              <div className="wstep">
                <h2>Contexto de obra</h2>
                <p className="wsub">La IA usa estos datos para generar instrucciones y referencias normativas precisas</p>
                <label className="lbl">Trabajos actualmente en ejecución (todos los tajos)</label>
                <textarea value={wTajos} onChange={(e) => setWTajos(e.target.value)} placeholder="Ej: Cimentación, ferralla, hormigonado losa, inicio mov. tierras zona 2" />
                <label className="lbl">Riesgos singulares, aspectos especiales o incidencias</label>
                <textarea value={wIncid} onChange={(e) => setWIncid(e.target.value)} placeholder="Ej: Parcela en núcleo urbano, accesos angostos, servicios enterrados" />
                <div className="infobox">
                  <IconInfo />
                  <p>La IA generará el acta con instrucciones específicas del tajo, EPIs, medidas preventivas y referencias exactas al RD 1627/1997, RD 171/2004 y LPRL.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn secondary" style={{ marginTop: 0 }} onClick={() => goStep(1)}><IconArrowLeft />Atrás</button>
                  <button className="btn orange" style={{ marginTop: 0 }} onClick={() => goStep(3)}><IconSparkle />Generar con IA</button>
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
                    <button className="btn primary" onClick={() => exportarPDF(actaTxt)}><IconDownload />Exportar PDF</button>
                    <button className="btn secondary" onClick={() => compartirTexto(actaTxt)}><IconShare />Compartir</button>
                    <button className="btn secondary" onClick={() => copiarTexto(actaTxt)}><IconCopy />Copiar texto</button>
                    <button className="btn secondary" onClick={generarActa}><IconRefresh />Regenerar</button>
                    <button className="btn green" onClick={guardarActa}><IconSave />Guardar en obra</button>
                  </>
                )}
                {!loading && (
                  <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => goStep(2)}><IconArrowLeft />Atrás</button>
                )}
              </div>
            )}
          </div>
        )}

        {screen === 'actas' && (
          <div className="screen">
            <div className="sh">Actas guardadas</div>
            <div className="card">
              {actas.length === 0 ? (
                <EmptyMsg text="No hay actas guardadas aún." />
              ) : actas.map((a) => (
                <ActaRow key={a.id} acta={a} onClick={() => { setDetailActa(a); setModal('detail'); }} />
              ))}
            </div>
            <button className="btn orange" onClick={() => setScreen('nueva')}><IconPlus />Nueva acta</button>
          </div>
        )}

        {screen === 'obras' && (
          <div className="screen">
            <div className="sh">Mis obras</div>
            <div className="card">
              {obras.length === 0 ? (
                <EmptyMsg text="No hay obras. Añade la primera." />
              ) : obras.map((o, i) => (
                <ListItem
                  key={i}
                  icon={<IconBuilding />}
                  color={i === obraIdx ? 'orange' : 'blue'}
                  title={o.nombre}
                  sub={o.contratista || '—'}
                  onClick={() => selObra(i)}
                  pill={i === obraIdx ? { text: 'Activa', color: 'orange' } : { text: 'Seleccionar', color: 'blue' }}
                />
              ))}
            </div>
            <button className="btn primary" onClick={() => setModal('nueva-obra')}><IconPlus />Añadir obra</button>

            <div className="sh" style={{ marginTop: 20 }}>Mi perfil (CSS)</div>
            <div className="card">
              <label className="lbl">Nombre del coordinador</label>
              <input type="text" value={css.nombre} onChange={(e) => setCss({ ...css, nombre: e.target.value })} placeholder="Manuel Sánchez Medina" />
              <label className="lbl">Titulación / cargo</label>
              <input type="text" value={css.cargo} onChange={(e) => setCss({ ...css, cargo: e.target.value })} placeholder="arquitecto técnico" />
              <label className="lbl">Teléfono</label>
              <input type="text" value={css.tel} onChange={(e) => setCss({ ...css, tel: e.target.value })} placeholder="670 204 368" />
              <button className="btn primary" onClick={() => showToast('✓ Perfil guardado')}><IconSave />Guardar perfil</button>
            </div>

            <div className="sh">Plan de Seguridad y Salud</div>
            <div className="card">
              <div className="card-title">📄 PSS de la obra activa</div>
              <div className="card-sub" style={{ marginBottom: 10 }}>Carga el PDF del PSS aprobado para que la IA lo use como referencia al generar las actas.</div>
              <label htmlFor="pss-file" className="btn primary" style={{ display: 'flex', cursor: 'pointer', marginTop: 0 }}>
                <IconUpload />Cargar PSS (PDF)
              </label>
              <input id="pss-file" type="file" accept=".pdf" style={{ display: 'none' }} onChange={loadPSS} />
              {pss && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ {pss}</div>}
            </div>

            <div className="sh">Normativa de referencia</div>
            <div className="card">
              {[
                ['RD 1627/97', 'Disposiciones mínimas de seguridad y salud en obras de construcción'],
                ['RD 171/2004', 'Coordinación de actividades empresariales en centros de trabajo'],
                ['L 31/1995', 'Ley de Prevención de Riesgos Laborales (LPRL)'],
                ['RD 1215/97', 'Requisitos mínimos de seguridad para equipos de trabajo'],
                ['RD 614/2001', 'Protección frente al riesgo eléctrico'],
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
              <div className="card-sub" style={{ lineHeight: 1.7, marginBottom: 10 }}>
                <b>Android (Chrome):</b> Menú ⋮ → "Añadir a pantalla de inicio"<br />
                <b>iPhone/iPad (Safari):</b> Botón □↑ → "Añadir a pantalla de inicio"
              </div>
              {canInstall && <button className="btn primary" onClick={installPWA}><IconUpload />Instalar app</button>}
            </div>
          </div>
        )}
      </div>

      <nav className="nav">
        <NavBtn active={screen === 'home'} onClick={() => setScreen('home')} icon={<IconHome />} label="Inicio" />
        <NavBtn active={screen === 'nueva'} onClick={() => setScreen('nueva')} icon={<IconFilePlus />} label="Nueva acta" />
        <NavBtn active={screen === 'actas'} onClick={() => setScreen('actas')} icon={<IconFiles />} label="Actas" />
        <NavBtn active={screen === 'obras'} onClick={() => setScreen('obras')} icon={<IconBuilding />} label="Obras" />
      </nav>

      {/* MODALES */}
      {modal === 'obras' && (
        <Modal onClose={() => setModal(null)} title="Seleccionar obra activa">
          {obras.length === 0 ? (
            <EmptyMsg text="No hay obras. Añade una primero." />
          ) : obras.map((o, i) => (
            <ListItem key={i} icon={<IconBuilding />} color={i === obraIdx ? 'orange' : 'blue'} title={o.nombre} sub={o.contratista || '—'} onClick={() => selObra(i)} pill={i === obraIdx ? { text: 'Activa', color: 'orange' } : { text: 'Seleccionar', color: 'blue' }} />
          ))}
          <button className="btn secondary" style={{ marginTop: 12 }} onClick={() => { setModal('nueva-obra'); }}><IconPlus />Añadir obra</button>
        </Modal>
      )}

      {modal === 'nueva-obra' && (
        <Modal onClose={() => setModal(null)} title="Nueva obra">
          <label className="lbl">Nombre de la obra *</label>
          <input type="text" value={noNombre} onChange={(e) => setNoNombre(e.target.value)} placeholder="Ej: Edificio 24 viviendas Calle Mayor" />
          <label className="lbl">Situación / dirección</label>
          <input type="text" value={noDir} onChange={(e) => setNoDir(e.target.value)} placeholder="Calle Mayor 12, Estepona" />
          <label className="lbl">Promotor</label>
          <input type="text" value={noProm} onChange={(e) => setNoProm(e.target.value)} placeholder="Promotora Costa SL" />
          <label className="lbl">Dirección facultativa</label>
          <input type="text" value={noDf} onChange={(e) => setNoDf(e.target.value)} placeholder="Arq. García / Arq.Téc. López" />
          <label className="lbl">Contratista principal</label>
          <input type="text" value={noCont} onChange={(e) => setNoCont(e.target.value)} placeholder="Construcciones Acme SA" />
          <button className="btn primary" onClick={crearObra}><IconCheck />Crear obra</button>
          <button className="btn secondary" onClick={() => setModal(null)}>Cancelar</button>
        </Modal>
      )}

      {modal === 'detail' && detailActa && (
        <Modal onClose={() => setModal(null)} title={detailActa.tajo || TIPO_SHORT[detailActa.tipo] || 'Acta'}>
          <div className="ai-out" style={{ maxHeight: '48vh' }}>{detailActa.texto}</div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => exportarPDF(detailActa.texto)}><IconDownload />Exportar PDF</button>
          <button className="btn secondary" onClick={() => setModal(null)}>Cerrar</button>
        </Modal>
      )}

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────
function NavBtn({ active, onClick, icon, label }) {
  return (
    <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}{label}
    </button>
  );
}

function ListItem({ icon, color, title, sub, onClick, pill }) {
  return (
    <div className="li" onClick={onClick}>
      <div className={`li-icon ${color}`}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="li-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div className="li-sub">{sub}</div>
      </div>
      {pill ? <span className={`pill ${pill.color}`}>{pill.text}</span> : <div className="li-arr"><IconChevronRight width={14} height={14} /></div>}
    </div>
  );
}

function ActaRow({ acta, onClick }) {
  const color = ['coordinacion', 'subcontrata'].includes(acta.tipo) ? 'orange' : 'blue';
  return (
    <ListItem
      icon={<IconFileText />}
      color={color}
      title={acta.tajo || TIPO_SHORT[acta.tipo] || 'Acta'}
      sub={`${acta.fecha || '—'} · ${acta.empresa || '—'}`}
      onClick={onClick}
      pill={{ text: '✓', color: 'green' }}
    />
  );
}

function EmptyMsg({ text }) {
  return <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>{text}</div>;
}

function Modal({ onClose, title, children }) {
  return (
    <div className="modal-bg" onClick={(e) => { if (e.target.classList.contains('modal-bg')) onClose(); }}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}
