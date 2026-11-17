# Base ships the starter classes and skills

Status: ready-for-agent
Type: task
Blocked by: 07

Spec: `../spec.md` (Decision 10).

- Base FR and Base EN carry today's starter classes and skills (`starter-classes.ts`, EN/FR pairs) as fixed content, with the attributes they use declared.
- The code paths that seed starter classes and skills (world creation, sandbox, catalogues' "add defaults") use the pack import instead, and `starter-classes.ts` goes away. No fallback to the old seeding (dev, no backward compatibility).
- Starter items (`starter-items.ts`, generated) stay as they are. *(assumed)*
- User docs: the packs page mentions fixed content.
