# Aunty Alice Schools

Mobile-first school website and free Nigerian exam academy in Mararaba, Nasarawa. Next.js App Router on Cloudflare Workers via OpenNext. See GitHub issues for the delivery roadmap. Public school, primary, secondary and learn experiences first; private portal later. No real pupil data or unverified school claims.

Run `npm install`, `npm run dev`, `npm run build:worker` and `npm run preview`. Production deployment requires approval.

## Product specifications
- [PRODUCT.md](PRODUCT.md): audiences and scope
- [DESIGN.md](DESIGN.md): brand family, navigation and experience
- [ARCHITECTURE.md](ARCHITECTURE.md): domain contract and technical design
- [ACADEMY.md](ACADEMY.md): examination and lesson architecture
- [ROADMAP.md](ROADMAP.md): issue-driven milestones
- [DECISIONS.md](DECISIONS.md): agreed decisions

## Deployment verification
After merging application changes, confirm the Cloudflare production deployment serves the latest main revision. Smoke-test the homepage, /learn, and /learn/lesson/quadratic-equations. GitHub CI success alone does not establish successful production delivery.
