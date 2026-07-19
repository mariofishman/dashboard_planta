# Preguntas mínimas sobre realtime para el arquitecto de EmusaSoft

Estamos diseñando **Monitor**, un sistema de dashboard, mensajes, errores y alertas integrado con EmusaSoft. El MCP y la base de datos no exponen la implementación realtime ni su infraestructura.

Por favor, responde manteniendo la numeración y enlaza el repositorio, commit o documento correspondiente cuando exista. No incluyas tokens, contraseñas ni secretos.

1. ¿Qué tecnología y servicio realtime usa actualmente EmusaSoft —Socket.IO, WebSocket nativo, SSE u otro— y cómo se conectan y autentican los clientes? Indica endpoint, protocolo, namespaces o rooms si existen, y manejo de expiración o renovación de la sesión durante una conexión activa.

2. ¿Dónde está definido el contrato de eventos realtime? Necesitamos los nombres de eventos, esquemas y versiones de sus payloads, y saber qué cambios del sistema se publican actualmente por ese canal.

3. ¿Qué garantías e infraestructura tiene ese canal y cómo recomiendan integrarlo con Monitor? Indica broker, adaptador u outbox si existen; comportamiento ante duplicados, pérdida u orden incorrecto; cursores, replay y reconexión; estrategia de escalamiento; y si Monitor debe consumir el servicio existente o conectarse mediante un gateway específico.
