# Monitoreo y Costos - Xavier API

Guía completa para monitorear el uso, rendimiento y costos de tu API desplegada en Google Cloud Run.

## 📊 Dashboard de Métricas (Cloud Run)

### Acceso directo
```
https://console.cloud.google.com/run/detail/us-central1/xavi-api/metrics?project=xavier-platform
```

### Métricas disponibles

**Rendimiento:**
- **Solicitudes por segundo** - Tráfico actual de la API
- **Latencia** - Tiempo de respuesta (P50, P95, P99)
- **Códigos de estado** - 2xx (éxito), 4xx (errores cliente), 5xx (errores servidor)

**Recursos:**
- **Uso de CPU** - Porcentaje utilizado vs asignado (1 vCPU)
- **Uso de memoria** - MB utilizados vs asignados (512Mi)
- **Número de instancias** - Instancias activas en tiempo real

**Costos:**
- **Tiempo de CPU facturado** - Milisegundos de CPU consumidos
- **Memoria facturada** - GB-segundos de memoria consumidos

## 💰 Monitoreo de Costos

### 1. Consola de Facturación GCP

**Acceso:**
```
https://console.cloud.google.com/billing/
```

**Pasos:**
1. Selecciona tu cuenta de facturación
2. Ve a **"Reports"** o **"Informes"**
3. Filtra por:
   - Servicio: **Cloud Run**
   - Proyecto: **xavier-platform**
   - Período: Hoy / Esta semana / Este mes

**Desglose de costos:**
- Solicitudes HTTP
- Tiempo de CPU
- Memoria consumida
- Tráfico de red (egress)

### 2. Límites y Alertas de Presupuesto

**Crear alerta de presupuesto:**
1. Ve a: `https://console.cloud.google.com/billing/budgets`
2. Click en **"Create Budget"**
3. Configura:
   ```
   Nombre: Xavier API Monthly Budget
   Presupuesto: $5 USD/mes (ajústalo según necesites)
   Alertas: 50%, 75%, 90%, 100%
   ```
4. Agrega tu email para recibir notificaciones

## 📈 Estructura de Costos

### Cloud Run (Nivel Gratuito)

**Solicitudes:**
- ✅ **Gratis:** Primeras 2,000,000 solicitudes/mes
- 💵 **Después:** $0.40 por millón de solicitudes adicionales

**CPU:**
- ✅ **Gratis:** 180,000 vCPU-segundos/mes
- 💵 **Después:** $0.00002400 por vCPU-segundo

**Memoria:**
- ✅ **Gratis:** 360,000 GiB-segundos/mes
- 💵 **Después:** $0.00000250 por GiB-segundo

**Configuración actual:**
```yaml
Memory: 512Mi (0.5 GiB)
CPU: 1 vCPU
Min instances: 0  # ← No pagas cuando no hay tráfico
Max instances: 10
Timeout: 300s
```

### Neon PostgreSQL

**Plan Free Tier:**
- ✅ **Gratis:** 0.5 GB almacenamiento
- ✅ **Gratis:** 3 GB transferencia/mes
- ✅ **Gratis:** Compute (con límites)
- 💵 **Pro:** $19/mes (si necesitas más)

**Monitoreo:**
```
https://console.neon.tech
```
- Ve a tu proyecto → **Usage**
- Revisa: Storage, Compute hours, Data transfer

### Upstash Redis

**Plan Free:**
- ✅ **Gratis:** 10,000 comandos/día
- ✅ **Gratis:** 256 MB almacenamiento
- 💵 **Pay-as-you-go:** $0.20 por 100K comandos después

**Monitoreo:**
```
https://console.upstash.com
```
- Selecciona tu database
- Ve a **Metrics** → Daily operations

## 🔍 Logs y Debugging

### 1. Logs de Cloud Run (Terminal)

**Ver últimos 50 logs:**
```bash
gcloud run services logs read xavi-api --region=us-central1 --limit=50
```

**Seguir logs en tiempo real:**
```bash
gcloud run services logs tail xavi-api --region=us-central1
```

**Filtrar por severidad:**
```bash
# Solo errores
gcloud run services logs read xavi-api --region=us-central1 --log-filter="severity>=ERROR"
```

**Usando npm scripts:**
```bash
# Ver logs recientes
npm run deploy:logs

# Seguir logs en tiempo real
npm run deploy:logs:tail
```

### 2. Logs en Cloud Console

**Acceso directo:**
```
https://console.cloud.google.com/logs/query?project=xavier-platform
```

**Queries útiles:**

**Ver todos los logs de Cloud Run:**
```
resource.type="cloud_run_revision"
resource.labels.service_name="xavi-api"
```

**Solo errores:**
```
resource.type="cloud_run_revision"
resource.labels.service_name="xavi-api"
severity>=ERROR
```

