# Vehicle Models — Sources & Licenses

All assets in this folder are free for personal AND commercial use. No attribution required.

## kenney_car-kit/
- **Source:** Car Kit by Kenney (kenney.nl/assets/car-kit)
- **License:** CC0 1.0 (Public Domain) — https://creativecommons.org/publicdomain/zero/1.0/
- **Contents:** 50 GLBs — ~25 drivable vehicles (sedan/sports/SUV variants, taxi, police,
  ambulance, firetruck, garbage truck, delivery vans, box trucks, tractors, karts) plus
  kit pieces (wheels, debris, cones) used as street props.
- Native GLB format; pivot sits ~0.30 above ground (loader drops wheels onto y=0).

## quaternius_cars/
- **Source:** Cars Bundle by Quaternius (poly.pizza bundle `Cars-Bundle-FE5IWe6OMk`)
- **License:** CC0 1.0 (Public Domain)
- **Contents:** 7 smooth-shaded civilian cars — police, taxi, sedan (blue), sedan (teal),
  sports (orange), sports (white), SUV (white).
- Direct CDN download URL pattern: https://static.poly.pizza/<s3id>.glb

## Loader
`vehicle-loader.js` — same drop-in API as the character loader:
`VehicleFactory.spawn('q_taxi', {length: 4.5})` returns a ground-level model with
measured `.halfExtents {hx,hz}` for collision registration (footprint rule: always
derive from bounds, never hand-type).

## Recommended usage for a Schedule-1-style game
- Player traffic / parked cars: `q_*` Quaternius set (cleaner shading, consistent scale)
- City services & flavor: Kenney ambulance/firetruck/garbage/delivery/taxi
- Street props: cone, cone_flat, crate, tire
- All lengths normalized via the `length` opt so mixed packs share one road scale.
