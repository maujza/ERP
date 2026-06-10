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

Alert rules are evaluated in Grafana but do not send notifications until a
contact point and notification policy are added under `provisioning/alerting/`.
