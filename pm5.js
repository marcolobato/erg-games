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
