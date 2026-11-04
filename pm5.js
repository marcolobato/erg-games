// Everything that talks to the Concept2 PM5 over Web Bluetooth.
// This file knows nothing about the page. The page hands it callbacks,
// and it calls them when something happens.

// ---- Concept2 PM5 Bluetooth ids (rowing service) ----
var SVC = 'ce060030-43e5-11e4-916c-0800200c9a66';
var CH_ADD1 = 'ce060032-43e5-11e4-916c-0800200c9a66';   // additional status 1: stroke rate is byte 5
var CH_SAMPLE = 'ce060034-43e5-11e4-916c-0800200c9a66'; // how often status is sent

// True if this browser can use Web Bluetooth (Chrome or Edge, not Safari).
export function isSupported() {
  return !!navigator.bluetooth;
}

// Opens the browser's device picker, connects, and starts live updates.
//   onStrokeRate(n)  called with strokes per minute, about twice a second
//   onDisconnect()   called if the PM5 drops the connection
// Returns { name } once connected. Throws if the picker is closed or connecting fails.
export async function connect(handlers) {
  var dev = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'PM5' }],
    optionalServices: [SVC]
  });
  dev.addEventListener('gattserverdisconnected', handlers.onDisconnect);
  var server = await dev.gatt.connect();
  var svc = await server.getPrimaryService(SVC);
  try {
    var sr = await svc.getCharacteristic(CH_SAMPLE);
    await sr.writeValue(new Uint8Array([1])); // ask for updates about twice a second
  } catch (e) { /* default rate still works */ }
  var ch = await svc.getCharacteristic(CH_ADD1);
  ch.addEventListener('characteristicvaluechanged', function (ev) {
    var v = ev.target.value;
    if (v.byteLength > 5) handlers.onStrokeRate(v.getUint8(5));
  });
  await ch.startNotifications();
  return { name: dev.name || 'PM5' };
}

// ---- More PM5 data (used by lab.html) ----
// Byte positions and units come from the community library ergometer.js,
// which has been used with real PM5s. lab.html shows the raw bytes next to
// the decoded numbers so we can check them on a real row.

function pmUuid(id) { return 'ce0600' + id + '-43e5-11e4-916c-0800200c9a66'; }

// The data streams the PM5 pushes while you row.
export var STREAMS = [
  { name: 'General Status', uuid: pmUuid('31') },
  { name: 'Additional Status 1', uuid: pmUuid('32') },
  { name: 'Additional Status 2', uuid: pmUuid('33') },
  { name: 'Stroke Data', uuid: pmUuid('35') },
  { name: 'Additional Stroke Data', uuid: pmUuid('36') },
  { name: 'Force Curve', uuid: pmUuid('3d') },
  { name: 'Heart Rate Belt Info', uuid: pmUuid('3b') }
];

// The PM5 sends numbers low byte first, so 6C 39 means 0x396C.
function u8(v, i) { return v.getUint8(i); }
function u16(v, i) { return v.getUint8(i) + v.getUint8(i + 1) * 256; }
function u24(v, i) { return u16(v, i) + v.getUint8(i + 2) * 65536; }

// Each decoder takes a DataView and returns labelled numbers, or null if the
// packet is shorter than expected.
export function decodeGeneralStatus(v) {
  if (v.byteLength < 19) return null;
  return {
    elapsedSec: u24(v, 0) / 100,
    distanceM: u24(v, 3) / 10,
    workoutType: u8(v, 6),
    intervalType: u8(v, 7),
    workoutState: u8(v, 8),
    rowingState: u8(v, 9),
    strokeState: u8(v, 10),
    workoutDistanceM: u24(v, 11),
    workoutDuration: u24(v, 14),
    durationType: u8(v, 17),
    dragFactor: u8(v, 18)
  };
}

export function decodeAdditionalStatus1(v) {
  if (v.byteLength < 16) return null;
  var hr = u8(v, 6);
  return {
    elapsedSec: u24(v, 0) / 100,
    speedMps: u16(v, 3) / 1000,
    strokeRate: u8(v, 5),
    heartRate: hr === 255 ? null : hr, // 255 means no heart rate belt is paired
    paceSecPer500: u16(v, 7) / 100,
    averagePaceSecPer500: u16(v, 9) / 100,
    restDistanceM: u16(v, 11),
    restTimeSec: u24(v, 13) / 100
  };
}

export function decodeAdditionalStatus2(v) {
  if (v.byteLength < 20) return null;
  return {
    elapsedSec: u24(v, 0) / 100,
    intervalCount: u8(v, 3),
    averagePowerW: u16(v, 4),
    totalCalories: u16(v, 6),
    splitAveragePaceSecPer500: u16(v, 8) / 100,
    splitAveragePowerW: u16(v, 10)
  };
}

