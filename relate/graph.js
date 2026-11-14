'use strict';
/**
 * relate/graph.js — Ciudadano Graph
 * Capa de grafo de KAIPY sobre Relate (@relate/relate).
 * Modo: single file -> data/graph/ciudadano.rl
 */
const path = require('path');
const fs = require('fs');
const { Database } = require('@relate/relate');

const STORE_DIR = path.join(__dirname, '..', 'data', 'graph');
const STORE_FILE = path.join(STORE_DIR, 'ciudadano.rl');
const GRID = 0.001; // ~110 m, la misma celda del dedupe de KAIPY
const RECUR_WINDOW_DAYS = 30;

let _db = null;
let _conn = null;

function open(storePath) {
  if (_conn) return _conn;
  const target = storePath || STORE_FILE;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  _db = Database.open(target);
  _conn = _db.connect();
  try {
    _conn.query('CREATE CONSTRAINT report_id IF NOT EXISTS FOR (r:Report) REQUIRE r.id IS UNIQUE');
    _conn.query('CREATE CONSTRAINT workorder_id IF NOT EXISTS FOR (w:WorkOrder) REQUIRE w.id IS UNIQUE');
  } catch (e) {
    // La idempotencia la garantiza MERGE; no abortamos por la sintaxis de constraint.
  }
  return _conn;
}

function close() {
  if (_db && typeof _db.close === 'function') _db.close();
  _db = null;
  _conn = null;
}

function cell(lat, lng) {
  const rLat = Math.round(lat / GRID) * GRID;
  const rLng = Math.round(lng / GRID) * GRID;
  return { lat: rLat, lng: rLng, key: rLat.toFixed(3) + ',' + rLng.toFixed(3) };
}

function recordReport(opts) {
  const conn = open();
  const reportId = opts.reportId;
  const area = opts.area || 'other';
  const severity = opts.severity || 'medium';
  const description = opts.description || '';
  const createdAt = opts.createdAt || new Date().toISOString();
  const district = opts.district || 'unassigned';
  const location = cell(opts.lat, opts.lng);

  conn.begin();
  try {
    conn.query(
      'MERGE (l:Location {cell: $cell}) ' +
      'ON CREATE SET l.lat = $lat, l.lng = $lng ' +
      'SET l.district = coalesce(l.district, $district) RETURN l',
      { cell: location.key, lat: location.lat, lng: location.lng, district: district }
    );

    const openCase = conn.query(
      "MATCH (r:Report {status: 'open'})-[:LOCATED_AT]->(l:Location {cell: $cell}), " +
      '(r)-[:BELONGS_TO]->(a:Area {name: $area}) ' +
      'RETURN r.id AS id ORDER BY r.first_seen ASC LIMIT 1',
      { cell: location.key, area: area }
    );

    const recurrence = conn.query(
      'MATCH (w:WorkOrder)-[:AT]->(l:Location {cell: $cell}) ' +
      'WHERE w.closed_at IS NOT NULL ' +
      'RETURN w.id AS id, w.closed_at AS closedAt ORDER BY w.closed_at DESC LIMIT 1',
      { cell: location.key }
    );

    conn.query(
      'MERGE (r:Report {id: $id}) ' +
      'ON CREATE SET r.first_seen = $createdAt, r.description = $description ' +
      "SET r.status = coalesce(r.status, 'open'), r.severity = $severity RETURN r",
      { id: reportId, createdAt: createdAt, description: description, severity: severity }
    );

    conn.query(
      'MERGE (a:Area {name: $area}) WITH a ' +
      'MATCH (r:Report {id: $id}) MERGE (a)-[:WROTE]->(r) RETURN r',
      { area: area, id: reportId }
    );

    conn.query(
      'MATCH (r:Report {id: $id}), (l:Location {cell: $cell}) ' +
      'MERGE (r)-[:LOCATED_AT]->(l) RETURN r',
      { id: reportId, cell: location.key }
    );

    conn.query(
      'MERGE (a:Area {name: $area}) WITH a ' +
      'MATCH (r:Report {id: $id}) MERGE (r)-[:BELONGS_TO]->(a) RETURN r',
      { area: area, id: reportId }
    );

    let isDuplicateOf = null;
    if (openCase.rows.length > 0 && openCase.rows[0].id !== reportId) {
      isDuplicateOf = openCase.rows[0].id;
      conn.query(
        'MATCH (dup:Report {id: $id}), (canon:Report {id: $canon}) ' +
        'MERGE (dup)-[:DUPLICATE_OF]->(canon) RETURN dup',
        { id: reportId, canon: isDuplicateOf }
      );
    }

    let recursAfter = null;
    if (recurrence.rows.length > 0) {
      recursAfter = recurrence.rows[0].id;
      conn.query(
        'MATCH (r:Report {id: $id}), (w:WorkOrder {id: $wo}) ' +
        'MERGE (r)-[:RECURS_AFTER]->(w) RETURN r',
        { id: reportId, wo: recursAfter }
      );
    }

    conn.commit();
    return { reportId: reportId, isDuplicateOf: isDuplicateOf, witnessCount: witnessCount(reportId), recursAfter: recursAfter };
  } catch (err) {
    conn.rollback();
    throw err;
  }
}

