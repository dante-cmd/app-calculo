# Análisis de cartera de factoring

Aplicación para importar exportaciones de Prestamype y analizar una cartera personal de factoring. Presenta KPIs ponderados por capital, riesgo, concentración, flujo de caja, proyecciones y comparación con benchmarks.

## Requisitos y despliegue

La forma recomendada de iniciar la aplicación es con Docker Desktop o Docker Engine con Compose:

```bash
docker-compose up --build
```

Luego abra [http://localhost:8080](http://localhost:8080). La API queda disponible en [http://localhost:8000/api/health](http://localhost:8000/api/health). La base SQLite se conserva en el volumen Docker `cartera_data`.

Para desarrollo local se necesita Python 3.12 y Node.js 20:

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt pytest
.venv/bin/uvicorn app.main:app --reload

cd ../frontend
npm install
npm run dev
```

## Archivo de entrada

En **Cargar datos** suba un archivo `.xlsx`, `.xls` o `.csv`. Se admite una hoja llamada `reporte` (o la primera hoja). Debe contener exactamente estas columnas:

| Columna | Ejemplo |
| --- | --- |
| Fecha | 15/01/2026 |
| Hora | 10:30 |
| Cliente | Empresa SAC |
| RUC | 20123456789 |
| Codigo de subasta | SUB-0001 |
| Riesgo | A, B o C |
| Inversion | 1500.00 |
| Moneda | PEN o USD |
| Retorno mensual (%) | 1.15 |
| Fecha de cierre de subasta | 16/01/2026 |
| Fecha de pago | 16/03/2026 |
| Estado | cobrado o por cobrar |

Los importes y porcentajes se limpian desde formatos comunes de Excel/CSV. `Codigo de subasta` es único: una carga posterior con el mismo código actualiza la operación. Las filas inválidas se reportan sin impedir la importación de las demás.

Hay un archivo de ejemplo listo para cargar en [data/mis-inversiones.xlsx](data/mis-inversiones.xlsx).

## Dashboard

El dashboard permite aplicar filtros globales de fecha, moneda, riesgo, estado y cliente. Los montos se muestran separadamente para PEN y USD. Solo al configurar un tipo de cambio en **Configuración** se habilita la consolidación a PEN.

- KPIs: capital, retornos, retorno mensual y TEA ponderados, plazo promedio y mora.
- Riesgo: retorno, TEA y tasa de cumplimiento de A/B/C.
- Diversificación: principales clientes/RUC, HHI y alerta si una moneda supera 40% de la exposición consolidada.
- Flujo de caja: cobros mensuales desglosados en capital y retorno, cobrado y pendiente.
- Proyección: interés compuesto reinvirtiendo el retorno ponderado actual en escenarios pesimista, base y optimista a 1, 3 y 5 años.

Una operación en estado `por cobrar` con fecha de pago anterior a hoy se marca como **en mora**.

## Pruebas

Desde `backend`, con el entorno virtual activo:

```bash
pytest
```

Las pruebas cubren el cálculo ponderado, TEA, mora, HHI, consolidación con tipo de cambio, flujo de caja, proyección y tasa de cumplimiento.
