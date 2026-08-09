/**
 * Lee la salida de DTR:TN (Resiber) o TWD/TKT (Amadeus) y saca los hechos.
 *
 * Es la pieza que evita el error más caro: el bot corporativo miró este mismo
 * billete y dijo que un cupón estaba volado cuando ponía OPEN FOR USE, y que
 * la tarifa era BASIC cuando el fare basis terminaba en M.
 *
 * Las expresiones regulares están calibradas contra PANTALLAS REALES
 * (ver scripts/lectores/test-lectores.js). Un parser genérico escrito "a
 * ojo" no lee estos formatos: se probó y devolvía cero cupones.
 *
 * Todo lo que devuelve está LEÍDO de la pantalla. Nada se deduce aquí — eso
 * es trabajo de derivar.mjs.
 */

// DOI: 29SEP25   ·   ORG/DST: SCL/SCL   ·   FCMI: 1
const RE_CABECERA = /ORG\/DST:\s*([A-Z]{3})\/([A-Z]{3})|DOI:\s*(\d{1,2}[A-Z]{3}\d{2})|FCMI:\s*(\d+)/g;

const RE_PASAJERO = /^PASSENGER:\s*(.+?)\s*$/m;
const RE_EMISOR = /^ISSUED BY:\s*(.+?)(?:\s{2,}|$)/m;
const RE_EXCH = /^EXCH:\s*(\S+)/m;
const RE_LOCALIZADOR = /^AIRLINE DATA:\s*([A-Z0-9]{5,6})\b/m;
const RE_ENDOSO = /«E\/R:([^»]*)»/;

/**
 * Un cupón:
 * O FM: SCL IB 0118 A 20AUG 1040 OK AON4NQM7 20AUG/20AUG 1PC OPEN FOR USE
 *      └dir └org └al └vuelo └cl └fecha └hora └ok └farebasis └NVB/NVA └bag └estado
 */
const RE_CUPON =
  /^\s*[OX]?\s*(FM|TO):\s*([A-Z]{3})\s+([A-Z0-9]{2})\s+(\d{3,4})\s+([A-Z])\s+(\d{1,2}[A-Z]{3})\s+(\d{4})\s+([A-Z]{2})\s+(\S+)\s+(\d{1,2}[A-Z]{3})\/(\d{1,2}[A-Z]{3})\s+(\S+)\s+(.+?)\s*$/;

// El destino del último cupón viene en su propia línea:  "  TO: SCL"
const RE_DESTINO_SUELTO = /^\s+TO:\s*([A-Z]{3})\s*$/;

const RE_FC = /^FC:\s*(.+?)\s*$/m;
const RE_FARE = /^FARE:\s*([A-Z]{3})\s*([\d.,]+)/m;
const RE_FOP = /FOP:([^/]+)/;
const RE_TOTAL = /^TOTAL:\s*(?:([A-Z]{3})\s*([\d.,]+)|(NO ADC))/m;
const RE_TKTN = /TKTN:\s*([\d-]+)/;

// TAX:  USDPD16.50 AEJD/   ·   TAXES: CLP 547990/OI:
const RE_TASA = /^TAX:\s*([A-Z]{3})(?:PD)?\s*([\d.,]+)\s+([A-Z0-9]{2,4})/gm;
const RE_TASAS_TOTAL = /^TAXES:\s*([A-Z]{3})\s*([\d.,]+)/m;

// EMD: 075442 - A0B5 - SEAT ASSIGNMENT   BOARDED
const RE_EMD = /^\s*EMD:\s*(\S+)\s*-\s*(\S+)\s*-\s*(.+?)\s{2,}(\S+)\s*$/;

/** El número que se tecleó: ►DTR:TN 0752527441266 */
const RE_CONSULTA = /^[►>]?\s*(DTR:?\s?TN|TWD\/TKT|TWD\/L)\s*\/?\s*(\S+)/m;

