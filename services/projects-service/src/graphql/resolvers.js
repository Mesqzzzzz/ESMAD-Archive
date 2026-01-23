import axios from "axios";
import { getDb } from "../db/index.js";

const FILES_BASE =
  process.env.FILES_SERVICE_INTERNAL_URL || "http://files-manager-service:3004";

function mapProjectRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    repoUrl: row.repo_url,
    demoUrl: row.demo_url,
    coverImageUrl: row.cover_image_url,

    // datas ISO
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,

    creatorUserId:
      row.creator_user_id != null ? String(row.creator_user_id) : null,
    visibility: row.visibility,
    fileId: row.file_id ? String(row.file_id) : null,

    // se vier do JOIN ao users
    _creatorName: row.creator_name ?? null,
    _creatorEmail: row.creator_email ?? null,
  };
}

function mustAuth(ctx) {
  const authedId = ctx?.user?.id != null ? String(ctx.user.id) : null;
  if (!authedId || !ctx?.token) throw new Error("Not authenticated");
  return authedId;
}

function pickDetail(val) {
  if (val == null) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    if (typeof val.detail === "string") return val.detail;
    if (typeof val.message === "string") return val.message;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

// =======================
// UC 1:1 helpers
// =======================
async function getProjectUcId(db, projectId) {
  const { rows } = await db.query(
    `SELECT uc_id FROM project_uc WHERE project_id = $1 LIMIT 1`,
    [Number(projectId)],
  );
  const ucId = rows?.[0]?.uc_id;
  return ucId != null ? [String(ucId)] : [];
}

async function setProjectUcId(db, projectId, ucId) {
  const pid = Number(projectId);

  await db.query(`DELETE FROM project_uc WHERE project_id = $1`, [pid]);

  if (ucId == null || String(ucId).trim() === "") return;

  await db.query(
    `INSERT INTO project_uc(project_id, uc_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [pid, Number(ucId)],
  );
}

// =======================
// Tags helpers (mantém)
// =======================
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

// =======================
// Validation 1:1 (ucId singular)
// =======================
function pickUcIdFromInput(input) {
  const ucId = String(input?.ucId ?? "").trim();
  if (!ucId) throw new Error("UC inválida");
  return ucId;
}

export const resolvers = {
  Query: {
    health: () => "ok",

    // courses
    courses: async () => {
      const db = getDb();
      const { rows } = await db.query(
        `SELECT id, type, name FROM courses ORDER BY type, name`,
      );
      return rows.map((r) => ({
        id: String(r.id),
        type: r.type,
        name: r.name,
      }));
    },

    ucs: async (_, { courseId, search }) => {
      const db = getDb();

      if (!courseId) return [];

      const params = [Number(courseId)];
      let sql = `SELECT id, course_id, name FROM ucs WHERE course_id = $1`;

      if (search && String(search).trim()) {
        params.push(`%${String(search).trim()}%`);
        sql += ` AND name ILIKE $${params.length}`;
      }

      sql += ` ORDER BY name`;

      const { rows } = await db.query(sql, params);
      return rows.map((r) => ({
        id: String(r.id),
        courseId: String(r.course_id),
        name: r.name,
      }));
    },

    project: async (_, { id }) => {
      const db = getDb();
      const { rows } = await db.query(
        `
        SELECT p.*,
               u.name  AS creator_name,
               u.email AS creator_email
        FROM projects p
        LEFT JOIN users u ON u.id = p.creator_user_id::int
        WHERE p.id = $1
        `,
        [Number(id)],
      );
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

      // público por agora
      where.push(`p.visibility = 'PUBLIC'`);

      // join users para createdBy sem N+1
      joins.push(`LEFT JOIN users u ON u.id = p.creator_user_id::int`);

      if (filters.search) {
        const q = `%${filters.search}%`;
        const p1 = addParam(q);
        const p2 = addParam(q);
        where.push(`(p.title ILIKE ${p1} OR p.description ILIKE ${p2})`);
      }

      // ✅ filtros por UC / course
      const needsUcJoin = filters.courseId || filters.ucId;
      if (needsUcJoin) {
        joins.push(`JOIN project_uc pu ON pu.project_id = p.id`);
        joins.push(`JOIN ucs ucs1 ON ucs1.id = pu.uc_id`);

        if (filters.ucId) {
          const pUc = addParam(Number(filters.ucId));
          where.push(`ucs1.id = ${pUc}`);
        }
        if (filters.courseId) {
          const pCourse = addParam(Number(filters.courseId));
          where.push(`ucs1.course_id = ${pCourse}`);
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
        SELECT DISTINCT p.*,
               u.name  AS creator_name,
               u.email AS creator_email
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
    // ✅ Agora bate certo com o schema: Project.ucId
    ucId: async (project) => {
      const db = getDb();
      const ids = await getProjectUcId(db, project.id);
      return ids[0] ?? null; // 1:1
    },

    tags: async (project) => {
      const db = getDb();
      return getProjectTags(db, project.id);
    },

    createdBy: async (project) => {
      // se veio do JOIN
      if (project?._creatorName || project?._creatorEmail) {
        return {
          id: project.creatorUserId,
          name: project._creatorName,
          email: project._creatorEmail,
        };
      }

      if (!project?.creatorUserId) return null;

      const db = getDb();
      const { rows } = await db.query(
        `SELECT id, name, email FROM users WHERE id = $1`,
        [Number(project.creatorUserId)],
      );
      const u = rows?.[0];
      if (!u) return { id: project.creatorUserId, name: null, email: null };

      return { id: String(u.id), name: u.name, email: u.email };
    },
  },

  Mutation: {
    createProject: async (_, { input }, ctx) => {
      const db = getDb();
      const authedId = mustAuth(ctx);

      const title = String(input?.title ?? "").trim();
      if (!title) throw new Error("Title is required");

      const visibility = input?.visibility || "PUBLIC";
      const description = input?.description ?? null;
      const repoUrl = input?.repoUrl ?? null;
      const demoUrl = input?.demoUrl ?? null;
      const coverImageUrl = input?.coverImageUrl ?? null;

      const fileId = input?.fileId ? String(input.fileId) : null;
      if (!fileId) throw new Error("fileId is required");

      // ✅ 1 projeto = 1 UC
      const ucId = pickUcIdFromInput(input);

      // 1) cria projeto SEM file_id (fica depois do attach)
      const insertRes = await db.query(
        `
        INSERT INTO projects (
          title, description, repo_url, demo_url, cover_image_url,
          file_id, creator_user_id, visibility
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
        `,
        [
          title,
          description,
          repoUrl,
          demoUrl,
          coverImageUrl,
          null, // file_id depois do attach
          Number(authedId),
          visibility,
        ],
      );

      const row = insertRes.rows?.[0];
      if (!row) throw new Error("Failed to create project");
      const projectId = row.id;

      try {
        // 2) guardar UC 1:1
        await setProjectUcId(db, projectId, ucId);

        // tags (opcional)
        if (Array.isArray(input.tags) && input.tags.length) {
          await setProjectTags(db, projectId, input.tags);
        }

        // 3) anexa ficheiro ao projeto (files.project_id)
        await axios.post(
          `${FILES_BASE}/files/${encodeURIComponent(fileId)}/attach`,
          { projectId: Number(projectId) },
          {
            headers: { Authorization: `Bearer ${ctx.token}` },
            timeout: 15000,
          },
        );

        // 4) guarda file_id no projeto
        await db.query(`UPDATE projects SET file_id = $1 WHERE id = $2`, [
          fileId,
          projectId,
        ]);
      } catch (e) {
        console.error("[createProject] failed", {
          projectId,
          fileId,
          status: e?.response?.status,
          data: e?.response?.data,
          message: e?.message,
        });

        // rollback simples
        try {
          await db.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
        } catch (rbErr) {
          console.error(
            "[createProject] rollback failed",
            rbErr?.message || rbErr,
          );
        }

        const detail =
          pickDetail(e?.response?.data) || pickDetail(e?.message) || "unknown";
        throw new Error(`Failed to create project: ${detail}`);
      }

      // devolver com JOIN
      const finalRes = await db.query(
        `
        SELECT p.*,
               u.name  AS creator_name,
               u.email AS creator_email
        FROM projects p
        LEFT JOIN users u ON u.id = p.creator_user_id::int
        WHERE p.id = $1
        `,
        [Number(projectId)],
      );

      return mapProjectRow(finalRes.rows?.[0]);
    },

    updateProject: async (_, { id, input }, ctx) => {
      const db = getDb();
      const pid = Number(id);

      const authedId = mustAuth(ctx);

      const existingRes = await db.query(
        `SELECT * FROM projects WHERE id = $1`,
        [pid],
      );
      const existing = existingRes.rows?.[0];
      if (!existing) throw new Error("Project not found");

      // ownership
      const ownerId =
        existing.creator_user_id != null
          ? String(existing.creator_user_id)
          : null;
      if (!ownerId || ownerId !== authedId) throw new Error("Forbidden");

      const next = {
        title:
          input?.title != null ? String(input.title).trim() : existing.title,
        description: input?.description ?? existing.description,
        repo_url: input?.repoUrl ?? existing.repo_url,
        demo_url: input?.demoUrl ?? existing.demo_url,
        cover_image_url: input?.coverImageUrl ?? existing.cover_image_url,
      };

      if (!next.title) throw new Error("Title is required");

      // se pediu trocar ficheiro, tenta anexar primeiro
      if (input?.fileId) {
        const newFileId = String(input.fileId);
        try {
          await axios.post(
            `${FILES_BASE}/files/${encodeURIComponent(newFileId)}/attach`,
            { projectId: Number(pid) },
            {
              headers: { Authorization: `Bearer ${ctx.token}` },
              timeout: 15000,
            },
          );
        } catch (e) {
          console.error("[updateProject] attach failed", {
            projectId: pid,
            fileId: input.fileId,
            status: e?.response?.status,
            data: e?.response?.data,
            message: e?.message,
          });

          const detail =
            pickDetail(e?.response?.data) ||
            pickDetail(e?.message) ||
            "unknown";
          throw new Error(`Failed to attach new file: ${detail}`);
        }
      }

      const nextFileId =
        input?.fileId != null ? String(input.fileId) : existing.file_id;

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

      if (!updateRes.rows?.[0]) throw new Error("Failed to update project");

      // ✅ UC 1:1 (ucId singular)
      if (input?.ucId !== undefined) {
        const ucId = pickUcIdFromInput(input);
        await setProjectUcId(db, pid, ucId);
      }

      if (Array.isArray(input?.tags)) {
        await setProjectTags(db, pid, input.tags);
      }

      const finalRes = await db.query(
        `
        SELECT p.*,
               u.name  AS creator_name,
               u.email AS creator_email
        FROM projects p
        LEFT JOIN users u ON u.id = p.creator_user_id::int
        WHERE p.id = $1
        `,
        [pid],
      );

      return mapProjectRow(finalRes.rows?.[0]);
    },

    deleteProject: async (_, { id }, ctx) => {
      const db = getDb();
      const pid = Number(id);

      const authedId = mustAuth(ctx);

      const { rows } = await db.query(
        `SELECT creator_user_id FROM projects WHERE id = $1`,
        [pid],
      );
      const ownerId =
        rows?.[0]?.creator_user_id != null
          ? String(rows[0].creator_user_id)
          : null;
      if (!ownerId) return false;

      if (ownerId !== authedId) throw new Error("Forbidden");

      const delRes = await db.query(`DELETE FROM projects WHERE id = $1`, [
        pid,
      ]);
      return (delRes.rowCount ?? 0) > 0;
    },
  },
};
