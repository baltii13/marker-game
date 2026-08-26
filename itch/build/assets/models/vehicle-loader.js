/* ============================================================
   VehicleFactory.js — drop-in vehicle/prop loader
   For: OX casino (Schedule-1-style game) · three.js r147 UMD
   ------------------------------------------------------------
   PASTE INTO FINAL GAME:
     1) <script src="assets/models/vehicles/vehicle-loader.js"></script>
        (place AFTER your three.js r147 script tag — it injects
         GLTFLoader itself if missing, jsdelivr + unpkg fallback)
     2) After scene exists:
          VehicleFactory.init();
     3) Spawn a car:
          const car = await VehicleFactory.spawn('q_taxi');
          car.position.set(x, 0, z); scene.add(car);
     4) Measured collision footprint (AABB half-extents AFTER scaling):
          const { hx, hz } = VehicleFactory.footprint(car);

   All models sit ground-level (wheels touch y=0) and their NOSE faces
   +Z in model space (verified: headlight/tail-light centroids, grills,
   spoilers, shovel arms). So with rotation.y=ry, forward = (sin ry, cos ry).

   Sources: Kenney Car Kit (CC0) + Quaternius Cars Bundle (CC0).
   See assets/models/vehicles/LICENSES.md.
   ============================================================ */
