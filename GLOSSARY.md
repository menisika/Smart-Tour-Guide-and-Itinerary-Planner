# Promenade

Promenade plans an outing around a city for a party of one or more people — fitted to their time, interests and limits — and accompanies them along the route. This glossary fixes the shared language of the product; only agreed terms belong here. The Russian word used in product discussions is given in parentheses.

## Language

### Places

**Place** (Место):
A named point of interest — the atomic stop of a Route. It is seen from outside or visited inside.
_Avoid_: object, POI, point, location, attraction

**Territory** (Территория):
A Place with a boundary that contains other Places and can itself be a stop of a Route. A nested Place has exactly one parent — the smallest Territory that contains it.
_Avoid_: complex, zone, area, site, grounds

**Entrance** (Вход):
A point on the boundary of a Territory through which people get in.
_Avoid_: gate, access point

**Venue** (Заведение):
A Place people go into to eat or drink: a café, restaurant or bar.
_Avoid_: establishment, food spot, restaurant (as the general term)

**Custom Place** (Своё Место):
A named point on the map that a person added to their own Route. It is visible only in that Route and has no Dossier and no Story.
_Avoid_: user point, pin, marker

**Access Rules** (Правила доступа):
The conditions under which a Place can be visited: opening hours, price, whether a ticket is needed. A nested Place inherits the Access Rules of its Territory.
_Avoid_: schedule, opening hours (as the general term), restrictions

**Proposed Change** (Предложенная правка):
A change to the data of a Place that has been put forward and is not yet applied or rejected. It comes from a Source, a Freshness Check, a Correction or a Curator, and carries its evidence.
_Avoid_: suggestion, edit request, patch, diff

**Freshness Check** (Проверка актуальности):
A scheduled look at whether what the base says about Places is still true: a re-read of a Source, or a reading of a Place's own website. It yields Proposed Changes and confirmations.
_Avoid_: check (on its own), crawler, scraper, agent, sync

### Routes and outings

**Route** (Маршрут):
A plan: an ordered set of Places together with the parameters it was built for. It is saved, edited, shared and published.
_Avoid_: tour, itinerary, track, path, trip

**Outing** (Прогулка):
One passage of a Route by a specific Party at a specific time. Visits and ratings belong to the Outing, not to the Route.
_Avoid_: walk, session, tour, trip, run

**Travel Mode** (Способ передвижения):
How a Party moves between the stops of a Route: on foot, by bicycle or by car.
_Avoid_: transport, vehicle, route type

**Break** (Пауза):
A stop of a Route without a specific Place: time for coffee, food or rest, with a list of nearby Venues.
_Avoid_: pause, slot, rest stop

**Route Pack** (Пакет Маршрута):
Everything an Outing needs to work without a network, downloaded to the device as one unit.
_Avoid_: offline bundle, download, cache

**Route Page** (Страница Маршрута):
The public view of a Route — map, Places, photos, timing — that opens by a link in a browser without installing anything.
_Avoid_: landing page, preview, share page

**Guided Mode** (Режим «с гидом»):
The Outing mode in which the introduction, the Stories at Places and the bridges between them are played.
_Avoid_: audio mode, tour mode

**Quiet Mode** (Тихий режим):
The Outing mode without automatic Stories: only the Route and navigation. A Story can still be started by hand.
_Avoid_: silent mode, navigation mode

**Visit** (Посещение):
The recorded fact that a member of a Party was at a Place during an Outing.
_Avoid_: check-in, stop, attendance

**Recap** (Карточка итогов):
A summary of a finished Outing — route on the map, time, distance, Places — that can be saved or posted.
_Avoid_: summary card, results, report

### Party

**Party** (Компания):
The people of one Outing: those who go on it together. It may consist of a single person; it is not a standing list of friends.
_Avoid_: group, team, friends, company

**Organizer** (Организатор):
The member of a Party who created the Outing, edits its Route and makes the final decision. The role can be handed to another member.
_Avoid_: owner, host, admin

**Participant** (Участник):
A member of a Party who answers the Invitation and votes on Route options.
_Avoid_: guest, invitee, member