export function leerBillete(texto) {
  if (!texto || typeof texto !== 'string') {
    return { cupones: [], emds: [], tasas: [], avisos: ['No se recibió texto que leer.'] };
  }

  const lineas = texto.split(/\r?\n/);
  const b = {
    fuente: null,
    numeroBillete: null,
    placa: null,
    emisor: null,
    localizador: null,
    pasajero: null,
    origen: null,
    destino: null,
    doi: null,
    fcmi: null,
    billeteAnterior: null,
    endoso: null,
    cupones: [],
    emds: [],
    fareCalculation: null,
    fare: null,
    tasas: [],
    tasasTotal: null,
    formaDePago: null,
    total: null,
    avisos: []
  };

  const consulta = texto.match(RE_CONSULTA);
  if (consulta) {
    b.fuente = consulta[1].startsWith('DTR') ? 'resiber' : 'amadeus';
    b.numeroBillete = consulta[2].replace(/[·.]$/, '');
  }

  let m;
  RE_CABECERA.lastIndex = 0;
  while ((m = RE_CABECERA.exec(texto)) !== null) {
    if (m[1]) { b.origen = m[1]; b.destino = m[2]; }
    if (m[3]) b.doi = m[3];
    if (m[4]) b.fcmi = Number(m[4]);
  }

  const pas = texto.match(RE_PASAJERO); if (pas && pas[1]) b.pasajero = pas[1];
  const emi = texto.match(RE_EMISOR); if (emi) b.emisor = emi[1].trim();
  const loc = texto.match(RE_LOCALIZADOR); if (loc) b.localizador = loc[1];
  const exc = texto.match(RE_EXCH); if (exc && exc[1] !== 'CONJ') b.billeteAnterior = exc[1];
  const end = texto.match(RE_ENDOSO); if (end) b.endoso = end[1];
  const fc = texto.match(RE_FC); if (fc) b.fareCalculation = fc[1];

  const fare = texto.match(RE_FARE);
  if (fare) b.fare = { moneda: fare[1], importe: fare[2] };
  const fop = texto.match(RE_FOP); if (fop) b.formaDePago = fop[1].trim();

  const tot = texto.match(RE_TOTAL);
  if (tot) b.total = tot[3] ? { sinCargo: true } : { moneda: tot[1], importe: tot[2] };

  // Tasas desglosadas (TAX: USDPD16.50 AEJD/) y total (TAXES: CLP 547990)
  RE_TASA.lastIndex = 0;
  while ((m = RE_TASA.exec(texto)) !== null) {
    b.tasas.push({ moneda: m[1], importe: m[2], codigo: m[3] });
  }
  const tt = texto.match(RE_TASAS_TOTAL);
  if (tt) b.tasasTotal = { moneda: tt[1], importe: tt[2] };

  const tktn = texto.match(RE_TKTN);
  if (tktn) b.numeroBillete = tktn[1];
  if (b.numeroBillete) {
    const p = b.numeroBillete.replace(/\D/g, '');
    if (p.length >= 3) b.placa = p.slice(0, 3);
  }

  for (const linea of lineas) {
    const c = linea.match(RE_CUPON);
    if (c) {
      b.cupones.push({
        n: b.cupones.length + 1,
        direccion: c[1],
        origen: c[2],
        aerolinea: c[3],
        vuelo: c[4],
        clase: c[5],
        fecha: c[6],
        hora: c[7],
        estadoReserva: c[8],
        fareBasis: c[9],
        nvb: c[10],
        nva: c[11],
        equipaje: c[12],
        estado: c[13].trim()
      });
      continue;
    }
    const d = linea.match(RE_DESTINO_SUELTO);
    if (d && b.cupones.length) {
      b.cupones[b.cupones.length - 1].destino = d[1];
      continue;
    }
    const e = linea.match(RE_EMD);
    if (e) b.emds.push({ numero: e[1], codigo: e[2], descripcion: e[3].trim(), estado: e[4] });
  }

  // El destino de cada cupón es el origen del siguiente
  for (let i = 0; i < b.cupones.length - 1; i++) {
    if (!b.cupones[i].destino) b.cupones[i].destino = b.cupones[i + 1].origen;
  }

  if (!b.doi) b.avisos.push('No se encontró el DOI — sin él no se puede cotizar a histórico.');
  if (!b.cupones.length) b.avisos.push('No se reconoció ningún cupón. ¿Es una salida de DTR:TN o TWD?');

  return b;
}

export default leerBillete;