(function () {
  'use strict';

  // ---- every vehicle on disk, keyed by short name --------------
  // k_ omitted for Kenney keys; q_ prefix = Quaternius Cars Bundle.
  var CAST = {
    // Kenney Car Kit — city traffic & services
    'ambulance':      { path: 'kenney_car-kit/Models/GLB_format/ambulance.glb',      length: 5.8 },
    'delivery':       { path: 'kenney_car-kit/Models/GLB_format/delivery.glb',       length: 5.0 },
    'delivery_flat':  { path: 'kenney_car-kit/Models/GLB_format/delivery-flat.glb',  length: 5.0 },
    'firetruck':      { path: 'kenney_car-kit/Models/GLB_format/firetruck.glb',      length: 5.8 },
    'garbage_truck':  { path: 'kenney_car-kit/Models/GLB_format/garbage-truck.glb',  length: 5.8 },
    'hatchback':      { path: 'kenney_car-kit/Models/GLB_format/hatchback-sports.glb', length: 4.0 },
    'race':           { path: 'kenney_car-kit/Models/GLB_format/race.glb',           length: 4.3 },
    'race_future':    { path: 'kenney_car-kit/Models/GLB_format/race-future.glb',    length: 4.3 },
    'sedan':          { path: 'kenney_car-kit/Models/GLB_format/sedan.glb',          length: 4.4 },
    'sedan_sports':   { path: 'kenney_car-kit/Models/GLB_format/sedan-sports.glb',   length: 4.4 },
    'suv':            { path: 'kenney_car-kit/Models/GLB_format/suv.glb',            length: 4.6 },
    'suv_luxury':     { path: 'kenney_car-kit/Models/GLB_format/suv-luxury.glb',     length: 4.7 },
    'taxi':           { path: 'kenney_car-kit/Models/GLB_format/taxi.glb',           length: 4.4 },
    'police':         { path: 'kenney_car-kit/Models/GLB_format/police.glb',         length: 4.4 },
    'tractor':        { path: 'kenney_car-kit/Models/GLB_format/tractor.glb',        length: 3.4 },
    'tractor_police': { path: 'kenney_car-kit/Models/GLB_format/tractor-police.glb', length: 3.4 },
    'tractor_shovel': { path: 'kenney_car-kit/Models/GLB_format/tractor-shovel.glb', length: 3.6 },
    'truck':          { path: 'kenney_car-kit/Models/GLB_format/truck.glb',          length: 5.2 },
    'truck_flat':     { path: 'kenney_car-kit/Models/GLB_format/truck-flat.glb',     length: 5.2 },
    'van':            { path: 'kenney_car-kit/Models/GLB_format/van.glb',            length: 5.0 },
    // Quaternius Cars Bundle — smooth-shaded civilian cars
    'q_police':       { path: 'quaternius_cars/police.glb',        length: 4.5 },
    'q_taxi':         { path: 'quaternius_cars/taxi.glb',          length: 4.5 },
    'q_sedan':        { path: 'quaternius_cars/sedan.glb',         length: 4.5 },
    'q_sedan_teal':   { path: 'quaternius_cars/sedan_teal.glb',    length: 4.3 },
    'q_sports':       { path: 'quaternius_cars/sports.glb',        length: 4.4 },
    'q_sports_white': { path: 'quaternius_cars/sports_white.glb',  length: 4.4 },
    'q_suv':          { path: 'quaternius_cars/suv.glb',           length: 4.7 },
    // street props (natural size, no rescale)
    'cone':           { path: 'kenney_car-kit/Models/GLB_format/cone.glb',       length: 0 },
    'cone_flat':      { path: 'kenney_car-kit/Models/GLB_format/cone-flat.glb',  length: 0 },
    'crate':          { path: 'kenney_car-kit/Models/GLB_format/box.glb',        length: 0 },
    'tire':           { path: 'kenney_car-kit/Models/GLB_format/debris-tire.glb', length: 0 }
  };

  var baseURL = 'assets/models/vehicles/';
  var templates = Object.create(null);   // url -> Promise<{scene}>
  var bootPromise = null;

  function injectScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('failed ' + src)); };
      document.head.appendChild(s);
    });
  }

  // GLTFLoader matching the r147 UMD build (jsdelivr first, unpkg fallback)
  function boot() {
    if (bootPromise) return bootPromise;
    bootPromise = (function () {
      if (!window.THREE) throw new Error('three.js must load BEFORE vehicle-loader.js');
      if (THREE.GLTFLoader) return Promise.resolve();
      var ver = '0.' + (THREE.REVISION || 147) + '.0';
      return injectScript('https://cdn.jsdelivr.net/npm/three@' + ver + '/examples/js/loaders/GLTFLoader.js')
        ['catch'](function () {
          return injectScript('https://unpkg.com/three@' + ver + '/examples/js/loaders/GLTFLoader.js');
        });
    })();
    return bootPromise;
  }

  function resolveURL(key) {
    if (/^https?:|^\.\?\//.test(key)) return key;          // explicit path/url
    var def = CAST[key];
    if (!def) {
      throw new Error("Unknown vehicle '" + key + "'. Available: " + Object.keys(CAST).join(', '));
    }
    return baseURL + def.path;
  }

  function loadTemplate(url) {
    if (!templates[url]) {
      templates[url] = boot().then(function () {
        return new THREE.GLTFLoader().loadAsync(url);
      }).then(function (gltf) { return { scene: gltf.scene }; });
    }
    return templates[url];
  }

  var VF = {

    CAST: CAST,

    init: function (opts) {
      opts = opts || {};
      if (opts.baseURL) baseURL = opts.baseURL;
      return boot();
    },

    preload: function (keys) {
      return Promise.all((Array.isArray(keys) ? keys : [keys]).map(function (k) {
        return loadTemplate(resolveURL(k));
      }));
    },

    /**
     * Spawn a vehicle instance.
     *   key   CAST name ('q_taxi') or explicit path ('quaternius_cars/suv.glb')
     *   opts: { length: 4.5,        // target length in meters (0 = natural size)
     *           castShadow: true, receiveShadow: false, onLoaded }
     * Returns the model root (Object3D), ground-level, + extras:
     *   .size {x,y,z}  .halfExtents {hx,hz}  (measured, for collisions)
     */
    spawn: function (key, opts) {
      var def = (/^https?:|^\.\?\//.test(key)) ? null : CAST[key];
      opts = opts || {};
      return loadTemplate(resolveURL(key)).then(function (tpl) {
        var root = tpl.scene.clone(true);

        // scale to target length (z extent) unless natural-size prop
        var targetLen = (opts.length != null) ? opts.length : (def ? def.length : 0);
        var box = new THREE.Box3().setFromObject(root);
        var size = new THREE.Vector3(); box.getSize(size);
        if (targetLen > 0 && size.z > 0) {
          var s = targetLen / size.z;
          root.scale.multiplyScalar(s);
          box.setFromObject(root); box.getSize(size);
        }
        // drop wheels onto y=0 (Kenney pivots sit 0.30 above ground)
        box.setFromObject(root);
        root.position.y -= box.min.y;

        root.traverse(function (o) {
          if (o.isMesh) {
            o.castShadow = opts.castShadow !== false;
            o.receiveShadow = !!opts.receiveShadow;
          }
        });

        var fin = new THREE.Box3().setFromObject(root);
        var fs = new THREE.Vector3(); fin.getSize(fs);
        root.size = { x: fs.x, y: fs.y, z: fs.z };
        root.halfExtents = { hx: fs.x / 2, hz: fs.z / 2 };

        if (opts.onLoaded) opts.onLoaded(root);
        return root;
      });
    },

    /** Measured AABB half-extents of a spawned instance (collision-ready). */
    footprint: function (root) {
      return root.halfExtents || { hx: 1, hz: 2 };
    },

    /** Free GPU memory for a removed vehicle (optional). */
    dispose: function (root) {
      root.traverse(function (o) {
        if (o.isMesh) {
          if (o.geometry) o.geometry.dispose();
          var m = o.material;
          if (m) { [].concat(m).forEach(function (mm) { mm.dispose(); }); }
        }
      });
    }
  };

  window.VehicleFactory = VF;
})();
