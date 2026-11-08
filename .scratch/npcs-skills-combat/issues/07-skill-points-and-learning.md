# Skill points and learning skills

Status: ready-for-agent
Type: task
Blocked by: 06, 15

Spec: `../spec.md` (Skill points, What players receive).

World rules `startingSkillPoints` and `skillPointsPerLevel` (wizard Rules step and World rules page, defaults 1 and 1); level-ups grant them (toast says both). Actions `learn-skill` (player), `refund-skill`, `grant-skill-points`, `set-skill` (any skill at any rank), `set-class` (GM only), host-validated over the fake peer network; offline toggle `learnSkills`. Per-player view `class/mine` (own class, its tree and skills, own skills only; no catalogue to players). Sheet Skills tab with the tree view, skills taught outside the tree and a skill points badge. NPC editor gains class, "Learn from the class", free skill editing, and generation picks a class and learns along its tree.
