-- reseñas
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2taVFNrdHhWRk5wYUZsSFR5MUNNa0kwT1dkaVNIYxAB', 'Yago Sanchez', '2026-08-23', 5, 'La verdad, las pastas son una locura. Fui a comprar unos sorrentinos y son riquísimos. Además, Paula me atendió súper bien, una genia total. Da gusto ir a un lugar donde el producto es tan bueno y te atienden con la mejor onda. ¡Recomendadísimo!', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJE1hOo9ijMpQRcAZkNHay_CI'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2toMWRUWTBWRlF4T0RsblJVNUJWbGhYU2t0TE1VRRAB', 'Virginia Moyano', '2026-08-23', 4, 'Riquísimas las pastas, las amo. Pero están muy picantes las salsas! Antes no era así, no sé si fue esta tanda que están picantes, si cambiaron de cocinero o si se les cayó el ají, pero están incomibles. Ni rebajada con salsa de tomate se puede comer. Menos es más, porfa que vuelvan las salsas de antes', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJE1hOo9ijMpQRcAZkNHay_CI'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT25oU1VsQnZiMUYzZVZBeVUwcGtOVEpmTUU1Wk1VRRAB', 'Camila Pucheta', '2026-08-12', 5, null, 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJE1hOo9ijMpQRcAZkNHay_CI'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2xoNGF6TlBkVWxCWWxWSlFtcEZjbUZJTFdZNVNVRRAB', 'Carlos Koval Yanzi', '2026-08-02', 4, null, 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJE1hOo9ijMpQRcAZkNHay_CI'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT25KVmNWUkVUbEZXY1RKcmNHVldiazFaYUVkdFNsRRAB', 'Gabriel Mondino', '2026-08-01', 4, null, 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJE1hOo9ijMpQRcAZkNHay_CI'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'ChdDSUhNMG9nS0VJQ0FnSUNMZy1pbDRRRRAB', 'César Lemos', '2026-08-09', 5, 'Excelente atención, excelente calidad y sabor, rapidez en el envío. Siempre todo OK!', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJ-VIhviCjMpQRdsd1qDkDq_M'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT21veWFqbGpjMWs0Y1ZGT09GUkJSR2wxYVhkTWRVRRAB', 'Franco Minoli', '2026-09-01', 5, 'Que terrible esa hamburguesa 🤤🤤', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJa2cWiXmZMpQRcItMChl0WEs'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT21aT09HMVFjR1EyTmxkWlFWTjFkWGRpYWpKTVkzYxAB', 'Daiana Rossetti', '2026-08-30', 5, null, 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJa2cWiXmZMpQRcItMChl0WEs'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2xOYU1qZEtRaTFFU0ZWQ01FRkJkV1JXUTBjNVIyYxAB', 'Ignacio Francisco', '2026-08-30', 5, 'Increíble tanto las burgers y los lomos, buenísimas las promos para cortar la semana, no falla!', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJa2cWiXmZMpQRcItMChl0WEs'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2tOQ2MzWmFhemh4ZDFrNFdtSlFhMWRVUVhCNldGRRAB', 'Lucas Mena', '2026-08-29', 5, 'Buena comida y atención', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJa2cWiXmZMpQRcItMChl0WEs'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2toWmJGWmpXRWRhVURKcU5VczBaRmhPVVVaWlpFRRAB', 'Agus Linzoain', '2026-08-17', 5, 'Buenisimas las hamburguesas y las papas también. 10/10', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJa2cWiXmZMpQRcItMChl0WEs'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT25SMGJqTkdWMGhLZW5ONVpXTlpUVFJrYjJFMk5HYxAB', 'Andi Grangetto', '2026-08-09', 5, 'Una DELICIA! Carne de primera, pan super rico, proporciones justas, mayonesa sabrosisima! Lo super recomiendo ( y generoso tamaño) Censurado URCA 💪🏼❤️', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJa2cWiXmZMpQRcItMChl0WEs'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2s1R1pGWTBVR1IzYVRJMFJtWTJhRGxyWVZaQmQxRRAB', 'Yanina Peirone', '2026-08-09', 5, 'Buenisimos los lomos!!! El pan muy rico !!!', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJa2cWiXmZMpQRcItMChl0WEs'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT21sMFpWQkJkbkE1Vld4UFZrVjFURE5XUlVkUFFtYxAB', 'Emilio Zlocowski', '2026-08-09', 5, 'Muy bien las hamburguesas, pedimos la bacon and bacon y la Smokey, las dos muy ricas', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJa2cWiXmZMpQRcItMChl0WEs'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2tGVVJrdFRTa3R0VTA5bVZEbDVla3hoVEc5MFJrRRAB', 'Patricio Cartier', '2026-09-01', 5, 'Excelente atención y muy rico el lomo. Probamos el censurado, exquisito!!! Excelente atención de Nilton, un crack!!!', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJBckoomijMpQRzLCSWoM5XcQ'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2kxd1EzSm9VRlJzV0cwd01FaFFZMnB3V2taVlRtYxAB', 'Gonzalo Andres Lopez', '2026-08-29', 5, 'Muy buenas las promos que te dan, totalmente recomendables.', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJBckoomijMpQRzLCSWoM5XcQ'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT25rMFFtcE9UazVXYVdsZmNIcGxiMkpQZDAxZldIYxAB', 'Santiago Maldonado', '2026-08-27', 5, 'Bueno. Me tomo el tiempo de redactar una reseña que espero esté a la altura de la hamburguesa deglutida por quien les habla.

