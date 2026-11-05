# Prompts reutilizables para AniTrack

Las pautas permanentes viven en [AGENTS.md](../AGENTS.md). Estos prompts definen el alcance de cada tarea. Reemplazá los campos entre corchetes antes de usarlos.

## Continuar en un chat nuevo

```text
Continuamos con AniTrack. Leé AGENTS.md, README.md y docs/ESTADO.md,
revisá los cambios locales y los archivos relacionados con esta tarea.
Trabajá con criterio de desarrollador senior de Next.js 16 y diseñador
UX/UI profesional, siguiendo las pautas del repositorio.

Objetivo de este chat: [resultado concreto].
Alcance: [pantallas, flujos o módulos].
Criterios de aceptación: [comportamientos verificables].

Contrastá el estado documentado con el código. Explicá brevemente el
enfoque y ejecutá el trabajo dentro de ese alcance. Conservá los cambios
previos. Validá lo que corresponda y actualizá docs/ESTADO.md al cerrar.
```

## Preparar el rediseño, sin implementarlo todavía

```text
Leé AGENTS.md, README.md, docs/ESTADO.md y los requisitos del rediseño
en Requerimientos/. Inspeccioná sus HTML, capturas y codigo/temas.css.

Compará la app actual con esas referencias. Prepará un plan por las fases
de los requisitos, indicando por fase: pantallas/componentes, dependencias,
cambios de datos, riesgos, criterios de aceptación y validación.
Distinguí lo implementado de lo propuesto y las decisiones todavía abiertas.

Guardá el plan en docs/PLAN-REDISENO.md y enlazalo desde docs/ESTADO.md.
En esta tarea solo prepará documentación; no cambies la aplicación.
```

## Implementar la primera fase visual

```text
Implementá la fase 1 del rediseño de AniTrack: base visual, tipografías,
logo, barra superior y textos en español rioplatense. Seguí AGENTS.md,
docs/ESTADO.md y los requisitos y referencias de Requerimientos/.
Si existe docs/PLAN-REDISENO.md, revisalo antes de empezar.

Usá los temas y la identidad entregados. Adaptá los componentes existentes
y conservá los flujos operativos. Coordiná globals.css, layout y el sistema
de temas para evitar parpadeos. Como esta fase no cambia datos, conservá
la persistencia disponible y documentá la transición pendiente a
profiles.theme y a Ajustes. No enlaces a rutas que aún no existan.

No incluyas todavía el nuevo modelo Biblioteca/Me encanta, tablas nuevas
ni funciones sociales posteriores. Preservá la lógica de sincronización.

Validá móvil y escritorio, temas afectados, teclado, contraste, carga
y errores. Ejecutá las comprobaciones de código pertinentes y actualizá
docs/ESTADO.md con lo completado y las limitaciones verificadas.
```

## Implementar una función o fase posterior

```text
Objetivo: [función o fase].
Referencia: [requisito y pantallas].
Criterios de aceptación: [lista concreta].
Fuera de alcance: [solo si hace falta delimitar].

Seguí AGENTS.md y revisá docs/ESTADO.md. Trazá el flujo desde la UI hasta
la persistencia y reutilizá servicios y componentes. Si cambia el modelo,
prepará migración, permisos RLS, compatibilidad y pruebas de aislamiento.
Informá por separado si la migración está escrita, probada localmente
o aplicada al entorno objetivo.

Implementá, verificá y documentá. No simules funcionalidades faltantes
como si estuvieran conectadas al backend.
```

## Corregir un error

```text
Error observado: [qué sucede].
Resultado esperado: [qué debería suceder].
Cómo reproducirlo: [pasos, ruta, estado de sesión/proveedor].

Seguí AGENTS.md. Investigá la causa y corregí con el menor alcance
razonable. Agregá una prueba de regresión si protege un comportamiento
relevante. Verificá el caso original y los flujos afectados. Informá causa,
solución y evidencia; actualizá la documentación si cambia un contrato
o una decisión del proyecto.
```

## Auditar UX/UI o revisar un cambio

```text
Revisá [pantalla, flujo o diff] siguiendo AGENTS.md y las referencias del
rediseño. En esta tarea devolvé hallazgos, sin modificar la aplicación.

Priorizá problemas concretos: pérdida de datos, permisos, regresiones,
claridad de acciones, accesibilidad, responsive, temas y rendimiento.
Para cada hallazgo indicá impacto, dónde ocurre, cómo verificarlo y una
corrección propuesta. Separá errores de preferencias visuales y declará
qué no pudiste comprobar. Si no hay hallazgos, decilo sin inventarlos.
```

## Cerrar una sesión larga

```text
Actualizá docs/ESTADO.md para continuar en otro chat: qué se implementó,
decisiones y motivos, archivos clave, comprobaciones y resultados,
pendientes, bloqueos y próximo paso concreto. Separá código local,
migraciones aplicadas y despliegues verificados. No incluyas credenciales
ni des por hecho que el próximo chat conoce esta conversación.
```