export function decodeStrokeData(v) {
  if (v.byteLength < 20) return null;
  return {
    elapsedSec: u24(v, 0) / 100,
    distanceM: u24(v, 3) / 10,
    driveLengthM: u8(v, 6) / 100,
    driveTimeSec: u8(v, 7) / 100,
    recoverySec: u16(v, 8) / 100,
    strokeDistanceM: u16(v, 10) / 100,
    peakForceLbf: u16(v, 12) / 10,
    averageForceLbf: u16(v, 14) / 10,
    workPerStrokeJ: u16(v, 16) / 10,
    strokeCount: u16(v, 18)
  };
}

export function decodeAdditionalStrokeData(v) {
  if (v.byteLength < 15) return null;
  return {
    elapsedSec: u24(v, 0) / 100,
    strokePowerW: u16(v, 3),
    strokeCalories: u16(v, 5),
    strokeCount: u16(v, 7),
    projectedWorkTimeSec: u24(v, 9),
    projectedWorkDistanceM: u24(v, 12)
  };
}

// Standard Bluetooth heart rate packet (what a watch or chest strap sends).
// The first byte says whether the heart rate is one byte or two.
export function decodeHeartRate(v) {
  return (u8(v, 0) & 1) ? u16(v, 1) : u8(v, 1);
}

var HEART_MONITOR = 'Heart Rate Monitor';

var DECODERS = {
  'General Status': decodeGeneralStatus,
  'Additional Status 1': decodeAdditionalStatus1,
  'Additional Status 2': decodeAdditionalStatus2,
  'Stroke Data': decodeStrokeData,
  'Additional Stroke Data': decodeAdditionalStrokeData
};
DECODERS[HEART_MONITOR] = function (v) { return { heartRate: decodeHeartRate(v) }; };

// Decode a packet by stream name. Returns null if we have no decoder for it.
export function decodePacket(name, v) {
  return DECODERS[name] ? DECODERS[name](v) : null;
}

// The force curve is the graph the PM5 draws of how hard you pull during one
// stroke. It arrives in pieces. Each piece is: a header byte (high half = how
// many pieces make up this curve, low half = how many data points are in this
// piece), a sequence number, then up to 9 data points of two bytes each.
// Call the function this returns with every Force Curve packet. When a whole
// curve has arrived, onCurve(points) is called with an array of numbers.
// (The oldest PM5 hardware, "PM5v1", does not send this stream.)
export function createForceCurveAssembler(onCurve) {
  var points = [], pieces = 0, lastSeq = -1;
  return function (v) {
    if (v.byteLength < 2) return;
    var total = u8(v, 0) >> 4, count = u8(v, 0) & 15, seq = u8(v, 1);
    if (seq <= lastSeq) { points = []; pieces = 0; } // a new stroke started, drop any unfinished one
    for (var i = 0; i < count && 2 + i * 2 + 1 < v.byteLength; i++) points.push(u16(v, 2 + i * 2));
    pieces++;
    lastSeq = seq;
    if (pieces >= total) {
      var curve = points;
      points = []; pieces = 0; lastSeq = -1;
      onCurve(curve);
    }
  };
}

function packetListener(name, handlers) {
  return function (ev) { handlers.onPacket(name, ev.target.value); };
}

// Like connect(), but listens to every stream in STREAMS and hands each raw
// packet to the page:
//   onPacket(streamName, dataView)  called for every packet
//   onDisconnect()                  called if the PM5 drops the connection
// Returns { name, failed } where failed lists streams that could not start.
export async function connectLab(handlers) {
  var dev = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'PM5' }],
    optionalServices: [SVC]
  });
  dev.addEventListener('gattserverdisconnected', handlers.onDisconnect);
  var server = await dev.gatt.connect();
  var svc = await server.getPrimaryService(SVC);
  try {
    var sr = await svc.getCharacteristic(CH_SAMPLE);
    await sr.writeValue(new Uint8Array([1])); // ask for updates about twice a second
  } catch (e) { /* default rate still works */ }
  var failed = [];
  for (var i = 0; i < STREAMS.length; i++) {
    try {
      var ch = await svc.getCharacteristic(STREAMS[i].uuid);
      ch.addEventListener('characteristicvaluechanged', packetListener(STREAMS[i].name, handlers));
      await ch.startNotifications();
    } catch (e) { failed.push(STREAMS[i].name); }
  }
  return { name: dev.name || 'PM5', failed: failed };
}

// Connects straight to a chest strap, watch, or other heart rate monitor,
// with no PM5 involved. A watch has to be broadcasting heart rate over
// Bluetooth. A strap always is.
//   onPacket('Heart Rate Monitor', dataView)  called for every reading
//   onDisconnect()                            called if the monitor drops
export async function connectHeartRate(handlers) {
  var dev = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
  dev.addEventListener('gattserverdisconnected', handlers.onDisconnect);
  var server = await dev.gatt.connect();
  var svc = await server.getPrimaryService('heart_rate');
  var ch = await svc.getCharacteristic('heart_rate_measurement');
  ch.addEventListener('characteristicvaluechanged', packetListener(HEART_MONITOR, handlers));
  await ch.startNotifications();
  return { name: dev.name || 'Heart rate monitor' };
}
