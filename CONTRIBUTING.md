# Colaboracion y Git Workflow

## Objetivo
Este proyecto ya tiene despliegue productivo, asi que ningun cambio debe llegar a `main` sin revision previa.

## Modelo de ramas
```text
main          produccion
  └── develop integracion y pruebas previas
        └── feature/nombre-tarea trabajo diario
```

## Regla de oro
- No hacer `push` directo a `main`.
- No hacer `push` directo a `develop`.
- Todo cambio entra por `feature/*` -> Pull Request -> revision -> merge.

## Flujo diario
### 1. Antes de empezar
```powershell
git checkout develop
git pull origin develop
git checkout -b feature/nombre-tarea
```

Ejemplos:
- `feature/inventario-fix-stock`
- `feature/historial-detalle-mascota`
- `feature/factus-ui`
- `feature/wompi-checkout`

### 2. Mientras trabajas
```powershell
git add .
git commit -m "fix: corregir calculo de stock tras movimiento"
git fetch origin
git rebase origin/develop
```

### 3. Cuando terminas
```powershell
git push origin feature/nombre-tarea
```

Abrir un Pull Request de `feature/nombre-tarea` hacia `develop`.

### 4. Revision cruzada
- Quien no hizo el cambio revisa el PR.
- Si hace falta algo, se corrige en la misma rama.
- Solo se hace merge a `develop` cuando el PR queda aprobado.

### 5. Paso a produccion
```powershell
git checkout main
git pull origin main
git merge develop
git push origin main
```

`main` despliega produccion, asi que este paso solo se hace cuando `develop` esta estable y probado.

## Convenciones de commits
```text
feat: nueva funcionalidad
fix: correccion de bug
style: cambios visuales o CSS
refactor: cambio interno sin alterar comportamiento
test: agregar o ajustar pruebas
chore: mantenimiento o estructura
```

Ejemplos:
- `feat: agregar alerta visual de stock bajo`
- `fix: historial clinico no filtra por clinicaId`
- `chore: mover factusService a services`

## Como evitar conflictos
- Repartir tareas intentando no tocar los mismos archivos al mismo tiempo.
- Avisar en el chat cuando vayan a modificar una pantalla o controlador compartido.
- Hacer commits pequenos y frecuentes.
- Rebasear sobre `develop` antes de abrir el PR.
- Resolver conflictos archivo por archivo, sin mezclar cambios no relacionados.

## Checklist antes de merge a `main`
- El flujo del modulo funciona de punta a punta en local.
- No quedan `console.log` de depuracion.
- Las variables nuevas existen en Render si aplican.
- El otro desarrollador reviso y aprobo el PR.
- Se probaron frontend, backend y base localmente o con Docker.

## Pendientes de setup del repositorio
Estos puntos no se resuelven desde el codigo y deben configurarse en GitHub:

- Crear la rama remota `develop`.
- Proteger `main` para exigir Pull Request y al menos 1 aprobacion.
- Proteger `develop` con la misma regla.
- Bloquear bypass de protecciones para evitar pushes accidentales.
