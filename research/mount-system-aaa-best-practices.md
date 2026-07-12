# Mount System — recherche AAA et baseline Unreal

> Rapport de recherche pour un futur skill public `mount-system`.
> Sources primaires uniquement : documentation et API officielles, talks de
> développeurs first-party, blogs et patch notes des studios concernés.
> Recherche réalisée le 12 juillet 2026. Les choix de produit et d'architecture
> restent provisoires jusqu'à la session `grill-me`.

## Résumé exécutif

Un skill `mount-system` séparé est justifié. Les sources les plus solides
traitent une monture animale comme un **agent locomoteur avec son propre
lifecycle, sa propre agency et sa propre presentation**, pas comme un simple
speed modifier appliqué au rider. Rockstar décrit un cheval-compagnon crédible
et ArenaNet explique avoir explicitement rejeté le mount réduit à un boost
cosmétique ([Rockstar, GDC 2021](https://www.gdcvault.com/play/1027113/AI-Summit-Making-the-Believable),
[ArenaNet, Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/)).

Les conclusions structurantes sont les suivantes :

1. **Unreal ne fournit pas de recette mount complète.** Epic documente
   séparément Pawn/Controller, Mover, Network Prediction, GAS, Motion Warping,
   AI, World Partition et persistence, mais aucune source first-party ne
   combine ces briques en animal mount co-op production-ready
   ([Epic, Mover](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-in-unreal-engine),
   [Epic, Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine)).
2. **Mover demeure Experimental en UE 5.8.** Epic prévient que ses APIs,
   properties et data formats peuvent changer. Le skill devra employer des
   capability gates et des compile/runtime spikes, sans présenter ses symboles
   actuels comme un contrat stable
   ([Epic, Mover](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-in-unreal-engine)).
3. **Le Default Character Movement Set n'est pas une baseline quadrupède
   automatique.** Il suppose une vertical capsule pour tous les actors ; un
   mount devra soit accepter et valider cette approximation, soit utiliser un
   custom movement set sur `UMoverComponent`
   ([Epic, Mover Features and Concepts](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine)).
4. **Une seule displacement authority doit exister pendant `Mounted`.**
   C'est une recommandation dérivée du modèle Mover et du fait que le swept
   movement ne considère normalement que l'`UpdatedComponent` ; les attached
   components suivent sans contribuer un compound collision sweep
   ([Epic, UMoverComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/UMoverComponent),
   [Epic, UMovementComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UMovementComponent)).
5. **La control topology est la première décision d'architecture à griller,
   après le rôle produit et la runtime identity.** Un possession swap vers un
   mount Pawn suit le chemin Unreal naturel vers l'owning connection et
   l'autonomous prediction, mais dépossède le rider. Conserver le rider possédé
   stabilise son identité, mais aucune recette Mover first-party publique ne
   couvre un mount client-predicted non possédé
   ([Epic, Possess](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Pawn/Possess),
   [Epic, Actor Owner and Owning Connection](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-owner-and-owning-connection-in-unreal-engine)).
6. **Ground, flying et aquatic sont des movement identities, pas des flags.**
   ArenaNet leur donne des physics, abilities, resources, terrains et cameras
   différents ; Blizzard distingue aussi un flight dynamique fondé sur
   momentum/resource d'un steady flight
   ([ArenaNet, Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/),
   [Blizzard, Skyriding](https://news.blizzard.com/en-us/article/24104275/take-to-the-skies-with-skyriding)).
7. **Le durable mount record doit être séparé du runtime actor.** C'est une
   recommandation fondée sur l'Asset Manager, le SaveGame model et les failure
   categories publiées par Rockstar autour de summon, fast travel, bonding,
   cargo et cosmetics
   ([Epic, Asset Management](https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine),
   [Epic, Saving and Loading](https://dev.epicgames.com/documentation/en-us/unreal-engine/saving-and-loading-your-game-in-unreal-engine),
   [Rockstar, Title Update 1.11](https://support.rockstargames.com/articles/6dT8UroC7aKslsqA38oaxj/red-dead-redemption-2-title-update-1-11-notes-ps4-xbox-one)).
8. **Recommendation — utiliser une state snapshot idempotente pour
   join-in-progress et reconnect.** Plusieurs `OnRep` n'ont pas d'ordre garanti
   et des RPCs envoyés depuis différents actors n'ont pas d'ordre global ; cette
   absence d'ordre justifie de regrouper le binding rider↔mount dans une
   replicated struct révisionnée
   ([Epic, Replicated Object Execution Order](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicated-object-execution-order-in-unreal-engine)).

La recherche ne permet pas de présenter comme « AAA established practice » :

- une topologie réseau précise pour les animal mounts co-op ;
- un algorithme universel de safe dismount ;
- possession swap versus retained rider possession ;
- une transaction atomique GAS prediction + Mover rollback + mount binding ;
- une stratégie first-party 3D navigation turnkey pour flying/aquatic mounts ;
- une politique de collision entre les mounts de plusieurs joueurs.

Ces points sont des décisions de projet ou des spikes, pas des faits sur les
jeux cités.

## Portée et méthode

### Inclus

- animal et creature mounts ground, flying et aquatic ;
- un rider actif par joueur, avec passenger seats comme capability optionnelle ;
- third-person open-world action RPG ;
- Unreal-first, Mover-first, kinematic Network Prediction ;
- standalone, listen server et dedicated server ;
- co-op, join-in-progress et reconnect ;
- lifecycle, typed requests/outcomes, animation handoff, AI, combat adapters,
  summon, streaming, persistence, accessibility, diagnostics et validation.

### Exclus

- voitures, motos, trains, bateaux pilotables et aircraft mécaniques ;
- build-your-own vehicles ;
- multi-crew vehicle physics ;
- wheel, tire, suspension et buoyancy physics comme gameplay principal ;
- une copie supposée de l'architecture interne d'un jeu observée seulement en
  gameplay.

Ces domaines doivent aller vers un futur `vehicle-system`.

### Légende d'évidence

| Label | Sens |
| --- | --- |
| **Stable fact** | Contrat moteur ou comportement largement stable, documenté par le propriétaire de la source |
| **Version-sensitive fact** | API ou feature actuelle, Experimental/Beta ou susceptible de changer |
| **Implementation fact** | Détail interne exposé par le développeur du jeu |
| **Product behavior** | Comportement public confirmé par le studio, sans inférence d'architecture |
| **Product evidence** | Failure ou fix confirmé par une source first-party, sans preuve de root cause interne |
| **Recommendation** | Architecture proposée ici à partir des contraintes et sources |
| **Unknown** | Aucune réponse first-party publique suffisamment précise |

Une recommandation n'est jamais attribuée à un jeu de référence. Un product
behavior n'est jamais transformé en revendication sur son netcode ou son object
model.

## Evidence matrix

| Sujet | Fait utilisable | Classe | Source primaire |
| --- | --- | --- | --- |
| Statut Mover | Mover supporte modular movement et rollback, mais reste Experimental ; API et formats peuvent changer | Version-sensitive fact | [Epic — Mover](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-in-unreal-engine) |
| Mover primitives | Un mode actif, layered moves temporaires, modifiers et instant effects | Version-sensitive fact | [Epic — Mover Features](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine) |
| Quadruped baseline | Le Default Character Movement Set suppose une vertical capsule | Version-sensitive fact | [Epic — Mover Features](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine) |
| Generic mount mover | `UMoverComponent` est un `UActorComponent`; `UCharacterMoverComponent` n'est qu'une specialization dérivée | Version-sensitive fact | [Epic — UMoverComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/UMoverComponent), [Epic — UCharacterMoverComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UCharacterMoverComponent) |
| Collision | Le swept movement considère l'`UpdatedComponent`; les enfants attachés suivent sans sweep | Stable fact | [Epic — UMovementComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UMovementComponent) |
| Possession | `Possess` s'exécute seulement sur authority ; Controller/Pawn est normalement one-to-one | Stable fact | [Epic — Possess](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Pawn/Possess), [Epic — Controllers](https://dev.epicgames.com/documentation/en-us/unreal-engine/controllers-in-unreal-engine) |
| Ownership | Possession et owner chain déterminent owning connection, RPC routing et replication conditions | Stable fact | [Epic — Actor Owner and Owning Connection](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-owner-and-owning-connection-in-unreal-engine) |
| Replicated transition | Plusieurs `OnRep` et RPCs cross-actor n'ont pas d'ordre global garanti | Stable fact | [Epic — Replicated Object Execution Order](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicated-object-execution-order-in-unreal-engine) |
| Mover examples | Fixed tick, interpolated simulated proxies et smoothing sont recommandés ; sample non destiné au shipping | Version-sensitive fact | [Epic — Mover Examples](https://dev.epicgames.com/documentation/unreal-engine/mover-examples-in-unreal-engine) |
| AI input | Mover expose des input producers et un NavMover bridge ; la documentation RVO actuelle est contradictoire | Version-sensitive fact | [Epic — UMoverComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/UMoverComponent), [Epic — UNavMoverComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UNavMoverComponent), [Epic — Mover Features](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine) |
| GAS placement | Un Pawn peut utiliser l'ASC d'un PlayerState afin de préserver cooldowns/data au changement de Pawn | Stable fact | [Epic — Ability System Component and Attributes](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-system-component-and-gameplay-attributes-in-unreal-engine) |
| Motion Warping | Named warp targets ajustent le root motion ; un Mover adapter et des sim-driven root-motion paths existent actuellement | Version-sensitive fact | [Epic — Motion Warping](https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-warping-in-unreal-engine), [Epic — Mover API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover) |
| Multi-actor animation | Contextual Animation expose roles, bindings, warp/IK et late-join data, mais reste Experimental | Version-sensitive fact | [Epic — ContextualAnimation API](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ContextualAnimation) |
| Streaming | World Partition utilise des streaming sources et expose un completion check | Stable fact | [Epic — World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine), [Epic — IsStreamingCompleted](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UWorldPartitionSubsystem/IsStreamingCompleted) |
| Asset/persistence | Primary Assets peuvent être async-loaded ; `AsyncSaveGameToSlot` est recommandé pour le SaveGame local | Stable fact | [Epic — Asset Management](https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine), [Epic — Saving and Loading](https://dev.epicgames.com/documentation/en-us/unreal-engine/saving-and-loading-your-game-in-unreal-engine) |
| Quadruped pathing | Une circular biped footprint échoue pour un long quadrupède dans les passages étroits | Implementation fact | [Microsoft — On All Fours](https://www.gdcvault.com/play/1023433/On-All-Fours-Creating-Realistic), [slides](https://media.gdcvault.com/gdc2016/Presentations/Karlsson_Tobias_On_All_Fours.pdf) |
| Horse control | RDR2 combine lateral movement, gait ranges, terrain awareness, avoidance, motivations et rider layers | Implementation fact | [Rockstar — GDC session](https://www.gdcvault.com/play/1027113/AI-Summit-Making-the-Believable), [slides](https://media.gdcvault.com/GDC%2B2021/making_horses_gdc2021.pdf) |
| Rider sync | RDR2 dérive deux rider/passenger layers du horse locomotion data sans mapping clip 1:1 | Implementation fact | [Rockstar — slides](https://media.gdcvault.com/GDC%2B2021/making_horses_gdc2021.pdf) |
| Unique movement identity | GW2 donne à chaque mount ses physics, camera, ability, endurance et terrain role | Implementation fact | [ArenaNet — Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/) |
| Combat transition | GW2 a ajouté des engage skills parce que manual dismount puis attack était clunky | Implementation fact | [ArenaNet — Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/) |
| Health policy | GW2 utilise une mount health séparée et force le dismount sans réduire la santé du rider | Product behavior | [ArenaNet — Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/) |
| Dynamic flight | Dragonriding/Skyriding échange altitude, speed et Vigor ; Steady Flight reste une autre policy | Product behavior | [Blizzard — Dragonriding](https://news.blizzard.com/en-gb/article/23818251/updated-aug-25-dragonriding-and-you-ascending-to-new-heights-of-skill), [Blizzard — Skyriding](https://news.blizzard.com/en-us/article/24104275/take-to-the-skies-with-skyriding) |
| Aquatic identity | GW2 Skimmer traverse la surface et peut obtenir l'underwater traversal | Product behavior | [ArenaNet — Introduction to Mounts](https://www.guildwars2.com/en/news/introduction-to-mounts-in-guild-wars-2/) |
| Accessibility guidance | Microsoft recommande remapping, alternatives aux holds/repeated presses et réglages de camera motion | Stable fact | [Microsoft — XAG 107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107), [Microsoft — XAG 117](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117) |
| Shipped accessibility | Camera assist, ledge guard et mounted auto-vault sont des options shipped | Product behavior | [Naughty Dog — Accessibility](https://www.naughtydog.com/blog/the_last_of_us_part_ii_accessibility_features_detailed) |
| Real failure classes | Rockstar a corrigé summon, fast-travel, bonding, IK, revive, mounted combat, session et synchronization bugs | Product evidence | [Rockstar — TU 1.09](https://support.rockstargames.com/articles/6XLmD65fhWzs67WCok5hud/red-dead-redemption-2-title-update-1-09-notes-ps4-xbox-one), [TU 1.11](https://support.rockstargames.com/articles/6dT8UroC7aKslsqA38oaxj/red-dead-redemption-2-title-update-1-11-notes-ps4-xbox-one), [TU 1.15](https://support.rockstargames.com/articles/28AmlyPGLVKsJ8OpdN8myn/red-dead-redemption-2-title-update-1-15-notes-ps4-xbox-one-pc-stadia) |

## Enseignements AAA exploitables

### La monture est un agent, pas un speed modifier

Rockstar présente le cheval comme un partenaire crédible dont le movement et la
réaction au monde participent à la relation avec le joueur
([Rockstar, GDC session](https://www.gdcvault.com/play/1027113/AI-Summit-Making-the-Believable)).
ArenaNet explique avoir construit les mount physics et animation sets tôt, avec
une movement identity et une camera propres à chaque mount
([ArenaNet, Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/)).

**Recommendation :** un `MountDefinition` doit décrire un locomotion contract,
une anatomy/collision policy, une agency policy et une presentation contract.
Un skin qui ne change que l'apparence ne doit pas modifier ces paramètres.
ArenaNet confirme comme product behavior que ses dyes et mount skins n'affectent
ni abilities ni power
([ArenaNet, Introduction to Mounts](https://www.guildwars2.com/en/news/introduction-to-mounts-in-guild-wars-2/)).

### Contrôle direct, intention et agency

RDR2 expose une direction de movement réactive dont l'orientation peut suivre
avec retard, du lateral movement, de l'environment awareness et des motivations
qui peuvent contrarier le rider dans des situations fortes
([Rockstar, slides](https://media.gdcvault.com/GDC%2B2021/making_horses_gdc2021.pdf)).
Nintendo décrit publiquement un cheval qui évite des arbres et obstacles afin de
libérer le joueur pour d'autres actions ; cela décrit le produit, pas son
algorithme
([Nintendo, Zelda Wii U reveal](https://www.nintendo.com/en-gb/News/2014/December/Nintendo-announces-new-details-for-three-games-coming-in-2015-including-a-new-look-at-The-Legend-of-Zelda-for-Wii-U-941917.html)).

**Recommendation :** séparer :

- `RiderIntent` : desired direction, desired speed/gait, ability flags ;
- `AuthoredConstraint` : no-mount, corridor, landing, water/air restrictions ;
- `SafetyAdjustment` : collision, cliff/edge stop, non-traversable footprint ;
- `AssistAdjustment` : road follow, auto-vault, camera/navigation assistance ;
- `MountAgency` : agitation, hesitation, flee ou personality, si le design le
  retient ;
- `MovementOutcome` : transform, velocity, active mode, gait, refusal/reason.

La priority order proposée pour le grill est :

~~~text
Safety > Authored constraint > Accessibility assist > Rider intent > Ambient agency
~~~

Ce priority order est une recommandation, pas une architecture révélée par les
jeux cités.

### Gaits continus plutôt que quatre vitesses discrètes

Les slides Rockstar montrent walk, trot, canter et gallop avec des ideal/full
ranges qui se chevauchent ; les gaits peuvent exprimer l'effort plutôt qu'une
association rigide gait=speed
([Rockstar, slides](https://media.gdcvault.com/GDC%2B2021/making_horses_gdc2021.pdf)).

**Recommendation :**

- garder speed/acceleration/turn rate comme simulation facts ;
- sélectionner gait et animation phase à partir de ranges avec hysteresis ;
- permettre des transition cycles interruptibles ;
- exposer cadence/phase à l'animation, sans laisser l'AnimBP écrire la
  locomotion ;
- valider foot sliding à chaque accélération, freinage, pente et correction
  réseau.

### Une footprint quadrupède change navigation et collision

Le talk Microsoft montre qu'une circular pathfinding radius de biped ne décrit
pas correctement un animal long dans un environnement obstacle-rich ; sa
solution construit et lisse un path, adapte la spine au path et conserve des
breadcrumbs pour sortir d'un dead end
([Microsoft, GDC session](https://www.gdcvault.com/play/1023433/On-All-Fours-Creating-Realistic),
[slides](https://media.gdcvault.com/gdc2016/Presentations/Karlsson_Tobias_On_All_Fours.pdf)).

**Recommendation :**

- ne pas confondre locomotion collider, pathfinding footprint et animation
  footprint ;
- tester shoulder width, body length, head clearance et turning envelope ;
- conserver un escape/reverse contract pour les dead ends ;
- faire valider toute approximation capsule par une doorway/switchback suite ;
- ne jamais supposer que plusieurs attached colliders créent un compound sweep,
  puisque le movement component déplace normalement son seul
  `UpdatedComponent`
  ([Epic, UMovementComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UMovementComponent)).

### Le rider suit la locomotion sans clip mapping 1:1

Rockstar indique que rider et passenger reçoivent deux layers dérivés des horse
locomotion data, interpolent leurs paramètres indépendamment et n'exigent pas
une correspondance clip 1:1
([Rockstar, slides](https://media.gdcvault.com/GDC%2B2021/making_horses_gdc2021.pdf)).
Le talk Snowdrop pour Avatar indique que le mount doit être évalué avant le
player dans les cas riding/flying, puis que les graphs peuvent être pipelinés
([Massive, GDC session](https://www.gdcvault.com/play/1034412/Upgrading-the-Snowdrop-Engine-for),
[slides](https://media.gdcvault.com/gdc2024/Slides/GDC%2Bslide%2Bpresentations/Simmons_Joshua_Upgrading_the_Snowdrop.pdf)).

**Recommendation :** le mount publie d'abord un stable presentation frame
(seat transform, linear/angular velocity, gait, phase, terrain frame,
acceleration, impact); le rider AnimBP le consomme ensuite. L'ordre d'évaluation
est un contract testable.

## Baseline Unreal et capability gates

### Mover-first, mais pas Default-Set-first

`UMoverComponent` est un generic actor component, tandis que
`UCharacterMoverComponent` est une specialization dérivée
([Epic, UMoverComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/UMoverComponent),
[Epic, UCharacterMoverComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UCharacterMoverComponent)).
Le Default Character Movement Set est un bridge familier aux utilisateurs du
CMC et suppose une vertical capsule
([Epic, Mover Features](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine)).

Le futur skill doit donc avoir un capability branch explicite :

| Branch | Quand l'utiliser | Gate obligatoire |
| --- | --- | --- |
| Vertical capsule approximation | Le mount tient réellement dans une capsule et le level design accepte cette footprint | Doorway, overhang, side collision, turn-in-place et edge suite réussie |
| Custom kinematic mount movement set | La body length, le turning envelope ou les modes rendent le Default Set trompeur | Custom Input/Sync/Aux state, collision contract et rollback tests |
| Physics backend | Seulement si physics-as-gameplay est une exigence qui remplace le choix kinematic | Décision séparée ; hors baseline actuelle |

Le backend physics n'est pas interchangeable avec Network Prediction. Les
Mover Examples précisent que les physics-driven Mover actors ne sont pas
synchronisés avec ceux utilisant Network Prediction et que les moving
non-physics objects créent des problèmes de tick
([Epic, Mover Examples](https://dev.epicgames.com/documentation/unreal-engine/mover-examples-in-unreal-engine)).

### Capability gate par installation

Avant toute branche `build`, le skill devra inspecter les modules et symboles
réellement présents :

- `Mover`, `NetworkPrediction`, `EnhancedInput` ;
- `UMoverComponent`, backend liaison, Input/Sync/Aux collection support ;
- `UMotionWarpingMoverAdapter` et le root-motion path choisi ;
- optional `GameplayAbilities`, `StateTree`, `SmartObjects`,
  `ContextualAnimation`, `AnimationBudgetAllocator` ;
- APIs navigation, Water et World Partition requises par la mobility branch.

**Completion rule :** si une API requise manque ou change, la branche
`build` s'arrête avec le symbole, le module et la preuve manquante. Elle
n'invente pas un fallback CMC. Ce comportement est recommandé parce que Mover
est Experimental et que ses APIs peuvent changer
([Epic, Mover](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-in-unreal-engine)).

### Contradiction RVO à traiter comme capability, pas comme vérité

La page Mover Features indique que RVO n'est pas supporté, tandis que l'API
`UNavMoverComponent` actuelle mentionne un basic RVO interface utilisable avec
Detour Crowd
([Epic, Mover Features](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine),
[Epic, UNavMoverComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UNavMoverComponent)).

**Conclusion :** le skill ne doit ni promettre ni interdire RVO par version. Il
doit compiler, exécuter un crowd spike et reporter le résultat.

## Frontières de modules recommandées

~~~mermaid
flowchart LR
    P["Party / PlayerState<br/>ownership, reconnect"] --> MS["mount-system<br/>lifecycle, binding, agency"]
    COL["collection / progression<br/>unlock, bond, cosmetics"] --> MS
    TR["traversal-system<br/>zones, affordances,<br/>summon candidates"] -->|"World contract"| MS
    GAS["combat / GAS<br/>abilities, costs, damage"] -->|"Typed command"| MS
    AI["AI / navigation<br/>path, behavior intent"] -->|"AI intent"| MS
    MS -->|"Rider handoff"| CC["character-controller<br/>suspend/resume,<br/>safe on-foot placement"]
    MS -->|"Camera context"| CAM["camera-system"]
    MS -->|"Presentation facts"| AN["animation-system"]
    MS -->|"Mount input"| MV["Mount Mover<br/>single displacement writer"]
    WP["streaming / save backend"] <--> MS
~~~

| Module | Possède | Ne possède pas |
| --- | --- | --- |
| `mount-system` | Runtime lifecycle, mount actor, rider binding, control lease, mount movement contract, gait/agency, seats, summon transaction, damage/downed policy adapter, replicated session state | Roster UI, global economy, combo graph, camera implementation, AnimBP graph, world markup |
| `character-controller` | Suspension/reprise du rider Mover, on-foot collision, safe placement/teleport application | Mount locomotion, mount AI, bond, summon, stable |
| `traversal-system` | No-mount/no-fly/no-dive markup, volumes, affordances, summon/dismount candidates, route readability | Runtime binding, possession, mount prediction, mounted displacement |
| `combat-system` / GAS | Ability availability, costs, targeting, damage, cancel windows, combat state | Direct mount transform writes, seat binding |
| `camera-system` | Camera rigs, collision, aim framing, assist settings, transitions | Mount movement authority |
| `animation-system` | Mount/rider AnimBP, Motion Matching/state machines, IK, montage assets, phase presentation | Gameplay lifecycle authority |
| AI/navigation | Behavior decision, route/corridor, pathfinding, server-authored follow/flee intent | Player ownership et rider transaction |
| Collection/progression/save | Unlock, durable mount instance, bond progression, cosmetics entitlement, economy | Live actor pointer comme source durable |
| Party/session | Player identity, team, reconnect association | Movement simulation |
| Future `vehicle-system` | Vehicle physics, multi-crew roles, build-your-own | Animal agency et bonding |

Cette boundary est une recommandation. Elle respecte le seam déjà retenu où
`character-controller` exécute l'on-foot locomotion et où
`traversal-system` possède les affordances du monde.

## Alternatives de control topology

Epic documente que `Possess` est authority-only, qu'un Controller possède
normalement un Pawn à la fois et que l'owning connection dépend de cette chaîne
([Epic, Possess](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Pawn/Possess),
[Epic, Controllers](https://dev.epicgames.com/documentation/en-us/unreal-engine/controllers-in-unreal-engine),
[Epic, Actor Owner and Owning Connection](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-owner-and-owning-connection-in-unreal-engine)).
Ces faits ne suffisent pas à choisir une architecture.

### Comparaison

| Option | Topologie | Atouts | Risques et preuves requises | Statut |
| --- | --- | --- | --- | --- |
| **A. Possession swap** | Le PlayerController possède `AMountPawn`; le rider devient un attached presentation actor | Suit le chemin Unreal naturel pour ownership, RPCs et autonomous pawn ; le mount devient clairement l'unique writer | Le rider dépossédé perd l'owning connection obtenue par possession ; owner-only data, rider ASC, prediction history, camera, JIP et reconnect doivent être testés | Candidat fort, non décidé |
| **B. Rider possession retained** | Le PlayerController garde le rider ; celui-ci commande un mount actor séparé | Identité rider, camera et Pawn-owned systems restent stables ; passage AI↔player potentiellement simple | Aucune recette Mover publique ne prouve l'autonomous prediction d'un mount non possédé ; owner chain, role, input producer et correction doivent être prototypés | Spike obligatoire |
| **C. Compound Pawn** | Un seul Pawn contient rider et mount meshes/components et change de mode | Une seule owning connection, un seul replicated actor et une seule prediction history | Rend independent AI, durable mount identity, separate damage/downed et despawn difficiles ; attached colliders ne forment pas automatiquement un compound sweep | Réservé aux mounts non persistants ou très simples |
| **D. Dual simulation** | Rider et mount Movers continuent tous deux à déplacer leur actor | Aucun bénéfice nécessaire au problème | Double authority, correction loops, collision divergence et undefined attach ordering | À interdire |

#### Effet GAS

Epic autorise un Pawn à utiliser un ASC porté par le PlayerState précisément pour
préserver des données comme les long cooldowns quand le Pawn est détruit,
respawned ou remplacé par possession
([Epic, Ability System Component and Attributes](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-system-component-and-gameplay-attributes-in-unreal-engine)).

Conséquences :

- un player ASC sur PlayerState réduit le coût d'un possession swap ;
- un mount independently damageable peut avoir son propre ASC ;
- un actor ne doit pas posséder plusieurs ASCs, même si plusieurs actors
  peuvent partager un ASC
  ([Epic, Ability System Component and Attributes](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-system-component-and-gameplay-attributes-in-unreal-engine));
- aucune source Epic ne garantit une transaction atomique entre GAS prediction,
  Mover rollback et rider binding : un project-specific AbilityTask/command
  bridge reste une recommandation.

### Spike comparatif avant décision

Implémenter le même graybox scenario sous A et B :

1. deux clients + dedicated server ;
2. summon d'un mount actor ;
3. mount, accélération, turn, correction forcée, dismount ;
4. une owner-only property sur rider et mount ;
5. une locally predicted GAS ability avant, pendant et après le mount ;
6. join-in-progress pendant `Mounted` ;
7. disconnect/reconnect pendant `Mounted` ;
8. takeover AI après dismount ;
9. inspection des roles, owning connections, RPC routing et correction count.

**Completion criterion :** une option n'est éligible que si tous les endpoints
convergent sans double simulation, sans perte de player state et sans
reconstruction event-only. Les Mover Examples eux-mêmes ne sont pas shipping
code
([Epic, Mover Examples](https://dev.epicgames.com/documentation/unreal-engine/mover-examples-in-unreal-engine)).

## Invariant de movement authority

Quelle que soit la topology retenue :

~~~text
On foot:
  rider Mover = active writer
  mount Mover = AI writer, idle, or absent

Mounting transaction:
  neither actor may be committed halfway

Mounted:
  mount Mover = sole assembly displacement writer
  rider Mover = suspended and snapshot-safe
  rider collision = non-authoritative presentation

Dismounting transaction:
  server validates exit, commits detach, then resumes rider Mover
~~~

Le rider mesh peut être attaché au seat, mais sa capsule ne doit pas être
supposée participer au mount sweep. Epic précise que le swept movement normal
ne considère que l'`UpdatedComponent`, tandis que les attached components sont
transportés sans collision
([Epic, UMovementComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UMovementComponent)).

Si l'overhead clearance du rider doit bloquer le mount, le mount solver doit
effectuer une explicit mounted-envelope query ou employer un validated root
shape. Un attached rider collider n'est pas une solution implicite.

## Lifecycle séparé du behavior

`Following`, `Fleeing`, `RoadFollowing` et `Waiting` sont des AI behavior
states. Ils ne doivent pas être mélangés avec le lifecycle de présence et de
binding.

~~~mermaid
stateDiagram-v2
    [*] --> Despawned
    Despawned --> Spawning: Summon accepted
    Spawning --> Unridden: Actor ready
    Spawning --> Recovery: Failed or cancelled
    Unridden --> Mounting: Mount accepted
    Mounting --> Ridden: Binding committed
    Mounting --> Recovery: Rejected or interrupted
    Ridden --> Dismounting: Dismount requested or forced
    Dismounting --> Unridden: Safe detach committed
    Dismounting --> Recovery: Exit invalidated
    Unridden --> Despawning: Dismiss accepted
    Despawning --> Despawned: Runtime actor released
    Unridden --> Downed: Damage policy
    Ridden --> Downed: Damage policy
    Downed --> Recovering: Revive accepted
    Recovering --> Unridden: Recovered
    Downed --> Despawning: Death policy
    Recovery --> Unridden: Mount remains valid
    Recovery --> Despawned: Runtime actor invalid
~~~

| State | Autorité | Postcondition minimale |
| --- | --- | --- |
| `Despawned` | Collection/session record | Aucun live actor requis |
| `Spawning` | Server coordinator | Assets/world/candidate réservés ou failure explicite |
| `Unridden` | Mount actor + server AI | Aucun seat occupé ; AI/idle input source explicite |
| `Mounting` | Server transaction | Rider, mount et seat réservés avec TransitionId |
| `Ridden` | Mount Mover | Binding snapshot complet ; un writer |
| `Dismounting` | Server transaction | Exit candidate réservé et revalidé |
| `Downed` | Combat/damage policy | Movement et interaction policy explicites |
| `Recovering` | Server transaction | Revive owner et completion idempotents |
| `Despawning` | Server coordinator | Binding/cargo/cosmetic state flushed avant actor release |
| `Recovery` | Server coordinator | Compensation après cancellation, timeout ou invalidation |

Rockstar a publié des correctifs concernant plusieurs joueurs revivant le même
horse simultanément, les animations après revive et la récupération après
injury ; cela justifie une reservation et une transaction de revive, sans
révéler leur implémentation
([Rockstar, Title Update 1.15](https://support.rockstargames.com/articles/28AmlyPGLVKsJ8OpdN8myn/red-dead-redemption-2-title-update-1-15-notes-ps4-xbox-one-pc-stadia)).

## Typed requests, outcomes et state snapshot

### Request envelope recommandé

~~~cpp
struct FMountRequest
{
    FGuid RequestId;
    uint32 ExpectedRevision;
    EMountRequestType Type;       // Summon, Mount, Dismount, Dismiss, Revive...
    FMountInstanceId MountId;
    TWeakObjectPtr<AActor> Rider;
    FName SeatId;
    FTransform CandidateTransform;
    FGameplayTagContainer ContextTags;
    FPredictionKey OptionalPredictionKey;
};
~~~

La forme exacte est project-specific. Les invariants sont :

- `RequestId` rend les retries idempotents ;
- `ExpectedRevision` rejette un stale client ;
- actor reference et durable `MountId` ne sont pas confondus ;
- le client propose, le serveur valide ownership, state, distance, world
  residency, seat, collision et gameplay permissions ;
- la request ne contient jamais une destination arbitraire acceptée sans
  validation.

### Outcome recommandé

~~~cpp
struct FMountOutcome
{
    FGuid RequestId;
    uint32 NewRevision;
    EMountOutcomeStatus Status;   // Accepted, Rejected, Cancelled, Completed
    EMountFailureReason Reason;
    EMountLifecycleState State;
    FMountInstanceId MountId;
    TWeakObjectPtr<AActor> Rider;
    TWeakObjectPtr<AActor> MountActor;
    FName SeatId;
    FTransform CommittedTransform;
    int32 ServerSimulationFrame;
};
~~~

Le reason enum doit au moins distinguer :

- `NotOwned`, `WrongTeam`, `StaleRevision` ;
- `RestrictedZone`, `InCombat`, `AbilityBlocked` ;
- `SeatOccupied`, `RiderBusy`, `MountBusy` ;
- `NoCandidate`, `CollisionBlocked`, `NavUnavailable` ;
- `WorldNotReady`, `AssetNotReady` ;
- `Interrupted`, `MountDowned`, `RiderDowned` ;
- `ConnectionLost`, `TimedOut`, `InternalCapabilityMissing`.

### Replicated session snapshot

Epic précise que plusieurs property notifications ne sont pas ordonnées entre
elles et que les RPCs cross-actor n'ont pas d'ordre global
([Epic, Replicated Object Execution Order](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicated-object-execution-order-in-unreal-engine)).

**Recommendation :** regrouper les valeurs couplées :

~~~cpp
struct FMountSessionState
{
    uint32 Revision;
    EMountLifecycleState State;
    FMountInstanceId MountId;
    TObjectPtr<AActor> Rider;
    TObjectPtr<AActor> MountActor;
    FName SeatId;
    EMountControlSource ControlSource;
    FTransform SeatOrExitTransform;
    int32 ServerSimulationFrame;
    FGuid ActiveRequestId;
};
~~~

`OnRep_MountSessionState` doit être idempotent et capable de construire le
bon presentation state depuis n'importe quelle révision plus récente. Les RPCs
peuvent demander une action ou accélérer un cosmetic cue, mais ne constituent
pas l'unique historique requis par un late join.

## Transaction mount/dismount

### Mount

1. Receive request.
2. Validate player/mount identity, permissions, distance, LOS si requis, seat,
   lifecycle revision et combat policy.
3. Reserve rider, mount et seat avec `RequestId`.
4. Freeze conflicting transitions, pas toute la simulation mondiale.
5. Select approach/seat warp targets.
6. Start paired presentation ; le authoritative transaction reste le timer/state
   owner.
7. À la commit window, switch control authority, suspend rider Mover, normalize
   collision, attach rider et publish `Ridden` en une révision.
8. Complete outcome.
9. Sur interruption, exécuter une compensation idempotente vers `Unridden` ou
   `Recovery`.

### Dismount

1. Receive normal ou forced dismount request.
2. Generate candidates depuis traversal/world data.
3. Filter par world residency, no-dismount rules, capsule/envelope clearance,
   nav/walkability et combat constraints.
4. Score par side preference, camera readability, distance, slope et hazard.
5. Reserve le candidat ; revalidate immédiatement avant commit.
6. Warp/present vers l'exit.
7. Detach, place le rider par le character-controller safe-placement contract,
   reset rider Mover state et publish `Unridden`.
8. Si le candidat devient invalide : essayer le prochain candidat, puis une
   authored emergency socket, puis last-known-safe/checkpoint selon la policy
   décidée.

Epic expose EQS pour générer, filtrer et scorer des locations, ainsi que
`FindTeleportSpot` pour chercher une position non colliding proche ; aucune de
ces APIs n'est à elle seule un safe dismount algorithm
([Epic, EQS](https://dev.epicgames.com/documentation/en-us/unreal-engine/environment-query-system-in-unreal-engine),
[Epic, FindTeleportSpot](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UWorld/FindTeleportSpot)).

**Unknown :** l'ordre exact des fallbacks et la possibilité de dismount-in-place
sont des choix de game design à griller.

## Movement contract partagé

Tous les mounts peuvent partager un command envelope sans partager la même
physics :

~~~cpp
struct FMountInputCmd
{
    FVector DesiredMove;
    FVector DesiredFacing;
    float DesiredSpeedFraction;
    EMountGaitIntent GaitIntent;
    FMountActionBits Actions;
    uint32 ControlLeaseRevision;
    FTraversalConstraintSnapshot Constraints;
};
~~~

Le command doit être produit par un adapter :

- player-controlled : Enhanced Input → intent ;
- unmounted AI : server-authored StateTree/navigation → intent ;
- road-follow assist : path corridor → assist intent, manual override explicite ;
- recovery : server-authored stop/return intent.

Mover documente l'input producer abstraction et le NavMover bridge
([Epic, UMoverComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/UMoverComponent),
[Epic, UNavMoverComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UNavMoverComponent)).

Toute donnée qui influence le résultat du simulation tick doit être dans
Input/Sync/Aux state ou déterministement reconstructible. Le
`RollbackBlackboard` est local-only et destiné aux données transitoires qui ne
sont pas nécessaires pour reconstituer la simulation
([Epic, EBlackboardSizingPolicy](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/EBlackboardSizingPolicy),
[Epic, Mover API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover)).

### State replay-safe minimal

| Catégorie | Exemples à capturer |
| --- | --- |
| Input | desired vector/speed/gait, jump/dive/ascend flags, manual override, control lease revision |
| Sync | transform, velocity, orientation, active mode, gait state, movement base, mount action phase |
| Aux | locomotion profile revision, turn/accel settings, water/air policy, stamina/resource snapshot si elle affecte le tick |
| Reconstructible cache | floor hit, recent probes, animation presentation samples |
| Hors Mover mais révisionné | durable MountId, rider/seat binding, health, summon lifecycle |

Le mount movement ne doit pas lire directement la live camera, un raw device,
un mutable AI blackboard ou l'ASC pendant resimulation. Ces systèmes produisent
un replay-safe command ou snapshot.

## Branches ground, flying et aquatic

La recherche ne choisit pas encore la baseline de produit. Elle établit des
contracts distincts.

| Axe | Ground | Flying | Aquatic |
| --- | --- | --- | --- |
| Core modes | Grounded, Falling, Landing | Grounded, Takeoff, Glide/PoweredFlight, Landing | Surface, DiveTransition, Underwater, SurfaceTransition, ShoreExit |
| Input | Planar intent + turn/gait | 3D pitch/yaw/roll policy + thrust/ascend/descend | Surface planar ou underwater 3D + ascend/descend |
| Resource possible | Sprint/endurance | Vigor/stamina/energy ou none | Aquatic stamina/boost ou none |
| World constraints | Slope, step, edge, doorway, nav area | No-fly, ceiling, wind, landing volumes, streaming horizon | Water body, depth, currents, exclusion volumes, shore candidates |
| Navigation | Recast/NavMover peut servir de base | Aucune turnkey 3D strategy trouvée | Aucune turnkey underwater 3D strategy trouvée |
| Collision concern | Long footprint et turning envelope | High speed tunneling, ceiling/wings, landing envelope | Surface boundary oscillation, shore clearance, submerged obstacles |
| Camera concern | Speed, lateral offset, obstacle collision | Horizon, roll, FOV, motion sickness | Waterline, pitch, occlusion, motion sickness |
| Recovery | Reverse/breadcrumb, safe stop | Glide/land/emergency descent | Surface/shore/last-safe water point |

### Ground

Le talk Microsoft démontre l'écart entre biped path radius et oblong quadruped
footprint, ainsi que l'intérêt d'un smooth path et de breadcrumbs/backtracking
([Microsoft, slides](https://media.gdcvault.com/gdc2016/Presentations/Karlsson_Tobias_On_All_Fours.pdf)).
Rockstar montre des gait ranges, lateral motion et cliff stopping renforcé par
du markup
([Rockstar, slides](https://media.gdcvault.com/GDC%2B2021/making_horses_gdc2021.pdf)).

**Completion gates ground :**

- stop, reverse et turn sur flat, slope, steps et moving base ;
- narrow doorway et switchback compatibles avec la footprint annoncée ;
- cliff/edge suite sans oscillation ni hidden input override ;
- walk/trot/canter/gallop ranges sans foot slide visible ;
- same command suite exécutée par player et server AI adapters ;
- no correction loop quand deux mounts se croisent selon la collision policy
  choisie.

### Flying

Epic expose actuellement `UFlyingMode` et `USimpleFlyingMode`, mais ces APIs
font partie de Mover Experimental
([Epic, UFlyingMode](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UFlyingMode),
[Epic, USimpleFlyingMode](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/USimpleFlyingMode)).
Blizzard documente un product model où descendre augmente speed, remonter échange
momentum contre altitude et des abilities dépensent Vigor
([Blizzard, Dragonriding](https://news.blizzard.com/en-gb/article/23818251/updated-aug-25-dragonriding-and-you-ascending-to-new-heights-of-skill)).

**Decisions pending :**

- dynamic flight, steady flight ou les deux ;
- free takeoff versus authored launch ;
- roll visuel versus roll physique ;
- altitude ceiling et no-fly representation ;
- combat en vol ;
- stamina/vigor ownership ;
- AI follow : authored corridor, spline, custom 3D nav ou reposition policy.

**Completion gates flying :**

- takeoff/landing avec blocked destination et moving base ;
- max-speed collision sous correction réseau ;
- streaming test au worst-case reachable speed ;
- loss-of-resource recovery sans soft-lock ;
- camera roll/shake/FOV entièrement réglables ;
- join-in-progress pendant takeoff, cruise et landing.

### Aquatic

Epic documente un `USwimmingMode` orienté water volumes, dont des surface
swimming settings, et son Water System ; ces APIs ne constituent pas un mount
underwater design complet
([Epic, USwimmingMode](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/USwimmingMode),
[Epic, Water System](https://dev.epicgames.com/documentation/en-us/unreal-engine/water-system-in-unreal-engine)).
ArenaNet confirme comme product behavior qu'un Skimmer peut traverser des
surfaces dangereuses et obtenir l'underwater movement
([ArenaNet, Introduction to Mounts](https://www.guildwars2.com/en/news/introduction-to-mounts-in-guild-wars-2/)).

**Decisions pending :**

- surface-only, free underwater ou authored routes ;
- amphibious same actor versus aquatic archetype ;
- shoreline auto-exit et fallback ;
- currents comme input/constraint versus force ;
- oxygen, aquatic stamina ou aucune ressource ;
- underwater combat et camera.

**Completion gates aquatic :**

- waterline entry/exit sans mode flicker ;
- shallow-water rejection et shore recovery ;
- surface ↔ underwater ↔ surface under packet loss ;
- submerged obstacle collision à max boost ;
- World Partition/nav residency avant long underwater route ;
- player et AI adapters validés séparément.

### Same actor ou archetypes spécialisés

Un seul `AMountPawn` peut posséder plusieurs custom movement modes, mais cela
ne prouve pas que chaque mount doit supporter tous les media. ArenaNet choisit
des mounts dont les abilities répondent à des terrains différents
([ArenaNet, Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/)).

Le futur skill doit proposer deux branches :

- **capability composition** : un actor gagne/retire Ground/Flying/Aquatic ;
- **specialized archetypes** : chaque mount definition choisit un petit movement
  set.

Le choix dépend du roster et des transitions voulues ; il reste à griller.

## AI, navigation et indirect autonomy

### Input adapters communs, validation distincte

Rockstar indique que player-controlled et AI horses partageaient des
fondations, tout en reconnaissant ne pas avoir atteint une complète parity dans
tous les cas
([Rockstar, slides](https://media.gdcvault.com/GDC%2B2021/making_horses_gdc2021.pdf)).
Mover expose une input producer abstraction et un navigation bridge
([Epic, UMoverComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/UMoverComponent),
[Epic, UNavMoverComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UNavMoverComponent)).

**Recommendation :** partager le simulation core, pas les behavior tests :

- `PlayerMountIntentAdapter` produit des locally predicted commands ;
- `AIMountIntentAdapter` produit des server-authored commands ;
- `AssistIntentAdapter` produit road-follow/navigation assistance et cède la
  priorité à un manual override explicite ;
- une control lease révisionnée garantit qu'un seul adapter produit le command
  autorisé à un instant donné.

### Unmounted behavior

StateTree est une hierarchical state machine avec Tasks et Transitions ; Smart
Objects fournissent des slots réservables mais ne contiennent pas l'execution
logic
([Epic, StateTree](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine),
[Epic, Smart Objects](https://dev.epicgames.com/documentation/unreal-engine/smart-objects-in-unreal-engine---overview)).

Une découpe recommandée :

~~~text
Lifecycle: Unridden
Behavior:
  Idle
  FollowOwner
  ApproachForMount
  RoadFollow
  AvoidHazard
  Flee
  ReturnToSafeArea
  AwaitDismiss
~~~

Le behavior décide l'intent ; Mover décide le movement outcome. Les Smart
Objects peuvent authorer des stable/feeding/hitching slots, pas piloter le
lifecycle à la place du mount coordinator.

### Path et footprint

Recast Navigation génère des surface polygons avec traversal costs à partir de
la collision geometry
([Epic, Navigation System](https://dev.epicgames.com/documentation/unreal-engine/navigation-system-in-unreal-engine)).
Cela convient à une base ground, sous réserve d'un agent/footprint adapté. Le
talk Microsoft montre pourquoi une path radius limitée au shoulder width doit
être accompagnée de path smoothing, animation footprint checks et dead-end
recovery pour un long quadrupède
([Microsoft, slides](https://media.gdcvault.com/gdc2016/Presentations/Karlsson_Tobias_On_All_Fours.pdf)).

**Unknown :** aucune source Epic trouvée ne fournit un turnkey free-space 3D
navigation system pour flying ou underwater mounts. Le skill devra demander
l'une de ces strategies :

- authored splines/corridors ;
- custom 3D nav graph/volume ;
- local steering autour d'un server-authored macro path ;
- despawn/reposition recovery avec règles de visibilité ;
- refus explicite du follow dans les zones non navigables.

## Animation, seat sync, Motion Warping et IK

### Ownership du seam

`mount-system` doit publier :

- mount/rider/seat identities ;
- lifecycle state + transition revision ;
- seat transform et entry/exit warp targets ;
- mount linear/angular velocity, acceleration, gait et normalized phase ;
- surface/water/air frame ;
- impact, downed et combat presentation facts.

`animation-system` doit posséder :

- mount et rider AnimBP architecture ;
- Motion Matching ou state machines ;
- clip/Chooser selection ;
- paired montage assets ;
- Sync Markers, IK et Control Rig ;
- cosmetic offsets par skeleton, saddle et body type.

Epic documente les Sync Groups/Markers à l'intérieur des animation graphs et
montages
([Epic, Animation Sync Groups](https://dev.epicgames.com/documentation/unreal-engine/animation-sync-groups-in-unreal-engine)).
Le cross-actor rider/mount phase reste donc un explicit project contract ; il ne
faut pas supposer qu'un même group name synchronise magiquement deux
`AnimInstance`.

### Mount/dismount

Motion Warping ajuste le root motion vers des named targets pendant des montage
windows
([Epic, Motion Warping](https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-warping-in-unreal-engine)).
L'API Mover actuelle expose un `UMotionWarpingMoverAdapter` et des
simulation-driven root-motion paths, mais ils restent version-sensitive avec
Mover
([Epic, Mover API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover),
[Epic, FLayeredMove_AnimRootMotion](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/FLayeredMove_AnimRootMotion)).

**Recommendation :**

- mount/dismount locomotion root motion passe par Mover ;
- le rider montage ne devient jamais un second world-space writer ;
- entry/exit warp targets font partie du replay-safe command/snapshot quand ils
  influencent le movement ;
- Anim Notifies déclenchent presentation/audio/VFX ou signalent une fenêtre,
  mais un authoritative timer/state machine possède commit, cancellation et
  recovery ;
- le mount state peut resynchroniser un late join sans rejouer tout le montage.

### Contextual Animation

L'API Contextual Animation actuelle expose roles, scene bindings, attachment,
collision behaviors, IK targets, replicated start/stop et late-join data
([Epic, ContextualAnimation API](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ContextualAnimation)).
Elle reste sous le chemin Experimental.

Trois branches à proposer :

| Branch | Usage | Condition |
| --- | --- | --- |
| Project-owned paired transaction | Baseline indépendante des Experimental scene APIs | Toujours disponible |
| Contextual Animation adapter | Accélère authoring/alignment de rider+mount | Capability spike + dedicated/JIP validation |
| Presentation-only Contextual scene | La scene joue après un commit déjà autorisé | Ne possède jamais gameplay state |

Le public contract ne doit pas rendre Contextual Animation obligatoire avant la
décision du grill.

### IK et seat contacts

Epic présente FBIK comme un procedural adjustment tool pour ground alignment et
arm reaching
([Epic, Full-Body IK](https://dev.epicgames.com/documentation/unreal-engine/control-rig-full-body-ik-in-unreal-engine)).
Rockstar a publié des correctifs pour rider feet floating au-dessus des stirrups,
confirmant ce défaut comme shipped failure category
([Rockstar, Title Update 1.11](https://support.rockstargames.com/articles/6dT8UroC7aKslsqA38oaxj/red-dead-redemption-2-title-update-1-11-notes-ps4-xbox-one)).

**Recommendation :**

- pelvis/seat offset avant hands/feet correction ;
- hands → reins/handles, feet → stirrups/supports, pelvis → seat frame ;
- mount feet → terrain/water presentation ;
- reach clamp et per-rig limits ;
- fade IK pendant fast transitions/airborne phases ;
- aucun IK effector ne change gameplay collision ou authoritative transform.

### Performance

Epic indique que Root Motion extraction peut déplacer l'AnimGraph vers le game
thread et avoir un coût
([Epic, Root Motion](https://dev.epicgames.com/documentation/en-us/unreal-engine/root-motion-in-unreal-engine)).
L'Animation Budget Allocator peut throttle skeletal mesh ticks selon un fixed CPU
budget et la significance
([Epic, Animation Budget Allocator](https://dev.epicgames.com/documentation/unreal-engine/animation-budget-allocator-in-unreal-engine)).

**Recommendation :** mesurer séparément mount mesh, rider mesh, IK, Control Rig,
paired montage et remote proxy cost. Ne jamais résoudre un budget en throttlant
la simulation authority ; seulement la presentation fidelity.

## Camera et targeting handoff

ArenaNet a créé une custom camera pour soutenir les unique movements de chaque
mount
([ArenaNet, Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/)).
Epic place le PlayerCameraManager sur le PlayerController et permet de changer
le view target indépendamment
([Epic, Gameplay Framework Quick Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-quick-reference-in-unreal-engine),
[Epic, Set View Target with Blend](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Game/Player/SetViewTargetwithBlend)).

**Recommendation :**

- `mount-system` publie `MountCameraContext` : mobility mode, gait, speed,
  acceleration, roll policy, seat, combat/aim mode ;
- `camera-system` possède rigs, blending, collision, manual-input priority,
  FOV, shake, recenter et accessibility ;
- `targeting-system` possède target selection et aim assist ;
- mount simulation reçoit un replay-safe desired facing policy, jamais la live
  camera ;
- camera ownership ne doit pas dépendre implicitement de la possession option
  retenue.

## Combat, damage, downed et death

Les références publiques démontrent des policies différentes, pas une seule
best practice :

| Policy | Exemple first-party | Conséquence |
| --- | --- | --- |
| Travel-only | Aucune référence unique imposée ici | Dismount avant ability activation ; scope minimal |
| Engage then dismount | GW2 ajoute des engage skills pour éviter un manual dismount clunky | Transition combat fluide, mount combat limité |
| Full mounted combat | Elden Ring documente targeting, left/right attacks et charged attacks montés ; RDR patch notes couvrent aim/fire/reload horseback | Facing, weapon, hitboxes, damage et cancel windows nettement plus complexes |

Sources :
[ArenaNet, Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/),
[Bandai Namco, Elden Ring Starter Guide](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-starter-guide-tips-know-playing-the-game),
[Rockstar, Title Update 1.09](https://support.rockstargames.com/articles/6XLmD65fhWzs67WCok5hud/red-dead-redemption-2-title-update-1-09-notes-ps4-xbox-one).

### Combat seam recommandé

- GAS/combat décide ability eligibility, costs, target, damage et cancel ;
- un custom AbilityTask soumet une `MountRequest` ou `MountActionCommand` ;
- mount-system traduit l'action en mode, modifier, layered move ou instant
  effect Mover ;
- Mover reste l'unique displacement writer ;
- mount et rider hitboxes/damage recipients sont explicites ;
- facing policy est déclarée : `MountAligned`, `AimAligned`,
  `TargetAligned`, `FreeLook`, `Authored`.

### Health/downed alternatives

| Option | Atout | Coût |
| --- | --- | --- |
| No mount health | Simple traversal entity | Peu d'agency/damage gameplay |
| Separate mount health, forced dismount | Lisible ; GW2 shipped behavior | Damage routing et safe forced dismount |
| Independent mount ASC + downed/revive/death | Riche, compatible bonding/injury | Persistence, concurrency, griefing et recovery complexes |
| Shared rider resource | Peu d'actors gameplay | Confond rider et mount identity |

GW2 confirme une mount health séparée et un forced dismount avec rider full
health
([ArenaNet, Developer Diary](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/)).
Rockstar patch notes confirment critical injury, simultaneous revive bugs et
post-revive animation issues comme product failure categories
([Rockstar, Title Update 1.15](https://support.rockstargames.com/articles/28AmlyPGLVKsJ8OpdN8myn/red-dead-redemption-2-title-update-1-15-notes-ps4-xbox-one-pc-stadia)).

Le choix reste à griller. Dans tous les cas, forced dismount doit passer par le
même typed, server-authoritative safe-placement contract qu'un dismount normal,
avec une urgency/fallback policy différente.

## Network authority, prediction et rollback

Unreal utilise un client-server model où le server modère le true game state ;
un dedicated server est headless
([Epic, Dedicated Servers](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-dedicated-servers-in-unreal-engine)).
Mover supporte rollback via Network Prediction, mais reste Experimental
([Epic, Mover](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-in-unreal-engine)).

### Authority matrix recommandée

| Domaine | Owning client | Server | Simulated proxies |
| --- | --- | --- | --- |
| Input | Produit predicted rider intent | Valide/rejoue | Aucun authority input |
| Summon/mount/dismount | Peut anticiper presentation | Valide et commit lifecycle | Reçoit snapshot |
| Mounted movement | Prédit si topology le permet | Authoritative simulation | Interpole |
| Unmounted AI | Présente | Produit AI intent | Interpole |
| Damage/health | Feedback predicted limité | Applique et réplique | Présente |
| Asset/animation | Précharge et présente | Ne dépend d'aucun rendu | Présente selon significance |
| Persistence | Aucun commit durable predicted | Commit durable | Read-only relevant state |

### Mount-affecting facts à capturer

- control source et lease revision ;
- active movement mode, gait et action phase ;
- movement profile/settings revision ;
- resource lease ou stamina snapshot si elle modifie le tick ;
- edge/route constraint seulement si elle n'est pas déterministement
  reconstructible ;
- root-motion entry et warp targets ;
- active seat/binding revision quand il modifie l'assembly ;
- movement base/local transform ;
- forced dismount trigger frame si le movement outcome en dépend.

Le `RollbackBlackboard` peut conserver des caches local-only et les faire
rollback, mais Epic précise qu'il ne se réplique pas et qu'il sert aux données
non nécessaires à une reconstruction from scratch
([Epic, EBlackboardSizingPolicy](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/EBlackboardSizingPolicy)).

### Join-in-progress

Un late join doit recevoir au moins :

- lifecycle revision/state ;
- durable MountId + live mount actor ;
- rider actor/player identity ;
- seat et control source ;
- mount transform/velocity/mode/gait ;
- current transition/action phase et server simulation frame ;
- health/downed state ;
- cosmetics/archetype IDs nécessaires à la presentation ;
- world/asset readiness state ou une placeholder policy.

Contextual Animation expose actuellement du late-join data, mais son statut
Experimental interdit d'en faire l'unique reconstruction contract
([Epic, ContextualAnimation API](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ContextualAnimation)).

### Reconnect

Le PlayerState est conçu pour représenter l'état d'un participant et son API
contient un chemin d'inactive PlayerState/rejoin
([Epic, Gameplay Framework Quick Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-quick-reference-in-unreal-engine),
[Epic, APlayerState](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/APlayerState)).

**Recommendation :**

- conserver l'association durable player↔MountId hors du transient Pawn ;
- à reconnect, résoudre l'actuel runtime actor ou le recréer depuis le record ;
- invalider toute ancienne control lease ;
- réémettre une session snapshot avec nouvelle revision ;
- ne jamais faire confiance à un client qui réclame un ancien actor pointer ;
- définir la policy si le mount est downed, occupied, unloaded ou détruit.

Le backend de persistence d'un dedicated/live-service game reste
project-specific. `USaveGame` documente un local save format, pas une base de
données serveur
([Epic, Saving and Loading](https://dev.epicgames.com/documentation/en-us/unreal-engine/saving-and-loading-your-game-in-unreal-engine)).

### Relevancy, dormancy et scale

Actor dormancy évite de considérer continuellement des actors immobiles pour
replication ; un actor doit être réveillé avant mutation
([Epic, Actor Network Dormancy](https://dev.epicgames.com/documentation/unreal-engine/actor-network-dormancy-in-unreal-engine)).
Replication Graph est conçu pour de grands nombres d'actors répliqués et permet
des nodes spatiaux ou project-specific
([Epic, Replication Graph](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine)).

**Recommendation :**

- active ridden mount : owner + spatially relevant, high movement priority ;
- summoned nearby unmounted mount : spatially relevant, AI tick selon
  significance ;
- idle distant live mount : dormant/despawn selon persistence policy ;
- stable collection : record, pas un always-relevant live actor ;
- wake/flush dormancy avant lifecycle, cosmetic, health ou ownership mutation ;
- mesurer bandwidth avant de choisir Replication Graph/Iris policy.

### Server validation

Le server doit revalider :

- player owns/has permission for MountId ;
- request revision et unique id ;
- rider/mount lifecycle ;
- distance/LOS si le design l'exige ;
- seat availability ;
- no-mount/no-fly/no-dive/combat tags ;
- world cell, nav et asset readiness ;
- candidate collision ;
- action cost/cooldown ;
- claimed client transform, speed et time.

GAS local prediction garde le server comme final authority et peut rejeter le
client
([Epic, Using Gameplay Abilities](https://dev.epicgames.com/documentation/unreal-engine/using-gameplay-abilities-in-unreal-engine)).
Cela ne remplace pas la validation mount-specific.

## Summon, dismiss et World Partition

### Pipeline recommandé

~~~mermaid
sequenceDiagram
    participant C as Client
    participant S as Mount Coordinator (Server)
    participant T as Traversal/World
    participant A as Asset Manager
    participant W as World Partition
    participant M as Mount Actor

    C->>S: SummonRequest(RequestId, MountId, revision)
    S->>S: Validate ownership/state/tags
    S->>T: Request summon candidates
    S->>A: Async load MountDefinition bundles
    S->>W: Ensure candidate area resident
    W-->>S: Streaming completion
    T-->>S: Candidate set
    S->>S: Collision/nav/restriction validation
    S->>M: Spawn or wake actor
    S-->>C: Replicated Spawning → Unridden snapshot
~~~

World Partition permet d'ajouter une streaming source et de vérifier quand les
cellules concernées ont fini de streamer
([Epic, World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine),
[Epic, IsStreamingCompleted](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UWorldPartitionSubsystem/IsStreamingCompleted)).
L'Asset Manager permet des async Primary Asset loads avec callbacks
([Epic, LoadPrimaryAssets](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAssetManager/LoadPrimaryAssets)).

### Ownership des candidates

`traversal-system` doit produire une typed candidate :

~~~cpp
struct FMountWorldCandidate
{
    FTransform Transform;
    FGameplayTagContainer SurfaceAndZoneTags;
    FName NavAgentOrRouteId;
    uint32 WorldRevision;
    float ExpiryTime;
    EMountCandidateKind Kind; // Summon, Dismount, Landing, ShoreExit
};
~~~

`mount-system` réserve et consomme cette candidate. Le server refait les
collision/gameplay checks au commit. Une candidate ne confère pas elle-même
l'autorité de spawn ou teleport.

### Dismiss

Décisions à griller :

- dismiss instant versus animation/exit ;
- allowed while observed, airborne, swimming, in combat, downed ou carrying
  state ;
- actor destruction versus dormancy/pool ;
- AI return-to-stable versus despawn ;
- que deviennent cargo, injuries et temporary effects.

Rockstar a corrigé des horses disparus après fast travel, des summon failures et
des cosmetics/cargo incorrects après dismiss/resummon ; ce sont des test
categories, pas une prescription de policy
([Rockstar, Title Update 1.11](https://support.rockstargames.com/articles/6dT8UroC7aKslsqA38oaxj/red-dead-redemption-2-title-update-1-11-notes-ps4-xbox-one),
[Rockstar, Title Update 1.19](https://support.rockstargames.com/articles/2HSuJe3AXEFssIXEJn07gJ/red-dead-redemption-2-title-update-1-19-notes-ps4-xbox-one-pc-stadia)).

## Persistence, collection, bonding et cosmetics

### Deux sources de données, un seul owner par fait

| Durable record | Runtime actor |
| --- | --- |
| MountInstanceId | Actor/NetGUID |
| Definition/ArchetypeId | Loaded class/components |
| Unlock/ownership | Current connection/control lease |
| Bond XP/level si retenu | Current motivation/AI state |
| Cosmetic loadout | Instantiated meshes/materials |
| Persistent injury/health policy | Current replicated health/action |
| Stable/equipped selection | Current world transform/mode |
| Cargo IDs si le produit le retient | Attached presentation objects |

Le runtime actor est une projection du durable record. Il ne doit pas être la
seule source de vérité d'un unlock, d'un bond ou d'un cosmetic entitlement.
Cette recommandation s'appuie sur les capabilities Asset Manager/SaveGame et
sur les pertes de bonding/cargo/horse appearance documentées par Rockstar
([Epic, Asset Management](https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine),
[Rockstar, Title Update 1.09](https://support.rockstargames.com/articles/6XLmD65fhWzs67WCok5hud/red-dead-redemption-2-title-update-1-09-notes-ps4-xbox-one)).

### Bonding

Rockstar décrit officiellement care, feeding, cleaning, calming et riding comme
des moyens de renforcer le bond et d'améliorer certains résultats de horse
handling
([Rockstar, Horse Customization](https://www.rockstargames.com/newswire/article/25o24118179ak8/Game-Tips-Character-Camp-Horse-Customization)).

Le futur skill doit brancher, sans imposer :

- **cosmetic bond** : presentation, barks, trust, collection ;
- **horizontal bond** : maneuvers ou convenience ;
- **power bond** : stats/handling, avec impact économie/balance ;
- **no bond** : mount as traversal tool.

Collection/progression possède le score et les unlocks. Mount-system ne reçoit
qu'un immutable/runtime profile revision. Le choix de power impact est un
game-design decision.

### Cosmetics

ArenaNet indique que dyes et mount skins ne changent ni abilities ni power
([ArenaNet, Introduction to Mounts](https://www.guildwars2.com/en/news/introduction-to-mounts-in-guild-wars-2/)).

**Recommendation :**

- une cosmetic ne modifie ni collision, ni turn radius, ni speed, ni stamina ;
- un changement mécanique est un archetype/profile, pas un skin ;
- les assets sont soft-referenced et async-loaded via bundles ;
- remote clients peuvent afficher un placeholder sûr jusqu'au load ;
- cosmetic state fait partie de la JIP snapshot, sans bloquer gameplay
  simulation ;
- aucune monétisation pay-to-fast n'appartient au mount runtime contract.

## Accessibility baseline

Microsoft recommande de remapper les actions, d'offrir des alternatives aux
long holds/repeated/simultaneous presses et de proposer toggle/auto-hold
([Microsoft, XAG 107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107)).
Microsoft recommande aussi des réglages pour camera shake, bob, motion blur,
FOV, sensitivity et automatic camera movement
([Microsoft, XAG 117](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117)).
Naughty Dog documente full control remapping, hold/toggle, camera assist,
navigation assistance, ledge guard et automatic vaulting on horseback
([Naughty Dog, Accessibility](https://www.naughtydog.com/blog/the_last_of_us_part_ii_accessibility_features_detailed)).

### Settings à prévoir

- full remapping de mount/dismount, gait, jump, ascend/descend, ability et
  camera actions ;
- hold/toggle pour sprint/gallop/boost/aim ;
- optional auto-run/road-follow avec immediate manual override ;
- steering sensitivity, deadzone, inversion et response curve ;
- edge guard et collision/obstacle assist intensities ;
- camera recenter on/off, delay et strength ;
- camera shake, bob, roll, motion blur, speed lines et FOV sliders, avec zéro
  réellement possible ;
- audio, visual et haptic cues pour mount state, blocked request, stamina,
  edge guard et forced dismount ;
- no rapid-tap mount interactions sans alternative ;
- per-branch assist : auto-takeoff/landing, maintain altitude, surface
  recovery, shore assist.

Enhanced Input supporte runtime Mapping Contexts et cite explicitement des
contexts différents pour walk/swim/vehicle-like travel
([Epic, Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine)).

### Accessibility completion criteria

- toutes les actions essentielles sont remappables ;
- aucune action essentielle n'exige deux sticks sans assist alternative ;
- mount/dismount fonctionne en single press et hold/toggle variants ;
- player peut réduire chaque forced camera motion à zéro ;
- edge/obstacle assist n'écrit jamais directement le transform hors Mover ;
- chaque blocked request a au moins deux modalities de feedback ;
- les settings sont identiques en standalone, client et reconnect ;
- tests avec motor, low-vision et motion-sensitivity presets.

## Observability et diagnostics

Epic fournit pour Mover le Gameplay Debugger category, `LogMover`, trajectory,
rollback trails, corrections et root-motion logs
([Epic, Mover Debugging](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-debugging-reference-for-unreal-engine)).
Visual Logger permet d'enregistrer puis scruber actor state et debug shapes
([Epic, Visual Logger](https://dev.epicgames.com/documentation/en-us/unreal-engine/visual-logger-in-unreal-engine)).
Networking Insights expose packets, replicated objects, properties et RPCs
([Epic, Networking Insights](https://dev.epicgames.com/documentation/unreal-engine/networking-insights-in-unreal-engine)).

### Mount debug overlay recommandé

Afficher pour rider et mount :

- durable IDs, actor IDs, network roles, owner et owning connection ;
- lifecycle state/revision, active RequestId et last outcome ;
- seat reservation/binding ;
- control source/lease revision ;
- Mover mode, gait, velocity, intent, facing et correction count ;
- current collision shape et mounted envelope ;
- ground/air/water probes et rejected reasons ;
- nav path/corridor, AI/assist/manual intent priorities ;
- streaming source/cell/asset readiness ;
- health/downed/revive state ;
- animation phase, montage, warp targets et IK error ;
- dormancy/relevancy/significance state.

### Diagnosis matrix

| Symptom | Evidence à collecter | Probable owner | Corrective direction |
| --- | --- | --- | --- |
| Rubberband juste après mount | Roles, owning connection, control lease, Mover corrections | Control topology/network | Commit ownership et input source dans une seule révision ; resim state complet |
| Rider et mount dérivent | Deux transform writers, attach state, seat frame | Mount lifecycle | Suspendre rider writer ; mount seul writer ; idempotent reattach |
| Doorway passe visuellement puis bloque | Actual root collider, path footprint, mounted envelope | Mount movement/traversal | Valider capsule approximation ou custom footprint |
| Mount tourne sur place comme un biped | Path curvature, body length, angular model | Mount movement | Turn envelope, path smoothing, lateral movement |
| Edge-stop oscille avec input | Rider intent et safety outputs par frame | Agency/movement | Stable priority + hysteresis + refusal reason |
| Gait pop ou feet slide | Speed/gait ranges, phase markers, correction frames | Animation | Overlapping ranges, phase-aware transitions, correction resync |
| Feet flottent hors stirrups | Seat socket, pelvis offset, IK reach | Animation/seat | Pelvis-first solve, rig-specific offsets, reach clamp |
| Dismount dans un mur | Candidate list, rejection reasons, revalidation frame | Traversal + controller handoff | Typed candidate cascade, reserve/revalidate, last-safe fallback |
| Forced dismount tue le rider | Damage event, exit candidates, hazard score | Combat + mount lifecycle | Separate emergency placement policy |
| Summon n'apparaît jamais | Asset load, world cell, candidate, dormancy, relevancy | World/summon | Observable staged pipeline, timeout outcome, wake before mutate |
| Mauvais mount après reconnect | Durable ID, session revision, stale actor pointer | Party/persistence | Resolve ID server-side, new lease/revision, discard stale pointers |
| Late join voit un rider debout | Snapshot phase, seat state, cosmetic asset readiness | Replication/animation | Snapshot-driven realization, placeholder, phase catch-up |
| AI follow jitter | Nav path, avoidance layer, manual/assist priority, RVO capability | AI/navigation | Capability-test crowd path, stable corridor, throttle only presentation |
| Flying mount traverse unloaded cell | Speed horizon, streaming source, cell completion | Streaming | Worst-case speed budget, prefetch/deny/recovery |
| Waterline mode flicker | Water volume/probe sequence, hysteresis, resim | Aquatic movement | Explicit boundary transition + stable state |
| Remote aim/weapon state incorrect | Facing policy, weapon snapshot, cross-actor RPC ordering | Combat/replication | Coupled replicated struct, idempotent OnRep |
| Stable rempli coûte trop | AI tick, skeletal ticks, replication, draw/asset cost | Performance | Record instead of live actors, dormancy, significance, animation budget |

### First-party failure evidence à convertir en tests

Rockstar a publié des corrections couvrant :

- horse absent après whistle ou fast travel ;
- bonding reset et cargo/pelts perdus ;
- saddle/cosmetic state incorrect ;
- rider feet floating ;
- incorrect animation après revive ;
- mounted navigation sous cinematic camera ;
- aim/fire/reload et weapon state au dismount ;
- synchronization pops et session transition while mounted
([Rockstar, TU 1.09](https://support.rockstargames.com/articles/6XLmD65fhWzs67WCok5hud/red-dead-redemption-2-title-update-1-09-notes-ps4-xbox-one),
[Rockstar, TU 1.11](https://support.rockstargames.com/articles/6dT8UroC7aKslsqA38oaxj/red-dead-redemption-2-title-update-1-11-notes-ps4-xbox-one),
[Rockstar, TU 1.15](https://support.rockstargames.com/articles/28AmlyPGLVKsJ8OpdN8myn/red-dead-redemption-2-title-update-1-15-notes-ps4-xbox-one-pc-stadia)).

Ces patch notes prouvent les failure categories, pas leur root cause interne.

## Validation matrix

### Process topology

Epic documente les modes standalone/listen/dedicated et précise que Gauntlet peut
lancer plusieurs sessions server/client
([Epic, Testing Networked Games](https://dev.epicgames.com/documentation/en-us/unreal-engine/testing-and-debugging-networked-games-in-unreal-engine)).

| Test | Standalone | Listen | Dedicated separate processes |
| --- | ---: | ---: | ---: |
| Core lifecycle | Required | Required | Required |
| Local prediction/correction | N/A | Remote client required | Required |
| Simulated proxy presentation | N/A | Required | Required |
| Join-in-progress | N/A | Required | Required |
| Disconnect/reconnect | N/A | Required | Required |
| Travel/World Partition | Required | Required | Required |
| AI takeover | Required | Required | Required |
| Harsh network | N/A | Required | Required |
| Bandwidth/profile | Optional | Required | Required |

### Transition coverage

Pour chaque topology et chaque selected mobility branch :

- summon accepted/rejected/cancelled/timed out ;
- two players request same mount/seat ;
- mount while moving, on slope, at waterline et près d'un wall ;
- mount interrupted par damage, downed, world unload et connection loss ;
- manual dismount left/right/rear ;
- blocked dismount avec candidate fallback ;
- forced dismount ;
- dismiss idle/following/downed/observed ;
- downed → revive, simultaneous revive, death/despawn ;
- player → AI control, AI → player control ;
- teleport/fast travel/checkpoint ;
- join-in-progress dans chaque lifecycle state ;
- reconnect dans chaque lifecycle state ;
- stale/duplicate/out-of-order requests ;
- missing cosmetic asset et late asset completion.

### Movement coverage

- flat, ramps, stairs, slopes, uneven terrain ;
- doorway juste au-dessus et juste sous la footprint limit ;
- 90° corner, switchback et dead end ;
- ledge, cliff, jump, moving base et high-speed obstacle ;
- mount-mount, mount-player, mount-AI et enemy collision selon policy ;
- takeoff/landing/no-fly/ceiling si flying ;
- shore/shallow/deep/current/surface transition si aquatic ;
- manual override pendant road/follow assist ;
- all gaits et acceleration/deceleration reversals ;
- root-motion action pendant rollback.

### Network adversity

Epic recommande d'utiliser des conditions très dures, dont 500 ms round-trip
ping et au moins 10 % packet loss, afin d'exposer bugs et exploits
([Epic, Network Emulation](https://dev.epicgames.com/documentation/unreal-engine/using-network-emulation-in-unreal-engine)).

Tester :

- latency, jitter, loss, duplication et reordering ;
- correction au frame de mount commit ;
- correction au frame de dismount commit ;
- lost request, duplicate request et late outcome ;
- server rejection d'une locally anticipated transition ;
- ownership change pendant packet loss ;
- simulated proxy qui devient owner après reconnect ;
- bandwidth spikes lors de stable/summon group.

### Performance gates

- CPU mount movement total et par actor ;
- player versus unmounted AI cost ;
- rider + mount AnimBP, IK et root motion ;
- server tick cost sans rendering ;
- replicated bytes/properties/RPCs par state ;
- correction frequency et resim frames ;
- asset load latency/hitch et memory residency ;
- World Partition streaming margin au max reachable speed ;
- stable/crowd density avec significance/dormancy ;
- LOD, animation budget et remote presentation fidelity.

Unreal Insights, Animation Insights et Networking Insights sont les official
profiling paths correspondants
([Epic, Unreal Insights](https://dev.epicgames.com/documentation/unreal-engine/unreal-insights-in-unreal-engine),
[Epic, Animation Insights](https://dev.epicgames.com/documentation/unreal-engine/animation-insights-in-unreal-engine),
[Epic, Networking Insights](https://dev.epicgames.com/documentation/unreal-engine/networking-insights-in-unreal-engine)).

## Staged build order et completion criteria

Cette sequence ne choisit pas ground/flying/aquatic. « Selected branch » désigne
la première branch retenue après le grill.

### Stage 0 — Capability et topology spike

- [ ] Capability report pour Mover/Network Prediction/Motion Warping/GAS/AI/
      Water/World Partition.
- [ ] Options A et B du control-topology spike exécutées en dedicated.
- [ ] Collision approximation branch choisie ou explicitement laissée au grill.
- [ ] One-writer invariant observable.
- [ ] Replicated `FMountSessionState` reconstruit un late join.

**Complete quand :** une topology éligible est démontrée ou les blocking facts
sont documentés sans fallback inventé.

### Stage 1 — Lifecycle graybox

- [ ] Durable MountId séparé du actor.
- [ ] Summon, Mount, Dismount et Dismiss typed requests/outcomes.
- [ ] Reservation, cancellation, timeout et recovery idempotents.
- [ ] Safe candidate interface avec traversal/controller.
- [ ] Duplicate/stale request suite.

**Complete quand :** standalone/listen/dedicated convergent pour chaque lifecycle
state sans animation assets.

### Stage 2 — Selected movement branch

- [ ] Custom Input/Sync/Aux structs en C++.
- [ ] Player et AI intent adapters.
- [ ] Collision/footprint contract.
- [ ] Mode transitions et recovery.
- [ ] Fixed tick, smoothing et simulated proxies.

**Complete quand :** la branch-specific movement suite et harsh-network suite
réussissent, sans correction loop.

### Stage 3 — Rider presentation

- [ ] Mount presentation frame publié avant rider evaluation.
- [ ] Seat definitions et rig offsets data-driven.
- [ ] Mount/dismount Motion Warping path.
- [ ] Rider/mount gait phase handoff.
- [ ] IK contacts et remote resync.
- [ ] Contextual Animation branch capability-tested si retenue.

**Complete quand :** all body types/seats/gaits/transitions restent aligned en
owner, simulated proxy et late join.

### Stage 4 — Summon AI et open world

- [ ] Candidate pipeline avec restrictions et debug reasons.
- [ ] Async asset + World Partition readiness.
- [ ] Unmounted follow/approach/return behavior.
- [ ] Dead-end and lost-path recovery.
- [ ] Dormancy/relevancy/significance policy.

**Complete quand :** summon/dismiss/fast travel/streaming tests ne perdent ni
actor association ni durable state.

### Stage 5 — Combat et damage branch

- [ ] Travel-only, engage ou full-mounted policy choisie.
- [ ] GAS command/AbilityTask bridge.
- [ ] Facing/targeting/hitbox contract.
- [ ] Mount health/downed/death policy.
- [ ] Forced dismount recovery.

**Complete quand :** abilities et damage restent server-authoritative,
rollback-safe et testés dans tous les facing/weapon states retenus.

### Stage 6 — Persistence, co-op et accessibility

- [ ] Save/backend adapter et versioned MountInstanceRecord.
- [ ] Join-in-progress/reconnect in every lifecycle state.
- [ ] Bond/cosmetic ownership boundaries.
- [ ] Co-op collision/seat contention policy.
- [ ] Remap, toggle, assists et camera comfort suite.

**Complete quand :** state survives process travel/reconnect et aucune
accessibility option ne bypass Mover authority.

### Stage 7 — Additional mobility branches

- [ ] Chaque nouvelle branch reprend Stage 2 completion gates.
- [ ] Cross-medium transitions ont leur propre typed states.
- [ ] 3D AI navigation/reposition policy démontrée.
- [ ] Worst-case streaming and performance budgets mesurés.

**Complete quand :** aucune branch n'est un flag qui réutilise implicitement des
assumptions ground invalides.

## Implications pour le refactor actuel

### Audit local

Au moment de l'audit, l'ancien fichier combiné mounts/vehicles — remplacé pendant
le refactor par [`vehicles.md`](../skills/traversal-system/vehicles.md) — contenait
126 lignes et mélangeait :

- comparative product/design references ;
- mount handling/bonding ;
- flying trivialization ;
- vehicles, build-your-own et multi-crew sailing ;
- community/wiki claims et des source names sans liens directs.

Il ne définit ni runtime lifecycle, ni typed interface, ni Unreal build
workflow, ni network contract, ni completion criteria.

Le
[`traversal-system/SKILL.md`](../skills/traversal-system/SKILL.md)
réduit les mounts à une ligne Tier 4 « controller-swap » et laisse
« possession swap vs attached pawn » non résolu. Le
[`pitfalls.md`](../skills/traversal-system/pitfalls.md)
actuel a un seul mount failure group : doorway, dismount placement et summon.

### Contenu à déplacer vers `mount-system`

- mount-as-agent, gait, indirect autonomy et bonding seam ;
- rider↔mount lifecycle et control topology ;
- seat/binding/animation handoff ;
- summon/dismiss/runtime actor ;
- mount AI/follow/recovery ;
- damage/downed/death adapter ;
- co-op authority, prediction, JIP/reconnect ;
- mount-specific diagnostics et validation ;
- ground/flying/aquatic movement branches.

### Contenu à conserver dans `traversal-system`

- no-mount/no-fly/no-dive world markup ;
- terrain/volume/anchor affordances ;
- summon, landing, shore et dismount candidate discovery ;
- traversal economy et world readability ;
- flying-mount world-trivialization design question ;
- streaming reachability budgets comme world contract.

### Contenu à déplacer vers un futur `vehicle-system`

- driving handling et tire models ;
- vehicle physics ;
- build-your-own construction ;
- ships, crews et multi-role stations ;
- multi-crew replication ;
- mechanical passenger/seat topology.

### Contenu à retirer ou réécrire

- community wiki numbers présentés comme anchors ;
- claims non liés à une primary source ;
- generic speed/tuning values sans project context ;
- « disable rider wholesale » comme unique solution ;
- possession versus attachment comme simple engine mapping sans decision
  workflow ;
- tout claim d'architecture interne dérivé seulement du gameplay.

## Forme progressive-disclosure proposée

~~~text
skills/mount-system/
├── SKILL.md                  # router design / build / diagnose
├── architecture.md           # boundaries, topology, one-writer, data model
├── lifecycle.md              # requests, outcomes, transactions, recovery
├── mover-build.md            # capabilities, C++, prediction, collision
├── movement-branches.md      # ground / flying / aquatic / AI adapters
├── animation-combat.md       # seats, warping, IK, camera/targeting/GAS seams
├── world-persistence.md      # summon, streaming, save, collection, cosmetics
├── diagnostics.md            # symptom → evidence → owner → correction
└── validation.md             # standalone/listen/dedicated and completion gates
~~~

`SKILL.md` doit :

- annoncer explicitement les branches `design`, `build`, `diagnose` ;
- commencer par capability discovery et control-topology discovery ;
- router vers une seule référence pertinente par étape ;
- distinguer fact, version-sensitive API, recommendation et unknown ;
- terminer par des observable completion criteria ;
- ne pas inclure de fallback CMC ;
- ne pas promettre ground/flying/aquatic avant la décision de scope ;
- refuser les véhicules et multi-crew physics vers `vehicle-system`.

## Ordre recommandé pour la session `grill-me`

Chaque point est une décision ; une question à la fois.

1. **Rôle produit** — traversal utility réactive, compagnon léger, simulation
   profonde, ou boucle principale du jeu ?
2. **Runtime identity/persistence** — persistent world actor, despawned record,
   ou hybrid ?
3. **Control topology** — possession swap vers `AMountPawn`, retained rider
   possession, ou compound Pawn ?
4. **Collision contract** — vertical capsule approximation ou custom mount
   movement set/footprint ?
5. **Première mobility branch** — ground, flying, aquatic, ou un subset
   combiné ?
6. **Archetype composition** — même actor multi-mode ou specialized mount
   archetypes ?
7. **Control feel** — direct avatar, intent-driven animal, ou mix configurable ?
8. **Safety priority** — quelles situations peuvent contrarier rider intent ?
9. **AI follow** — comportements requis et recovery flying/aquatic sans turnkey
   3D nav ?
10. **Co-op collision** — mount↔mount, mount↔player et friendly blocking ?
11. **Passenger seats** — aucun, cosmetic passenger, ou player passenger
    support ?
12. **Combat policy** — travel-only, engage-then-dismount, ou full mounted
    combat ?
13. **Damage model** — no health, separate health/forced dismount, ou independent
    ASC/downed/death ?
14. **Facing/targeting** — séparation mount heading, camera aim et target lock ?
15. **Animation dependency** — project-owned pair, optional Contextual Animation
    spike, ou required Experimental dependency ?
16. **Root motion policy** — quelles transitions/actions utilisent Mover
    sim-driven root motion ?
17. **Summon visibility** — spawn proche, AI approach, offscreen reposition,
    stable return et refusal policies ?
18. **Safe dismount cascade** — ordre des candidates et emergency fallback ?
19. **Persistence fields** — bond, injury, cargo, equipment et temporary effects ?
20. **Progression/monetization** — cosmetic-only skins, horizontal bond ou power
    effects ?
21. **Accessibility defaults** — assists disponibles, defaults et competitive
    constraints ?
22. **Performance budget policy** — live mount density, dormancy, animation et
    network budgets ?
23. **Ship gates** — quelles branches et lifecycle states bloquent la release ?

Les deux premières questions fixent la place de la monture dans le jeu et son
identité runtime. La control topology est ensuite la première question
d'architecture : elle conditionne ownership, prediction, GAS continuity, input,
camera, AI takeover, join-in-progress et reconnect.

## Selected primary sources

### Epic Games

- [Mover in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-in-unreal-engine)
- [Mover Features and Concepts](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine)
- [Mover Examples](https://dev.epicgames.com/documentation/unreal-engine/mover-examples-in-unreal-engine)
- [UMoverComponent API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/UMoverComponent)
- [Mover API index](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover)
- [UNavMoverComponent API](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UNavMoverComponent)
- [Mover Debugging Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-debugging-reference-for-unreal-engine)
- [Actor Owner and Owning Connection](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-owner-and-owning-connection-in-unreal-engine)
- [Controllers](https://dev.epicgames.com/documentation/en-us/unreal-engine/controllers-in-unreal-engine)
- [Possess](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Pawn/Possess)
- [Replicated Object Execution Order](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicated-object-execution-order-in-unreal-engine)
- [UMovementComponent API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UMovementComponent)
- [Ability System Component and Attributes](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-system-component-and-gameplay-attributes-in-unreal-engine)
- [Using Gameplay Abilities](https://dev.epicgames.com/documentation/unreal-engine/using-gameplay-abilities-in-unreal-engine)
- [Motion Warping](https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-warping-in-unreal-engine)
- [ContextualAnimation API](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ContextualAnimation)
- [Full-Body IK](https://dev.epicgames.com/documentation/unreal-engine/control-rig-full-body-ik-in-unreal-engine)
- [World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine)
- [Asset Management](https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine)
- [Saving and Loading](https://dev.epicgames.com/documentation/en-us/unreal-engine/saving-and-loading-your-game-in-unreal-engine)
- [StateTree](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine)
- [Smart Objects](https://dev.epicgames.com/documentation/unreal-engine/smart-objects-in-unreal-engine---overview)
- [Environment Query System](https://dev.epicgames.com/documentation/en-us/unreal-engine/environment-query-system-in-unreal-engine)
- [Network Emulation](https://dev.epicgames.com/documentation/unreal-engine/using-network-emulation-in-unreal-engine)
- [Testing and Debugging Networked Games](https://dev.epicgames.com/documentation/en-us/unreal-engine/testing-and-debugging-networked-games-in-unreal-engine)

### First-party game development and product sources

- [Rockstar — Making the Believable Horses of RDR2](https://www.gdcvault.com/play/1027113/AI-Summit-Making-the-Believable)
- [Rockstar — developer slides](https://media.gdcvault.com/GDC%2B2021/making_horses_gdc2021.pdf)
- [Microsoft — On All Fours](https://www.gdcvault.com/play/1023433/On-All-Fours-Creating-Realistic)
- [Microsoft — On All Fours slides](https://media.gdcvault.com/gdc2016/Presentations/Karlsson_Tobias_On_All_Fours.pdf)
- [Naughty Dog — Motion Matching in The Last of Us Part II](https://www.gdcvault.com/play/1027378/Motion-Matching-in-The-Last)
- [Naughty Dog — Accessibility Features](https://www.naughtydog.com/blog/the_last_of_us_part_ii_accessibility_features_detailed)
- [Massive — Upgrading Snowdrop for Avatar](https://www.gdcvault.com/play/1034412/Upgrading-the-Snowdrop-Engine-for)
- [ArenaNet — Joy of Movement on Mounts](https://www.guildwars2.com/en-gb/news/developer-diary-joy-of-movement-on-mounts/)
- [ArenaNet — Introduction to Mounts](https://www.guildwars2.com/en/news/introduction-to-mounts-in-guild-wars-2/)
- [ArenaNet — Roller Beetle](https://www.guildwars2.com/en/news/the-roller-beetle-a-familiar-friend/)
- [Blizzard — Dragonriding](https://news.blizzard.com/en-gb/article/23818251/updated-aug-25-dragonriding-and-you-ascending-to-new-heights-of-skill)
- [Blizzard — Skyriding](https://news.blizzard.com/en-us/article/24104275/take-to-the-skies-with-skyriding)
- [Bandai Namco — Elden Ring Starter Guide](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-starter-guide-tips-know-playing-the-game)
- [Nintendo — Zelda Wii U horse behavior](https://www.nintendo.com/en-gb/News/2014/December/Nintendo-announces-new-details-for-three-games-coming-in-2015-including-a-new-look-at-The-Legend-of-Zelda-for-Wii-U-941917.html)
- [Rockstar — Horse Customization](https://www.rockstargames.com/newswire/article/25o24118179ak8/Game-Tips-Character-Camp-Horse-Customization)
- [Rockstar — Title Update 1.09](https://support.rockstargames.com/articles/6XLmD65fhWzs67WCok5hud/red-dead-redemption-2-title-update-1-09-notes-ps4-xbox-one)
- [Rockstar — Title Update 1.11](https://support.rockstargames.com/articles/6dT8UroC7aKslsqA38oaxj/red-dead-redemption-2-title-update-1-11-notes-ps4-xbox-one)
- [Rockstar — Title Update 1.15](https://support.rockstargames.com/articles/28AmlyPGLVKsJ8OpdN8myn/red-dead-redemption-2-title-update-1-15-notes-ps4-xbox-one-pc-stadia)
- [Microsoft — Xbox Accessibility Guideline 107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107)
- [Microsoft — Xbox Accessibility Guideline 117](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117)

## Final recommendation before grilling

Créer `mount-system` séparément de `traversal-system` et
`character-controller`, avec un public contract centré sur :

~~~text
Mount Request
  → authoritative lifecycle transaction
  → one mount movement writer
  → replicated Mount Outcome / Session Snapshot
  → rider, camera, animation, combat and persistence handoffs
~~~

Ne pas écrire encore le skill comme si le rôle produit, la runtime identity, la
control topology, la collision quadrupède, la first mobility branch, le combat
ou le damage model étaient décidés. Ce sont précisément les décisions de la
prochaine session `grill-me`.
