"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Post = {
  id: string;
  author_id: string;
  kind: "ASK" | "HELP";
  title: string;
  body: string;
  category: string;
  status: string;
  created_at: string;
 profiles?: {
  display_name: string;
}[] | null;
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPosts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        author_id,
        kind,
        title,
        body,
        category,
        status,
        created_at,
        profiles (
          display_name
        )
      `)
      .in("status", ["OPEN", "IN_PROGRESS"])
      .order("created_at", { ascending: false });

    if (!error) {
      setPosts((data as Post[]) || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPosts();

    const channel = supabase
      .channel("home-posts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts"
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="container">

      {/* HERO */}

      <section
        className="card"
        style={{
          padding: "38px 30px",
          marginBottom: 24,
          background:
            "linear-gradient(135deg, #ffffff 0%, #f1f1ff 100%)"
        }}
      >
        <div style={{ maxWidth: 720 }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 10px",
              borderRadius: 999,
              background: "#e8e8ff",
              color: "#4b4cc9",
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 12
            }}
          >
            ASKORAA
          </span>

          <h1
            style={{
              fontSize: "clamp(30px, 5vw, 48px)",
              lineHeight: 1.08,
              marginBottom: 12
            }}
          >
            Someone knows the answer.
            <br />
            Maybe you can help.
          </h1>

          <p
            className="muted"
            style={{
              maxWidth: 600,
              fontSize: 16,
              lineHeight: 1.7
            }}
          >
            Share a problem you're facing, or find someone
            you can genuinely help.
          </p>
        </div>
      </section>


      {/* TWO CORE ACTIONS */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 34
        }}
      >

        <Link
          href="/create"
          className="card"
          style={{
            padding: 24,
            border: "1px solid #dcdcff",
            background:
              "linear-gradient(135deg, #ffffff, #f3f3ff)"
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              display: "grid",
              placeItems: "center",
              background: "#5b5ce2",
              color: "white",
              fontWeight: 900,
              fontSize: 20,
              marginBottom: 15
            }}
          >
            ?
          </div>

          <h2 style={{ marginBottom: 7 }}>
            POST YOUR TODAY'S PROBLEM
          </h2>

          <p
            className="muted"
            style={{
              margin: 0,
              lineHeight: 1.6
            }}
          >
            Stuck on something? Tell ASKORAA what
            you're trying to solve.
          </p>
        </Link>


        <Link
          href="#problems"
          className="card"
          style={{
            padding: 24,
            border: "1px solid #ccefe8",
            background:
              "linear-gradient(135deg, #ffffff, #effbf8)"
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              display: "grid",
              placeItems: "center",
              background: "#16a394",
              color: "white",
              fontWeight: 900,
              fontSize: 20,
              marginBottom: 15
            }}
          >
            →
          </div>

          <h2 style={{ marginBottom: 7 }}>
            SOLVE SOMEONE'S PROBLEM
          </h2>

          <p
            className="muted"
            style={{
              margin: 0,
              lineHeight: 1.6
            }}
          >
            Browse real problems and help someone
            using what you know.
          </p>
        </Link>

      </section>


      {/* PROBLEM FEED */}

      <section id="problems">

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
            marginBottom: 16
          }}
        >
          <div>
            <h2 style={{ marginBottom: 4 }}>
              Problems people need help with
            </h2>

            <p
              className="muted"
              style={{ margin: 0 }}
            >
              Find one you genuinely know how to solve.
            </p>
          </div>

          <button
            className="btn secondary"
            onClick={loadPosts}
          >
            Refresh
          </button>
        </div>


        {loading ? (
          <div className="card" style={{ padding: 24 }}>
            Loading problems...
          </div>
        ) : posts.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 35,
              textAlign: "center"
            }}
          >
            <h3>No open problems yet.</h3>

            <p className="muted">
              Be the first person to post today's problem.
            </p>

            <Link
              href="/create"
              className="btn"
            >
              Post a Problem
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 14
            }}
          >

            {posts.map((post) => {

              const ownerName =
  post.profiles?.[0]?.display_name ||
  "ASKORAA User";

              return (
                <article
                  key={post.id}
                  className="card"
                  style={{
                    padding: 22
                  }}
                >

                  {/* POST META */}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 13
                    }}
                  >

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap"
                      }}
                    >

                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          background:
                            post.kind === "ASK"
                              ? "#eeeeff"
                              : "#e8faf7",
                          color:
                            post.kind === "ASK"
                              ? "#4b4cc9"
                              : "#087a68",
                          fontSize: 11,
                          fontWeight: 800
                        }}
                      >
                        {post.kind === "ASK"
                          ? "ASK"
                          : "HELP"}
                      </span>

                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: "#f2f4f7",
                          color: "#475467",
                          fontSize: 11,
                          fontWeight: 700
                        }}
                      >
                        {post.category}
                      </span>

                    </div>

                    <span className="small">
                      {new Date(
                        post.created_at
                      ).toLocaleDateString()}
                    </span>

                  </div>


                  {/* OWNER */}

                  <div
                    style={{
                      marginBottom: 9,
                      fontSize: 12,
                      color: "#667085"
                    }}
                  >
                    <strong
                      style={{
                        color: "#344054"
                      }}
                    >
                      Problem posted by:
                    </strong>{" "}
                    {ownerName}
                  </div>


                  {/* TITLE */}

                  <Link href={`/post/${post.id}`}>
                    <h3
                      style={{
                        marginBottom: 8,
                        fontSize: 20
                      }}
                    >
                      {post.title}
                    </h3>
                  </Link>


                  {/* BODY */}

                  <p
                    className="muted"
                    style={{
                      marginTop: 0,
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {post.body.length > 300
                      ? post.body.slice(0, 300) + "..."
                      : post.body}
                  </p>


                  {/* ACTION */}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 16,
                      paddingTop: 15,
                      borderTop:
                        "1px solid #eef0f4"
                    }}
                  >

                    <span className="small">
                      Can you help solve this?
                    </span>

                    <Link
                      href={`/post/${post.id}`}
                      className="btn"
                    >
                      I CAN HELP
                    </Link>

                  </div>

                </article>
              );
            })}

          </div>
        )}

      </section>

    </main>
  );
}