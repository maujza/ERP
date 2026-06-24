# Grafana Configuration

This directory is the source of truth for Grafana resources:

- `dashboards/`: dashboard JSON files.
- `provisioning/datasources/`: provisioned data sources.
- `provisioning/dashboards/`: dashboard providers.
- `provisioning/alerting/`: alert rules, contact points, notification policies,
  templates, and mute timings.
- `provisioning/plugins/`: plugin provisioning.

Provisioned resources must be changed here instead of being edited only in the
Grafana UI. Grafana loads these files when the container starts. Dashboard
providers also poll for dashboard JSON changes.

`scripts/grafana-reload-provisioning.sh` reloads all three resource types
during deployment.

Alert rules notify via the `resend-email` contact point
(`provisioning/alerting/contact-points.yml`) and the root notification policy
(`provisioning/alerting/notification-policies.yml`), routed through Grafana's
own SMTP (`GF_SMTP_*` in `infra/monitoring/compose.yml`) pointed at Resend's
SMTP relay — see `infra/.env.example` for the required `RESEND_API_KEY`,
`RESEND_FROM`, and `MONITORING_ALERT_EMAIL` variables. The recipient address
is read at runtime via Grafana's `$__env{}` provisioning macro rather than
committed to `contact-points.yml`.
