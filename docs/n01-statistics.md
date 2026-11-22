# Atribución de estadísticas n01

Verificado el 22/11/2026 con el encuentro `t_QVou_5113_lg_0_qfre_ei7J_k3jK` (27 sets, 53 legs).

## Fuentes públicas y formato

- Historial paginado: `https://lb2.n01darts.com/n01/tournament/n01_history.php?cmd=get_t_list&tdid=TORNEO&skip=0&count=30&name=`.
- Todos los sets y visitas: `https://lb2.n01darts.com/n01/tournament/n01_online_t.php?cmd=get_setdata&tmid=ENCUENTRO`.
- Visor de referencia: https://n01darts.com/n01/tournament/n01_v2/js/n01_view.js (funciones `legOrder`, `orderHeaderIndex`).
- Interpretación de cierres: https://n01darts.com/n01/tournament/n01_v2/js/n01_c_stats.js (`calcLeg`).

`statsData[side].order` identifica jugadores por `oid`. `legData[leg].order[side]`, cuando existe, sustituye ese orden; si falta se hereda el último orden de leg, y finalmente el del set. La visita i (desde cero, excluido el registro inicial de saldo) pertenece a `order[i % order.length]`. `first` determina qué lado empieza, no cambia la rotación interna. El contador se reinicia por leg.

Cada `playerData[side]` empieza con el saldo inicial. Las visitas normales consumen tres dardos (también un cero/bust). Los cierres se codifican con score -1, -2 o -3: son los dardos empleados y los puntos son la diferencia de saldos. No se divide el resultado colectivo por el número de jugadores.

## Definiciones de la página

- Solo encuentros terminados, sets no borrados y legs completos de 01; se rechazan formatos o alineaciones ambiguos. Los desempates `middleForDiddle` se excluyen con aviso.
- Media: puntos propios / dardos propios × 3.
- First 9: primeras tres visitas **propias** de cada leg, o las disponibles si termina antes. No son los nueve primeros dardos del lado colectivo.
- 100+: 100–139; 140+: 140–179; 180: exactamente 180. Incluyen los cierres que alcanzan esos rangos.
- Cierre: exclusivamente su autor. Mejor leg personal: solo modalidad individual.
- Legs/sets: participación en la alineación. Victoria del leg compartida por los alineados; victoria de set si su lado gana más legs. PJ: encuentros distintos.
- Los KPI y rankings de equipos siguen siendo los agregados oficiales de todas las modalidades. El selector afecta a las estadísticas individuales y al detalle.
- La vista del equipo permite desplegar ambos lados, alineación, salida, visitas y aportación de cada jugador. No confundir la posición de ranking con el turno.
- Si falla alguna descarga o no se puede interpretar un set, no se presenta un agregado parcial como verificado. Cargar permite reintentar; cambiar modalidad no descarga de nuevo.

## Validación

`node --test tests/n01-detail.test.cjs`

En el encuentro real, la reconstrucción suma exactamente los agregados oficiales: OLOT 25.106 puntos / 1.452 dardos; CEDSAB 24.553 / 1.449. En la tripleta de CEDSAB: Rafael 281/15, Jesus 238/15, Ramon 182/14; cierre de 20 atribuido a Ramon. La tripleta del rival acaba con 15, 15 y 12 dardos, reflejando visitas desiguales.

## Vista de jugadoras

La categoría independiente «Estadísticas por jugadora» enlaza desde el inicio a `jugadoras.html` para cada liga. Reúne a todas las jugadoras identificadas con datos en una tabla completa, sin límite de diez filas, con equipo de procedencia, PJ, sets y legs ganados/jugados, puntos y dardos propios, media 3D, First 9, 180s, mejor cierre y mejor leg individual. No hay selector de equipo. Las páginas generales de torneo y equipo mantienen sus funciones anteriores.

Los filtros de modalidad permiten consultar individuales, parejas y tripletas. El mínimo de legs solo afecta a los gráficos de medias, no oculta filas de la tabla completa. Los KPI resumen los datos del grupo; su media es ponderada por dardos. La identificación por nombres sigue siendo orientativa y los datos corresponden a encuentros finalizados verificables.

La API consultada no aporta un campo de categoría femenina. A petición del propietario se usa una identificación **orientativa por el primer nombre**, normalizando mayúsculas, acentos y licencias antepuestas. No se buscan nombres dentro de los apellidos ni en cualquier parte del nombre compuesto: «Josep Maria» y «Arturo Miguel Elena» no se incluyen. No reconocer un nombre no equivale a clasificar a esa persona como hombre. La interfaz avisa de posibles errores y omisiones, también cuando la selección está vacía.

La lista de primeros nombres y las excepciones están en `n01-jugadoras.js`. Se puede corregir una persona mediante `overrides['torneo:equipo:oid'] = true` (incluir) o `false` (excluir). Las excepciones se aplican a los rankings y KPI globales de jugadoras. No se presenta esta heurística como una clasificación oficial.

Revisión de los registros disponibles el 22/11/2026:
- Divisió d’Honor 2026/27: 6 coincidencias (Iolanda Riba, Estefania Ros, Judit Riera, Lina Guerrero, Maria Dolores Cascales y Uxue Lorca).
- Primera Divisió 2025/26: 17 coincidencias.

Validación completa: `node --test tests/*.test.cjs` (13 pruebas, incluidas carga de las tres páginas, cambios de modalidad y una tabla de 17 jugadoras de distintos equipos). Los recuentos anteriores proceden de la lista pública de estadísticas; la vista reconstruida solo muestra participantes con legs verificables de la modalidad seleccionada.
