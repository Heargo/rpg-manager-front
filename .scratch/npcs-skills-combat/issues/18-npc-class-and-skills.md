# NPC class and skills

Status: ready-for-agent
Type: task
Blocked by: 07

Spec: `../spec.md` (NPC catalogue → Generate, Decisions 6).

Split from N07 (2026-11-08). The NPC editor gains a class picker, a "Learn from the class" action (spends the NPC's skill points along its class tree, using N07's learn rules), and free skill editing (any catalogue skill at any rank, like `set-skill`). Generation picks a class (random or chosen) from the world's classes and learns skills along its tree with the points its level gives. A world with no classes generates NPCs without a class, as today.
