const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const upload = require("../middleware/multer");
const multer = require("multer");
const { ValidationError, NotFoundError } = require("../lib/errors");
const { z } = require("zod");

const PostInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
});

router.use(authenticate); 


function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

function formatPost(post, currentUserId = null) {
  return {
    ...post,
    question: post.title,
    answer: post.content,
    date: post.date.toISOString().split("T")[0],
    keywords: post.keywords.map((k) => k.name),
    userName: post.user?.name || null,
    user: undefined,
    solved: post.attempts?.some(
      (a) => a.userId === currentUserId && a.correct
    ) ?? false,
  };
}

router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const { keyword } = req.query;
  const where = keyword ? { keywords: { some: { name: keyword } } } : {};

  const [filteredPosts, total] = await Promise.all([ 
    prisma.post.findMany({ 
        where, 
        include: { 
          keywords: true, 
          user: true,
          attempts: true,
        }, 
        orderBy: { id: "asc" }, 
        skip,
        take: limit,
    }), 
    prisma.post.count({ where }),
  ]);

  res.json({
    data: filteredPosts.map((p) => formatPost(p, req.user.userId)),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/:postId", async (req, res) => {
  const postId = Number(req.params.postId);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { 
      keywords: true, 
      user: true,
      attempts: true,
    },
  });

  if (!post) {
    req.log.warn({ postId }, "user tried to access nonexistent post");
    throw new NotFoundError("Post not found");
  }

  res.json(formatPost(post, req.user.userId));
});

router.post("/", (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError || 
        (err && err.message === "Only image files are allowed")) {
      return res.status(400).json({ msg: err.message });
    }
    if (err) return next(err);
    next();
  });
}, async (req, res) => {
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const data = PostInput.parse(req.body);
  const keywordsArray = parseKeywords(data.keywords);

  const newPost = await prisma.post.create({
    data: {
      title: data.question,
      date: new Date(),
      content: data.answer,
      imageUrl,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true, attempts: true },
  });

  res.status(201).json(formatPost(newPost, req.user.userId));
});

router.put("/:postId", isOwner, upload.single("image"), async (req, res) => {
  const postId = Number(req.params.postId);
  const { title, date, content, keywords } = req.body;

  const existingPost = await prisma.post.findUnique({ where: { id: postId } });
  if (!existingPost) {
    throw new NotFoundError("Post not found");
  }

  if (!title || !date || !content) {
    throw new ValidationError("title, date and content are mandatory");
  }

  const data = {
    title,
    date: new Date(date),
    content,
  };

  if (req.file) {
    data.imageUrl = `/uploads/${req.file.filename}`; 
  }

  const keywordsArray = parseKeywords(keywords); 
  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      ...data,
      keywords: {
        set: [],
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true, attempts: true },
  });
  res.json(formatPost(updatedPost, req.user.userId));
});

router.delete("/:postId", isOwner, async (req, res) => {
  const postId = Number(req.params.postId);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { keywords: true, attempts: true },
  });

  if (!post) {
    throw new NotFoundError("Post not found");
  }

  await prisma.post.delete({ where: { id: postId } });

  res.json({
    message: "Post deleted successfully",
    post: formatPost(post, req.user.userId),
  });
});

router.post("/:postId/play", async (req, res) => {
  const postId = Number(req.params.postId);
  const { answer } = req.body;

  if (!answer) {
    throw new ValidationError("answer is required");
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new NotFoundError("Post not found");
  }

  const correct =
    post.content.trim().toLowerCase() === answer.trim().toLowerCase();

  const attempt = await prisma.attempt.create({
    data: {
      answer,
      correct,
      userId: req.user.userId,
      postId,
    },
  });

  res.status(201).json({
    id: attempt.id,
    correct,
    submittedAnswer: answer,
    correctAnswer: correct ? answer : post.content,
    createdAt: attempt.createdAt
      .toISOString()
      .replace("T", " ")
      .slice(0, 16),
  });
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Only image files are allowed") {
    return res.status(400).json({ msg: err.message });
  }
  next(err);
});

module.exports = router;