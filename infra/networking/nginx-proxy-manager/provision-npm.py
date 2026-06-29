#!/usr/bin/env python3
"""Idempotently declare Nginx Proxy Manager certificates + proxy hosts.

NPM's routing/cert state lives in its own database (the erp_nginx_data /
erp_nginx_db_data volumes), not in any config file Ansible renders — so a
bare-box reprovision used to come up with no TLS and no routing. This script
closes that gap: given the NPM admin login, a custom (Cloudflare Origin)
certificate, and a list of proxy hosts, it brings NPM to the desired state
via its REST API. Safe to run on every deploy.

Idempotency:
  * certificate — matched by nice_name. Created + uploaded if absent. If
    present, the uploaded leaf cert's notAfter is compared to the API's
    expires_on; a mismatch (i.e. a rotated cert) triggers a re-upload. Set
    NPM_FORCE_CERT=1 to force a re-upload regardless.
  * proxy hosts — matched by domain. Created if absent; updated (PUT) only
    when forward target, certificate, or the managed flags drift.

Inputs (all via env):
  NPM_BASE_URL     default http://127.0.0.1:81
  NPM_IDENTITY     admin login email
  NPM_SECRET       admin password
  NPM_CERT_NAME    nice_name for the custom cert
  NPM_CERT_FILE    path to the cert (fullchain) PEM
  NPM_KEY_FILE     path to the private key PEM
  NPM_HOSTS_JSON   JSON list of {domain, forward_host, forward_port}
  NPM_FORCE_CERT   "1" to force cert re-upload (optional)

Exit status: 0 on success (prints one line per resource: created/updated/ok).
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

BASE = os.environ.get("NPM_BASE_URL", "http://127.0.0.1:81").rstrip("/")

# Managed flags applied to every proxy host this script owns. Mirrors the
# settings of the pre-existing hosts (ssl forced, websockets on for the admin
# SPA, exploit blocking). http2/hsts off because Cloudflare terminates the
# public TLS in front of this origin.
HOST_FLAGS = {
    "forward_scheme": "http",
    "ssl_forced": True,
    "allow_websocket_upgrade": True,
    "http2_support": False,
    "hsts_enabled": False,
    "block_exploits": True,
    "caching_enabled": False,
    "advanced_config": "",
    "meta": {"letsencrypt_agree": False, "dns_challenge": False},
    "locations": [],
    "access_list_id": 0,
}


def _req(method, path, token=None, data=None, multipart=None):
    url = BASE + path
    headers = {}
    body = None
    if multipart is not None:
        boundary = uuid.uuid4().hex
        parts = []
        for name, (filename, content) in multipart.items():
            parts.append(f"--{boundary}\r\n".encode())
            parts.append(
                f'Content-Disposition: form-data; name="{name}"; '
                f'filename="{filename}"\r\n'
                f"Content-Type: application/octet-stream\r\n\r\n".encode()
            )
            parts.append(content if isinstance(content, bytes) else content.encode())
            parts.append(b"\r\n")
        parts.append(f"--{boundary}--\r\n".encode())
        body = b"".join(parts)
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    elif data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        sys.exit(f"NPM API {method} {path} -> {e.code}: {e.read().decode()[:400]}")


def _login(identity, secret):
    return _req("POST", "/api/tokens", data={"identity": identity, "secret": secret})["token"]


def _cert_notafter_epoch(cert_file):
    out = subprocess.check_output(
        ["openssl", "x509", "-enddate", "-noout", "-in", cert_file], text=True
    ).strip()
    # "notAfter=Jun 24 00:13:00 2041 GMT"
    val = out.split("=", 1)[1].strip()
    dt = datetime.strptime(val, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


def _iso_epoch(iso):
    if not iso:
        return None
    try:
        return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp())
    except ValueError:
        return None


def ensure_cert(token, name, cert_file, key_file, force):
    certs = _req("GET", "/api/nginx/certificates", token=token) or []
    existing = next((c for c in certs if c.get("nice_name") == name), None)
    payload_files = {
        "certificate": ("cert.pem", open(cert_file, "rb").read()),
        "certificate_key": ("key.pem", open(key_file, "rb").read()),
    }
    if existing is None:
        cid = _req(
            "POST", "/api/nginx/certificates", token=token,
            data={"provider": "other", "nice_name": name},
        )["id"]
        _req("POST", f"/api/nginx/certificates/{cid}/upload", token=token, multipart=payload_files)
        print(f"cert '{name}' (id {cid}): created")
        return cid
    cid = existing["id"]
    want = _cert_notafter_epoch(cert_file)
    have = _iso_epoch(existing.get("expires_on"))
    if force or have != want:
        _req("POST", f"/api/nginx/certificates/{cid}/upload", token=token, multipart=payload_files)
        print(f"cert '{name}' (id {cid}): re-uploaded (rotation/force)")
    else:
        print(f"cert '{name}' (id {cid}): ok")
    return cid


def ensure_host(token, existing_hosts, host, cert_id):
    domain = host["domain"]
    desired = {
        "domain_names": [domain],
        "forward_host": host["forward_host"],
        "forward_port": int(host["forward_port"]),
        "certificate_id": cert_id,
        **HOST_FLAGS,
    }
    current = next((h for h in existing_hosts if domain in h.get("domain_names", [])), None)
    if current is None:
        res = _req("POST", "/api/nginx/proxy-hosts", token=token, data=desired)
        print(f"host {domain} (id {res['id']}): created -> {host['forward_host']}:{host['forward_port']}")
        return
    drift = (
        current.get("forward_host") != desired["forward_host"]
        or int(current.get("forward_port", 0)) != desired["forward_port"]
        or current.get("certificate_id") != cert_id
        or not current.get("ssl_forced")
        or not current.get("allow_websocket_upgrade")
        or not current.get("block_exploits")
    )
    if drift:
        _req("PUT", f"/api/nginx/proxy-hosts/{current['id']}", token=token, data=desired)
        print(f"host {domain} (id {current['id']}): updated -> {host['forward_host']}:{host['forward_port']}")
    else:
        print(f"host {domain} (id {current['id']}): ok")


def main():
    identity = os.environ["NPM_IDENTITY"]
    secret = os.environ["NPM_SECRET"]
    name = os.environ["NPM_CERT_NAME"]
    cert_file = os.environ["NPM_CERT_FILE"]
    key_file = os.environ["NPM_KEY_FILE"]
    hosts = json.loads(os.environ["NPM_HOSTS_JSON"])
    force = os.environ.get("NPM_FORCE_CERT") == "1"

    token = _login(identity, secret)
    cert_id = ensure_cert(token, name, cert_file, key_file, force)
    existing_hosts = _req("GET", "/api/nginx/proxy-hosts", token=token) or []
    for host in hosts:
        ensure_host(token, existing_hosts, host, cert_id)


if __name__ == "__main__":
    main()