**Logs de una solicitud específica:**
```
resource.type="cloud_run_revision"
httpRequest.requestUrl=~"/api/auth/register"
```

**Logs en las últimas 24 horas:**
```
resource.type="cloud_run_revision"
timestamp>="2024-01-30T00:00:00Z"
```

## 📱 Comandos útiles

### Estado del servicio
```bash
# Información general
gcloud run services describe xavi-api --region=us-central1

# URL del servicio
gcloud run services describe xavi-api --region=us-central1 --format="value(status.url)"

# Ver revisiones
gcloud run revisions list --service=xavi-api --region=us-central1
```

### Health checks
```bash
# Health endpoint
curl https://xavi-api-2772744525.us-central1.run.app/api/health

# Documentación
curl https://xavi-api-2772744525.us-central1.run.app/api/docs

# Con respuesta formateada
curl -s https://xavi-api-2772744525.us-central1.run.app/api/health | jq
```

### Actualizar configuración
```bash
# Aumentar memoria
gcloud run services update xavi-api --memory=1Gi --region=us-central1

# Cambiar número máximo de instancias
gcloud run services update xavi-api --max-instances=20 --region=us-central1

# Cambiar timeout
gcloud run services update xavi-api --timeout=600 --region=us-central1
```

## 💡 Optimización de Costos

### Recomendaciones

**1. Mantén min-instances=0**
- Solo pagas cuando hay tráfico real
- Cold start inicial: ~2-3 segundos (aceptable para tu caso)

**2. Monitorea el nivel gratuito**
- Revisa semanalmente que estés dentro del free tier
- 2M solicitudes/mes = ~66,000 solicitudes/día

**3. Optimiza las consultas a DB**
- Usa índices apropiados en PostgreSQL
- Implementa caché en Redis para queries frecuentes
- Revisa slow queries en Neon

**4. Compresión de respuestas**
- Tu API ya usa `compression` middleware ✅
- Reduce transferencia de red (egress)

**5. Limita max-instances**
- Configurado en 10 para evitar costos inesperados ✅
- Ajusta según carga esperada

## 🚨 Alertas y Notificaciones

### Configurar alertas importantes

**1. Uptime Checks:**
```
https://console.cloud.google.com/monitoring/uptime
```
- Crea un check HTTP a `/api/health`
- Intervalo: 1 minuto
- Notifica si falla 3 veces consecutivas

**2. Alertas de errores:**
```
https://console.cloud.google.com/monitoring/alerting
```
- Alerta si tasa de errores 5xx > 5%
- Alerta si latencia P95 > 2000ms

**3. Alertas de costos:**
- Ya configuradas en presupuesto (ver arriba)

## 📊 Ejemplo de Costo Mensual Estimado

### Escenario: Uso moderado

**Tráfico:**
- 50,000 solicitudes/mes
- Latencia promedio: 200ms
- 10 MB respuesta promedio

**Costos estimados:**
```
Cloud Run:
  Solicitudes:  50K            → $0 (dentro del free tier)
  CPU:          ~100 vCPU-min  → $0 (dentro del free tier)
  Memoria:      ~50 GiB-min    → $0 (dentro del free tier)
  
Neon:                          → $0 (dentro del free tier)
Upstash:                       → $0 (dentro del free tier)

TOTAL:                         → $0/mes ✅
```

### Escenario: Uso alto

**Tráfico:**
- 5,000,000 solicitudes/mes
- Latencia promedio: 200ms

**Costos estimados:**
```
Cloud Run:
  Solicitudes:  5M             → $1.20 (3M sobre free tier)
  CPU:          ~500 vCPU-min  → $0.72
  Memoria:      ~250 GiB-min   → $0 (dentro del free tier)
  
Neon:                          → $0 (si storage < 0.5GB)
Upstash:                       → $0.60 (si >300K ops/día)

TOTAL:                         → ~$2.52/mes
```

## 🎯 Métricas Clave a Monitorear

| Métrica | Ideal | Aceptable | Crítico |
|---------|-------|-----------|---------|
| Latencia P95 | < 500ms | < 1000ms | > 2000ms |
| Tasa de errores 5xx | 0% | < 0.1% | > 1% |
| Uso de memoria | < 60% | < 80% | > 90% |
| Cold starts | < 5% | < 10% | > 20% |
| Disponibilidad | 99.9% | 99.5% | < 99% |

## 📞 Recursos Adicionales

- **Cloud Run Docs:** https://cloud.google.com/run/docs
- **Pricing Calculator:** https://cloud.google.com/products/calculator
- **Neon Status:** https://neon.tech/status
- **Upstash Status:** https://status.upstash.com/

---

**Última actualización:** Enero 2026  
**URL del servicio:** https://xavi-api-2772744525.us-central1.run.app
