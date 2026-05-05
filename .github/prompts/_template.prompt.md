---
# INSTRUCCIONES: Elimina los comentarios (#...) antes de usar este prompt.
# Renombra el archivo a: <nombre-kebab-case>.prompt.md
# Los prompts aparecen como slash commands al escribir / en el chat.

description: "REEMPLAZAR: Describe qué hace el prompt y cuándo usarlo. Ej: 'Use when generating a unit test file for a service. Requires the service file to be open.'"
argument-hint: "REEMPLAZAR (opcional): Hint que se muestra al usuario. Ej: '<service-name>'"
agent: 'agent' # Opciones: agent (ejecuta acciones) | ask (solo responde)
# model: "Claude Sonnet 4.6 (copilot)"  # Descomenta para fijar modelo
# tools: [search, filesystem]           # Descomenta y ajusta si necesitas herramientas específicas
---

<!-- CONTEXTO: Enlaza los archivos que el agente SIEMPRE necesita para esta tarea -->
<!-- Ejemplo: [Wallet Service](../../src/services/wallet.service.ts) -->
<!-- Ejemplo: [Test Helpers](../../tests/helpers/mocks.ts) -->

<!-- INSTRUCCIÓN PRINCIPAL: Una tarea clara y bien definida -->
<!-- Reemplaza todo el bloque de abajo con tu prompt real -->

## Tarea

DESCRIBIR LA TAREA CONCRETA AQUÍ.

## Requisitos

- Requisito 1
- Requisito 2
- Requisito 3

## Convenciones a seguir

- Seguir los patrones de este proyecto: ver `.github/instructions/` para la capa relevante
- [Instrucciones de servicios](../../.github/instructions/services.instructions.md)
- [Instrucciones de tests](../../.github/instructions/tests.instructions.md)

## Formato de salida esperado (si aplica)

<!-- Incluye un ejemplo mínimo del output esperado para guiar la calidad -->
<!-- Ejemplo:
```typescript
describe('ServiceName.methodName', () => {
  it('should ...', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```
-->
