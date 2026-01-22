import axios from "axios";
import { getDb } from "../db/index.js";

const FILES_BASE =
  process.env.FILES_SERVICE_INTERNAL_URL || "http://files-manager-service:3004";

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
    visibility: row.visibility,

    // ✅ vem diretamente do Postgres
    fileId: row.file_id ? String(row.file_id) : null,
  };
}

async function getProjectUcIds(db, projectId) {
  const { rows } = await db.query(
    `SELECT uc_id FROM project_uc WHERE project_id = $1 ORDER BY uc_id`,
    [Number(projectId)],
  );
  return rows.map((r) => String(r.uc_id));
}

async function getProjectTags(db, projectId) {
  const { rows } = await db.query(
    `
    SELECT t.name
    FROM tags t
    JOIN project_tags pt ON pt.tag_id = t.id
    WHERE pt.project_id = $1
    ORDER BY t.name
    `,
    [Number(projectId)],
  );
  return rows.map((r) => r.name);
}

async function setProjectUcIds(db, projectId, ucIds) {
  const pid = Number(projectId);
  await db.query(`DELETE FROM project_uc WHERE project_id = $1`, [pid]);

  for (const ucId of ucIds) {
    await db.query(
      `INSERT INTO project_uc(project_id, uc_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [pid, Number(ucId)],
    );
  }
}

async function setProjectTags(db, projectId, tags) {
  const pid = Number(projectId);

  await db.query(`DELETE FROM project_tags WHERE project_id = $1`, [pid]);

  for (const raw of tags) {
    const name = String(raw || "").trim();
    if (!name) continue;

    await db.query(
      `INSERT INTO tags(name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [name],
    );

    const tagRes = await db.query(`SELECT id FROM tags WHERE name = $1`, [
      name,
    ]);
    const tagId = tagRes.rows?.[0]?.id;
    if (!tagId) continue;

    await db.query(
      `INSERT INTO project_tags(project_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [pid, tagId],
    );
  }
}

export const resolvers = {
  Query: {
    health: () => "ok",

    project: async (_, { id }) => {
      const db = getDb();
      const { rows } = await db.query(`SELECT * FROM projects WHERE id = $1`, [
        Number(id),
      ]);
      const row = rows?.[0];
      if (!row) return null;
      return mapProjectRow(row);
    },

    projects: async (_, { filters = {}, page = {} }) => {
      const db = getDb();
      const limit = Math.min(Math.max(page.limit ?? 20, 1), 100);
      const offset = Math.max(page.offset ?? 0, 0);

      const where = [];
      const params = [];
      const joins = [];

      const addParam = (val) => {
        params.push(val);
        return `$${params.length}`;
      };

      where.push(`p.visibility = 'PUBLIC'`);

      if (filters.search) {
        const q = `%${filters.search}%`;
        const p1 = addParam(q);
        const p2 = addParam(q);
        where.push(`(p.title ILIKE ${p1} OR p.description ILIKE ${p2})`);
      }

      const needsUcJoin = filters.courseId || filters.year || filters.ucId;
      if (needsUcJoin) {
        joins.push(`JOIN project_uc pu ON pu.project_id = p.id`);
        joins.push(`JOIN ucs u ON u.id = pu.uc_id`);

        if (filters.ucId) {
          const pUc = addParam(Number(filters.ucId));
          where.push(`u.id = ${pUc}`);
        }
        if (filters.courseId) {
          const pCourse = addParam(Number(filters.courseId));
          where.push(`u.course_id = ${pCourse}`);
        }
        if (filters.year) {
          const pYear = addParam(Number(filters.year));
          where.push(`u.year = ${pYear}`);
        }
      }

      if (filters.tag) {
        joins.push(`JOIN project_tags pt ON pt.project_id = p.id`);
        joins.push(`JOIN tags t ON t.id = pt.tag_id`);
        const pTag = addParam(filters.tag.trim());
        where.push(`t.name = ${pTag}`);
      }

      const joinSql = joins.join("\n");
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const totalRes = await db.query(
        `
        SELECT COUNT(DISTINCT p.id) AS total
        FROM projects p
        ${joinSql}
        ${whereSql}
        `,
        params,
      );
      const total = Number(totalRes.rows?.[0]?.total ?? 0);

      const pLimit = addParam(limit);
      const pOffset = addParam(offset);

      const rowsRes = await db.query(
        `
        SELECT DISTINCT p.*
        FROM projects p
        ${joinSql}
        ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT ${pLimit} OFFSET ${pOffset}
        `,
        params,
      );

      return {
        total,
        items: rowsRes.rows.map(mapProjectRow),
      };
    },
  },

  Project: {
    ucIds: async (project) => {
      const db = getDb();
      return getProjectUcIds(db, project.id);
    },
    tags: async (project) => {
      const db = getDb();
      return getProjectTags(db, project.id);
    },

    // 🔗 Vai buscar o fileId ao files-manager (via project_id)
  },

  Mutation: {
    createProject: async (_, { input }, ctx) => {
      const db = getDb();
      const creatorUserId = ctx?.user?.id ? String(ctx.user.id) : null;

      if (!creatorUserId || !ctx?.token) throw new Error("Not authenticated");

      // 1) cria projeto SEM file_id
      const insertRes = await db.query(
        `
    INSERT INTO projects (
      title, description, repo_url, demo_url, cover_image_url,
      creator_user_id, visibility
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'PUBLIC')
    RETURNING *
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

      const row = insertRes.rows?.[0];
      if (!row) throw new Error("Failed to create project");
      const projectId = row.id;

      try {
        if (input.ucIds?.length)
          await setProjectUcIds(db, projectId, input.ucIds);
        if (input.tags?.length) await setProjectTags(db, projectId, input.tags);

        // 2) anexa o ficheiro ao projeto (files.project_id)
        await axios.post(
          `${FILES_BASE}/files/${input.fileId}/attach`,
          { projectId: String(projectId) },
          { headers: { Authorization: `Bearer ${ctx.token}` }, timeout: 5000 },
        );

        // 3) só agora guardas file_id no projeto
        await db.query(`UPDATE projects SET file_id = $1 WHERE id = $2`, [
          input.fileId,
          projectId,
        ]);
      } catch (e) {
        // rollback: apaga o projeto
        await db.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
        throw new Error("Failed to create project (file attach failed)");
      }

      const finalRes = await db.query(`SELECT * FROM projects WHERE id = $1`, [
        projectId,
      ]);
      return mapProjectRow(finalRes.rows?.[0]);
    },

    updateProject: async (_, { id, input }, ctx) => {
      const db = getDb();
      const pid = Number(id);

      const existingRes = await db.query(
        `SELECT * FROM projects WHERE id = $1`,
        [pid],
      );
      const existing = existingRes.rows?.[0];
      if (!existing) throw new Error("Project not found");

      const next = {
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        repo_url: input.repoUrl ?? existing.repo_url,
        demo_url: input.demoUrl ?? existing.demo_url,
        cover_image_url: input.coverImageUrl ?? existing.cover_image_url,
      };

      // se pediu trocar ficheiro, tenta primeiro anexar (pode falhar)
      if (input.fileId) {
        if (!ctx?.token) throw new Error("Not authenticated");
        try {
          await axios.post(
            `${FILES_BASE}/files/${input.fileId}/attach`,
            { projectId: String(pid) },
            {
              headers: { Authorization: `Bearer ${ctx.token}` },
              timeout: 5000,
            },
          );
        } catch {
          throw new Error("Failed to attach new file");
        }
      }

      const nextFileId = input.fileId ?? existing.file_id;

      const updateRes = await db.query(
        `
    UPDATE projects
    SET title = $1,
        description = $2,
        repo_url = $3,
        demo_url = $4,
        cover_image_url = $5,
        file_id = $6
    WHERE id = $7
    RETURNING *
    `,
        [
          next.title,
          next.description,
          next.repo_url,
          next.demo_url,
          next.cover_image_url,
          nextFileId,
          pid,
        ],
      );

      if (Array.isArray(input.ucIds))
        await setProjectUcIds(db, pid, input.ucIds);
      if (Array.isArray(input.tags)) await setProjectTags(db, pid, input.tags);

      return mapProjectRow(updateRes.rows?.[0]);
    },

    deleteProject: async (_, { id }, ctx) => {
      const db = getDb();
      const pid = Number(id);

      const existingRes = await db.query(
        `SELECT id FROM projects WHERE id = $1`,
        [pid],
      );
      const existing = existingRes.rows?.[0];
      if (!existing) return false;

      // (Opcional) apagar ficheiro associado (se criares endpoint de delete por project no files-manager)
      // if (ctx?.token) { ... }

      const delRes = await db.query(`DELETE FROM projects WHERE id = $1`, [
        pid,
      ]);
      return (delRes.rowCount ?? 0) > 0;
    },
  },
};
