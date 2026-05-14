const { resetDb, request, app, prisma, registerAndLogin, createPost } = require("./helpers");

beforeEach(resetDb);

describe("post tests", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/posts");
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown post", async () => {
    const token = await registerAndLogin();
    const res = await request(app).get("/api/posts/99999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Post not found");
  });

  it("returns 400 for invalid post body", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "" });
    expect(res.status).toBe(400);
  });

  it("creates a post successfully", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Test question", answer: "Test answer" });
    expect(res.status).toBe(201);
    expect(res.body.question).toBe("Test question");
  });

  it("returns 403 when editing someone else's post", async () => {
  const aliceToken = await registerAndLogin("alice@test.io", "Alice");
  const post = await createPost(aliceToken, { question: "Alice's post", answer: "Alice's answer" });

  const bobToken = await registerAndLogin("bob@test.io", "Bob");
  const res = await request(app).put(`/api/posts/${post.id}`)
    .set("Authorization", `Bearer ${bobToken}`)
    .send({ title: "hijacked", date: "2026-01-01", content: "x" });

  expect(res.status).toBe(403);

  const after = await prisma.post.findUnique({ where: { id: post.id } });
  expect(after.title).toBe("Alice's post");
});
});