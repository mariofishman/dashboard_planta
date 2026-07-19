# Respuestas arquitectónicas de EmusaSoft para Monitor

**Fecha:** 2026-07-19
**Estado:** decisiones de alto nivel respondidas; contratos de implementación pendientes

## Respuestas recibidas

1. El transporte realtime de EmusaSoft es **SSE**.
2. El contrato de eventos debe definirse según los requerimientos funcionales de Monitor.
3. La infraestructura realtime de EmusaSoft utiliza **Redis**.
4. Monitor debe consumir directamente el servicio realtime de EmusaSoft.
5. Monitor es un sistema nuevo: tendrá repositorio y base de datos de control propios, con acceso de solo lectura a la base de EmusaSoft.

## Consecuencia para Monitor

- Arquitectura: repositorio, servicio, despliegue y base de datos completamente independientes.
- Entrada desde EmusaSoft: SSE consumido por backend.
- Recuperación y contexto: consultas read-only a la base de EmusaSoft.
- Comunicación con clientes: WebSockets propios de Monitor por ser bidireccional.
- Coordinación realtime de Monitor: Redis propio; no se presupone acceso al Redis interno de EmusaSoft.
- Persistencia: base propia de Monitor para incidentes, mensajes, cursores y auditoría.
- Prohibición: Monitor no escribe en la base de EmusaSoft.
- Cierres sin resolución: Monitor ofrece una vista read-only con evidencia y referencias ERP. Cualquier ajuste posterior pertenece al equipo de EmusaSoft y queda fuera del alcance de Monitor.

## Contratos que debe definir el equipo de Monitor

- endpoint, autenticación, payloads, versionado, cursores y replay del SSE;
- consultas e índices permitidos para reconciliación read-only;
- protocolo WebSocket, autorización, idempotencia y recuperación por API;
- autenticación de usuarios y mapeo a `sysUserId`;
- runtime, frameworks y topología de despliegue del nuevo sistema.
