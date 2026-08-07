# GRAPH ENGINEER — Investigación aplicada a kaipy

## Qué es

El **Graph Engineer** es un rol de ingeniería especializado en datos y
sistemas modelados como **grafos** (nodos + relaciones), a diferencia del
modelado relacional tradicional (tablas + joins). No es un cargo formal
universal como "backend developer"; es una especialización emergente que
combina: modelado de datos, bases de datos de grafos, pipelines ETL,
GraphQL/APIs y (en la variante moderna) GraphRAG e IA sobre grafos.

## Dominios donde opera

1. **Knowledge graphs** — base de conocimiento donde entidades (personas,
   empresas, proyectos, documentos) se conectan por relaciones semánticas.
   Usados por Google, Bing, Siri, WolframAlpha.
2. **Graph databases** — Neo4j, ArangoDB, Dgraph, Memgraph, Amazon Neptune,
   JanusGraph. Query language principal: **Cypher** (Neo4j), también
   Gremlin (Apache TinkerPop) y SPARQL (RDF/Semantic Web).
3. **GraphQL** — capa de API sobre cualquier fuente (no es lo mismo que
   graph database, pero es el puente natural frontend ↔ grafo).
4. **GraphRAG** — retrieval augmented generation sobre knowledge graphs:
   el LLM consulta un grafo para responder con contexto verificado en vez
   de solo vector embeddings. Tendencia 2024-2026.
5. **Graph analytics / GNN** — redes neuronales de grafos, detección de
   comunidades, ranking (PageRank, centrality).

## Stack típico del rol

| Capa            | Herramientas                                    |
|-----------------|-------------------------------------------------|
| Base de datos   | Neo4j, ArangoDB, Dgraph, Memgraph, Neptune      |
| Lenguaje        | Cypher, Gremlin, SPARQL, GraphQL                |
| Procesamiento   | Python (networkx, iGraph, PyTorch Geometric)    |
| Ingesta         | ETL/ELT, Apache Spark GraphX, Kafka              |
| Exposición      | GraphQL (Apollo), REST, endpoints de embeddings |
| IA              | GraphRAG (Microsoft), LlamaIndex, LangChain     |

## Cómo encaja en kaipy

La estructura preparada (Atomic Design + GRASP) ya contempla el punto de
integración:

- `assets/js/core/config.js` → `apiBase` apuntará al servicio de grafos
  (GraphQL o REST).
- `assets/js/modules/services/` → capa de indirección (GRASP) para las
  consultas al grafo; la UI nunca habla con el grafo directo.
- Los componentes atómicos (atoms/molecules/organisms) se construyen a
  partir de los **tipos de entidad** que exponga el grafo: si kaipy modela
  personas, proyectos y documentos, cada entidad tendrá su organism
  (tarjeta, detalle, listado) reutilizable.
- Los templates/pages consumen consultas de grafo (ej. "proyectos
  relacionados con X") sin conocer el query language: el service traduce.

## Decisión de modelado pendiente

Cuando definas las necesidades del backend, la primera pregunta de
Graph Engineer es: **¿los datos son inherentemente relacionales o de
grafo?** Si hay jerarquías profundas, relaciones N:N con contexto en la
relación, o búsqueda semántica → grafo (Neo4j). Si son tablas planas con
reportes simples → PostgreSQL tradicional. kaipy puede arrancar con
PostgreSQL y migrar a grafo solo si el modelo lo exige.

## Referencias

- Knowledge graph — Wikipedia (EN): interlinked descriptions of entities,
  encoding semantics of relationships; base de Google/Bing/WolframAlpha.
- Graph database — entrada de grafos: modelado nodo-relación vs
  tablas/joins.