**Invitation** (Приглашение):
A link through which a person joins a Party and states their preferences for that Outing.
_Avoid_: invite, share link

**Meeting Point** (Точка сбора):
The place and time where a Party meets before the Outing starts.
_Avoid_: rendezvous, start point

**Chat** (Чат):
The conversation of the members of a Party within one Outing.
_Avoid_: discussion, comments, messenger

### Catalog

**Catalog** (Каталог):
The collection of published Routes available to other people.
_Avoid_: library, showcase, marketplace

**Review** (Отзыв):
A User's text about a Route from the Catalog.
_Avoid_: comment, rating, feedback

### Knowledge about places

**Dossier** (Досье):
A verifiable set of facts about a Place with their sources, shared by all users. It is either a draft (collected automatically) or verified (checked by a Curator).
_Avoid_: fact sheet, place card, place profile

**Story** (Рассказ):
A text about a Place, generated from its Dossier and meant for a listener on an Outing.
_Avoid_: content, description, article, script

**Narration** (Озвучка):
The audio version of a Story.
_Avoid_: audio, audio guide, recording, voice-over

**Preparation** (Подготовка):
The background collection of knowledge about a Place from sources: compiling its Dossier and generating its Stories and Narration. The unit of Preparation is a Place, not a city; a prepared Dossier is not prepared again.
_Avoid_: city generation, indexing, scraping, ingestion

**Source** (Источник):
A body of data outside the product from which records about Places and facts are gathered, with its licence: the map, Wikidata, an encyclopedia, a register.
_Avoid_: feed, dataset, provider (a provider is a service we call)

**Key Place** (Ключевое Место):
A Place on the list a Curator keeps for a city: the Places that a Route there is expected to know. The list is seeded from how often a Place's articles are read and from its heritage category, and is the Curator's to change.
_Avoid_: top place, must-see, landmark

**Reference City** (Эталонный город):
A city in which the Dossiers of all Key Places are verified by a Curator. The first Reference City is Minsk.
_Avoid_: pilot city, demo city

**Coverage** (Уровень покрытия):
How well a city is prepared: the share of its Key Places with a verified Dossier, and the share of its Venues and of its Places that are visited inside whose opening hours are known.
_Avoid_: readiness, completeness

### Preferences

**Profile** (Профиль):
A person's standing preferences: their attitude to themes, their Dealbreakers and their pace. It is refined from ratings after Outings.
_Avoid_: questionnaire, tastes, settings

**Dealbreaker** (Запрет):
A person's hard condition that a Route may not violate. In a Party, any member's Dealbreaker binds everyone.
_Avoid_: veto, exclusion, filter, restriction

**Wish** (Пожелание):
Free text attached to one Route request, saying what is wanted this particular time.
_Avoid_: prompt, query, comment

### Feedback

**Correction** (Замечание):
A person's message that something is inaccurate in a Story, a Dossier or the data about a Place. Corrections are handled by a Curator.
_Avoid_: complaint, bug report, flag

**Complaint** (Жалоба):
A person's message that something published is unacceptable: a published Route, a Review or a Chat message. Complaints are handled by a Moderator.
_Avoid_: report, flag, correction

### People and roles

**Guest** (Гость):
A person without an account. Their Profile is kept on the device; their answers to an Invitation are kept with the Outing and deleted with it.
_Avoid_: anonymous user, visitor

**User** (Пользователь):
A person with an account.
_Avoid_: customer, client, account

**Author** (Автор):
A User in relation to a Route they published. It is a relation, not a separate role.
_Avoid_: creator, guide

**Curator** (Куратор):
An internal role: verifies Dossiers and Stories and maintains Reference Cities.
_Avoid_: operator, editor, content manager

**Moderator** (Модератор):
An internal role: handles Complaints about people and about what Users have published.
_Avoid_: controller, reviewer

**Administrator** (Администратор):
An internal role: manages system settings and roles.
_Avoid_: superuser, owner

### Access

**Plan** (План доступа):
A named set of capabilities and limits a person has: Free or Plus.
_Avoid_: tier, tariff, subscription (as the general term)

**Pass** (Пропуск):
A way to get the Plus Plan for a few days, without renewal.
_Avoid_: ticket, trial, day pass
