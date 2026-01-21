import { getDb } from "../db/index.js";

function mapProjectRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    repoUrl: row.repo_url,
    demoUrl: row.demo_url,
    coverImageUrl: row.cover_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creatorUserId: row.creator_user_id,
    visibility: row.visibility, // vai ser "PUBLIC"
  };
}

async function getProjectUcIds(db, projectId) {
  const rows = await db.all(
    `SELECT uc_id FROM project_uc WHERE project_id = ? ORDER BY uc_id`,
    [projectId],
  );
  return rows.map((r) => String(r.uc_id));
}

async function getProjectTags(db, projectId) {
  const rows = await db.all(
    `
    SELECT t.name
    FROM tags t
    JOIN project_tags pt ON pt.tag_id = t.id
    WHERE pt.project_id = ?
    ORDER BY t.name
    `,
    [projectId],
  );
  return rows.map((r) => r.name);
}

async function setProjectUcIds(db, projectId, ucIds) {
  await db.run(`DELETE FROM project_uc WHERE project_id = ?`, [projectId]);
  for (const ucId of ucIds) {
    await db.run(
      `INSERT OR IGNORE INTO project_uc(project_id, uc_id) VALUES (?, ?)`,
      [projectId, ucId],
    );
  }
}

async function setProjectTags(db, projectId, tags) {
  await db.run(`DELETE FROM project_tags WHERE project_id = ?`, [projectId]);

  for (const raw of tags) {
    const name = String(raw || "").trim();
    if (!name) continue;

    await db.run(`INSERT OR IGNORE INTO tags(name) VALUES (?)`, [name]);
    const tag = await db.get(`SELECT id FROM tags WHERE name = ?`, [name]);

    await db.run(
      `INSERT OR IGNORE INTO project_tags(project_id, tag_id) VALUES (?, ?)`,
      [projectId, tag.id],
    );
  }
}

export const resolvers = {
  Query: {
    health: () => "ok",

    project: async (_, { id }) => {
      const db = await getDb();
      const row = await db.get(`SELECT * FROM projects WHERE id = ?`, [id]);
      if (!row) return null;
      return mapProjectRow(row);
    },

    projects: async (_, { filters = {}, page = {} }) => {
      const db = await getDb();
      const limit = Math.min(Math.max(page.limit ?? 20, 1), 100);
      const offset = Math.max(page.offset ?? 0, 0);

      const where = [];
      const params = [];
      const joins = [];

      // tudo público por agora, mas mantemos a coluna
      where.push(`p.visibility = 'PUBLIC'`);

      if (filters.search) {
        where.push(`(p.title LIKE ? OR p.description LIKE ?)`);
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      const needsUcJoin = filters.courseId || filters.year || filters.ucId;
      if (needsUcJoin) {
        joins.push(`JOIN project_uc pu ON pu.project_id = p.id`);
        joins.push(`JOIN ucs u ON u.id = pu.uc_id`);

        if (filters.ucId) {
          where.push(`u.id = ?`);
          params.push(filters.ucId);
        }
        if (filters.courseId) {
          where.push(`u.course_id = ?`);
          params.push(filters.courseId);
        }
        if (filters.year) {
          where.push(`u.year = ?`);
          params.push(filters.year);
        }
      }

      if (filters.tag) {
        joins.push(`JOIN project_tags pt ON pt.project_id = p.id`);
        joins.push(`JOIN tags t ON t.id = pt.tag_id`);
        where.push(`t.name = ?`);
        params.push(filters.tag.trim());
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const joinSql = joins.join("\n");

      const totalRow = await db.get(
        `
        SELECT COUNT(DISTINCT p.id) as total
        FROM projects p
        ${joinSql}
        ${whereSql}
        `,
        params,
      );

      const rows = await db.all(
        `
        SELECT DISTINCT p.*
        FROM projects p
        ${joinSql}
        ${whereSql}
        ORDER BY datetime(p.created_at) DESC
        LIMIT ? OFFSET ?
        `,
        [...params, limit, offset],
      );

      return {
        total: totalRow?.total ?? 0,
        items: rows.map(mapProjectRow),
      };
    },
  },

  Project: {
    ucIds: async (project) => {
      const db = await getDb();
      return getProjectUcIds(db, project.id);
    },
    tags: async (project) => {
      const db = await getDb();
      return getProjectTags(db, project.id);
    },
  },

  Mutation: {
    createProject: async (_, { input }, ctx) => {
      const db = await getDb();

      // Por agora: tudo PUBLIC e sem exigir login.
      // Guardamos creator_user_id se vier do gateway (para futuro)
      const creatorUserId = ctx?.user?.id ? String(ctx.user.id) : null;

      const result = await db.run(
        `
        INSERT INTO projects (title, description, repo_url, demo_url, cover_image_url, creator_user_id, visibility)
        VALUES (?, ?, ?, ?, ?, ?, 'PUBLIC')
        `,
        [
          input.title,
          input.description ?? null,
          input.repoUrl ?? null,
          input.demoUrl ?? null,
          input.coverImageUrl ?? null,
          creatorUserId,
        ],
      );

      const projectId = result.lastID;

      if (input.ucIds?.length) {
        await setProjectUcIds(db, projectId, input.ucIds);
      }
      if (input.tags?.length) {
        await setProjectTags(db, projectId, input.tags);
      }

      const row = await db.get(`SELECT * FROM projects WHERE id = ?`, [
        projectId,
      ]);
      return mapProjectRow(row);
    },

    updateProject: async (_, { id, input }, ctx) => {
      const db = await getDb();

      const existing = await db.get(`SELECT * FROM projects WHERE id = ?`, [
        id,
      ]);
      if (!existing) throw new Error("Project not found");

      // FUTURO (deixas comentado / feature-flag):
      // const userId = ctx?.user?.id ? String(ctx.user.id) : null;
      // if (!userId || String(existing.creator_user_id) !== userId) {
      //   throw new Error("Not allowed");
      // }

      const next = {
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        repo_url: input.repoUrl ?? existing.repo_url,
        demo_url: input.demoUrl ?? existing.demo_url,
        cover_image_url: input.coverImageUrl ?? existing.cover_image_url,
      };

      await db.run(
        `
        UPDATE projects
        SET title=?, description=?, repo_url=?, demo_url=?, cover_image_url=?,
            updated_at=datetime('now')
        WHERE id=?
        `,
        [
          next.title,
          next.description,
          next.repo_url,
          next.demo_url,
          next.cover_image_url,
          id,
        ],
      );

      if (Array.isArray(input.ucIds)) {
        await setProjectUcIds(db, id, input.ucIds);
      }
      if (Array.isArray(input.tags)) {
        await setProjectTags(db, id, input.tags);
      }

      const row = await db.get(`SELECT * FROM projects WHERE id = ?`, [id]);
      return mapProjectRow(row);
    },

    deleteProject: async (_, { id }, ctx) => {
      const db = await getDb();

      const existing = await db.get(`SELECT * FROM projects WHERE id = ?`, [
        id,
      ]);
      if (!existing) return false;

      // FUTURO:
      // const userId = ctx?.user?.id ? String(ctx.user.id) : null;
      // if (!userId || String(existing.creator_user_id) !== userId) {
      //   throw new Error("Not allowed");
      // }

      const res = await db.run(`DELETE FROM projects WHERE id = ?`, [id]);
      return (res.changes ?? 0) > 0;
    },
  },
};
