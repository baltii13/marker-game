# MARKER — página para itch.io

Todo listo para publicar en 10 minutos.

## 1. Crear el proyecto
1. Entra en https://itch.io/game/new
2. **Title**: `MARKER`
3. **URL**: `baltii13-marker` (o la que prefieras)
4. **Kind of project**: `HTML` ← importante

## 2. Subir el build
- Arrastra `MARKER_itch_html5.zip` (ya generado, 1.5 MB)
- Marca **"This file will be played in the browser"**
- Viewport: **1280 × 720**, marcar *Fullscreen button*
- Guarda y visita tu página para probarlo

## 3. Textos listos para copiar

### Tagline (una línea)
> Brew moonshine in the valley. Sell to strangers. Wash the cash at Lucky Nine.
> Outrun the cops. Owe the wrong man and he comes to collect.

### Descripción (About)
```
MARKER is a crime-life sandbox in a single closed valley city — dusk forever,
neon on wet asphalt, and a whole economy running under the radar.

BREW — mash corn in a hidden alley still, chase quality batches
SELL — hooked customers walk up to YOU; pawn shops pay 115%
WASH — the casino cage cleans your dirty cash (25% cut, daily cap)
GAMBLE — blackjack with a marked deck, dice, and your own markers
SURVIVE — rent every 3 days, heat, patrols with vision cones,
          a collector who visits when you default

• Open world: 8×8 block valley city + harbor + pier + club interior
• Real animated characters (idle / walk / run), traffic with real car models
• Full day/night cycle, storms, dynamic sun, bloom, film grain
• Your character and car are real GLTF models — swap them from files
• Runs in the browser. Nothing to install.
```

### Créditos / licencias (obligatorio incluir)
```
3D assets: Quaternius (CC0) · Kenney (CC0) · three.js examples (MIT)
Engine: three.js r147 · Music/SFX: procedural WebAudio
```

### Tags sugeridos
`crime` · `sandbox` · `open-world` · `casino` · `management` · `3d`
`low-poly` · `singleplayer` · `simulator`

## 4. Capturas
Toma 3–5 dentro del juego:
- El valle de noche desde el muelle (neones + ferris wheel)
- Tu personaje vendiendo a un cliente enganchado (etiqueta dorada)
- Persiguiendo/despistando a la policía (cono rojo)
- Mesa de blackjack con la baraja marcada revelada
- El still con humo saliendo en el callejón

(Con "Allow remote debugging" aprobado en Chrome, puedo capturarlas yo.)

## 5. Precio / visibilidad
- **Free** o **Donation** ($0 mínimo) para arrancar
- Marca *Community posts* si quieres feedback de jugadores

## 6. Después de publicar
Pásame el URL y hago: primera ronda de feedback → ajustes de balance →
actualizaciones con `python tools/paste_builder.py` + re-zip.
