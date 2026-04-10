const express = require("express");
const router = express.Router();

const posts = require("../data/posts");

// GET /posts 
// List all posts
router.get("/", (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.json(posts);
  }

  const filteredPosts = posts.filter(post =>
    post.question.toLowerCase().includes(keyword.toLowerCase())
  );

  res.json(filteredPosts);
});

router.get("/:postId", (req, res) => {
  const postId = Number(req.params.postId);

  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.json(post);
});

router.post("/", (req, res) => {
  const newPost = {
    id: posts.length + 1,
    question: req.body.question,
    answer: req.body.answer
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

router.post("/", (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }

  const maxId = Math.max(...posts.map(p => p.id), 0);

  const newPost = {
    id: maxId + 1,
    question,
    answer
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

router.put("/:postId", (req, res) => {
  const postId = Number(req.params.postId);
  const { question, answer } = req.body;

  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }

  post.question = question;
  post.answer = answer;

  res.json(post);
});

router.delete("/:postId", (req, res) => {
  const postId = Number(req.params.postId);
  
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return res.status(404).json({ message: "Post not found" });
  }

  const deletedPost = posts.splice(postIndex, 1);

  res.json({
    message: "Post deleted successfully",
    post: deletedPost[0]
  });
});

module.exports = router;
