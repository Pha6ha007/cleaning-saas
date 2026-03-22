---
id: M007
title: Production Deploy Prep
status: in_progress
started: 2026-03-17
tests_at_start: 464
---

# M007 Roadmap: Production Deploy Prep

## Goal
Ship a production-ready deployment configuration: hardened Docker images, 
a composable production stack, GitHub Actions CI pipeline, and an updated 
runbook. Any engineer should be able to deploy from zero to running in < 30 min.

## Slices

- [ ] **S01: Django Health Endpoint + Dockerfile Hardening** `risk:low` `depends:[]`
- [ ] **S02: docker-compose Production Stack** `risk:medium` `depends:[S01]`
- [ ] **S03: GitHub Actions CI Pipeline** `risk:low` `depends:[S01]`
- [ ] **S04: Runbook & Env Audit** `risk:low` `depends:[S02,S03]`

## Constraints
- Python 3.12 in Docker (3.14 not widely available in slim images; 3.11 in current Dockerfile is outdated)
- `python-bidi==0.4.2` pinned; must use `--prefer-binary` in Docker build
- LOCKED files must not be touched
- Frontend stays on Vercel (no change to vercel.json / frontend deploy)
- docker-compose targets self-hosted VPS scenario (not K8s)
