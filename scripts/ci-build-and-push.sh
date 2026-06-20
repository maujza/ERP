#!/usr/bin/env bash
# ci-build-and-push.sh — build one image and push it to the local CI registry.
#
# Usage: ci-build-and-push.sh <backend|backend-init|pos|web> <tag>
#
# backend/backend-init/pos have no environment baked in at build time, so the
# same tag is reused unchanged between staging and prod (build-once-promote).
# web is the exception — see docker-compose.staging.yml's header comment and
# CLAUDE.md: NEXT_PUBLIC_* vars are baked in from storefront/.env at build
# time, so the caller must render the right storefront/.env (staging's via
# `sync-medusa-env.sh --project erp-staging`, or prod's via the plain form)
# *before* invoking this script for "web".
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REGISTRY="${REGISTRY:-localhost:5000}"
TARGET="${1:?usage: ci-build-and-push.sh <backend|backend-init|pos|web> <tag>}"
TAG="${2:?usage: ci-build-and-push.sh <backend|backend-init|pos|web> <tag>}"

case "$TARGET" in
  backend)
    docker build -t "$REGISTRY/erp-backend:$TAG" --target runner backend
    ;;
  backend-init)
    docker build -t "$REGISTRY/erp-backend-init:$TAG" --target builder backend
    ;;
  pos)
    docker build -t "$REGISTRY/erp-pos:$TAG" -f pos/Dockerfile.web pos
    ;;
  web)
    docker build -t "$REGISTRY/erp-web:$TAG" storefront/
    ;;
  *)
    echo "Unknown target: $TARGET (expected backend|backend-init|pos|web)" >&2
    exit 1
    ;;
esac

docker push "$REGISTRY/erp-$TARGET:$TAG"
