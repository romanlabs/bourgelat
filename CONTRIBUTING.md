# Colaboracion y Git Workflow

## Objetivo
Este proyecto ya tiene despliegue productivo (una clinica piloto lo usa a diario),
asi que ningun cambio debe llegar a `main` sin pasar por un Pull Request.

## Modelo de ramas
```text
main              produccion (Render despliega desde aqui)
  └── develop     integracion y pruebas previas
        └── <tipo>/descripcion   trabajo diario
```

Tipos de rama (mismos prefijos que los commits):

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feat/` | funcionalidad nueva | `feat/formula-pdf-tutor` |
| `fix/` | correccion de bug | `fix/inventario-stock-negativo` |
| `refactor/` | cambio interno sin alterar comportamiento | `refactor/query-keys` |
| `chore/` | mantenimiento, infraestructura, Render | `chore/render-quita-bourgelat-web` |
| `docs/` | solo documentacion | `docs/actualiza-claude-contributing` |

## Regla de oro
- No hacer `push` directo a `main`.
- No hacer `push` directo a `develop`.
- Todo cambio entra por rama -> PR a `develop` -> PR de `develop` a `main`.

## Flujo diario
### 1. Antes de empezar
```powershell
git fetch --prune
git switch develop
git pull --ff-only
git switch -c feat/nombre-tarea
```

### 2. Mientras trabajas
```powershell
git add <archivos>
git commit -m "fix(inventario): corrige calculo de stock tras movimiento"
git fetch origin
git rebase origin/develop
```

### 3. Cuando terminas
```powershell
git push -u origin HEAD
gh pr create --base develop
```

### 4. Revision
- Roman revisa y mergea los PRs a `develop`.
- Si hace falta algo, se corrige en la misma rama.

### 5. Paso a produccion
Tambien por Pull Request, nunca con `git merge` + `push` a `main`:

```powershell
gh pr create --base main --head develop --title "Release: <resumen>"
```

`main` despliega produccion, asi que este PR solo se mergea cuando `develop` esta
estable y probado.

### 6. Despues del merge
```powershell
git fetch --prune
git switch develop
git pull --ff-only
git branch -d feat/nombre-tarea
```

La rama remota se borra con el boton "Delete branch" del PR (o con
`gh pr merge <n> --delete-branch`); el repo no la borra solo. La local, a mano.

## Convenciones de commits
```text
feat: nueva funcionalidad
fix: correccion de bug
style: cambios visuales o CSS
refactor: cambio interno sin alterar comportamiento
test: agregar o ajustar pruebas
chore: mantenimiento, infraestructura o estructura
docs: solo documentacion
```

El scope entre parentesis es opcional y nombra el modulo:

- `feat(historias): formula del plan farmacologico en PDF`
- `fix(cache): refresca los datos entre modulos sin recargar la pagina`
- `chore(render): retira bourgelat-web del Blueprint`

## Como evitar conflictos
- Repartir tareas intentando no tocar los mismos archivos al mismo tiempo.
- Avisar en el chat cuando vayan a modificar una pantalla o controlador compartido.
- Hacer commits pequenos y frecuentes.
- Rebasear sobre `develop` antes de abrir el PR.
- Resolver conflictos archivo por archivo, sin mezclar cambios no relacionados.

## Checklist antes de merge a `main`
- El flujo del modulo funciona de punta a punta en local.
- No quedan `console.log` de depuracion.
- `npm test` (backend) y `npm run build` (frontend) pasan.
- Las variables nuevas existen en Render (o en `render.yaml` si son del Blueprint).
- Las migraciones nuevas son seguras sobre datos reales de la clinica piloto.

## Render y el Blueprint
`render.yaml` es la fuente de verdad de la infraestructura; Render lo sincroniza al
mergear a `main`.

- **Para retirar un servicio:** quitarlo de `render.yaml`, mergear a `main` y
  **solo despues** borrarlo en el dashboard. Si se borra antes, el siguiente sync
  lo recrea y vuelve a cobrar.
- Los dominios propios se mueven a mano en el dashboard; el Blueprint no los
  traslada solo.
- Detalle y aprendizajes en `docs/render-reduccion-costos.md`.

## Pendientes de setup del repositorio
Estado verificado el 2026-09-21. Se configuran en GitHub, no desde el codigo:

- [x] Rama remota `develop` creada.
- [x] `main` protegida: exige Pull Request con 1 aprobacion.
- [ ] Proteger `develop` con Pull Request obligatorio.
- [ ] Decidir si los administradores pueden saltarse la proteccion de `main`
      (hoy `enforce_admins` esta desactivado).