function assignWorkOrder(opts) {
  const conn = open();
  const workOrderId = opts.workOrderId;
  const crew = opts.crew || 'unassigned';
  const openedAt = opts.openedAt || new Date().toISOString();
  conn.begin();
  try {
    conn.query(
      'MERGE (w:WorkOrder {id: $id}) ' +
      "ON CREATE SET w.opened_at = $openedAt, w.status = 'open' RETURN w",
      { id: workOrderId, openedAt: openedAt }
    );
    conn.query(
      'MERGE (c:Crew {name: $crew}) WITH c ' +
      'MATCH (w:WorkOrder {id: $id}) MERGE (c)-[:EXECUTES]->(w) RETURN w',
      { crew: crew, id: workOrderId }
    );
    conn.query(
      'MATCH (r:Report {id: $rid}), (w:WorkOrder {id: $id}) ' +
      'MERGE (r)-[:RESOLVED_BY]->(w) RETURN r',
      { rid: opts.reportId, id: workOrderId }
    );
    conn.query(
      'MATCH (w:WorkOrder {id: $id}), (l:Location)<-[:LOCATED_AT]-(:Report {id: $rid}) ' +
      'MERGE (w)-[:AT]->(l) RETURN w',
      { id: workOrderId, rid: opts.reportId }
    );
    conn.commit();
    return { workOrderId: workOrderId, reportId: opts.reportId };
  } catch (err) {
    conn.rollback();
    throw err;
  }
}

function closeWorkOrder(opts) {
  const conn = open();
  const closedAt = opts.closedAt || new Date().toISOString();
  conn.begin();
  try {
    conn.query(
      'MATCH (w:WorkOrder {id: $id}) ' +
      "SET w.status = 'closed', w.closed_at = $closedAt RETURN w",
      { id: opts.workOrderId, closedAt: closedAt }
    );
    conn.query(
      "MATCH (r:Report)-[:RESOLVED_BY]->(w:WorkOrder {id: $id}) SET r.status = 'closed' RETURN r",
      { id: opts.workOrderId }
    );
    conn.commit();
    return { workOrderId: opts.workOrderId, closedAt: closedAt };
  } catch (err) {
    conn.rollback();
    throw err;
  }
}

function witnessCount(reportId) {
  const conn = open();
  const res = conn.query(
    'MATCH (dup:Report)-[:DUPLICATE_OF*]->(canon:Report {id: $id}) ' +
    'RETURN count(dup) AS witnesses',
    { id: reportId }
  );
  return res.rows.length ? Number(res.rows[0].witnesses) : 0;
}

function areaRanking() {
  const conn = open();
  return conn.query(
    'MATCH (a:Area)-[:WROTE]->(r:Report) ' +
    "RETURN a.name AS area, count(r) AS reports, count(CASE WHEN r.status = 'open' THEN 1 END) AS open " +
    'ORDER BY reports DESC'
  ).rows;
}

function crewAccountability() {
  const conn = open();
  return conn.query(
    'MATCH (c:Crew)-[:EXECUTES]->(w:WorkOrder)<-[:RESOLVED_BY]-(r:Report) ' +
    'OPTIONAL MATCH (again:Report)-[:RECURS_AFTER]->(w) ' +
    'RETURN c.name AS crew, count(DISTINCT w) AS closedOrders, count(DISTINCT again) AS recurrences ' +
    'ORDER BY recurrences DESC'
  ).rows;
}

function neighbourhoodPatterns(minReports) {
  const conn = open();
  return conn.query(
    'MATCH (r:Report)-[:LOCATED_AT]->(l:Location) WITH l, count(r) AS reports ' +
    'WHERE reports >= $min MATCH (a:Area)-[:WROTE]->(:Report)-[:LOCATED_AT]->(l) ' +
    'RETURN l.cell AS cell, l.district AS district, reports, collect(DISTINCT a.name) AS areas ' +
    'ORDER BY reports DESC',
    { min: minReports || 3 }
  ).rows;
}

function suspectedSemanticDuplicates() {
  const conn = open();
  return conn.query(
    'MATCH (a:Report)-[:LOCATED_AT]->(l:Location)<-[:LOCATED_AT]-(b:Report) ' +
    "WHERE a.id < b.id AND a.status = 'open' AND b.status = 'open' " +
    'RETURN a.id AS reportA, b.id AS reportB, l.cell AS cell'
  ).rows;
}

module.exports = {
  open: open,
  close: close,
  recordReport: recordReport,
  assignWorkOrder: assignWorkOrder,
  closeWorkOrder: closeWorkOrder,
  witnessCount: witnessCount,
  areaRanking: areaRanking,
  crewAccountability: crewAccountability,
  neighbourhoodPatterns: neighbourhoodPatterns,
  suspectedSemanticDuplicates: suspectedSemanticDuplicates,
  STORE_FILE: STORE_FILE,
  STORE_DIR: STORE_DIR,
};
