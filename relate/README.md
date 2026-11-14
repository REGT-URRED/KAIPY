# Ciudadano Graph — the graph memory of KAIPY

**The graph layer of [KAIPY](https://github.com/REGT-URRED/KAIPY), built on [Relate by Neo4j](https://relatedb.ai).**

KAIPY is an anonymous civic-reporting app: a neighbour photographs a broken streetlight, a pothole or an illegal dump and reports it without an account. What a city lacks is not more reports — it is **memory**: the ability to answer *"have we seen this before, who fixed it, and did the fix hold?"*

That is a graph problem, not a table problem. Ciudadano Graph stores every complaint, the office that owns it, the crew that fixed it and the recurrence that followed as nodes and edges inside Relate, embedded in the same Node.js process as KAIPY. No server, no port, no network hop: the graph lives beside the evidence.

---

## How it uses Relate

**Mode: `single file`.** The whole store is one file, `data/graph/ciudadano.rl`, opened with `Database.open()` from the `@relate/relate` package. Relate runs **in-process** — there is no `neo4j://` connection and no database server to operate.

```js
const { Database } = require('@relate/relate');
const db = Database.open('data/graph/ciudadano.rl');
const conn = db.connect();
conn.query("MATCH (r:Report) WHERE r.status = 'open' RETURN count(r) AS n").rows;
```

### Why single file

A district municipality, a university campus or a neighbourhood association should be able to **copy the whole city's complaint memory onto a USB stick**: one file, together with the encrypted evidence, on the machine they own. A directory store would work too, but a single `.rl` file makes backup, transfer and forensic audit a file copy. It also keeps the deployment story honest — the app already runs on a home server, so the database must not require an operator.

---

## Graph model

```
(:Area {name})-[:WROTE]->(:Report)
(:Report {id})-[:LOCATED_AT]->(:Location {cell, lat, lng, district})
(:Report)-[:BELONGS_TO]->(:Area)
(:Report)-[:DUPLICATE_OF]->(:Report)          // same problem, extra witness
(:Report)-[:RESOLVED_BY]->(:WorkOrder)
(:Report)-[:RECURS_AFTER]->(:WorkOrder)       // the fix failed
(:Crew {name})-[:EXECUTES]->(:WorkOrder)
(:WorkOrder)-[:AT]->(:Location)
```

`Location` is identified by a **cell**, not by coordinates: latitude and longitude rounded to 0.001°, roughly 110 metres — the same grid KAIPY already uses for deduplication. No precise position is ever stored, and there is no `Citizen` node at all: anonymity is structural.

### Why edges instead of columns

A duplicate is not a counter increment, it is an edge. Eleven people reporting the same pothole is one `Report` node with eleven incoming `DUPLICATE_OF` paths, and the witness count is the length of that path:

```cypher
MATCH (dup:Report)-[:DUPLICATE_OF*]->(canon:Report {id: $id})
RETURN count(dup) AS witnesses
```

The same holds for repair quality. A `RECURS_AFTER` edge is written when a new report lands on a cell that already has a **closed** work order. That single edge turns *"we closed 400 tickets"* into *"we closed 400 and 38 came back"*:

```cypher
MATCH (c:Crew)-[:EXECUTES]->(w:WorkOrder)<-[:RESOLVED_BY]-(r:Report)
OPTIONAL MATCH (again:Report)-[:RECURS_AFTER]->(w)
RETURN c.name, count(DISTINCT w) AS closedOrders,
       count(DISTINCT again) AS recurrences
ORDER BY recurrences DESC
```

---

## What the graph enables that the app alone did not

| Question a municipality asks | Before | With the graph |
|---|---|---|
| How many people reported this exact problem? | a counter column that can drift | length of the `DUPLICATE_OF` path, auditable |
| Did our repair actually hold? | unknowable | `RECURS_AFTER` edge, two hops |
| Which crew's fixes fail most? | not answerable | one grouped traversal |
| Which block floods every March? | three-way self-join | `neighbourhoodPatterns()` |
| Did the agent invent this category? | trust the model | verify the `BELONGS_TO` edge exists |

---

## Files

```
relate/
├── graph.js        # the Relate layer: store, schema, queries
└── README.md       # this file
```

`graph.js` exposes: `recordReport`, `assignWorkOrder`, `closeWorkOrder`, `witnessCount`, `areaRanking`, `crewAccountability`, `neighbourhoodPatterns`, `suspectedSemanticDuplicates`.

---

## Run it

```bash
npm install @relate/relate
node -e "require('./relate/graph').open()"
```

The first call creates `data/graph/ciudadano.rl`. Every write is wrapped in a transaction with `begin()` / `commit()` / `rollback()`, and every create is a `MERGE` keyed on the report id, so a client retry cannot double-count a witness.

---

## Design rules the code enforces

1. **Never delete a duplicate.** A merged report stays as a node with a `DUPLICATE_OF` edge, because the multiplicity *is* the urgency signal.
2. **Geography beats phrasing.** A report outside the cell opens a new case even if the text is identical.
3. **The agent proposes, the graph verifies.** A category is only accepted if the corresponding edge can be written; otherwise the case is flagged for review.
4. **Idempotent writes.** `MERGE` on the report id everywhere.
5. **No personal data at the centre.** No citizen node, no email, no precise coordinate.

---

## Stack

Relate (`@relate/relate`) · Cypher · Node.js 18+ · integrated with KAIPY's existing Express service.

## Author

Rafael Enrique Gomez Taype — Lima, Peru · [github.com/REGT-URRED](https://github.com/REGT-URRED)
