#!/usr/bin/env bash
set -euo pipefail

copy_if_missing() {
  local source_file="$1"
  local target_file="$2"

  if [ -f "$source_file" ] && [ ! -f "$target_file" ]; then
    cp "$source_file" "$target_file"
    echo "Created $target_file from $source_file"
  fi
}

npm_ci_if_needed() {
  local package_dir="$1"

  if [ -f "$package_dir/package-lock.json" ]; then
    echo "Installing dependencies in $package_dir"
    npm --prefix "$package_dir" ci
  fi
}

copy_if_missing backend/.env.example backend/.env
copy_if_missing backend/.env.dev.example backend/.env.dev
copy_if_missing storefront/.env.example storefront/.env
copy_if_missing storefront/.env.development.example storefront/.env.development

npm_ci_if_needed backend
npm_ci_if_needed storefront
npm_ci_if_needed pos

echo "Devcontainer setup complete."
