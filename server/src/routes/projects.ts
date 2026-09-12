import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

const router = Router();
const prisma = new PrismaClient();

router.post("/", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { name } = req.body;
    // Guaranteed to exist by the requireAuth middleware
    const userId = req.userId!;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await prisma.project.create({
      data: {
        name,
        inviteCode: Math.random().toString(36).substring(2, 8).toLowerCase(),
        members: {
          create: {
            userId: userId,
            role: "admin",
          },
        },
      },
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error("Project creation failed:", error);
    return res.status(500).json({ message: "Failed to create project" });
  }
});

router.post("/join", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { code } = req.body;
    const userId = req.userId!;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const project = await prisma.project.findUnique({
      where: { inviteCode: code },
    });

    if (!project) {
      return res.status(404).json({ message: "Invalid invite code or project not found" });
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: userId,
        },
      },
    });

    if (!existingMember) {
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: userId,
          role: "member",
        },
      });
    }

    return res.status(200).json(project);
  } catch (error) {
    console.error("Project join failed:", error);
    return res.status(500).json({ message: "Failed to join project" });
  }
});
router.get("/", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.userId!;

    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            _count: {
              select: { documents: true }
            }
          }
        }
      },
      orderBy: {
        project: { updatedAt: 'desc' }
      }
    });

    const formattedProjects = memberships.map((m) => {
      const p = m.project;
      return {
        id: p.id,
        name: p.name,
        role: m.role,
        branch: "main", // Static until version control schema is added
        fileCount: p._count.documents,
        commitCount: 0, // Static until version control schema is added
        collaborators: p.members.map((pm) => ({
          id: pm.user.id,
          initials: pm.user.name ? pm.user.name.charAt(0).toUpperCase() : pm.user.email.charAt(0).toUpperCase(),
          name: pm.user.name || pm.user.email.split('@')[0],
        })),
        overflowCount: Math.max(0, p.members.length - 2),
        updatedLabel: `Updated ${p.updatedAt.toLocaleDateString()}`,
      };
    });

    return res.status(200).json(formattedProjects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return res.status(500).json({ message: "Failed to fetch projects" });
  }
});
router.get("/:projectId/settings", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { projectId } = req.params;
    const userId = req.userId!;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Authorization: User must be a member of this project to view its settings
    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    const response = {
      id: project.id,
      name: project.name,
      inviteCode: project.inviteCode,
      members: project.members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role
      }))
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Failed to fetch project settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Remove a member from a project (or leave)
router.delete("/:projectId/members/:userId", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { projectId, userId: targetUserId } = req.params;
    const currentUserId = req.userId!;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: currentUserId } }
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only allow if user is removing themselves (leaving) or if current user is admin
    if (currentUserId !== targetUserId && membership.role !== "admin") {
      return res.status(403).json({ message: "Admin privileges required to remove other members" });
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } }
    });

    return res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete project entirely (Admin only)
router.delete("/:projectId", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { projectId } = req.params;
    const userId = req.userId!;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (!membership || membership.role !== "admin") {
      return res.status(403).json({ message: "Only project admins can delete the project" });
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    return res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// Get project file tree
router.get("/:projectId/tree", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    return res.status(200).json({ tree: project.fileTree || [] });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch file tree" });
  }
});

// Update project file tree
router.put("/:projectId/tree", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { projectId } = req.params;
    const { tree } = req.body;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { fileTree: tree },
    });

    return res.status(200).json({ message: "Tree updated", tree: updated.fileTree });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update file tree" });
  }
});

// Get all commits for a project
router.get("/:projectId/commits", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { projectId } = req.params;
    const commits = await prisma.commit.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ commits });
  } catch (error) {
    console.error("Failed to fetch commits:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create a new commit snapshot
router.post("/:projectId/commits", requireAuth, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { projectId } = req.params;
    const { message, shortHash, authorName, authorInitials, fileTreeSnapshot } = req.body;
    const userId = req.userId!;

    const newCommit = await prisma.commit.create({
      data: {
        projectId,
        message,
        shortHash,
        authorId: userId,
        authorName,
        authorInitials,
        fileTreeSnapshot,
      },
    });

    return res.status(201).json({ commit: newCommit });
  } catch (error) {
    console.error("Failed to create commit:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
export default router;