Miércoles a la noche, 21:01 hs, mi novia tuvo un mal día y un gran amigo, a quien llamaremos Titus, me hace saber del impacto positivo que puede llegar a tener una hamburguesa en el humor de la pareja de uno. No lo dudé, en el acto ingresé al Instagram de la mejor hamburgueseria de Córdoba, quienes anunciaron había una promoción de tres hamburguesas por 23.000. Envíe un mensaje realizando el pedido, en 30 minutos (conforme lo pactado con quien me atendió vía Wtsp) el delivery se encontraba en la puerta de mi edificio.

3 hamburguesas, desconozco el nombre de cada una de ellas, cada una con un sabor AUTÉNTICO y DIFERENCIAL. Cada mordisco impactaba en el rostro de mi pareja, hasta que de un momento a otro, se visualizaba una sonrisa de oreja a oreja. La conversación fluyó, hubo risas y las hamburguesas fueron ANIQUILADAS en 12 minutos.

Cada bocado me llevaba a mi infancia, cuando comía comida chatarra y no había preocupaciones, tales como: alquiler, monotributo, epec y ecogas. Cada hamburguesa fue realizada con amor y pasión, el sabor daba cuenta de ello.
Gracias censurado por alégrame el miércoles, que pensé iba a ser otro dia intrascendente en mi vida.
Ni frich, ni hoppines, ni mística ni nada.
CENSURADO, hoy y SIEMPRE.', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJBckoomijMpQRzLCSWoM5XcQ'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT21wT01DMVNWbTFXTTFOcWRVWkNVRTluYms4d1NtYxAB', 'Ivan Acquisto', '2026-08-24', 5, 'Excelente atención, muy atentos y excelente calidad !', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJBckoomijMpQRzLCSWoM5XcQ'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT21NdFZIQkVRbmxGVFZadFZETm5ZbUo2ZW1OSWRuYxAB', 'Benjamín Medina Barros', '2026-08-24', 5, 'Tremendas las hamburguesas y los lomos.', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJBckoomijMpQRzLCSWoM5XcQ'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2tWRFRFOXdjbEo0ZDJsNmFWZEJOVGhuUkZsblduYxAB', 'Christian leonel Torres', '2026-08-21', 3, 'Muy buena la hamburguesa, si te pasas por el local, en 10 min te lo hacen', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJBckoomijMpQRzLCSWoM5XcQ'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT25oSWNubHNiMDV2WlRWUFVIVnJTMUJTVGtkNFgxRRAB', 'Ignacio Di Benedetto', '2026-08-19', 5, 'Compré una CENSURADA SIMPLE con descuento de Tuki, me pareció LA MEJOR HAMBURGUESA que he comido en mucho tiempo. Gratamente sorprendido ✨', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJBckoomijMpQRzLCSWoM5XcQ'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2kxSU1XaHZlR0ZFZFRCTFoxQmhSR2x1Ym14cldIYxAB', 'Luna Serrallonga', '2026-08-19', 5, 'riquísimas hamburguesas y vienen con abundantes papas!!', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJBckoomijMpQRzLCSWoM5XcQ'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT21sSFZYUmxkMjlzU3pNNWN6VkhPSEo1ZW1zNGRWRRAB', 'Paul Lewis', '2026-08-25', 5, 'Un espectáculo', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJsydZIZufMpQR15UFXpetqr0'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT21OamFIQjBTRm93TVZwMGN6UlhiR1l5WkZaa1ZsRRAB', 'Ganalel', '2026-08-13', 5, 'Atención y servicio rápidos. Las hamburguesas riquísimas, bien cocidas y sabrosas. Se puede comer en el lugar sentandose en el kiosko de al lado.', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJsydZIZufMpQR15UFXpetqr0'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2pCRldFeG1WV1pqU3pGWFRqTmpTbVk1ZDJsMU5XYxAB', 'Agustina Bravo', '2026-08-12', 4, 'Muy buenos lomitos, el pan y la carne re ricas, las mayos le dan el toque. Las hamburguesas también son sabrosas y abundantes, me gustan todas las variedades! También excelente atención siempre', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJsydZIZufMpQR15UFXpetqr0'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2xGa01FcHVTbE10WjI1cWREWm9ZbFJzVTFRNFIzYxAB', 'Julieta Piazzi', '2026-08-22', 5, 'súper rápido, muy buen precio y demasiado rico, 10/10 mi nuevo lugar de hamburguesasssss', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJhyvxXv-ZMpQRxWijKRAWC_c'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT21vNGMybEdNRlUwVkhCNllYRTJkV3BIVUhkQ05sRRAB', 'Salva Diaz', '2026-08-03', 5, null, 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJhyvxXv-ZMpQRxWijKRAWC_c'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT25KRE5rbEtXV2hxU1RaNlIwcFBlVjh4ZG5ndE0yYxAB', 'Nicolas Larocca', '2026-08-03', 5, 'Papas tremendas de crocantes y sabrosas y las hamburguesas que pedimos un 10 . Super recomendado 🍔⭐️⭐️⭐️⭐️ ⭐️', 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJhyvxXv-ZMpQRxWijKRAWC_c'
on conflict (google_review_id) do nothing;
insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, 'Ci9DQUlRQUNvZENodHljRjlvT2paM1pEZFpkVFJTYkY5eU9ERk1hVlJaU200ellWRRAB', 'Julián Bertona', '2026-08-18', 5, null, 'sheets:resenas'
from public.locations l where l.google_place_id = 'ChIJNRr3ox9nLZQRNU3Neh4PaYA'
on conflict (google_review_id) do nothing;
