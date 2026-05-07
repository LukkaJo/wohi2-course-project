const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const upload = require("../middleware/multer");
const multer = require("multer");

router.use(authenticate); 

function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

function formatPost(post) {
  return {
    ...post,
    date: post.date.toISOString().split("T")[0],
    keywords: post.keywords.map((k) => k.name),
    userName: post.user?.name || null, 
    likeCount: post._count?.likes || 0,
    isLiked: post.likes?.length > 0,
    user: undefined,
    likes: undefined,
    _count: undefined,
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
          likes: { where: { userId: req.user.userId }, take: 1 },
          _count: { select: { likes: true } }
        }, 
        orderBy: { id: "asc" }, 
        skip,
        take: limit,
    }), 
    prisma.post.count({ where }),
  ]);

  res.json({
    data: filteredPosts.map(formatPost),
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
      likes: { where: { userId: req.user.userId }, take: 1 },
      _count: { select: { likes: true } }
    },
  });

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.json(formatPost(post));
});

router.post("/", upload.single("image"), async (req, res) => {
  const { title, date, content, keywords } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null; 

  if (!title || !date || !content) {
    return res.status(400).json({ msg: "title, date and content are mandatory" });
  }

  const keywordsArray = parseKeywords(keywords);

  const newPost = await prisma.post.create({
    data: {
      title,
      date: new Date(date),
      content,
      imageUrl,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true },
  });

  res.status(201).json(formatPost(newPost));
});

router.put("/:postId", isOwner, upload.single("image"), async (req, res) => {
  const postId = Number(req.params.postId);
  const { title, date, content, keywords } = req.body;

  const existingPost = await prisma.post.findUnique({ where: { id: postId } });
  if (!existingPost) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (!title || !date || !content) {
    return res.status(400).json({ msg: "title, date and content are mandatory" });
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
    include: { keywords: true },
  });
  res.json(formatPost(updatedPost));
});

router.delete("/:postId", isOwner, async (req, res) => {
  const postId = Number(req.params.postId);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { keywords: true },
  });

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  await prisma.post.delete({ where: { id: postId } });

  res.json({
    message: "Post deleted successfully",
    post: formatPost(post),
  });
});
